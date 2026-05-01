from fastapi import APIRouter
from app.api.endpoints import http, websocket

api_router = APIRouter()
api_router.include_router(websocket.router, tags=["websockets"])
api_router.include_router(http.router, prefix="/api/v1/stt", tags=["http"])
