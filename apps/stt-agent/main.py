import uvicorn
from app.core.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.STT_AGENT_HOST,
        port=settings.STT_AGENT_PORT,
        reload=True,
    )
