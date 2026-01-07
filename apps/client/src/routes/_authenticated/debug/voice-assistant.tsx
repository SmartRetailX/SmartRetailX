import { createFileRoute } from '@tanstack/react-router';

import { DebugVoiceAssistantPage } from '@/components/pages/debug/voice-assistant/index';

export const Route = createFileRoute('/_authenticated/debug/voice-assistant')({
  component: DebugVoiceAssistantPage,
});
