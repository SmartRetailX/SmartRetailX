import { useState } from 'react';

import { useAssistantQueries } from '@/hooks/use-assistant-queries';
import type { LanguageMode } from '@/types/voice-assistant';

import { QueryLogsCard } from './query-logs-card';
import { TextQueryCard } from './text-query-card';
import { VoiceRecordingCard } from './voice-recording-card';

export function DebugVoiceAssistantPage() {
  const [languageMode, setLanguageMode] = useState<LanguageMode>('si');

  const {
    logs,
    isProcessing,
    handleTextQuery,
    handleVoiceQuery,
    handleClientSideRecognition,
    clearLogs,
    copyToClipboard,
  } = useAssistantQueries();

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Voice Assistant Debug Console</h1>
        <p className="text-muted-foreground">Test and debug voice assistant functionality</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Input & Controls */}
        <div className="space-y-6">
          <TextQueryCard
            languageMode={languageMode}
            onLanguageChange={setLanguageMode}
            onSubmit={handleTextQuery}
            isLoading={isProcessing}
          />

          <VoiceRecordingCard
            languageMode={languageMode}
            onVoiceQuery={handleVoiceQuery}
            onClientSideRecognition={handleClientSideRecognition}
            isProcessing={isProcessing}
          />
        </div>

        {/* Right Column - Logs */}
        <div>
          <QueryLogsCard logs={logs} onClear={clearLogs} onCopy={copyToClipboard} />
        </div>
      </div>
    </div>
  );
}
