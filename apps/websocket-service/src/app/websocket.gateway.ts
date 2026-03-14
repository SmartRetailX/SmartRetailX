import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

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

  // Maintain a map of user connections if needed
  private userSockets: Map<string, string[]> = new Map();

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
    
    // In a real implementation, you would extract the user ID from the JWT token
    // client.handshake.headers.authorization or client.handshake.auth.token
    const userId = client.handshake.query.userId as string;
    
    if (userId) {
      const userConnections = this.userSockets.get(userId) || [];
      userConnections.push(client.id);
      this.userSockets.set(userId, userConnections);
      this.logger.log(`User ${userId} associated with client ${client.id}`);
      
      // Optionally join a user-specific room for easier broadcasting
      client.join(`user-${userId}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    const userId = client.handshake.query.userId as string;
    if (userId) {
      const userConnections = this.userSockets.get(userId) || [];
      const updatedConnections = userConnections.filter(id => id !== client.id);
      
      if (updatedConnections.length > 0) {
        this.userSockets.set(userId, updatedConnections);
      } else {
        this.userSockets.delete(userId);
      }
    }
  }

  /**
   * Broadcast an event to all connected clients
   */
  broadcastToAll(event: string, payload: any) {
    this.server.emit(event, payload);
  }

  /**
   * Broadcast an event to a specific user
   */
  sendToUser(userId: string, event: string, payload: any) {
    this.server.to(`user-${userId}`).emit(event, payload);
  }
}
