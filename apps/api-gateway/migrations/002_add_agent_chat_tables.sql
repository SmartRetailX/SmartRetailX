-- Persistent agent chat storage
-- One chat session per user, with transcript-first messages for text and voice

CREATE TABLE IF NOT EXISTS "agent_chat_session" (
    "id" TEXT PRIMARY KEY,
    "user_id" TEXT NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
    "agent_session_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "last_message_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "agent_chat_message" (
    "id" TEXT PRIMARY KEY,
    "chat_session_id" TEXT NOT NULL REFERENCES "agent_chat_session"("id") ON DELETE CASCADE,
    "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "role" TEXT NOT NULL CHECK ("role" IN ('user', 'assistant')),
    "channel" TEXT NOT NULL CHECK ("channel" IN ('text', 'voice')),
    "content" TEXT NOT NULL,
    "transcription" TEXT,
    "language" TEXT NOT NULL DEFAULT 'auto',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_agent_chat_message_session_created"
ON "agent_chat_message" ("chat_session_id", "created_at");

CREATE INDEX IF NOT EXISTS "idx_agent_chat_message_user_created"
ON "agent_chat_message" ("user_id", "created_at");
