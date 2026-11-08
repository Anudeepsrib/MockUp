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


def run_memories(run: dict, answer: dict) -> list[dict]:
    topic = run["topic"]
    titles = {"churn": "Northeast churn baseline", "network": "Network experience baseline", "revenue": "Revenue opportunity baseline"}
    entries = [
        ("fact", "Observation", titles[topic], answer["summary"], answer["sources"][0], 98),
        ("pattern", "Learned pattern", "Retention and expansion strategy" if topic == "revenue" else "Service incidents predict churn", answer["findings"][0], answer["sources"][1], 94),
        ("context", "Session context", "Question & recommended next step", f"Question: {run['question']}\n\nRecommended next step: {answer['action']}", "Current conversation", 100),
    ]
    return [{"id": f"{run['id']}-{suffix}", "type": kind, "title": title, "content": content, "source": source, "confidence": confidence, "confirmed": False, "question": run["question"], "savedAt": now_iso(), "state": "valid", "sourceFactIds": []} for suffix, kind, title, content, source, confidence in entries]
