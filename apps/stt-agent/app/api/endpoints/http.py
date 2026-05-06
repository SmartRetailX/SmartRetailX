from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from google.cloud import speech_v1p1beta1 as speech

from app.services.stt import get_recognition_config, get_speech_client

router = APIRouter()


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = Form("si-LK"),
) -> dict[str, str]:
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio payload is required")

    client = get_speech_client()
    config = get_recognition_config()
    if language.strip():
        config.language_code = language

    content_type = (audio.content_type or "").lower()
    filename = (audio.filename or "").lower()
    is_webm = "audio/webm" in content_type or filename.endswith(".webm")
    if is_webm:
        config.encoding = speech.RecognitionConfig.AudioEncoding.WEBM_OPUS
        config.sample_rate_hertz = 48000

    request = speech.RecognizeRequest(
        config=config,
        audio=speech.RecognitionAudio(content=audio_bytes),
    )
    response = await client.recognize(request=request)

    transcript = " ".join(
        result.alternatives[0].transcript.strip()
        for result in response.results
        if result.alternatives and result.alternatives[0].transcript.strip()
    ).strip()

    if not transcript:
        raise HTTPException(status_code=422, detail="No speech detected in audio")

    return {"transcription": transcript, "language": language}
