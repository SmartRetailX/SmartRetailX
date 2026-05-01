from pathlib import Path
from typing import List, Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_BOOSTED_PHRASES = [
    "order",
    "අවසාන order",
    "order එකෙහි",
    "cancel",
    "payment",
    "online",
]

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _load_phrases_from_file(file_path: str) -> List[str]:
    path = Path(file_path)
    if not path.is_absolute():
        path = PROJECT_ROOT / path

    try:
        lines = path.read_text(encoding="utf-8").splitlines()
        phrases = [line.strip() for line in lines if line.strip() and not line.strip().startswith("#")]
        return phrases or DEFAULT_BOOSTED_PHRASES
    except OSError:
        return DEFAULT_BOOSTED_PHRASES

class Settings(BaseSettings):
    # Google Cloud Authentication
    GOOGLE_API_KEY: Optional[str] = None
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    
    # STT Configuration
    STT_SAMPLE_RATE: int = 16000
    STT_LANGUAGE_CODE: str = "si-LK"
    STT_ALTERNATIVE_LANGUAGES: List[str] = ["en-US"]
    STT_BOOSTED_PHRASES_FILE: str = "app/data/stt_boosted_phrases.txt"
    STT_BOOSTED_PHRASES: List[str] = []
    STT_PHRASE_BOOST: float = 20.0
    
    # Network
    STT_AGENT_HOST: str = "0.0.0.0"
    STT_AGENT_PORT: int = 8003

    @field_validator("STT_ALTERNATIVE_LANGUAGES", "STT_BOOSTED_PHRASES", mode="before")
    @classmethod
    def parse_csv_list(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    def model_post_init(self, __context: object) -> None:
        if not self.STT_BOOSTED_PHRASES:
            self.STT_BOOSTED_PHRASES = _load_phrases_from_file(self.STT_BOOSTED_PHRASES_FILE)

    model_config = SettingsConfigDict(
        extra="ignore",
        enable_decoding=False,
    )

settings = Settings()
