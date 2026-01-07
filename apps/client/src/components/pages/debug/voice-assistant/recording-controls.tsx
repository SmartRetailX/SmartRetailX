import { Mic, Square } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface RecordingControlsProps {
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function RecordingControls({ isRecording, onStart, onStop }: RecordingControlsProps) {
  return (
    <div className="flex gap-2">
      {!isRecording ? (
        <Button onClick={onStart} className="flex-1" variant="default">
          <Mic className="mr-2 h-4 w-4" />
          Start Recording
        </Button>
      ) : (
        <Button onClick={onStop} className="flex-1" variant="destructive">
          <Square className="mr-2 h-4 w-4" />
          Stop Recording
        </Button>
      )}
    </div>
  );
}
