from dataclasses import dataclass
from typing import Any


@dataclass
class VoiceChatResult:
    success: bool
    transcription: str
    response: str
    language: str
    sessionId: str
    messages: list[dict[str, str]]
    model: str
    latencyMs: int
    intent: str | None = None
    entities: dict[str, Any] | None = None
    explainability: dict[str, Any] | None = None
    error: str | None = None
