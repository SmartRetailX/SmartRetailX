from dataclasses import dataclass


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
    error: str | None = None
