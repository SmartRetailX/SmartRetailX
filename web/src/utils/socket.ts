import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Initialize WebSocket connection with automatic cookie-based authentication
 * Better Auth bearer token is sent with the handshake request
 */
export const initiateSocket = (token: string) => {
  if (!socket) {
    socket = io(import.meta.env.PUBLIC_WS_URL, {
      auth: { token },
      transports: ['websocket'], // recommended
    });
  }
};

export const getSocket = () => {
  if (!socket) {
    throw new Error('Socket not initialized');
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
