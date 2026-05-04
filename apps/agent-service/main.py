"""Backward-compatible entrypoint for uvicorn.

Nx currently serves this app with `uvicorn main:app` from `apps/agent-service`.
Keep this file thin and delegate implementation to `src/` package.
"""

from src.app import app

__all__ = ["app"]
