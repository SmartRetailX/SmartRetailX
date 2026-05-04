"""In-memory session store for multi-turn conversation context.

Keeps the last clarification state per session so that a short follow-up
like "milk" or "කිරිවල" can be resolved as the product the agent just asked
about, rather than triggering another "what product?" clarification.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any

_TTL_SECONDS = 300  # sessions expire after 5 minutes of inactivity
_MAX_SESSIONS = 2000


@dataclass
class SessionState:
    pending_intent: str | None = None
    pending_entities: dict[str, Any] = field(default_factory=dict)
    last_updated: float = field(default_factory=time.monotonic)

    def touch(self) -> None:
        self.last_updated = time.monotonic()

    def is_expired(self) -> bool:
        return (time.monotonic() - self.last_updated) > _TTL_SECONDS

    def set_clarification(self, intent: str, entities: dict[str, Any]) -> None:
        self.pending_intent = intent
        self.pending_entities = dict(entities)
        self.touch()

    def consume_clarification(self) -> tuple[str, dict[str, Any]] | None:
        if not self.pending_intent or self.is_expired():
            self.clear()
            return None
        intent = self.pending_intent
        entities = dict(self.pending_entities)
        self.clear()
        return intent, entities

    def clear(self) -> None:
        self.pending_intent = None
        self.pending_entities = {}


_store: dict[str, SessionState] = {}


def get_session(session_id: str) -> SessionState:
    _evict_expired()
    if session_id not in _store:
        if len(_store) >= _MAX_SESSIONS:
            _evict_oldest()
        _store[session_id] = SessionState()
    return _store[session_id]


def _evict_expired() -> None:
    expired = [k for k, v in _store.items() if v.is_expired()]
    for k in expired:
        del _store[k]


def _evict_oldest() -> None:
    if not _store:
        return
    oldest = min(_store, key=lambda k: _store[k].last_updated)
    del _store[oldest]
