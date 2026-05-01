from fastapi import APIRouter
from app.api.endpoints import websocket

api_router = APIRouter()
api_router.include_router(websocket.router, tags=["websockets"])
