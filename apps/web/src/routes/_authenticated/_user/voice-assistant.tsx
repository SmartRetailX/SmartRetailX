import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks';
import { createFileRoute } from '@tanstack/react-router';
import { Mic, Pause, Play, Send, Square, Users } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';

import { PageContainer } from '@/components/partials/container/page-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { getPublicBaseUrl } from '@/lib/base-url';
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
  audioUrl?: string | null;
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
  audioUrl?: string;
  language?: string;
  sessionId?: string;
  data?: {
    response?: string;
    transcription?: string;
    audioUrl?: string;
  };
  message?: string;
};

type GatewayAck<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: { code: string; message: string } };

type VoiceProcessingStatus = {
  userId: string;
  sessionId?: string;
  requestId: string;
  channel: 'text' | 'voice';
  phase:
    | 'idle'
    | 'received'
    | 'gateway_to_agent'
    | 'transcribing'
    | 'intent_detection'
    | 'resolving'
    | 'responding'
    | 'completed'
    | 'failed'
    | 'busy';
  message: string;
  active: boolean;
  transcription?: string;
  intent?: string;
  error?: string;
  updatedAt: string;
};

type VoiceAccessState = {
  userId: string;
  hasMultipleAccess: boolean;
  connectionCount: number;
  isInputLocked: boolean;
  updatedAt: string;
};

type SpeechRecognitionAlternative = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
};

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

const rootBaseUrl = getPublicBaseUrl();

