from fastapi import FastAPI

from .models import IntentRequest, IntentResponse
from .service import detect_intent

app = FastAPI(
    title="sinLlama Intent Service",
    description="Intent detection + lightweight XAI for Sinhala/English retail queries",
    version="1.0.0",
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/v1/intent", response_model=IntentResponse)
async def intent(payload: IntentRequest) -> IntentResponse:
    return detect_intent(payload)

