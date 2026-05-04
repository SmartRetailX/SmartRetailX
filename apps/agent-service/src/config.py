import shutil

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    database_url: str = ""

    # HTTP / TCP ports
    agent_http_port: int = 8010
    agent_tcp_host: str = "0.0.0.0"
    agent_tcp_port: int = 8877

    # OpenAI – response generation
    openai_api_key: str = ""
    openai_response_model: str = "gpt-4o-mini"
    openai_response_timeout_ms: int = 45_000
    openai_api_base_url: str = "https://api.openai.com/v1"

    # OpenAI – Whisper / STT
    openai_whisper_model: str = "whisper-1"
    openai_stt_timeout_ms: int = 90_000
    openai_transcribe_prompt: str = ""

    # STT provider
    stt_provider: str = "stt-agent"
    stt_agent_http_url: str = "http://127.0.0.1:8003/api/v1/stt/transcribe"
    stt_agent_timeout_ms: int = 60_000

    # SinLlama – intent detection
    sinllama_base_url: str = ""
    sinllama_intent_path: str = "/api/v1/intent"
    sinllama_timeout_ms: int = 8_000
    sinllama_api_key: str = ""
    sinllama_retry_count: int = 1

    # Defaults
    default_intents: list[str] = [
        "offers",
        "order_history",
        "buying_suggestions",
        "prices",
        "product_search",
        "general",
    ]

    # Derived – not from env
    ffmpeg_available: bool = False
    openai_base_transcribe_prompt: str = (
        "Transcribe this audio verbatim. Keep original spoken words only. "
        "Allowed languages are Sinhala and English (including mixed speech). "
        "Do not translate, summarize, or add extra sentences."
    )
    openai_si_transcribe_prompt: str = (
        "Sinhala focus: return Sinhala words in Sinhala script and keep English words in English. "
        "Do not transliterate, translate, or add content."
    )

    @field_validator("sinllama_intent_path", mode="before")
    @classmethod
    def _default_intent_path(cls, v: str) -> str:
        return v.strip() or "/api/v1/intent"

    @field_validator("openai_api_base_url", mode="before")
    @classmethod
    def _default_openai_base(cls, v: str) -> str:
        return v.strip() or "https://api.openai.com/v1"

    @model_validator(mode="after")
    def _detect_ffmpeg(self) -> "Settings":
        self.ffmpeg_available = shutil.which("ffmpeg") is not None
        return self


settings = Settings()
