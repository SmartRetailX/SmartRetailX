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
  private static readonly MAX_MESSAGE_LENGTH = 2000;

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    const userId = this.getUserId(client);

    if (userId) {
      const userConnections = this.userSockets.get(userId) ?? new Set<string>();
      userConnections.add(client.id);
      this.userSockets.set(userId, userConnections);
      this.logger.log(`User ${userId} associated with client ${client.id}`);
      client.join(`user-${userId}`);
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
      }
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

  /**
   * Broadcast an event to all connected clients
   */
  broadcastToAll(event: string, payload: unknown) {
    this.server.emit(event, payload);
  }

  /**
   * Broadcast an event to a specific user
   */
  sendToUser(userId: string, event: string, payload: unknown) {
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

    // Broadcast to room participants except sender socket.
    client.to(this.chatRoomName(roomId)).emit('chat:typing', typingEvent);
    // Also sync other devices of the same account (mobile/web signed in as same user).
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

    // Broadcast to room participants.
    this.server.to(this.chatRoomName(roomId)).emit('chat:message', message);
    // Also sync all sockets for the same user account across devices.
    this.server.to(`user-${userId}`).emit('chat:message', message);
    return { ok: true, data: message };
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

    return { ok: true, data: { userId } };
  }

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
