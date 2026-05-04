import subprocess

from ..logging import logger


def normalize_audio_to_wav(audio_bytes: bytes, amplify: float = 1.0) -> bytes | None:
    try:
        audio_filters = "highpass=f=80,lowpass=f=7800"
        if amplify > 1.0:
            audio_filters = f"{audio_filters},volume={amplify}"

        result = subprocess.run(
            [
                "ffmpeg",
                "-hide_banner", "-loglevel", "error",
                "-i", "pipe:0",
                "-af", audio_filters,
                "-ac", "1",
                "-ar", "16000",
                "-f", "wav",
                "pipe:1",
            ],
            input=audio_bytes,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
        )
        return result.stdout or None
    except FileNotFoundError:
        logger.warning("ffmpeg not found; skipping audio normalization")
        return None
    except subprocess.CalledProcessError as exc:
        logger.warning("ffmpeg normalization failed: %s", exc.stderr.decode("utf-8", errors="ignore"))
        return None


def resolve_audio_upload_metadata(mime_type: str | None) -> tuple[str, str]:
    normalized = (mime_type or "").strip().lower()
    if "ogg" in normalized:
        return ("voice.ogg", "audio/ogg")
    if "wav" in normalized:
        return ("voice.wav", "audio/wav")
    if "mpeg" in normalized or "mp3" in normalized:
        return ("voice.mp3", "audio/mpeg")
    return ("voice.webm", "audio/webm")
