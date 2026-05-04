from typing import Any

from pydantic import BaseModel


class VoiceChatResult(BaseModel):
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
    suggestions: list[str] | None = None
    products: list[dict[str, Any]] | None = None
    productPagination: dict[str, Any] | None = None
    error: str | None = None


class IntentResult(BaseModel):
    intent: str
    confidence: float
    entities: dict[str, Any]
    explainability: dict[str, Any]
