import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { randomUUID } from 'crypto';
import { Server, Socket } from 'socket.io';

type ConnectionStats = {
  connectedClients: number;
  connectedUsers: number;
  rooms: string[];
};

type ChatSendPayload = {
  roomId: string;
  text: string;
  clientMessageId?: string;
};

type ChatTypingPayload = {
  roomId: string;
  isTyping: boolean;
};

type ChatRoomPayload = {
  roomId: string;
};

type IdentifyPayload = {
  userId: string;
};

type VoiceSendPayload = {
  channel: 'text' | 'voice';
  text?: string;
  audioBase64?: string;
  mimeType?: string;
  language?: string;
  userRole?: string;
};

type VoiceStatusPayload = {
  userId: string;
  requestId: string;
  channel: string;
  sessionId?: string;
  phase: string;
  message: string;
  active: boolean;
  transcription?: string;
  intent?: string;
  error?: string;
  updatedAt: string;
};

type VoiceAccessPayload = {
  userId: string;
  hasMultipleAccess: boolean;
  connectionCount: number;
  isInputLocked: boolean;
  updatedAt: string;
};

type VoiceTypingPayload = {
  isActive: boolean;
};

type GatewayAck =
  | { ok: true; data?: unknown }
  | { ok: false; error: { code: string; message: string } };

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket'],
})
export class AppWebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppWebSocketGateway.name);
  private readonly userSockets = new Map<string, Set<string>>();
  private readonly latestVoiceStatusByUser = new Map<string, VoiceStatusPayload>();
  private readonly activeRequestsByUser = new Map<string, string>();
  private readonly inputLockedByUser = new Map<string, boolean>();
  private static readonly MAX_MESSAGE_LENGTH = 2000;
  private static readonly MAX_AUDIO_BASE64_LENGTH = 15 * 1024 * 1024;
  private static readonly VOICE_STATUS_REPLAY_TTL_MS = 5 * 60 * 1000;
  private static readonly LOG_VALUE_MAX_LENGTH = 200;

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.attachSocketRequestLogging(client);

    const userId = this.getUserId(client);

    if (userId) {
      const userConnections = this.userSockets.get(userId) ?? new Set<string>();
      userConnections.add(client.id);
      this.userSockets.set(userId, userConnections);
      this.logger.log(`User ${userId} associated with client ${client.id}`);
      client.join(`user-${userId}`);
      this.replayVoiceStatus(client, userId);
      this.emitVoiceAccessState(userId);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    const userId = this.getUserId(client);
    if (userId) {
      const userConnections = this.userSockets.get(userId) ?? new Set<string>();
      userConnections.delete(client.id);

      if (userConnections.size > 0) {
        this.userSockets.set(userId, userConnections);
      } else {
        this.userSockets.delete(userId);
        this.inputLockedByUser.delete(userId);
        this.activeRequestsByUser.delete(userId);
      }
      this.emitVoiceAccessState(userId);
    }
  }

  getConnectionStats(): ConnectionStats {
    const socketIds = new Set(this.server?.sockets?.sockets?.keys?.() ?? []);
    const roomKeys = Array.from(this.server?.sockets?.adapter?.rooms?.keys?.() ?? []);

    return {
      connectedClients: this.server?.sockets?.sockets?.size ?? 0,
      connectedUsers: this.userSockets.size,
      rooms: roomKeys.filter((room) => !socketIds.has(room)),
    };
  }

  broadcastToAll(event: string, payload: unknown) {
    this.logger.log(
      `[ws:out:broadcast] event=${event} payload=${this.stringifyForLog(
        this.summarizePayload(payload),
      )}`,
    );
    this.server.emit(event, payload);
  }

  sendToUser(userId: string, event: string, payload: unknown) {
    if (event === 'voice:status') {
      this.rememberVoiceStatus(userId, payload);
    }
    this.logger.log(
      `[ws:out:user] userId=${userId} event=${event} payload=${this.stringifyForLog(
        this.summarizePayload(payload),
      )}`,
    );
    this.server.to(`user-${userId}`).emit(event, payload);
  }

  @SubscribeMessage('chat:join')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChatRoomPayload
  ): GatewayAck {
    const userId = this.getUserId(client);
    if (!userId) {
      return this.errorAck('UNAUTHORIZED', 'User is not authenticated for chat.');
    }

    const roomId = this.normalizeRoomId(payload?.roomId);
    if (!roomId) {
      return this.errorAck('VALIDATION_ERROR', 'roomId is required.');
    }

    client.join(this.chatRoomName(roomId));
    this.server.to(this.chatRoomName(roomId)).emit('chat:presence', {
      roomId,
      userId,
      status: 'joined',
      at: new Date().toISOString(),
    });

    return { ok: true, data: { roomId } };
  }

  @SubscribeMessage('chat:leave')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChatRoomPayload
  ): GatewayAck {
    const userId = this.getUserId(client);
    if (!userId) {
      return this.errorAck('UNAUTHORIZED', 'User is not authenticated for chat.');
    }

    const roomId = this.normalizeRoomId(payload?.roomId);
    if (!roomId) {
      return this.errorAck('VALIDATION_ERROR', 'roomId is required.');
    }

    client.leave(this.chatRoomName(roomId));
    this.server.to(this.chatRoomName(roomId)).emit('chat:presence', {
      roomId,
      userId,
      status: 'left',
      at: new Date().toISOString(),
    });

    return { ok: true, data: { roomId } };
  }

  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChatTypingPayload
  ): GatewayAck {
    const userId = this.getUserId(client);
    if (!userId) {
      return this.errorAck('UNAUTHORIZED', 'User is not authenticated for chat.');
    }

    const roomId = this.normalizeRoomId(payload?.roomId);
    if (!roomId) {
      return this.errorAck('VALIDATION_ERROR', 'roomId is required.');
    }

    const isTyping = Boolean(payload?.isTyping);
    const typingEvent = {
      roomId,
      userId,
      isTyping,
      at: new Date().toISOString(),
    };

    client.to(this.chatRoomName(roomId)).emit('chat:typing', typingEvent);
    client.to(`user-${userId}`).emit('chat:typing', typingEvent);

    return { ok: true };
  }

  @SubscribeMessage('chat:send')
  handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChatSendPayload
  ): GatewayAck {
    const userId = this.getUserId(client);
    if (!userId) {
      return this.errorAck('UNAUTHORIZED', 'User is not authenticated for chat.');
    }

    const roomId = this.normalizeRoomId(payload?.roomId);
    if (!roomId) {
      return this.errorAck('VALIDATION_ERROR', 'roomId is required.');
    }

    const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
    if (!text) {
      return this.errorAck('VALIDATION_ERROR', 'text is required.');
    }
    if (text.length > AppWebSocketGateway.MAX_MESSAGE_LENGTH) {
      return this.errorAck(
        'VALIDATION_ERROR',
        `text exceeds max length of ${AppWebSocketGateway.MAX_MESSAGE_LENGTH}.`
      );
    }

    const message = {
      id: payload.clientMessageId?.trim() || `${Date.now()}-${client.id}`,
      roomId,
      userId,
      text,
      createdAt: new Date().toISOString(),
    };

    this.server.to(this.chatRoomName(roomId)).emit('chat:message', message);
    this.server.to(`user-${userId}`).emit('chat:message', message);
    return { ok: true, data: message };
  }

  @SubscribeMessage('voice:typing')
  handleVoiceTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: VoiceTypingPayload,
  ): GatewayAck {
    const userId = this.getUserId(client);
    if (!userId) {
      return this.errorAck('UNAUTHORIZED', 'User is not authenticated.');
    }

    const isActive = Boolean(payload?.isActive);
    this.inputLockedByUser.set(userId, isActive);
    this.emitVoiceAccessState(userId);
    return { ok: true };
  }

  @SubscribeMessage('voice:send')
  async handleVoiceSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: VoiceSendPayload
  ): Promise<GatewayAck> {
    const userId = this.getUserId(client);
    if (!userId) {
      return this.errorAck('UNAUTHORIZED', 'User is not authenticated for voice chat.');
    }

    const channel = payload?.channel === 'voice' ? 'voice' : 'text';
    const language = typeof payload?.language === 'string' && payload.language.trim()
      ? payload.language.trim()
      : 'si-LK';
    const userRole = typeof payload?.userRole === 'string' && payload.userRole.trim()
      ? payload.userRole.trim()
      : 'user';

    // Reject concurrent requests from the same user
    const existingRequestId = this.activeRequestsByUser.get(userId);
    if (existingRequestId) {
      this.sendVoiceStatus(userId, {
        requestId: existingRequestId,
        channel,
        phase: 'busy',
        message: 'Voice assistant is busy. Please wait for the current request to finish.',
        active: true,
      });
      return this.errorAck('VOICE_BUSY', 'Another voice request is already processing.');
    }

    const requestId = randomUUID();
    this.activeRequestsByUser.set(userId, requestId);
    this.inputLockedByUser.set(userId, true);
    this.emitVoiceAccessState(userId);

    try {
      this.sendVoiceStatus(userId, {
        requestId,
        channel,
        phase: 'received',
        message: channel === 'voice' ? 'Voice received. Preparing audio.' : 'Message received.',
        active: true,
      });

      // Build FormData for agent service
      const { formData, transcriptText } = channel === 'voice'
        ? this.buildAudioFormData(payload, language, userRole, userId)
        : this.buildTextFormData(payload, language, userRole, userId);

      this.sendVoiceStatus(userId, {
        requestId,
        channel,
        phase: channel === 'voice' ? 'transcribing' : 'intent_detection',
        message: channel === 'voice' ? 'Transcribing speech.' : 'Identifying intent.',
        active: true,
        transcription: transcriptText,
      });

      const agentResult = await this.callAgentService(formData);
      const agentTranscription = typeof agentResult.transcription === 'string' ? agentResult.transcription : undefined;
      const agentIntent = typeof agentResult.intent === 'string' ? agentResult.intent : undefined;
      const agentResponse = typeof agentResult.response === 'string' ? agentResult.response : '';

      this.sendVoiceStatus(userId, {
        requestId,
        channel,
        phase: 'intent_detection',
        message: 'Intent identified. Resolving response.',
        active: true,
        transcription: agentTranscription || transcriptText,
        intent: agentIntent,
      });

      this.sendVoiceStatus(userId, {
        requestId,
        channel,
        phase: 'resolving',
        message: 'Resolving the answer from retail data.',
        active: true,
        transcription: agentTranscription || transcriptText,
        intent: agentIntent,
      });

      this.sendVoiceStatus(userId, {
        requestId,
        channel,
        phase: 'responding',
        message: 'Generating the final response.',
        active: true,
        transcription: agentTranscription || transcriptText,
        intent: agentIntent,
      });

      // Persist to DB via API Gateway
      await this.saveExchangeToDb(client, {
        channel,
        language,
        userText: agentTranscription || transcriptText || '',
        assistantText: agentResponse,
        transcription: agentTranscription,
      });

      this.sendVoiceStatus(userId, {
        requestId,
        channel,
        phase: 'completed',
        message: 'Response ready.',
        active: false,
        transcription: agentTranscription || transcriptText,
        intent: agentIntent,
      });

      const response = { ...agentResult, requestId };
      this.server.to(`user-${userId}`).emit('voice:response', response);
      return { ok: true, data: response };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Voice request failed.';
      this.logger.error(`Voice processing failed for userId=${userId}: ${message}`);

      this.sendVoiceStatus(userId, {
        requestId,
        channel,
        phase: 'failed',
        message: 'Voice assistant failed. Please try again.',
        active: false,
        error: message,
      });

      this.server.to(`user-${userId}`).emit('voice:error', {
        message,
        at: new Date().toISOString(),
      });
      return this.errorAck('VOICE_REQUEST_FAILED', message);
    } finally {
      this.activeRequestsByUser.delete(userId);
      this.inputLockedByUser.set(userId, false);
      this.emitVoiceAccessState(userId);
    }
  }

  @SubscribeMessage('chat:identify')
  handleIdentify(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: IdentifyPayload
  ): GatewayAck {
    const roomUserId = this.getUserId(client);
    const bodyUserId = this.normalizeRoomId(payload?.userId);
    const userId = roomUserId ?? bodyUserId;

    if (!userId) {
      return this.errorAck('UNAUTHORIZED', 'userId is required for identification.');
    }

    const userConnections = this.userSockets.get(userId) ?? new Set<string>();
    userConnections.add(client.id);
    this.userSockets.set(userId, userConnections);
    client.join(`user-${userId}`);
    this.replayVoiceStatus(client, userId);
    this.emitVoiceAccessState(userId);

    return { ok: true, data: { userId } };
  }

  // ─── Voice pipeline helpers ───────────────────────────────────────────────

  private buildAudioFormData(
    payload: VoiceSendPayload,
    language: string,
    userRole: string,
    userId: string,
  ): { formData: FormData; transcriptText: string } {
    const audioBase64 = typeof payload?.audioBase64 === 'string' ? payload.audioBase64.trim() : '';
    if (!audioBase64) {
      throw new Error('audioBase64 is required for voice channel.');
    }
    if (audioBase64.length > AppWebSocketGateway.MAX_AUDIO_BASE64_LENGTH) {
      throw new Error('audio payload is too large.');
    }

    const mimeType = this.resolveAudioMimeType(payload?.mimeType);
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    if (!audioBuffer.length) {
      throw new Error('audio payload is empty.');
    }

    const ext = this.audioExtensionFromMimeType(mimeType);
    const arrayBuffer = audioBuffer.buffer.slice(
      audioBuffer.byteOffset,
      audioBuffer.byteOffset + audioBuffer.byteLength,
    ) as ArrayBuffer;

    const formData = new FormData();
    formData.append('audio', new Blob([arrayBuffer], { type: mimeType }), `voice-${Date.now()}.${ext}`);
    formData.append('language', language);
    formData.append('userRole', userRole);
    formData.append('userId', userId);

    return { formData, transcriptText: '' };
  }

  private buildTextFormData(
    payload: VoiceSendPayload,
    language: string,
    userRole: string,
    userId: string,
  ): { formData: FormData; transcriptText: string } {
    const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
    if (!text) {
      throw new Error('text is required for text channel.');
    }
    if (text.length > AppWebSocketGateway.MAX_MESSAGE_LENGTH) {
      throw new Error(`text exceeds max length of ${AppWebSocketGateway.MAX_MESSAGE_LENGTH}.`);
    }

    const formData = new FormData();
    formData.append('transcriptText', text);
    formData.append('language', language);
    formData.append('userRole', userRole);
    formData.append('userId', userId);

    return { formData, transcriptText: text };
  }

  private async callAgentService(formData: FormData): Promise<Record<string, unknown>> {
    const agentUrl = (process.env.AGENT_HTTP_VOICE_URL || 'http://127.0.0.1:8010/api/v1/voice/chat')
      .trim()
      .replace(/\/$/, '');

    const response = await fetch(agentUrl, { method: 'POST', body: formData });
    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await response.json() : await response.text();

    if (!response.ok) {
      const message = typeof body === 'object' && body && 'message' in body
        ? String((body as { message?: unknown }).message)
        : `Agent service failed with status ${response.status}`;
      throw new Error(message);
    }

    return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  }

  private async saveExchangeToDb(
    client: Socket,
    params: {
      channel: string;
      language: string;
      userText: string;
      assistantText: string;
      transcription?: string;
    },
  ): Promise<void> {
    const saveUrl = (process.env.API_GATEWAY_VOICE_URL || 'http://127.0.0.1:3000/api/v1/voice')
      .trim()
      .replace(/\/$/, '');

    try {
      const response = await fetch(`${saveUrl}/chat/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.forwardAuthHeaders(client),
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        this.logger.warn(`Failed to save voice exchange to DB: status=${response.status}`);
      }
    } catch (error) {
      this.logger.warn(`Could not save voice exchange to DB: ${error instanceof Error ? error.message : error}`);
    }
  }

  private sendVoiceStatus(
    userId: string,
    params: {
      requestId: string;
      channel: string;
      phase: string;
      message: string;
      active: boolean;
      sessionId?: string;
      transcription?: string;
      intent?: string;
      error?: string;
    },
  ): void {
    const statusPayload: VoiceStatusPayload = {
      userId,
      requestId: params.requestId,
      channel: params.channel,
      sessionId: params.sessionId,
      phase: params.phase,
      message: params.message,
      active: params.active,
      transcription: params.transcription,
      intent: params.intent,
      error: params.error,
      updatedAt: new Date().toISOString(),
    };
    this.sendToUser(userId, 'voice:status', statusPayload);
  }

  // ─── Utility helpers ──────────────────────────────────────────────────────

  private getUserId(client: Socket): string | null {
    const auth = client.handshake.auth ?? {};
    const query = client.handshake.query ?? {};
    const headers = client.handshake.headers ?? {};
    const candidate =
      (typeof auth.userId === 'string' ? auth.userId : null) ??
      (typeof auth.user?.id === 'string' ? auth.user.id : null) ??
      (typeof auth.sub === 'string' ? auth.sub : null) ??
      (typeof query.userId === 'string' ? query.userId : null) ??
      (typeof query.user_id === 'string' ? query.user_id : null) ??
      (typeof headers['x-user-id'] === 'string' ? headers['x-user-id'] : null);

    if (typeof candidate !== 'string') {
      return null;
    }

    const normalized = candidate.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeRoomId(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private chatRoomName(roomId: string): string {
    return `chat-${roomId}`;
  }

  private attachSocketRequestLogging(client: Socket): void {
    client.onAny((event, ...args) => {
      const userId = this.getUserId(client) ?? 'anonymous';
      const payload = args.length > 0 ? args[0] : undefined;
      this.logger.log(
        `[ws:in] socketId=${client.id} userId=${userId} event=${event} payload=${this.stringifyForLog(
          this.summarizePayload(payload),
        )}`,
      );
    });
  }

  private summarizePayload(payload: unknown): unknown {
    if (payload == null) {
      return payload;
    }

    if (typeof payload === 'string') {
      return payload.length > AppWebSocketGateway.LOG_VALUE_MAX_LENGTH
        ? `${payload.slice(0, AppWebSocketGateway.LOG_VALUE_MAX_LENGTH)}...`
        : payload;
    }

    if (Array.isArray(payload)) {
      return payload.slice(0, 5).map((item) => this.summarizePayload(item));
    }

    if (typeof payload !== 'object') {
      return payload;
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (key === 'audioBase64' && typeof value === 'string') {
        result.audioBase64Length = value.length;
        continue;
      }

      if (typeof value === 'string') {
        result[key] =
          value.length > AppWebSocketGateway.LOG_VALUE_MAX_LENGTH
            ? `${value.slice(0, AppWebSocketGateway.LOG_VALUE_MAX_LENGTH)}...`
            : value;
        continue;
      }

      if (Array.isArray(value)) {
        result[key] = value.slice(0, 5).map((item) => this.summarizePayload(item));
        continue;
      }

      if (value && typeof value === 'object') {
        result[key] = this.summarizePayload(value);
        continue;
      }

      result[key] = value;
    }

    return result;
  }

  private stringifyForLog(value: unknown): string {
    try {
      return JSON.stringify(value);
    } catch {
      return '[unserializable-payload]';
    }
  }

  private forwardAuthHeaders(client: Socket): Record<string, string> {
    const headers: Record<string, string> = {};
    const cookie = client.handshake.headers.cookie;
    if (typeof cookie === 'string' && cookie.trim()) {
      headers.cookie = cookie;
    }

    const authorization = client.handshake.headers.authorization;
    if (typeof authorization === 'string' && authorization.trim()) {
      headers.authorization = authorization;
    }

    return headers;
  }

  private resolveAudioMimeType(mimeType: string | undefined): string {
    const normalized = (mimeType || '').split(';')[0].trim().toLowerCase();
    if (
      normalized === 'audio/webm' ||
      normalized === 'audio/ogg' ||
      normalized === 'audio/wav' ||
      normalized === 'audio/mpeg'
    ) {
      return normalized;
    }
    return 'audio/webm';
  }

  private audioExtensionFromMimeType(mimeType: string): string {
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('wav')) return 'wav';
    if (mimeType.includes('mpeg')) return 'mp3';
    return 'webm';
  }

  private rememberVoiceStatus(userId: string, payload: unknown): void {
    if (!payload || typeof payload !== 'object') {
      return;
    }

    const status = payload as Partial<VoiceStatusPayload>;
    const updatedAt = typeof status.updatedAt === 'string' ? status.updatedAt : new Date().toISOString();
    const resolvedStatus: VoiceStatusPayload = {
      userId,
      requestId: status.requestId ?? '',
      channel: status.channel ?? 'voice',
      sessionId: status.sessionId,
      phase: status.phase ?? 'idle',
      message: status.message ?? '',
      active: Boolean(status.active),
      transcription: status.transcription,
      intent: status.intent,
      error: status.error,
      updatedAt,
    };

    this.latestVoiceStatusByUser.set(userId, resolvedStatus);
    if (!resolvedStatus.active) {
      const cleanupTimer = setTimeout(() => {
        const latest = this.latestVoiceStatusByUser.get(userId);
        if (latest?.requestId === resolvedStatus.requestId && !latest.active) {
          this.latestVoiceStatusByUser.delete(userId);
        }
      }, 30_000);
      cleanupTimer.unref?.();
    }
  }

  private replayVoiceStatus(client: Socket, userId: string): void {
    const status = this.latestVoiceStatusByUser.get(userId);
    if (!status) {
      return;
    }

    const updatedAtTime = new Date(status.updatedAt).getTime();
    if (
      Number.isFinite(updatedAtTime) &&
      Date.now() - updatedAtTime > AppWebSocketGateway.VOICE_STATUS_REPLAY_TTL_MS
    ) {
      this.latestVoiceStatusByUser.delete(userId);
      return;
    }

    client.emit('voice:status', status);
  }

  private emitVoiceAccessState(userId: string): void {
    const connectionCount = this.userSockets.get(userId)?.size ?? 0;
    const payload: VoiceAccessPayload = {
      userId,
      hasMultipleAccess: connectionCount > 1,
      connectionCount,
      isInputLocked: this.inputLockedByUser.get(userId) ?? false,
      updatedAt: new Date().toISOString(),
    };

    this.logger.log(
      `[ws:out:user] userId=${userId} event=voice:access payload=${this.stringifyForLog(payload)}`,
    );
    this.server.to(`user-${userId}`).emit('voice:access', payload);
  }

  private errorAck(code: string, message: string): GatewayAck {
    return {
      ok: false,
      error: {
        code,
        message,
      },
    };
  }
}
