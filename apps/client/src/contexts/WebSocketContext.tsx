import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface WebSocketContextType {
  socket: Socket | null;
  connected: boolean;
  lastEvent: { name: string; data: any; time: Date } | null;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  connected: false,
  lastEvent: null,
});

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<{ name: string; data: any; time: Date } | null>(null);

  useEffect(() => {
    // Determine the WS URL (fallback to 3004 where we ran the service)
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3004';
    
    // Only connect if we have a user, or whenever you want anonymous sockets too
    // For now we'll pass the userId so the backend can link it
    const newSocket = io(wsUrl, {
      query: user ? { userId: user.id } : {},
      transports: ['websocket'],
      autoConnect: true,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('WS Connected to:', wsUrl);
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('WS Disconnected');
      setConnected(false);
    });

    // Listen to ALL events generically for debug context
    // In production, components should register their own specific listeners via hook
    newSocket.onAny((eventName, ...args) => {
      console.log(`WS Event: [${eventName}]`, args);
      setLastEvent({
        name: eventName,
        data: args.length === 1 ? args[0] : args,
        time: new Date(),
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  return (
    <WebSocketContext.Provider value={{ socket, connected, lastEvent }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
