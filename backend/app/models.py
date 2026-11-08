from typing import Any, Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Memory(StrictModel):
    id: str = Field(min_length=1, max_length=250)
    type: Literal["Observation", "Learned pattern", "Session context"]
    title: str = Field(min_length=1, max_length=500)
    content: str = Field(min_length=1, max_length=20000)
    source: str = Field(min_length=1, max_length=250)
    confidence: float = Field(ge=0, le=100)
    confirmed: bool
    edited: bool | None = None
    question: str | None = Field(default=None, max_length=4000)
    savedAt: str | None = None
    editedAt: str | None = None
    state: Literal["valid", "invalidated"] = "valid"
    stateChangedAt: str | None = None
    reason: str | None = Field(default=None, max_length=1000)
    sourceFactIds: list[str] = Field(default_factory=list, max_length=100)


def https_endpoint(value: str) -> str:
    parsed = urlsplit(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.fragment:
        raise ValueError("Use an HTTPS endpoint without credentials or a fragment.")
    return value


class McpSource(StrictModel):
    id: str = Field(pattern=r"^mcp-[0-9a-f-]{36}$")
    name: str = Field(min_length=1, max_length=80)
    kind: Literal["workflow"]
    detail: str = Field(max_length=250)
    color: str = Field(max_length=30)
    category: Literal["MCP"]
    count: str = Field(max_length=60)
    endpoint: str = Field(max_length=2000)

    _endpoint = field_validator("endpoint")(https_endpoint)


class ContextUpdate(StrictModel):
    connections: list[str] = Field(max_length=100)
    files: list[str] = Field(max_length=200)
    mcpServers: list[McpSource] = Field(max_length=50)


class MemoryUpdate(StrictModel):
    memories: list[Memory] = Field(max_length=2000)

    @field_validator("memories")
    @classmethod
    def unique_ids(cls, memories: list[Memory]) -> list[Memory]:
        if len({m.id for m in memories}) != len(memories):
            raise ValueError("Memory IDs must be unique.")
        return memories


class BankConfig(StrictModel):
    name: str | None = Field(default=None, max_length=120)
    retain_mission: str | None = Field(default=None, max_length=8000)
    reflect_mission: str | None = Field(default=None, max_length=8000)
    observations_mission: str | None = Field(default=None, max_length=8000)
    retain_extraction_mode: Literal["concise", "verbose", "custom", "verbatim", "chunks"] | None = None
    retain_custom_instructions: str | None = Field(default=None, max_length=8000)
    retain_chunk_size: int | None = Field(default=None, ge=1, le=100000)
    retain_structured_chunk_size: int | None = Field(default=None, ge=1, le=100000)
    disposition_skepticism: int | None = Field(default=None, ge=1, le=5)
    disposition_literalism: int | None = Field(default=None, ge=1, le=5)
    disposition_empathy: int | None = Field(default=None, ge=1, le=5)
    enable_observations: bool | None = None
    entities_allow_free_form: bool | None = None
    entity_labels: list[dict[str, Any]] | None = None


class MentalModel(StrictModel):
    id: str = Field(min_length=1, max_length=150)
    name: str = Field(min_length=1, max_length=120)
    source_query: str = Field(min_length=1, max_length=4000)
    tags: list[str] | None = None
    max_tokens: int | None = Field(default=None, ge=1, le=32000)
    trigger: dict[str, Any] | None = None
    content: str | None = Field(default=None, max_length=80000)
    updated_at: str | None = None
    source_ids: list[str] | None = None


class KnowledgePage(StrictModel):
    id: str
    name: str = Field(min_length=1, max_length=120)
    folder: str = Field(max_length=100)
    source_query: str = Field(min_length=1, max_length=4000)
    content: str = Field(max_length=80000)
    updated_at: str
    source_ids: list[str]


class Webhook(StrictModel):
    id: str
    name: str = Field(min_length=1, max_length=100)
    url: str = Field(max_length=2000)
    events: list[Literal["retain.completed", "consolidation.completed", "memory_defense.triggered"]] = Field(min_length=1)
    enabled: bool

    _url = field_validator("url")(https_endpoint)


class BankUpdate(StrictModel):
    config: BankConfig
    models: list[MentalModel] = Field(max_length=100)
    directives: list[dict[str, Any]] = Field(max_length=100)
    pages: list[KnowledgePage] = Field(max_length=100)
    hooks: list[Webhook] = Field(max_length=100)
    operations: list[dict[str, Any]] = Field(max_length=100)


class Question(StrictModel):
    question: str = Field(min_length=1, max_length=4000)


class Correction(StrictModel):
    text: str | None = Field(default=None, min_length=1, max_length=4000)
    state: Literal["valid", "invalidated"] | None = None
    reason: str = Field(min_length=1, max_length=1000)
