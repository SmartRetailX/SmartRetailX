import asyncio
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db.connection import close_pool, init_pool
from .service import process_voice_chat
from .transport.tcp import tcp_client_loop

_tcp_server: asyncio.base_events.Server | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _tcp_server
    await init_pool()
    _tcp_server = await asyncio.start_server(tcp_client_loop, settings.agent_tcp_host, settings.agent_tcp_port)

    yield

    if _tcp_server:
        _tcp_server.close()
        await _tcp_server.wait_closed()
    await close_pool()


app = FastAPI(
    title="Smart RetailX Agent Service",
    description="Sinhala voice-to-chat service (Transcript-first + OpenAI intent/response pipeline)",
    version="2.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "httpPort": settings.agent_http_port,
        "tcpPort": settings.agent_tcp_port,
        "whisperProvider": settings.stt_provider,
        "openaiModel": settings.openai_whisper_model,
    }


@app.post("/api/v1/voice/chat")
async def voice_chat(
    audio: UploadFile | None = File(None),
    language: str = Form("si-LK"),
    sessionId: str | None = Form(None),
    userId: str | None = Form(None),
    userRole: str = Form("guest"),
    transcriptText: str | None = Form(None),
    intents: str = Form("offers,order_history,buying_suggestions,prices,product_search,general"),
) -> dict[str, Any]:
    audio_bytes = await audio.read() if audio is not None else b""
    if not audio_bytes and not (transcriptText or "").strip():
        raise HTTPException(status_code=400, detail="Audio payload or transcriptText is required")

    parsed_intents = [p.strip() for p in intents.split(",") if p.strip()]
    if "general" not in parsed_intents:
        parsed_intents.append("general")

    result = await process_voice_chat(
        audio_bytes,
        language=language,
        mime_type=audio.content_type if audio is not None else None,
        session_id=sessionId,
        user_id=userId,
        user_context={"id": userId, "role": userRole},
        intents=parsed_intents,
        transcript_text=transcriptText,
    )
    return result.model_dump()
