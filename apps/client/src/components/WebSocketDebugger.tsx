import { useState } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, Send, MessageSquare } from 'lucide-react';

export default function WebSocketDebugger() {
  const { connected, lastEvent, socket } = useWebSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [testMessage, setTestMessage] = useState('');

  const sendTestMessage = () => {
    if (socket && connected) {
      // Typically, direct events back to the WS gateway aren't broadcasting to rabbitmq automatically
      // But standard nestjs @SubscribeMessage('test_event') would catch this.
      socket.emit('test_event', { message: testMessage, timestamp: new Date() });
      setTestMessage('');
    }
  };

  if (!import.meta.env.DEV) {
    // Hide in production
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {!isOpen ? (
        <Button 
          variant="outline" 
          size="icon" 
          className={`rounded-full shadow-lg ${connected ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'}`}
          onClick={() => setIsOpen(true)}
        >
          {connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        </Button>
      ) : (
        <div className="w-80 rounded-lg border border-border bg-background p-4 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="h-4 w-4" />
              WS Debugger
            </h3>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <button 
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setIsOpen(false)}
              >
                &times;
              </button>
            </div>
          </div>
          
          <div className="mb-4 text-xs">
            <p className="mb-1 text-muted-foreground">Last Received Event:</p>
            {lastEvent ? (
              <div className="rounded bg-muted p-2 font-mono">
                <div className="font-bold text-primary">{lastEvent.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {lastEvent.time.toLocaleTimeString()}
                </div>
                <pre className="mt-1 max-h-32 overflow-auto text-[10px]">
                  {JSON.stringify(lastEvent.data, null, 2)}
                </pre>
              </div>
            ) : (
               <div className="italic text-muted-foreground">No events received yet</div>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Send test message..."
              className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary"
              onKeyDown={(e) => e.key === 'Enter' && sendTestMessage()}
            />
            <Button size="icon" className="h-7 w-7" onClick={sendTestMessage} disabled={!connected || !testMessage}>
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
