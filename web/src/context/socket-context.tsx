import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';

import { disconnectSocket, getSocket, initiateSocket } from '@/utils/socket';

const SocketContext = createContext<Socket | null>(null);

/**
 * SocketProvider
 *
 * Manages WebSocket connection with automatic cookie-based authentication.
 * Better Auth bearer token is sent with the handshake request
 */
export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('bearer_token');

    if (!token) return;

    // Initialize socket connection with bearer token from local storage
    try {
      initiateSocket(token);
    } catch (error) {
      console.error('Error initiating socket:', error);
      return;
    }

    const sock = getSocket();

    // Wait for socket to connect before setting state
    sock.on('connect', () => {
      setSocket(sock);
    });

    sock.on('disconnect', () => {
      setSocket(null);
    });

    sock.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // If already connected, set immediately
    if (sock.connected) {
      setSocket(sock);
    }

    return () => {
      disconnectSocket();
    };
  }, []); // No dependencies needed - connects once on mount

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const socket = useContext(SocketContext);
  return socket;
};
