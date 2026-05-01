import asyncio
import base64
import json
from typing import Any

from .logging_setup import logger
from .service import process_voice_chat


def make_frame(payload: dict[str, Any]) -> bytes:
    body = json.dumps(payload, ensure_ascii=False)
    return f"{len(body)}#{body}".encode("utf-8")


def parse_pattern(packet: dict[str, Any]) -> str:
    pattern = packet.get("pattern")
    if isinstance(pattern, str):
        try:
            parsed = json.loads(pattern)
            if isinstance(parsed, dict) and "cmd" in parsed:
                return str(parsed["cmd"])
        except json.JSONDecodeError:
            return pattern
    if isinstance(pattern, dict):
        return str(pattern.get("cmd", ""))
    return ""


async def handle_nest_packet(packet: dict[str, Any]) -> dict[str, Any]:
    cmd = parse_pattern(packet)
    payload = packet.get("data", {})
    request_id = packet.get("id")

    if cmd != "voice_chat":
        return {"id": request_id, "err": f"Unsupported pattern: {cmd}", "isDisposed": True}

    audio_base64 = payload.get("audioBase64")
    transcript_text = (payload.get("transcriptText") or "").strip()
    if not audio_base64 and not transcript_text:
        return {"id": request_id, "err": "audioBase64 or transcriptText is required", "isDisposed": True}

    audio_bytes = b""
    if audio_base64:
        try:
            audio_bytes = base64.b64decode(audio_base64)
        except Exception:
            return {"id": request_id, "err": "Invalid base64 audio payload", "isDisposed": True}

    logger.info("TCP packet received: cmd=%s audio_size=%s session=%s", cmd, len(audio_bytes), payload.get("sessionId"))

    result = await process_voice_chat(
        audio_bytes=audio_bytes,
        language=payload.get("language", "si-LK"),
        mime_type=payload.get("mimeType"),
        session_id=payload.get("sessionId"),
        user_id=payload.get("userId"),
        user_context=payload.get("userContext"),
        intents=payload.get("intents"),
        transcript_text=payload.get("transcriptText"),
    )

    return {"id": request_id, "response": result.__dict__, "isDisposed": True}


async def tcp_client_loop(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    try:
        while True:
            header = await reader.readuntil(b"#")
            body_length = int(header[:-1].decode("utf-8"))
            body = await reader.readexactly(body_length)
            packet = json.loads(body.decode("utf-8"))
            response_packet = await handle_nest_packet(packet)
            writer.write(make_frame(response_packet))
            await writer.drain()
    except (asyncio.IncompleteReadError, asyncio.LimitOverrunError, ValueError, json.JSONDecodeError):
        pass
    finally:
        writer.close()
        await writer.wait_closed()
