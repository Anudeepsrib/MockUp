from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.service import recallable


@pytest.fixture
def client(tmp_path: Path):
    app = create_app(tmp_path / "test.sqlite3", run_step_seconds=.001)
    with TestClient(app) as session:
        yield session


def test_bootstrap_owns_the_mock_dataset(client):
    data = client.get("/api/bootstrap").json()
    assert len(data["state"]["memories"]) == 108
    assert len(data["sources"]) >= 18
    assert data["answers"]["churn"]["sources"]
    assert data["knowledgeRecords"][0]["id"] == data["state"]["memories"][0]["id"]
    assert data["presets"][0]["template"]["version"] == "1"


def test_context_rejects_unknown_connections_without_changing_state(client):
    before = client.get("/api/workspace").json()
    response = client.put("/api/context", json={"connections": ["unknown"], "files": [], "mcpServers": []})
    assert response.status_code == 422
    assert client.get("/api/workspace").json() == before


def test_mcp_configuration_and_file_names_persist(client):
    source = {"id": "mcp-12345678-1234-1234-1234-123456789abc", "name": "Knowledge tools", "kind": "workflow", "category": "MCP", "detail": "Enterprise context", "color": "#008cba", "count": "3 capabilities", "endpoint": "https://example.com/mcp"}
    response = client.put("/api/context", json={"connections": ["local", source["id"]], "files": ["service-review.pdf"], "mcpServers": [source]})
    assert response.status_code == 200
    assert client.get("/api/workspace").json()["mcpServers"][0]["name"] == "Knowledge tools"
    source["endpoint"] = "https://user:secret@example.com/mcp"
    assert client.put("/api/context", json={"connections": ["local"], "files": [], "mcpServers": [source]}).status_code == 422


def test_record_validation_and_unique_ids(client):
    records = client.get("/api/workspace").json()["memories"]
    assert client.put("/api/memories", json={"memories": records}).status_code == 200
    assert client.put("/api/memories", json={"memories": records + [records[0]]}).status_code == 422
    records[0]["confidence"] = 101
    assert client.put("/api/memories", json={"memories": records}).status_code == 422


def test_source_correction_revokes_dependent_approvals(client):
    records = client.get("/api/workspace").json()["memories"]
    source = records[0]
    derived = next(record for record in records if source["id"] in record.get("sourceFactIds", []))
    response = client.patch(f"/api/memories/{source['id']}", json={"text": "Corrected service evidence", "reason": "Reviewed against source"})
    assert response.status_code == 200
    updated = {memory["id"]: memory for memory in response.json()["memories"]}
    assert not updated[source["id"]]["confirmed"]
    assert not updated[derived["id"]]["confirmed"]
    assert updated[source["id"]]["editedAt"]
    assert client.patch(f"/api/memories/{derived['id']}", json={"text": "Override", "reason": "Edit"}).status_code == 409
    updated[derived["id"]]["confirmed"] = True
    assert client.put("/api/memories", json={"memories": list(updated.values())}).status_code == 409


def test_bank_configuration_is_validated_and_saved(client):
    bank = client.get("/api/workspace").json()["bank"]
    bank["config"]["reflect_mission"] = "Cite the evidence"
    assert client.put("/api/bank", json=bank).status_code == 200
    assert client.get("/api/workspace").json()["bank"]["config"]["reflect_mission"] == "Cite the evidence"
    bank["config"]["disposition_empathy"] = 10
    assert client.put("/api/bank", json=bank).status_code == 422


def test_agent_run_polling_saves_memories_once(client):
    before = client.get("/api/workspace").json()["memories"]
    question = "How is network performance affecting customers?"
    context = {"brief": {"objective": question, "region": "Northeast", "period": "Demo dataset coverage", "metric": "Network availability", "deliverable": "Explain the evidence"}, "pinnedIds": [], "scenario": "ready"}
    started = client.post("/api/runs", json={"question": question, "context": context}).json()
    # Advance this fixture's clock without sleeping through a presentation run.
    client.app.state.store.update(lambda state: state["runs"][str(started["id"])].update(started_at=0))
    completed = client.get(f"/api/runs/{started['id']}").json()
    assert completed["complete"] and completed["tick"] == 12
    assert completed["topic"] == "network"
    assert len(completed["memories"]) == len(before) + 3
    assert all(not memory["confirmed"] for memory in completed["memories"][:3])
    assert all(memory["question"] == started["question"] for memory in completed["memories"][:3])
    again = client.get(f"/api/runs/{started['id']}").json()
    assert len(again["memories"]) == len(completed["memories"])


def test_missing_runs_and_blank_questions(client):
    assert client.get("/api/runs/1").status_code == 404
    assert client.post("/api/runs", json={"question": " "}).status_code == 422


def test_query_and_evaluations_use_backend_fixtures(client):
    assert "1,240" in client.post("/api/query", json={"question": "How many customers are at risk?"}).json()["answer"]
    report = client.post("/api/evaluations").json()
    assert report["passed"] == 24 and report["total"] == 25
    assert len(report["metrics"]) == 3


def test_sqlite_survives_server_restart(tmp_path):
    path = tmp_path / "persistent.sqlite3"
    with TestClient(create_app(path)) as first:
        first.put("/api/context", json={"connections": ["local"], "files": ["retained.csv"], "mcpServers": []})
    with TestClient(create_app(path)) as second:
        assert second.get("/api/workspace").json()["files"] == ["retained.csv"]
        assert second.post("/api/reset").json()["files"] == []


def test_cors_is_limited_to_local_frontends(client):
    assert client.get("/api/health", headers={"Origin": "http://127.0.0.1:5173"}).headers["access-control-allow-origin"] == "http://127.0.0.1:5173"
    assert "access-control-allow-origin" not in client.get("/api/health", headers={"Origin": "https://unrelated.example"}).headers


def test_circular_evidence_is_not_recallable():
    record = {"id": "cycle", "confirmed": True, "sourceFactIds": ["cycle"]}
    assert not recallable(record, {"cycle": record})