const markdownComponents: Components = {
  a: ({ href, children, ...props }) => (
    <a
      {...props}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium underline underline-offset-4 hover:text-primary"
    >
      {children}
    </a>
  ),
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  h3: ({ children }) => <h3 className="mb-2 text-sm font-semibold leading-6">{children}</h3>,
  table: ({ children }) => (
    <div className="my-2 max-w-full overflow-x-auto rounded-lg border bg-background/60">
      <table className="w-full min-w-[520px] border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/80">{children}</thead>,
  th: ({ children }) => <th className="border-b px-3 py-2 font-semibold">{children}</th>,
  td: ({ children }) => (
    <td className="border-b px-3 py-2 align-top last:border-b-0">{children}</td>
  ),
  code: ({ children }) => (
    <code className="rounded bg-background/80 px-1 py-0.5 text-xs">{children}</code>
  ),
};

function voiceUrl(path: string) {
  if (rootBaseUrl) return `${rootBaseUrl}${path}`;
  return path;
}

function websocketUrl() {
  const env = import.meta.env ?? {};
  const configured = (env.PUBLIC_WEBSOCKET_URL || '').trim().replace(/\/$/, '');
  if (configured) return configured;
  if (typeof window === 'undefined') return 'http://localhost:3004';

  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:${env.WEBSOCKET_SERVICE_PORT || 3004}`;
}

function getSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function getVoiceRecognitionErrorMessage(errorCode: string) {
  if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed') {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      return 'Microphone access is blocked on insecure HTTP. Open this page over HTTPS to use voice input.';
    }
    return 'Microphone permission was denied. Allow mic access in browser site settings and try again.';
  }

  if (errorCode === 'audio-capture') {
    return 'No microphone was found. Connect a microphone and try again.';
  }

  return `Voice recognition failed: ${errorCode}`;
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

async function emitVoiceRequest(socket: Socket | null, payload: Record<string, unknown>) {
  if (!socket?.connected) {
    throw new Error('Voice websocket is not connected. Please try again.');
  }

  const ack = await new Promise<GatewayAck<VoiceChatResponse>>((resolve) => {
    socket
      .timeout(190_000)
      .emit(
        'voice:send',
        payload,
        (error: Error | null, response?: GatewayAck<VoiceChatResponse>) => {
          if (error) {
            resolve({ ok: false, error: { code: 'TIMEOUT', message: 'Voice request timed out.' } });
            return;
          }

          resolve(
            response ?? {
              ok: false,
              error: { code: 'NO_ACK', message: 'No voice response received.' },
            },
          );
        },
      );
  });

  if (!ack.ok) {
    throw new Error(ack.error.message || 'Failed to send voice request.');
  }

  return (ack.data ?? {}) as VoiceChatResponse;
}

async function blobToBase64(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read voice audio.'));
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      resolve(value.includes(',') ? value.split(',').pop() || '' : value);
    };
    reader.readAsDataURL(blob);
  });
}

async function sendTextMessage(text: string, socket: Socket | null) {
  return await emitVoiceRequest(socket, {
    channel: 'text',
    text,
    language: 'si-LK',
    userRole: USER_ROLE.USER,
  });
}

async function sendVoiceMessage(audioBlob: Blob, socket: Socket | null) {
  return await emitVoiceRequest(socket, {
    channel: 'voice',
    audioBase64: await blobToBase64(audioBlob),
    mimeType: audioBlob.type || 'audio/webm',
    language: 'si-LK',
    userRole: USER_ROLE.USER,
  });
}

function toImmediateMessages(
  payload: VoiceChatResponse,
  channel: 'text' | 'voice',
): VoiceMessage[] {
  const transcription = (payload.transcription ?? payload.data?.transcription ?? '').trim();
  const response = (payload.response ?? payload.data?.response ?? '').trim();
  const audioUrl = (payload.audioUrl ?? payload.data?.audioUrl ?? '').trim() || null;
  const now = new Date().toISOString();
  const items: VoiceMessage[] = [];

  if (transcription) {
    items.push({
      id: `local-user-${Date.now()}`,
      role: 'user',
      channel,
      content: transcription,
      transcription: channel === 'voice' ? transcription : null,
      audioUrl: channel === 'voice' ? audioUrl : null,
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
      audioUrl: null,
      createdAt: now,
    });
  }

  return items;
}

function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="text-sm leading-6">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

function formatAudioTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatMessageTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function getStatusLabel(status: VoiceProcessingStatus | null, sending: boolean) {
  if (!status?.active) {
    return sending ? 'Thinking...' : '';
  }

  if (status.phase === 'busy') return 'Voice assistant is busy in another window...';
  return status.message || 'Thinking...';
}

function VoiceBubblePlayer({ src, isUser }: { src: string; isUser: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMeta = () => setDuration(audio.duration || 0);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', onLoadedMeta);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMeta);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      await audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const seek = (nextPercent: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const clamped = Math.max(0, Math.min(100, nextPercent));
    audio.currentTime = (clamped / 100) * duration;
    setCurrentTime(audio.currentTime);
  };

  return (
    <div className="w-full max-w-sm">
      <audio ref={audioRef} preload="metadata" src={src} className="hidden" />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void togglePlayback()}
          className={
            isUser
              ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-primary'
              : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'
          }
          aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={(event) => seek(Number(event.target.value))}
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/40 accent-white"
            aria-label="Seek voice message"
          />
          <div
            className={
              isUser
                ? 'text-[11px] text-primary-foreground/80'
                : 'text-[11px] text-muted-foreground'
            }
          >
            {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
          </div>
        </div>
      </div>
    </div>
  );
}

function RouteComponent() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<VoiceProcessingStatus | null>(null);
  const [voiceAccessState, setVoiceAccessState] = useState<VoiceAccessState | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const statusClearTimerRef = useRef<number | null>(null);
  const shouldSubmitRecognitionRef = useRef(true);
  const streamRef = useRef<MediaStream | null>(null);
  const processedStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const emitVoiceTyping = (isActive: boolean) => {
    socketRef.current?.emit('voice:typing', { isActive });
  };

  const sortedMessages = useMemo(
    () =>
      [...messages].sort((a, b) => {
        const timeDelta = +new Date(a.createdAt) - +new Date(b.createdAt);
        if (timeDelta !== 0) {
          return timeDelta;
        }

        if (a.role !== b.role) {
          return a.role === 'user' ? -1 : 1;
        }

        return a.id.localeCompare(b.id);
      }),
    [messages],
  );
  const statusLabel = getStatusLabel(processingStatus, sending);
  const remoteProcessing = Boolean(processingStatus?.active);
  const lockedByOtherSession = Boolean(
    voiceAccessState?.hasMultipleAccess && voiceAccessState.isInputLocked && !sending && !recording,
  );
  const inputDisabled = sending || recording || remoteProcessing || lockedByOtherSession;

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
      speechRecognitionRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      processedStreamRef.current?.getTracks().forEach((track) => track.stop());
      void audioContextRef.current?.close();
      speechRecognitionRef.current = null;
      processedStreamRef.current = null;
      audioContextRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const socket = io(`${websocketUrl()}/chat`, {
      transports: ['websocket'],
      auth: { userId: user.id },
      query: { userId: user.id },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('chat:identify', { userId: user.id });
    });

    socket.on('voice:status', (status: VoiceProcessingStatus) => {
      if (!status || status.userId !== user.id) return;
      if (statusClearTimerRef.current) {
        window.clearTimeout(statusClearTimerRef.current);
        statusClearTimerRef.current = null;
      }

      setProcessingStatus(status);

      if (!status.active) {
        if (status.phase === 'completed') {
          void refreshMessages();
        }
        statusClearTimerRef.current = window.setTimeout(() => {
          setProcessingStatus((current) =>
            current?.requestId === status.requestId ? null : current,
          );
        }, 2500);
      }
    });

    socket.on('voice:access', (state: VoiceAccessState) => {
      if (!state || state.userId !== user.id) return;
      setVoiceAccessState(state);
    });

    return () => {
      if (statusClearTimerRef.current) {
        window.clearTimeout(statusClearTimerRef.current);
        statusClearTimerRef.current = null;
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ block: 'end' });
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [sortedMessages.length, loading, sending, statusLabel]);

  useEffect(() => {
    if (!error) return;
    toast.error('Voice assistant error', {
      description: error,
    });
  }, [error]);

  const refreshMessages = async () => {
    const sessionMessages = await loadSession();
    setMessages(sessionMessages);
  };

  const submitRecognizedVoiceText = async (recognizedText: string) => {
    const value = recognizedText.trim();
    if (!value) return;

    try {
      setSending(true);
      setError(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `optimistic-voice-text-${Date.now()}`,
          role: 'user',
          channel: 'voice',
          content: value,
          transcription: value,
          createdAt: new Date().toISOString(),
        },
      ]);

      const result = await sendTextMessage(value, socketRef.current);
      const immediate = toImmediateMessages(result, 'voice');
      const assistantMessages = immediate.filter((message) => message.role === 'assistant');
      if (assistantMessages.length > 0) setMessages((prev) => [...prev, ...assistantMessages]);
      await refreshMessages();
    } catch (err) {
      setError((err as Error).message || 'Failed to send voice message');
    } finally {
      setSending(false);
    }
  };

  const cleanupAudioRecording = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    processedStreamRef.current?.getTracks().forEach((track) => track.stop());
    void audioContextRef.current?.close();
    streamRef.current = null;
    processedStreamRef.current = null;
    audioContextRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  };

  const handleSendText = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || inputDisabled) return;

    try {
      setSending(true);
      setError(null);
      setText('');
      emitVoiceTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `optimistic-user-${Date.now()}`,
          role: 'user',
          channel: 'text',
          content: value,
          transcription: null,
          createdAt: new Date().toISOString(),
        },
      ]);
      const result = await sendTextMessage(value, socketRef.current);
      const immediate = toImmediateMessages(result, 'text');
      const assistantMessages = immediate.filter((message) => message.role === 'assistant');
      if (assistantMessages.length > 0) setMessages((prev) => [...prev, ...assistantMessages]);
      await refreshMessages();
    } catch (err) {
      setError((err as Error).message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleStartRecording = async () => {
    if (sending || remoteProcessing) return;

    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (SpeechRecognitionCtor) {
      try {
        setError(null);
        const recognition = new SpeechRecognitionCtor();
        let finalTranscript = '';
        let latestTranscript = '';
        shouldSubmitRecognitionRef.current = true;

        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'si-LK';
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
          let nextTranscript = '';
          for (let index = event.resultIndex; index < event.results.length; index += 1) {
            const result = event.results[index];
            const transcript = result?.[0]?.transcript?.trim() || '';
            if (!transcript) continue;
            if (result.isFinal) {
              finalTranscript = `${finalTranscript} ${transcript}`.trim();
            } else {
              nextTranscript = `${nextTranscript} ${transcript}`.trim();
            }
          }
          latestTranscript = (finalTranscript || nextTranscript).trim();
          setText(latestTranscript);
        };

        recognition.onerror = (event) => {
          const errorCode = event.error || 'unknown';
          if (errorCode === 'aborted') {
            shouldSubmitRecognitionRef.current = false;
            return;
          }
          setError(getVoiceRecognitionErrorMessage(errorCode));
        };

        recognition.onend = () => {
          speechRecognitionRef.current = null;
          setRecording(false);
          const transcript = finalTranscript.trim() || latestTranscript.trim();
          if (shouldSubmitRecognitionRef.current && transcript) {
            void submitRecognizedVoiceText(transcript);
          }
          shouldSubmitRecognitionRef.current = true;
          setText('');
        };

        speechRecognitionRef.current = recognition;
        recognition.start();
        setRecording(true);
        emitVoiceTyping(true);
        return;
      } catch {
        speechRecognitionRef.current = null;
      }
    }

    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          channelCount: 1,
          sampleRate: 48000,
          sampleSize: 16,
        },
      });

      const [track] = stream.getAudioTracks();
      if (track?.applyConstraints) {
        try {
          await track.applyConstraints({
            advanced: [{ noiseSuppression: true, echoCancellation: true, autoGainControl: false }],
          });
        } catch {
          // Ignore unsupported advanced constraints.
        }
      }

      const audioContext = new AudioContext({ sampleRate: 48000 });
      await audioContext.resume();
      const source = audioContext.createMediaStreamSource(stream);
      const destination = audioContext.createMediaStreamDestination();

      const highpass = audioContext.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 120;

      const lowpass = audioContext.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 7600;

      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.value = -28;
      compressor.knee.value = 20;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.12;

      source.connect(highpass);
      highpass.connect(lowpass);

      lowpass.connect(compressor);

      compressor.connect(destination);

      audioContextRef.current = audioContext;
      processedStreamRef.current = destination.stream;

      const preferredMimeTypes = ['audio/webm;codecs=opus', 'audio/webm'];
      const supportedMimeType = preferredMimeTypes.find((mimeType) =>
        MediaRecorder.isTypeSupported(mimeType),
      );
      const recorder = supportedMimeType
        ? new MediaRecorder(destination.stream, {
            mimeType: supportedMimeType,
            audioBitsPerSecond: 128000,
          })
        : new MediaRecorder(destination.stream);

      chunksRef.current = [];
      streamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blobType = supportedMimeType || 'audio/webm';
        const audioBlob = new Blob(chunksRef.current, { type: blobType });
        if (!audioBlob.size) return;
        const localAudioUrl = URL.createObjectURL(audioBlob);
        const optimisticVoiceId = `optimistic-voice-${Date.now()}`;

        try {
          setSending(true);
          setMessages((prev) => [
            ...prev,
            {
              id: optimisticVoiceId,
              role: 'user',
              channel: 'voice',
              content: 'Voice message',
              transcription: null,
              audioUrl: localAudioUrl,
              createdAt: new Date().toISOString(),
            },
          ]);
          const result = await sendVoiceMessage(audioBlob, socketRef.current);
          const immediate = toImmediateMessages(result, 'voice');
          if (immediate.length > 0) setMessages((prev) => [...prev, ...immediate]);
          await refreshMessages();
        } catch (err) {
          setError((err as Error).message || 'Failed to send voice');
        } finally {
          URL.revokeObjectURL(localAudioUrl);
          setSending(false);
          setRecording(false);
          emitVoiceTyping(false);
          cleanupAudioRecording();
        }
      };

      recorder.start(250);
      setRecording(true);
      emitVoiceTyping(true);
    } catch (err) {
      cleanupAudioRecording();
      setRecording(false);
      const message = (err as Error).message || '';
      if (
        typeof window !== 'undefined' &&
        !window.isSecureContext &&
        /not[\s-]?allowed|permission|denied/i.test(message)
      ) {
        setError(
          'Microphone access is blocked on insecure HTTP. Open this page over HTTPS to use voice input.',
        );
        return;
      }
      setError(message || 'Microphone access denied');
    }
  };

  const handleStopRecording = () => {
    if (speechRecognitionRef.current) {
      shouldSubmitRecognitionRef.current = false;
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
      return;
    }
    mediaRecorderRef.current?.stop();
  };

  return (
    <PageContainer noMaxHeight className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Chat header bar */}
        <div className="shrink-0 border-b bg-background/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6 sm:py-3">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Mic className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold leading-tight sm:text-base">
                  Voice Assistant
                </h1>
                <p className="text-xs text-muted-foreground">Sinhala · English</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {recording ? (
                <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
                  <span className="hidden sm:inline">Recording</span>
                </div>
              ) : null}
              {voiceAccessState && voiceAccessState.connectionCount > 0 ? (
                <div className="group relative flex items-center">
                  <button
                    type="button"
                    className="relative flex items-center justify-center focus:outline-none"
                    aria-label={`${voiceAccessState.connectionCount} active session${voiceAccessState.connectionCount !== 1 ? 's' : ''}${voiceAccessState.hasMultipleAccess ? ' — multiple sessions detected' : ''}`}
                  >
                    <Users
                      className={
                        voiceAccessState.hasMultipleAccess
                          ? 'h-5 w-5 text-amber-500'
                          : 'h-5 w-5 text-muted-foreground'
                      }
                    />
                    <span
                      className={
                        voiceAccessState.hasMultipleAccess
                          ? 'absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white'
                          : 'absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-muted-foreground/60 text-[10px] font-bold text-background'
                      }
                    >
                      {voiceAccessState.connectionCount}
                    </span>
                  </button>
                  {/* Tooltip — visible on hover or focus-within */}
                  <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-max max-w-[200px] rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                    {voiceAccessState.hasMultipleAccess
                      ? `Multiple active sessions (${voiceAccessState.connectionCount})`
                      : `${voiceAccessState.connectionCount} session${voiceAccessState.connectionCount !== 1 ? 's' : ''} open`}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div
          ref={scrollAreaRef}
          className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6"
          style={{ paddingBottom: '5.5rem' }}
        >
          <div className="mx-auto flex max-w-4xl flex-col gap-3">
            {loading ? (
              <div className="flex min-h-[45vh] items-center justify-center">
                <Spinner className="h-6 w-6" />
              </div>
            ) : sortedMessages.length === 0 ? (
              <div className="mx-auto flex min-h-[45vh] max-w-md flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                  <Mic className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-semibold sm:text-xl">How can I help?</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Ask about products, prices, stock, offers, orders, or shopping suggestions.
                </p>
              </div>
            ) : (
              sortedMessages.map((message) => {
                const normalizedContent = message.content.trim();
                const normalizedTranscript = (message.transcription || '').trim();
                const hideMainContent =
                  message.channel === 'voice' &&
                  normalizedTranscript.length > 0 &&
                  normalizedContent.localeCompare(normalizedTranscript, undefined, {
                    sensitivity: 'base',
                  }) === 0;

                return (
                  <div
                    key={message.id}
                    className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                  >
                    <div
                      className={
                        message.role === 'user'
                          ? 'max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3 py-2.5 text-primary-foreground shadow-sm sm:max-w-[72%] sm:px-4 sm:py-3'
                          : 'max-w-[90%] rounded-2xl rounded-bl-md bg-muted px-3 py-2.5 shadow-sm sm:max-w-[78%] sm:px-4 sm:py-3'
                      }
                    >
                      {!hideMainContent ? <MarkdownMessage content={message.content} /> : null}
                      {message.channel === 'voice' &&
                      (message.audioUrl || message.transcription) ? (
                        <div className={!hideMainContent ? 'mt-2 space-y-1.5' : 'space-y-1.5'}>
                          {message.audioUrl ? (
                            <VoiceBubblePlayer
                              src={message.audioUrl}
                              isUser={message.role === 'user'}
                            />
                          ) : null}
                          {message.transcription ? (
                            <p
                              className={
                                message.role === 'user'
                                  ? 'text-xs text-primary-foreground/75'
                                  : 'text-xs text-muted-foreground'
                              }
                            >
                              {message.transcription}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                      <div
                        className={
                          message.role === 'user'
                            ? 'mt-1.5 text-right text-[10px] text-primary-foreground/60'
                            : 'mt-1.5 text-right text-[10px] text-muted-foreground/70'
                        }
                      >
                        {formatMessageTimestamp(message.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {statusLabel ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-sm text-muted-foreground shadow-sm">
                  <Spinner className="h-4 w-4" />
                  {statusLabel}
                </div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input bar — fixed to bottom of viewport */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+8px)] backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:px-6 sm:py-3">
          {lockedByOtherSession ? (
            <div className="mx-auto mb-2 flex max-w-4xl items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">
              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-500" />
              Another session is active. Input is disabled until it finishes.
            </div>
          ) : null}
          <form onSubmit={handleSendText} className="mx-auto flex max-w-4xl items-center gap-2">
            <Input
              value={text}
              onChange={(event) => {
                const next = event.target.value;
                setText(next);
                emitVoiceTyping(next.length > 0);
              }}
              onBlur={() => {
                if (!text.trim()) emitVoiceTyping(false);
              }}
              placeholder={
                lockedByOtherSession ? 'Another session is active...' : 'Type message in Sinhala...'
              }
              disabled={inputDisabled}
              className="h-11 flex-1 rounded-full bg-card px-4 text-sm shadow-sm"
            />
            <Button
              type="submit"
              disabled={inputDisabled || !text.trim()}
              size="icon"
              className="h-11 w-11 shrink-0 rounded-full"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
            {recording ? (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={handleStopRecording}
                disabled={sending || remoteProcessing}
                className="h-11 w-11 shrink-0 rounded-full"
                aria-label="Stop recording"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant={text.trim() ? 'outline' : 'default'}
                size="icon"
                onClick={handleStartRecording}
                disabled={sending || remoteProcessing}
                className="h-11 w-11 shrink-0 rounded-full"
                aria-label="Start voice recording"
              >
                <Mic className="h-4 w-4" />
              </Button>
            )}
          </form>
        </div>
      </div>
    </PageContainer>
  );
}
