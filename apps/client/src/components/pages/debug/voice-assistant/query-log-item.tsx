import { Copy, Mic } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { QueryLog } from '@/types/voice-assistant';

interface QueryLogItemProps {
  log: QueryLog;
  onCopy: (text: string) => void;
}

export function QueryLogItem({ log, onCopy }: QueryLogItemProps) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={log.method === 'voice' ? 'default' : 'secondary'}>
            {log.method === 'voice' ? <Mic className="mr-1 h-3 w-3" /> : null}
            {log.method}
          </Badge>
          <Badge variant="outline">{log.language}</Badge>
          <span className="text-xs text-muted-foreground">
            {log.timestamp.toLocaleTimeString()}
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onCopy(`Query: ${log.query}\nResponse: ${log.response}`)}
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase text-muted-foreground">Query:</div>
        <div className="text-sm mt-1">{log.query}</div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase text-muted-foreground">Response:</div>
        <div className="text-sm mt-1">{log.response}</div>
      </div>

      {(log.confidence || log.detectedLanguage || log.duration) && (
        <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
          {log.confidence && <div>Confidence: {(log.confidence * 100).toFixed(1)}%</div>}
          {log.detectedLanguage && <div>Detected: {log.detectedLanguage}</div>}
          {log.duration && <div>Duration: {log.duration.toFixed(2)}s</div>}
        </div>
      )}
    </div>
  );
}
