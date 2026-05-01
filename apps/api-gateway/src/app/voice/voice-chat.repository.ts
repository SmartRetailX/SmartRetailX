import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@smart-retail-x/config';
import { randomUUID } from 'crypto';
import { Pool, type PoolClient } from 'pg';

import {
  type VoiceChatInputMode,
  type VoiceChatSessionDto,
  type VoiceChatStoredMessage,
  type VoiceLanguageCode,
} from '@smart-retail-x/shared-types';

type VoiceChatSessionRow = {
  id: string;
  user_id: string;
  agent_session_id: string;
  created_at: Date;
  updated_at: Date;
  last_message_at: Date | null;
};

type VoiceChatMessageRow = {
  id: string;
  role: 'user' | 'assistant';
  channel: VoiceChatInputMode;
  content: string;
  transcription: string | null;
  language: VoiceLanguageCode;
  created_at: Date;
};

@Injectable()
export class VoiceChatRepository implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VoiceChatRepository.name);
  private readonly pool: Pool;
  private readonly coreSchemaName = 'core';
  private userTableRef = '"user"';
  private sessionTableRef = '"core"."agent_chat_session"';
  private messageTableRef = '"core"."agent_chat_message"';
  private persistenceEnabled = true;

  constructor(private readonly configService: ConfigService) {
    this.pool = new Pool({
      connectionString: this.configService.databaseUrl,
      min: this.configService.databasePoolMin,
      max: this.configService.databasePoolMax,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      keepAlive: true,
    });

    this.pool.on('error', (error) => {
      this.logger.error(`PostgreSQL pool error: ${error.message}`);
    });
  }

  async onModuleInit(): Promise<void> {
    await this.resolveTableRefs();
    await this.ensureSchemaIfPossible();
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async getOrCreateSession(userId: string): Promise<VoiceChatSessionDto> {
    if (!this.persistenceEnabled) {
      return this.buildEphemeralSession(userId);
    }

    const created = await this.pool.query<VoiceChatSessionRow>(
      `
      INSERT INTO ${this.sessionTableRef} ("id", "user_id", "agent_session_id")
      VALUES ($1, $2, $3)
      ON CONFLICT ("user_id")
      DO UPDATE SET "updated_at" = NOW()
      RETURNING "id", "user_id", "agent_session_id", "created_at", "updated_at", "last_message_at"
      `,
      [randomUUID(), userId, `agent-${userId}`],
    );

    const session = created.rows[0];
    return {
      id: session.id,
      userId: session.user_id,
      agentSessionId: session.agent_session_id,
      createdAt: session.created_at.toISOString(),
      updatedAt: session.updated_at.toISOString(),
      lastMessageAt: session.last_message_at?.toISOString() ?? null,
      messages: [],
    };
  }

  async getSessionWithMessages(userId: string, limit = 100): Promise<VoiceChatSessionDto> {
    if (!this.persistenceEnabled) {
      return this.buildEphemeralSession(userId);
    }

    const session = await this.getOrCreateSession(userId);
    const max = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 200)) : 100;

    const query = await this.pool.query<VoiceChatMessageRow>(
      `
      SELECT "id", "role", "channel", "content", "transcription", "language", "created_at"
      FROM ${this.messageTableRef}
      WHERE "chat_session_id" = $1
      ORDER BY "created_at" ASC
      LIMIT $2
      `,
      [session.id, max],
    );

    session.messages = query.rows.map((row) => this.toMessageDto(row));
    return session;
  }

  async appendExchange(params: {
    userId: string;
    channel: VoiceChatInputMode;
    language: VoiceLanguageCode;
    userText: string;
    assistantText: string;
    transcription?: string;
  }): Promise<void> {
    if (!this.persistenceEnabled) {
      return;
    }

    const session = await this.getOrCreateSession(params.userId);
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      if (params.userText.trim()) {
        await this.insertMessage(client, {
          sessionId: session.id,
          userId: params.userId,
          role: 'user',
          channel: params.channel,
          content: params.userText.trim(),
          transcription: params.channel === 'voice' ? (params.transcription ?? params.userText).trim() : null,
          language: params.language,
        });
      }

      if (params.assistantText.trim()) {
        await this.insertMessage(client, {
          sessionId: session.id,
          userId: params.userId,
          role: 'assistant',
          channel: params.channel,
          content: params.assistantText.trim(),
          transcription: null,
          language: params.language,
        });
      }

      await client.query(
        `
        UPDATE ${this.sessionTableRef}
        SET "updated_at" = NOW(), "last_message_at" = NOW()
        WHERE "id" = $1
        `,
        [session.id],
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async insertMessage(
    client: PoolClient,
    params: {
      sessionId: string;
      userId: string;
      role: 'user' | 'assistant';
      channel: VoiceChatInputMode;
      content: string;
      transcription: string | null;
      language: VoiceLanguageCode;
    },
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO ${this.messageTableRef} (
        "id",
        "chat_session_id",
        "user_id",
        "role",
        "channel",
        "content",
        "transcription",
        "language"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        randomUUID(),
        params.sessionId,
        params.userId,
        params.role,
        params.channel,
        params.content,
        params.transcription,
        params.language,
      ],
    );
  }

  private toMessageDto(row: VoiceChatMessageRow): VoiceChatStoredMessage {
    return {
      id: row.id,
      role: row.role,
      channel: row.channel,
      content: row.content,
      transcription: row.transcription,
      language: row.language,
      createdAt: row.created_at.toISOString(),
    };
  }

  private buildEphemeralSession(userId: string): VoiceChatSessionDto {
    return {
      id: `ephemeral-${userId}`,
      userId,
      agentSessionId: `agent-${userId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageAt: null,
      messages: [],
    };
  }

  private async resolveTableRefs(): Promise<void> {
    const userTableSchema = await this.detectExistingSchema('user', ['auth', 'public']);

    this.userTableRef = this.qualifyTable(userTableSchema, 'user');
    this.sessionTableRef = this.qualifyTable(this.coreSchemaName, 'agent_chat_session');
    this.messageTableRef = this.qualifyTable(this.coreSchemaName, 'agent_chat_message');

    this.logger.log(
      `Voice chat tables resolved: user=${this.userTableRef}, session=${this.sessionTableRef}, message=${this.messageTableRef}`,
    );
  }

  private async detectExistingSchema(tableName: string, schemaPreference: string[]): Promise<string | null> {
    const schemaListSql = schemaPreference.map((_, index) => `$${index + 2}`).join(', ');
    const orderingSql = schemaPreference
      .map((schema, index) => `WHEN '${schema}' THEN ${index}`)
      .join(' ');
    const result = await this.pool.query<{ schema_name: string }>(
      `
      SELECT table_schema AS schema_name
      FROM information_schema.tables
      WHERE table_name = $1 AND table_schema IN (${schemaListSql})
      ORDER BY CASE table_schema ${orderingSql} ELSE 999 END
      LIMIT 1
      `,
      [tableName, ...schemaPreference],
    );

    return result.rows[0]?.schema_name ?? null;
  }

  private qualifyTable(schemaName: string | null, tableName: string): string {
    return schemaName && schemaName !== 'public' ? `"${schemaName}"."${tableName}"` : `"${tableName}"`;
  }

  private async ensureSchemaIfPossible(): Promise<void> {
    if (!(await this.hasUserTable())) {
      this.persistenceEnabled = false;
      this.logger.warn(
        'Voice chat persistence disabled because the Better Auth user table is missing in the current database.',
      );
      return;
    }

    this.persistenceEnabled = true;
    await this.ensureSchema();
  }

  private async hasUserTable(): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'user'
          AND table_schema IN ('auth', 'public')
      ) AS exists
      `,
    );

    return Boolean(result.rows[0]?.exists);
  }

  private async ensureSchema(): Promise<void> {
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS "${this.coreSchemaName}";`);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.sessionTableRef} (
        "id" TEXT PRIMARY KEY,
        "user_id" TEXT NOT NULL UNIQUE REFERENCES ${this.userTableRef}("id") ON DELETE CASCADE,
        "agent_session_id" TEXT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "last_message_at" TIMESTAMPTZ
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.messageTableRef} (
        "id" TEXT PRIMARY KEY,
        "chat_session_id" TEXT NOT NULL REFERENCES ${this.sessionTableRef}("id") ON DELETE CASCADE,
        "user_id" TEXT NOT NULL REFERENCES ${this.userTableRef}("id") ON DELETE CASCADE,
        "role" TEXT NOT NULL CHECK ("role" IN ('user', 'assistant')),
        "channel" TEXT NOT NULL CHECK ("channel" IN ('text', 'voice')),
        "content" TEXT NOT NULL,
        "transcription" TEXT,
        "language" TEXT NOT NULL DEFAULT 'auto',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS "idx_agent_chat_message_session_created"
      ON ${this.messageTableRef} ("chat_session_id", "created_at");
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS "idx_agent_chat_message_user_created"
      ON ${this.messageTableRef} ("user_id", "created_at");
    `);
  }
}
