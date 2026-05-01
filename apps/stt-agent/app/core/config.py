from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional
from pydantic import field_validator

class Settings(BaseSettings):
    # Google Cloud Authentication
    GOOGLE_API_KEY: Optional[str] = None
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    
    # STT Configuration
    STT_SAMPLE_RATE: int = 16000
    STT_LANGUAGE_CODE: str = "si-LK"
    STT_ALTERNATIVE_LANGUAGES: List[str] = ["en-US"]
    STT_BOOSTED_PHRASES: List[str] = ["order", "අවසාන order", "order එකෙහි", "cancel", "payment", "online"]
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

    model_config = SettingsConfigDict(
        extra="ignore"
    )

settings = Settings()
