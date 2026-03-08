import os
import shutil
from dotenv import load_dotenv

from .logging_setup import logger

load_dotenv()

HTTP_PORT = int(os.getenv("AGENT_HTTP_PORT", "8010"))
TCP_HOST = os.getenv("AGENT_TCP_HOST", "0.0.0.0")
TCP_PORT = int(os.getenv("AGENT_TCP_PORT", "8877"))

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_RESPONSE_MODEL = os.getenv("OPENAI_RESPONSE_MODEL", "gpt-4o-mini")
OPENAI_RESPONSE_TIMEOUT_MS = int(os.getenv("OPENAI_RESPONSE_TIMEOUT_MS", "45000"))

WHISPER_PROVIDER = "openai"
OPENAI_API_BASE_URL = "https://api.openai.com/v1"
OPENAI_WHISPER_MODEL = "whisper-1"
OPENAI_TRANSCRIBE_PROMPT = ""
OPENAI_STT_TIMEOUT_MS = 90_000

OPENAI_BASE_TRANSCRIBE_PROMPT = (
    "Transcribe this audio verbatim. Keep original spoken words only. "
    "Allowed languages are Sinhala and English (including mixed speech). "
    "Do not translate, summarize, or add extra sentences."
)
OPENAI_SI_TRANSCRIBE_PROMPT = (
    "Sinhala focus: return Sinhala words in Sinhala script and keep English words in English. "
    "Do not transliterate, translate, or add content."
)

DEFAULT_INTENTS = ["offers", "order_history", "buying_suggestions", "prices", "product_search", "general"]

FFMPEG_AVAILABLE = shutil.which("ffmpeg") is not None
if not FFMPEG_AVAILABLE:
    logger.warning("ffmpeg is not installed. Audio normalization is disabled; transcription accuracy may be poor.")
