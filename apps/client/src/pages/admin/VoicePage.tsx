import { AssistantRuntimeProvider, useThread } from '@assistant-ui/react'
import { Loader2, Mic, MicOff, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { useVoiceChatRuntime } from '@/hooks/useVoiceChatRuntime'

const getMessageText = (content: unknown): string => {
  if (typeof content === 'string') {
    return content
  }

  if (!Array.isArray(content)) {
    return ''
  }

  return content
    .filter((part): part is { type: string; text?: string } => Boolean(part && typeof part === 'object'))
    .map((part) => (part.type === 'text' ? part.text || '' : ''))
    .join(' ')
    .trim()
}

function VoiceMessages() {
  const messages = useThread((state) => state.messages)

  if (!messages.length) {
    return null
  }

  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')
  const lastAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant')

  return (
    <div className="space-y-4">
      {lastUserMessage ? (
        <Card>
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">{getMessageText(lastUserMessage.content)}</p>
          </CardContent>
        </Card>
      ) : null}

      {lastAssistantMessage ? (
        <Card>
          <CardHeader>
            <CardTitle>Response</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">{getMessageText(lastAssistantMessage.content)}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

export default function VoicePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const role = user?.role?.toLowerCase()
  const intents =
    role === 'customer'
      ? ['offers', 'order_history', 'buying_suggestions', 'prices', 'product_search']
      : ['offers', 'prices', 'product_search', 'general']

  const {
    runtime,
    isRecording,
    isRunning,
    error,
    liveTranscript,
    hasLastRecording,
    startRecording,
    stopRecording,
    replayLastRecording,
  } = useVoiceChatRuntime({
    language: 'auto',
    user: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      : null,
    intents,
  })

  const onToggleRecording = () => {
    if (isRecording) {
      stopRecording()
      return
    }

    void startRecording()
  }

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold">{t('voice.title')}</h1>
          <p className="text-gray-500 mt-1">Sinhala voice assistant (Whisper + agent service)</p>
        </div>

        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-6">
              <button
                onClick={onToggleRecording}
                className={`h-32 w-32 rounded-full flex items-center justify-center transition-all ${
                  isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-primary hover:bg-primary/90'
                }`}
                type="button"
              >
                {isRecording ? (
                  <MicOff className="h-16 w-16 text-white" />
                ) : (
                  <Mic className="h-16 w-16 text-white" />
                )}
              </button>

              <p className="text-lg font-medium">
                {isRecording ? t('voice.listening') : t('voice.startListening')}
              </p>

              <button
                type="button"
                onClick={replayLastRecording}
                disabled={!hasLastRecording || isRecording}
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="h-4 w-4" />
                <span>Replay Last Speech</span>
              </button>

              {isRunning ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t('voice.processing')}</span>
                </div>
              ) : null}

              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {liveTranscript ? (
                <div className="w-full rounded-md border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Live Transcript</p>
                  <p className="text-sm">{liveTranscript}</p>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <VoiceMessages />
      </div>
    </AssistantRuntimeProvider>
  )
}
