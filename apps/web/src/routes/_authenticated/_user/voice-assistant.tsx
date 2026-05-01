import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AlertCircle, Mic, Send, Square } from 'lucide-react';

import { PageContainer } from '@/components/partials/container/page-container';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { USER_ROLE } from '@/types/auth';

export const Route = createFileRoute('/_authenticated/_user/voice-assistant')({
  component: RouteComponent,
});

type VoiceMessage = {
  id: string;
  role: 'user' | 'assistant';
  channel: 'text' | 'voice';
  content: string;
  transcription: string | null;
  createdAt: string;
};

type VoiceSessionResponse = {
  messages?: VoiceMessage[];
  data?: {
    messages?: VoiceMessage[];
  };
};

type VoiceChatResponse = {
  success?: boolean;
  response?: string;
  transcription?: string;
  language?: string;
  sessionId?: string;
  data?: {
    response?: string;
    transcription?: string;
  };
  message?: string;
};

const rootBaseUrl = (import.meta.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');

function voiceUrl(path: string) {
  if (rootBaseUrl) return `${rootBaseUrl}${path}`;
  return path;
}

async function loadSession() {
  const response = await fetch(voiceUrl('/api/v1/voice/chat/session?limit=30'), {
    credentials: 'include',
  });
  const payload = (await response.json()) as VoiceSessionResponse & { message?: string };

  if (!response.ok) {
    throw new Error(payload.message || 'Failed to load voice session');
  }

  return payload.messages ?? payload.data?.messages ?? [];
}

async function sendTextMessage(text: string) {
  const response = await fetch(voiceUrl('/api/v1/voice/chat/text'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      language: 'si-LK',
      userRole: USER_ROLE.USER,
    }),
  });

  const payload = (await response.json()) as VoiceChatResponse;

  if (!response.ok) {
    throw new Error(payload?.message || 'Failed to send text message');
  }

  return payload;
}

async function sendVoiceMessage(audioBlob: Blob) {
  const formData = new FormData();
  formData.append('audio', audioBlob, `voice-${Date.now()}.webm`);
  formData.append('language', 'si-LK');
  formData.append('userRole', USER_ROLE.USER);

  const response = await fetch(voiceUrl('/api/v1/voice/chat'), {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const payload = (await response.json()) as VoiceChatResponse;

  if (!response.ok) {
    throw new Error(payload?.message || 'Failed to send voice message');
  }

  return payload;
}

function toImmediateMessages(payload: VoiceChatResponse, channel: 'text' | 'voice'): VoiceMessage[] {
  const transcription = (payload.transcription ?? payload.data?.transcription ?? '').trim();
  const response = (payload.response ?? payload.data?.response ?? '').trim();
  const now = new Date().toISOString();
  const items: VoiceMessage[] = [];

  if (transcription) {
    items.push({
      id: `local-user-${Date.now()}`,
      role: 'user',
      channel,
      content: transcription,
      transcription: channel === 'voice' ? transcription : null,
      createdAt: now,
    });
  }

  if (response) {
    items.push({
      id: `local-assistant-${Date.now() + 1}`,
      role: 'assistant',
      channel,
      content: response,
      transcription: null,
      createdAt: now,
    });
  }

  return items;
}

function RouteComponent() {
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [messages],
  );

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setLoading(true);
        const sessionMessages = await loadSession();
        if (!active) return;
        setMessages(sessionMessages);
      } catch (err) {
        if (!active) return;
        setError((err as Error).message || 'Failed to load voice assistant');
      } finally {
        if (active) setLoading(false);
      }
    };

    void run();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const refreshMessages = async () => {
    const sessionMessages = await loadSession();
    setMessages(sessionMessages);
  };

  const handleSendText = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || sending) return;

    try {
      setSending(true);
      setError(null);
      const result = await sendTextMessage(value);
      setText('');
      const immediate = toImmediateMessages(result, 'text');
      if (immediate.length > 0) setMessages((prev) => [...prev, ...immediate]);
      await refreshMessages();
    } catch (err) {
      setError((err as Error).message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleStartRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = MediaRecorder.isTypeSupported('audio/webm')
        ? new MediaRecorder(stream, { mimeType: 'audio/webm' })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      streamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (!audioBlob.size) return;

        try {
          setSending(true);
          const result = await sendVoiceMessage(audioBlob);
          const immediate = toImmediateMessages(result, 'voice');
          if (immediate.length > 0) setMessages((prev) => [...prev, ...immediate]);
          await refreshMessages();
        } catch (err) {
          setError((err as Error).message || 'Failed to send voice');
        } finally {
          setSending(false);
          setRecording(false);
          streamRef.current?.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          mediaRecorderRef.current = null;
          chunksRef.current = [];
        }
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      setError((err as Error).message || 'Microphone access denied');
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  return (
    <PageContainer>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Sinhala Voice Assistant</h1>
          <p className="text-sm text-muted-foreground">Send text or use the microphone to chat in Sinhala.</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Voice assistant error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Chat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex min-h-52 items-center justify-center rounded-xl border border-dashed">
                <Spinner className="h-6 w-6" />
              </div>
            ) : sortedMessages.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                No messages yet. Start by typing or recording your voice.
              </div>
            ) : (
              <div className="max-h-[460px] space-y-3 overflow-y-auto rounded-xl border p-4">
                {sortedMessages.map((message) => (
                  <div
                    key={message.id}
                    className={
                      message.role === 'user'
                        ? 'ml-auto max-w-[85%] rounded-xl bg-primary/10 p-3'
                        : 'mr-auto max-w-[85%] rounded-xl bg-muted p-3'
                    }
                  >
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                    {message.channel === 'voice' && message.transcription ? (
                      <p className="mt-2 text-xs text-muted-foreground">Transcript: {message.transcription}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSendText} className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Type message in Sinhala..."
                disabled={sending}
              />
              <Button type="submit" disabled={sending || !text.trim()} className="sm:w-auto">
                <Send className="mr-2 h-4 w-4" />
                Send
              </Button>
              {recording ? (
                <Button type="button" variant="destructive" onClick={handleStopRecording} disabled={sending}>
                  <Square className="mr-2 h-4 w-4" />
                  Stop & Send
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={handleStartRecording} disabled={sending}>
                  <Mic className="mr-2 h-4 w-4" />
                  Mic
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
