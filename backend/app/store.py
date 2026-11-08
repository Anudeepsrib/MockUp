import json
import sqlite3
from copy import deepcopy
from pathlib import Path
from typing import Callable


class Store:
    """Single-workspace SQLite persistence; a tenant-aware backend should replace this storage adapter."""

    def __init__(self, path: Path, initial: dict):
        self.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as connection:
            connection.execute("CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY, payload TEXT NOT NULL)")
            connection.execute("INSERT OR IGNORE INTO workspace VALUES (1, ?)", (json.dumps(initial),))

    def connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.path, timeout=15)

    def read(self) -> dict:
        with self.connect() as connection:
            return json.loads(connection.execute("SELECT payload FROM workspace WHERE id=1").fetchone()[0])

    def update(self, change: Callable[[dict], None]) -> dict:
        with self.connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            state = json.loads(connection.execute("SELECT payload FROM workspace WHERE id=1").fetchone()[0])
            change(state)
            state["revision"] += 1
            connection.execute("UPDATE workspace SET payload=? WHERE id=1", (json.dumps(state),))
            return deepcopy(state)
