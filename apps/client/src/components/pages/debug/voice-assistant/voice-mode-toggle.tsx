import { Button } from '@/components/ui/button';

interface VoiceModeToggleProps {
  useClientSideSTT: boolean;
  onToggle: () => void;
}

export function VoiceModeToggle({ useClientSideSTT, onToggle }: VoiceModeToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant={useClientSideSTT ? 'default' : 'outline'} onClick={onToggle}>
        {useClientSideSTT ? 'Client-Side STT' : 'Server-Side STT'}
      </Button>
      <span className="text-xs text-muted-foreground">
        {useClientSideSTT ? 'Using browser Web Speech API' : 'Using AssemblyAI (server)'}
      </span>
    </div>
  );
}
