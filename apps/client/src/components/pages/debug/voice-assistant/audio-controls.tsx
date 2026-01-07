import { Play, Trash2, VolumeX } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface AudioControlsProps {
  audioBlob: Blob;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  onClear: () => void;
  onSend: () => void;
  isSending: boolean;
}

export function AudioControls({
  audioBlob,
  isPlaying,
  onPlay,
  onStop,
  onClear,
  onSend,
  isSending,
}: AudioControlsProps) {
  return (
    <>
      <Separator />

      <div className="space-y-2">
        <div className="text-sm font-medium">
          Recorded Audio ({(audioBlob.size / 1024).toFixed(2)} KB)
        </div>

        <div className="flex gap-2">
          {!isPlaying ? (
            <Button onClick={onPlay} size="sm" variant="outline" className="flex-1">
              <Play className="mr-2 h-4 w-4" />
              Play
            </Button>
          ) : (
            <Button onClick={onStop} size="sm" variant="outline" className="flex-1">
              <VolumeX className="mr-2 h-4 w-4" />
              Stop
            </Button>
          )}

          <Button onClick={onClear} size="sm" variant="outline" className="flex-1">
            <Trash2 className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>

        <Button onClick={onSend} disabled={isSending} className="w-full">
          {isSending ? 'Processing...' : 'Send Voice Query'}
        </Button>
      </div>
    </>
  );
}
