"""Deterministic local providers. Replace routing, recall, and memory extraction with real services here."""

import re
from datetime import datetime, timezone


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def topic_for(question: str) -> str:
    if re.search(r"revenue|sales|growth|opportunit", question, re.I):
        return "revenue"
    return "network" if re.search(r"network|latency|outage|performance", question, re.I) else "churn"


def recallable(memory: dict, records: dict[str, dict], seen: set[str] | None = None) -> bool:
    visited = set(seen or ())
    if not memory["confirmed"] or memory.get("state") == "invalidated" or memory["id"] in visited:
        return False
    visited.add(memory["id"])
    return all(key in records and recallable(records[key], records, visited) for key in memory.get("sourceFactIds", []))


def recall(memories: list[dict], question: str, limit: int = 2) -> list[dict]:
    words = [word for word in re.findall(r"[a-z0-9]+", question.lower()) if len(word) > 2 and word not in {"what", "which", "the", "are", "and", "how", "with", "from", "does"}]
    records = {memory["id"]: memory for memory in memories}
    ranked = []
    for memory in memories:
        if recallable(memory, records):
            body = (memory["title"] + " " + memory["content"]).lower()
            score = sum(word in body for word in words)
            if score:
                ranked.append((score, memory))
    ranked.sort(key=lambda row: row[0], reverse=True)
    return [row[1] for row in ranked[:limit]]


def evaluate_question(question: str, records: list[dict], source_count: int, inventory: bool = False) -> dict:
    matches = [] if inventory else recall(records, question, limit=4)
    requested = set(re.findall(r"\b(?:19|20)\d{2}\b", question))
    available = set(re.findall(r"\b(?:19|20)\d{2}\b", " ".join(record["content"] for record in records)))
    missing = sorted(requested - available)
    return {
        "question": question, "mode": "local_demo",
        "checks": [
            {"name": "Context match", "result": "pass" if inventory or matches else "fail",
             "summary": f"Lists the {source_count} currently configured sources." if inventory else
                        f"{len(matches)} sample records matched question keywords; relevance is not verified." if matches else
                        "No keyword matches in the configured sample sources. The prepared answer may not address this question."},
            {"name": "Requested years", "result": "fail" if missing else "pass" if requested else "not_applicable",
             "summary": "Requested years absent from sample record text: " + ", ".join(missing) + "." if missing else
                        "Requested years appear in sample record text; full coverage is not verified." if requested else
                        "No explicit year requested."},
            {"name": "Answer grounding", "result": "unknown",
             "summary": "Not verified. This is a prepared answer, not a live RAG result or a source-passage evaluation."},
        ],
        "matchedRecords": [{"id": record["id"], "title": record["title"], "source": record["source"]} for record in matches],
    }


def run_memories(run: dict, answer: dict) -> list[dict]:
    topic = run["topic"]
    titles = {"churn": "Northeast churn baseline", "network": "Network experience baseline", "revenue": "Revenue opportunity baseline"}
    entries = [
        ("fact", "Observation", titles[topic], answer["summary"], answer["sources"][0], 98),
        ("pattern", "Learned pattern", "Retention and expansion strategy" if topic == "revenue" else "Service incidents predict churn", answer["findings"][0], answer["sources"][1], 94),
        ("context", "Session context", "Question & recommended next step", f"Question: {run['question']}\n\nRecommended next step: {answer['action']}", "Current conversation", 100),
    ]
    return [{"id": f"{run['id']}-{suffix}", "type": kind, "title": title, "content": content, "source": source, "confidence": confidence, "confirmed": False, "question": run["question"], "savedAt": now_iso(), "state": "valid", "sourceFactIds": []} for suffix, kind, title, content, source, confidence in entries]
