import { Mic } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useVoiceRecording } from '@/hooks/use-voice-recording';
import type { LanguageMode } from '@/types/voice-assistant';

import { AudioControls } from './audio-controls';
import { RecordingControls } from './recording-controls';
import { StatusDisplay } from './status-display';
import { VoiceModeToggle } from './voice-mode-toggle';

interface VoiceRecordingCardProps {
  languageMode: LanguageMode;
  onVoiceQuery: (
    audioBlob: Blob,
    language: LanguageMode,
  ) => Promise<{ text: string; confidence?: number; detectedLanguage?: string; duration?: number }>;
  onClientSideRecognition: (
    language: LanguageMode,
    onRecognizedText: (text: string) => void,
  ) => Promise<void>;
  isProcessing: boolean;
}

export function VoiceRecordingCard({
  languageMode,
  onVoiceQuery,
  onClientSideRecognition,
  isProcessing,
}: VoiceRecordingCardProps) {
  const {
    isRecording,
    recordingStatus,
    recordedAudio,
    isPlaying,
    recognizedText,
    useClientSideSTT,
    setUseClientSideSTT,
    startRecording,
    stopRecording,
    playRecordedAudio,
    stopPlayingAudio,
    clearRecordedAudio,
    setRecognizedText,
  } = useVoiceRecording();

  const handleVoiceQuery = async () => {
    if (!recordedAudio) return;
    const result = await onVoiceQuery(recordedAudio, languageMode);
    setRecognizedText(result.text);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Voice Recording
        </CardTitle>
        <CardDescription>Record audio and send to the assistant</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <VoiceModeToggle
          useClientSideSTT={useClientSideSTT}
          onToggle={() => setUseClientSideSTT(!useClientSideSTT)}
        />

        <StatusDisplay status={recordingStatus} recognizedText={recognizedText} />

        {useClientSideSTT ? (
          <Button
            onClick={() => onClientSideRecognition(languageMode, setRecognizedText)}
            disabled={isProcessing}
            className="w-full"
            variant="secondary"
          >
            <Mic className="mr-2 h-4 w-4" />
            Start Client-Side Recognition
          </Button>
        ) : (
          <>
            <RecordingControls
              isRecording={isRecording}
              onStart={startRecording}
              onStop={stopRecording}
            />

            {recordedAudio && (
              <AudioControls
                audioBlob={recordedAudio}
                isPlaying={isPlaying}
                onPlay={playRecordedAudio}
                onStop={stopPlayingAudio}
                onClear={clearRecordedAudio}
                onSend={handleVoiceQuery}
                isSending={isProcessing}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
