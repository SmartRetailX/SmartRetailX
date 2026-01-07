import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { QueryLog } from '@/types/voice-assistant';

import { QueryLogItem } from './query-log-item';

interface QueryLogsCardProps {
  logs: QueryLog[];
  onClear: () => void;
  onCopy: (text: string) => void;
}

export function QueryLogsCard({ logs, onClear, onCopy }: QueryLogsCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Query Logs</CardTitle>
            <CardDescription>History of all queries and responses</CardDescription>
          </div>
          <Button onClick={onClear} size="sm" variant="outline" disabled={logs.length === 0}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No queries yet. Send a text or voice query to see logs.
            </div>
          ) : (
            logs.map((log) => <QueryLogItem key={log.id} log={log} onCopy={onCopy} />)
          )}
        </div>
      </CardContent>
    </Card>
  );
}
