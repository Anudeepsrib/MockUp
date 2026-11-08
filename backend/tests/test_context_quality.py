from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(tmp_path / "context.sqlite3", run_step_seconds=.001)) as session:
        yield session


def context(scenario="ready"):
    return {"brief": {"objective": "What is driving Northeast customer churn?", "region": "Northeast",
                      "period": "Demo dataset coverage", "metric": "Customer churn rate",
                      "deliverable": "Explain the evidence and propose a service recovery pilot."},
            "pinnedIds": [], "scenario": scenario}


def test_review_is_computed_without_mutating_workspace(client):
    before = client.get("/api/workspace").json()
    report = client.post("/api/context/review", json=context()).json()
    assert report["decision"] == "proceed"
    assert report["mode"] == "local_demo" and report["checkedAt"] and report["manifestId"]
    assert {check["dimension"] for check in report["checks"]} == {"Clarity", "Actionability", "Fidelity", "Efficiency", "Security"}
    assert all(check["result"] == "pass" and check["method"] == "deterministic" for check in report["checks"])
    assert report["metrics"]["included"] == sum(item["status"] == "included" for item in report["items"])
    assert client.get("/api/workspace").json() == before


@pytest.mark.parametrize("scenario,decision,dimension,result", [
    ("missing_scope", "needs_input", "Clarity", "fail"),
    ("stale_evidence", "blocked", "Fidelity", "fail"),
    ("noisy_context", "proceed", "Efficiency", "pass"),
    ("unsafe_context", "blocked", "Security", "fail"),
    ("draft_memory", "proceed", "Fidelity", "pass"),
])
def test_demo_conditions_change_real_backend_findings(client, scenario, decision, dimension, result):
    before = client.get("/api/workspace").json()
    report = client.post("/api/context/review", json=context(scenario)).json()
    assert report["decision"] == decision
    assert next(check for check in report["checks"] if check["dimension"] == dimension)["result"] == result
    assert client.get("/api/workspace").json() == before, "Demo cases modify copies, not retained knowledge"


def test_noise_and_unapproved_memory_do_not_enter_packet(client):
    report = client.post("/api/context/review", json=context("noisy_context")).json()
    assert report["metrics"]["excluded"] >= 5
    included = [item for item in report["items"] if item["status"] == "included"]
    assert len(included) == len({(item["kind"], item["content"].lower()) for item in included})
    assert report["metrics"]["estimatedTokens"] <= report["metrics"]["tokenBudget"]
    report = client.post("/api/context/review", json=context("draft_memory")).json()
    draft = next(item for item in report["items"] if item["id"] == "demo-unapproved-memory")
    assert draft["status"] == "excluded" and "not approved" in draft["reason"]


@pytest.mark.parametrize("scenario", ["missing_scope", "stale_evidence", "unsafe_context"])
def test_run_is_blocked_server_side_even_if_client_skips_review(client, scenario):
    request = context(scenario)
    before = client.get("/api/workspace").json()
    result = client.post("/api/runs", json={"question": request["brief"]["objective"], "context": request})
    assert result.status_code == 409 and "CAFE(S)" in result.json()["detail"]
    assert client.get("/api/workspace").json() == before
    assert not client.app.state.store.read()["runs"]


def test_run_rechecks_source_state_instead_of_trusting_old_report(client):
    request = context()
    assert client.post("/api/context/review", json=request).json()["decision"] == "proceed"
    client.put("/api/context", json={"connections": ["local"], "files": [], "mcpServers": []})
    result = client.post("/api/runs", json={"question": request["brief"]["objective"], "context": request})
    assert result.status_code == 409
    assert not client.app.state.store.read()["runs"]


def test_run_preserves_its_report_snapshot(client):
    request = context()
    result = client.post("/api/runs", json={"question": request["brief"]["objective"], "context": request})
    assert result.status_code == 200
    started = result.json()
    report = deepcopy(started["contextReview"])
    client.app.state.store.update(lambda state: state["runs"][str(started["id"])].update(started_at=0))
    assert client.get(f"/api/runs/{started['id']}").json()["contextReview"] == report


def test_review_rejects_forged_policy_and_bad_references(client):
    request = context()
    request["scenario"] = "bypass_security"
    assert client.post("/api/context/review", json=request).status_code == 422
    request = context()
    request["checks"] = [{"dimension": "Security", "result": "pass"}]
    assert client.post("/api/context/review", json=request).status_code == 422
    request = context()
    request["pinnedIds"] = ["nonexistent-record"]
    assert client.post("/api/context/review", json=request).json()["decision"] == "blocked"
    request["pinnedIds"] *= 2
    assert client.post("/api/context/review", json=request).status_code == 422
    request = context()
    assert client.post("/api/runs", json={"question": "Different question", "context": request}).status_code == 422


def test_current_memory_approval_is_respected(client):
    record_id = client.get("/api/workspace").json()["memories"][0]["id"]
    client.patch(f"/api/memories/{record_id}", json={"state": "invalidated", "reason": "Demo review"})
    request = context()
    request["brief"]["objective"] = "What changed in Boston fiber churn?"
    report = client.post("/api/context/review", json=request).json()
    assert not any(item["id"] == record_id and item["kind"] == "memory" and item["status"] == "included" for item in report["items"])


def test_omitting_context_cannot_bypass_run_checks(client):
    assert client.post("/api/runs", json={"question": "Why churn?"}).status_code == 422
    assert not client.app.state.store.read()["runs"]
