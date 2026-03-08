import asyncio
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .config import (
    HTTP_PORT,
    OPENAI_WHISPER_MODEL,
    TCP_HOST,
    TCP_PORT,
    WHISPER_PROVIDER,
)
from .service import process_voice_chat
from .tcp_transport import tcp_client_loop

app = FastAPI(
    title="Smart RetailX Agent Service",
    description="Sinhala voice-to-chat service (Transcript-first + OpenAI intent/response pipeline)",
    version="2.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

tcp_server: asyncio.base_events.Server | None = None


@app.on_event("startup")
async def start_tcp_server() -> None:
    global tcp_server
    tcp_server = await asyncio.start_server(tcp_client_loop, TCP_HOST, TCP_PORT)


@app.on_event("shutdown")
async def stop_tcp_server() -> None:
    global tcp_server
    if tcp_server:
        tcp_server.close()
        await tcp_server.wait_closed()


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "httpPort": HTTP_PORT,
        "tcpPort": TCP_PORT,
        "whisperProvider": WHISPER_PROVIDER,
        "openaiModel": OPENAI_WHISPER_MODEL,
    }


@app.post("/api/v1/voice/chat")
async def voice_chat(
    audio: UploadFile | None = File(None),
    language: str = Form("si-LK"),
    sessionId: str | None = Form(None),
    userId: str | None = Form(None),
    userRole: str = Form("guest"),
    transcriptText: str | None = Form(None),
    intents: str = Form(
        "offers,order_history,buying_suggestions,prices,product_search"
    ),
) -> dict[str, Any]:
    audio_bytes = await audio.read() if audio is not None else b""
    if not audio_bytes and not (transcriptText or "").strip():
        raise HTTPException(
            status_code=400, detail="Audio payload or transcriptText is required"
        )

    parsed_intents = [part.strip() for part in intents.split(",") if part.strip()]
    result = await process_voice_chat(
        audio_bytes,
        language=language,
        session_id=sessionId,
        user_id=userId,
        user_context={"id": userId, "role": userRole},
        intents=parsed_intents,
        transcript_text=transcriptText,
    )
    return result.__dict__
