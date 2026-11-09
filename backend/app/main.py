import json
import os
import re
import time
from contextlib import asynccontextmanager
from copy import deepcopy
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .models import BankUpdate, ContextUpdate, ContextReviewRequest, Correction, MemoryUpdate, Question, RunRequest
from .context_quality import SOURCE_CONNECTIONS, review_context
from .service import evaluate_question, now_iso, recall, recallable, run_memories, topic_for
from .store import Store

DATA = Path(__file__).resolve().parents[1] / "data" / "fixtures.json"


def create_app(db_path: Path | None = None, run_step_seconds: float = .85) -> FastAPI:
    """Local composition root; replace fixture/service providers while preserving the UI DTOs."""
    fixtures = json.loads(DATA.read_text(encoding="utf-8"))

    def initial_state() -> dict:
        return {"connections": fixtures["initialConnections"][:], "mcpServers": [], "files": [], "memories": deepcopy(fixtures["corpus"]), "bank": deepcopy(fixtures["bank"]), "runs": {}, "revision": 0}

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        application.state.store = Store(db_path or Path(os.getenv("STUDIO_DB", str(DATA.parent.parent / ".data" / "studio.sqlite3"))), initial_state())
        yield

    app = FastAPI(title="Super Agent Insights API", version="1.0.0", lifespan=lifespan)
    origins = os.getenv("STUDIO_CORS_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5174").split(",")
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET", "POST", "PUT", "PATCH"], allow_headers=["Content-Type"])

    def store() -> Store:
        return app.state.store

    def public_state(state: dict) -> dict:
        return {key: value for key, value in state.items() if key != "runs"}

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    # Aggregate only display/configuration data here; connector credentials never belong in bootstrap.
    @app.get("/api/bootstrap")
    def bootstrap():
        return {**{key: value for key, value in fixtures.items() if key not in {"corpus", "bank"}}, "knowledgeRecords": fixtures["corpus"], "state": public_state(store().read())}

    @app.get("/api/workspace")
    def workspace():
        return public_state(store().read())

    # Metadata-only mock. Real connector authorization and ingestion jobs should live behind this boundary.
    @app.put("/api/context")
    def context(update: ContextUpdate):
        value = update.model_dump(exclude_none=True)
        known = {source["id"] for source in fixtures["sources"]} | {source["id"] for source in value["mcpServers"]}
        if any(key not in known for key in value["connections"]) or len(set(value["connections"])) != len(value["connections"]):
            raise HTTPException(422, "Connections must reference unique, known source IDs.")
        if any(len(name) > 250 for name in value["files"]):
            raise HTTPException(422, "File names must be under 250 characters.")
        return public_state(store().update(lambda state: state.update(value)))

    # Bulk snapshots support the prototype editor; production can map the adapter to versioned per-record commands.
    @app.put("/api/memories")
    def memories(update: MemoryUpdate):
        records = [memory.model_dump(exclude_none=True) for memory in update.memories]
        lookup = {memory["id"]: memory for memory in records}
        if any(memory["confirmed"] and not recallable(memory, lookup) for memory in records):
            raise HTTPException(409, "Approved memories require valid, approved source evidence.")
        return public_state(store().update(lambda state: state.update(memories=records)))

    @app.patch("/api/memories/{memory_id}")
    def correct(memory_id: str, correction: Correction):
        def change(state: dict):
            record = next((item for item in state["memories"] if item["id"] == memory_id), None)
            if record is None:
                raise HTTPException(404, "Memory not found.")
            if record["type"] == "Learned pattern":
                raise HTTPException(409, "Observations are derived. Correct their source facts.")
            if correction.text is not None:
                record.update(content=correction.text, edited=True, editedAt=now_iso())
            if correction.state is not None:
                record.update(state=correction.state, stateChangedAt=now_iso())
            record.update(reason=correction.reason, confirmed=False)
            affected = {memory_id}
            while True:
                dependent = {item["id"] for item in state["memories"] if set(item.get("sourceFactIds", [])) & affected}
                if dependent <= affected:
                    break
                affected |= dependent
            for item in state["memories"]:
                if item["id"] in affected:
                    item["confirmed"] = False
        return public_state(store().update(change))

    # Stores definitions, not LLM-generated refresh jobs or actual outbound webhook deliveries.
    @app.put("/api/bank")
    def bank(update: BankUpdate):
        value = update.model_dump(exclude_none=True)
        if value["config"].get("retain_extraction_mode") == "custom" and not value["config"].get("retain_custom_instructions"):
            raise HTTPException(422, "Custom extraction requires instructions.")
        return public_state(store().update(lambda state: state.update(bank=value)))

    @app.post("/api/query")
    def query(body: Question):
        state = store().read()
        question = body.question
        if not state["connections"]:
            raise HTTPException(409, "Connect a source first.")
        inventory = bool(re.search(r"\b(sources?|connectors?)\b", question, re.I) and re.search(r"\b(which|what|list|available|connected)\b", question, re.I))
        if inventory:
            source_map = {source["id"]: source for source in fixtures["sources"] + state["mcpServers"]}
            answer = "Your workspace includes " + str(len(state["connections"])) + " connected sources: " + ", ".join(source_map[key]["name"] for key in state["connections"]) + "."
        elif any(word in question.lower() for word in ["how many", "risk"]):
            answer = fixtures["testAnswer"]
        else:
            answer = fixtures["answers"][topic_for(question)]["summary"]
        records = [record for record in fixtures["corpus"] if SOURCE_CONNECTIONS.get(record["source"]) in state["connections"]]
        return {"answer": answer, "evaluation": evaluate_question(question, records, len(state["connections"]), inventory)}

    @app.post("/api/evaluations")
    def evaluations():
        if not store().read()["connections"]:
            raise HTTPException(409, "Connect a source first.")
        return fixtures["evaluations"]

    @app.post("/api/context/review")
    def context_review(body: ContextReviewRequest):
        return review_context(body.model_dump(), store().read(), fixtures["corpus"])

    # Normalize an orchestrator job into this shape in production; tick 0..12 is a UI progress scale.
    def run_response(run: dict) -> dict:
        tick = min(12, max(0, int((time.time() - run["started_at"]) / run_step_seconds)))
        result = {"id": run["id"], "question": run["question"], "topic": run["topic"], "answer": fixtures["answers"][run["topic"]], "recalled": run["recalled"], "tick": tick, "complete": tick >= 12}
        if run.get("context_review"):
            result["contextReview"] = run["context_review"]
        return result

    @app.post("/api/runs")
    def start_run(body: RunRequest):
        run = {}
        def change(state: dict):
            if not state["connections"]:
                raise HTTPException(409, "Connect a source first.")
            if body.context.brief.objective != body.question:
                raise HTTPException(422, "The task brief must describe the question being run.")
            report = review_context(body.context.model_dump(), state, fixtures["corpus"])
            if report["decision"] != "proceed":
                reasons = [check["summary"] for check in report["checks"] if check["result"] == "fail"]
                raise HTTPException(409, "CAFE(S) review: " + " ".join(reasons))
            included = {item["id"] for item in report["items"] if item["kind"] == "memory" and item["status"] == "included"}
            recalled = [memory for memory in recall(state["memories"], body.question) if memory["id"] in included]
            identifier = max([int(time.time() * 1000)] + [int(key) + 1 for key in state["runs"]])
            run.update(id=identifier, question=body.question, topic=topic_for(body.question), recalled=recalled, started_at=time.time(), saved=False)
            run.update(context_review=report, task_brief=body.context.brief.model_dump())
            state["runs"][str(identifier)] = run
        store().update(change)
        return run_response(run)

    @app.get("/api/runs/{run_id}")
    def poll_run(run_id: int):
        state = store().read()
        run = state["runs"].get(str(run_id))
        if run is None:
            raise HTTPException(404, "Run not found.")
        result = run_response(run)
        if result["complete"]:
            def finish(current: dict):
                active = current["runs"][str(run_id)]
                if not active["saved"]:
                    current["memories"] = run_memories(active, result["answer"]) + current["memories"]
                    active["saved"] = True
            if not run["saved"]:
                state = store().update(finish)
            result["memories"] = state["memories"]
        return result

    @app.post("/api/reset")
    def reset():
        return public_state(store().update(lambda state: state.update(initial_state())))

    return app


app = create_app()
