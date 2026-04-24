import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

type ConnectionStats = {
  connectedClients: number;
  connectedUsers: number;
  rooms: string[];
};

@WebSocketGateway({
  cors: {
    origin: '*', // Modify as per security requirements (e.g., configService.corsOrigin)
  },
})
export class AppWebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppWebSocketGateway.name);
  private readonly userSockets = new Map<string, Set<string>>();

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

  private getUserId(client: Socket): string | null {
    const candidate = client.handshake.auth.userId ?? client.handshake.query.userId;

    if (typeof candidate !== 'string') {
      return null;
    }

    const normalized = candidate.trim();
    return normalized.length > 0 ? normalized : null;
  }
}
