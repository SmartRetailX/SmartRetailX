import struct
from google.cloud import speech_v1p1beta1 as speech
from google.api_core.client_options import ClientOptions
from app.core.config import settings

def get_speech_client() -> speech.SpeechAsyncClient:
    """Initialize and return the Google Cloud SpeechAsyncClient mapped to the environment variable priorities."""
    if settings.GOOGLE_API_KEY:
        return speech.SpeechAsyncClient(
            client_options=ClientOptions(api_key=settings.GOOGLE_API_KEY)
        )
    # Automatically falls back to ADC or GOOGLE_APPLICATION_CREDENTIALS
    return speech.SpeechAsyncClient()

def get_recognition_config() -> speech.RecognitionConfig:
    """Return the recognition configuration specifically tuned for Sinhala/English."""
    speech_context = speech.SpeechContext(
        phrases=settings.STT_BOOSTED_PHRASES,
        boost=settings.STT_PHRASE_BOOST
    )
    
    return speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=settings.STT_SAMPLE_RATE,
        language_code=settings.STT_LANGUAGE_CODE,
        alternative_language_codes=settings.STT_ALTERNATIVE_LANGUAGES,
        enable_automatic_punctuation=False,
        speech_contexts=[speech_context],
        use_enhanced=True,
    )

def get_streaming_config() -> speech.StreamingRecognitionConfig:
    """Return the streaming configuration for interim results."""
    return speech.StreamingRecognitionConfig(
        config=get_recognition_config(),
        interim_results=True,
    )

def calculate_amplitude(audio_data: bytes) -> int:
    """Calculate the maximum amplitude for a given audio chunk to mathematically verify mic health."""
    if not audio_data:
        return 0
    samples = struct.unpack(f"<{len(audio_data)//2}h", audio_data)
    return max(abs(s) for s in samples) if samples else 0
