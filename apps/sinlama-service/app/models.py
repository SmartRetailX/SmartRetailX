from pydantic import BaseModel, Field


class IntentRequest(BaseModel):
    text: str
    language: str = "si-LK"
    sessionId: str
    userId: str | None = None
    allowedIntents: list[str] = Field(default_factory=list)


class ExplanationFeature(BaseModel):
    name: str
    weight: float | None = None
    evidence: str | None = None


class Explanation(BaseModel):
    rationale: str | None = None
    features: list[ExplanationFeature] = Field(default_factory=list)


class IntentResponse(BaseModel):
    intent: str
    confidence: float
    entities: dict = Field(default_factory=dict)
    explanation: Explanation

