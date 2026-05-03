import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Mic, Pause, Play, Send, Square } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  const extension = audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
  formData.append('audio', audioBlob, `voice-${Date.now()}.${extension}`);
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
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldSubmitRecognitionRef = useRef(true);
  const streamRef = useRef<MediaStream | null>(null);
  const processedStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
    const frame = window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ block: 'end' });
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [sortedMessages.length, loading, sending]);

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

      const result = await sendTextMessage(value);
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
    if (!value || sending || recording) return;

    try {
      setSending(true);
      setError(null);
      setText('');
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
      const result = await sendTextMessage(value);
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
          const result = await sendVoiceMessage(audioBlob);
          const immediate = toImmediateMessages(result, 'voice');
          if (immediate.length > 0) setMessages((prev) => [...prev, ...immediate]);
          await refreshMessages();
        } catch (err) {
          setError((err as Error).message || 'Failed to send voice');
        } finally {
          URL.revokeObjectURL(localAudioUrl);
          setSending(false);
          setRecording(false);
          cleanupAudioRecording();
        }
      };

      recorder.start(250);
      setRecording(true);
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
    <PageContainer noMaxHeight className="h-full min-h-0 bg-background">
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-b bg-background/95 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            <div>
              <h1 className="text-base font-semibold leading-tight sm:text-lg">
                Sinhala Voice Assistant
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Sinhala-English retail chat
              </p>
            </div>
            {recording ? (
              <div className="flex items-center gap-2 text-xs font-medium text-destructive">
                <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
                Recording
              </div>
            ) : null}
          </div>
        </div>

        <div
          ref={scrollAreaRef}
          className="min-h-0 flex-1 overflow-y-auto px-3 py-4 pb-40 sm:px-6 sm:py-6 sm:pb-36"
        >
          <div className="mx-auto flex max-w-4xl flex-col gap-4">
            {loading ? (
              <div className="flex min-h-[45vh] items-center justify-center">
                <Spinner className="h-6 w-6" />
              </div>
            ) : sortedMessages.length === 0 ? (
              <div className="mx-auto flex min-h-[45vh] max-w-md flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Mic className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-semibold">How can I help?</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Ask about products, prices, stock, offers, orders, or shopping suggestions.
                </p>
              </div>
            ) : (
              sortedMessages.map((message) => (
                <div
                  key={message.id}
                  className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                >
                  {(() => {
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
                        className={
                          message.role === 'user'
                            ? 'max-w-[90%] rounded-2xl bg-primary px-3 py-2.5 text-primary-foreground shadow-sm sm:max-w-[70%] sm:px-4 sm:py-3'
                            : 'max-w-[92%] rounded-2xl bg-muted px-3 py-2.5 shadow-sm sm:max-w-[76%] sm:px-4 sm:py-3'
                        }
                      >
                        {!hideMainContent ? <MarkdownMessage content={message.content} /> : null}
                        {message.channel === 'voice' &&
                        (message.audioUrl || message.transcription) ? (
                          <div className={!hideMainContent ? 'mt-2 space-y-2' : 'space-y-2'}>
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
                                Transcript: {message.transcription}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                        <div
                          className={
                            message.role === 'user'
                              ? 'mt-2 text-right text-[11px] text-primary-foreground/70'
                              : 'mt-2 text-right text-[11px] text-muted-foreground'
                          }
                        >
                          {formatMessageTimestamp(message.createdAt)}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))
            )}

            {sending ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground shadow-sm">
                  <Spinner className="h-4 w-4" />
                  Thinking...
                </div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+8px)] backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:px-6 sm:py-3">
          <form
            onSubmit={handleSendText}
            className="mx-auto grid max-w-4xl grid-cols-[1fr_auto_auto] items-center gap-2"
          >
            <Input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Type message in Sinhala..."
              disabled={sending || recording}
              className="col-span-3 h-10 rounded-full bg-card px-4 text-sm shadow-sm sm:col-span-1 sm:h-11"
            />
            <Button
              type="submit"
              disabled={sending || recording || !text.trim()}
              className="h-10 shrink-0 rounded-full px-3 sm:h-11 sm:px-4"
              aria-label="Send message"
            >
              <Send className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Send</span>
            </Button>
            {recording ? (
              <Button
                type="button"
                variant="destructive"
                onClick={handleStopRecording}
                disabled={sending}
                className="h-10 shrink-0 rounded-full px-3 sm:h-11 sm:px-4"
              >
                <Square className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Stop</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={handleStartRecording}
                disabled={sending}
                className="h-10 shrink-0 rounded-full px-3 sm:h-11 sm:px-4"
              >
                <Mic className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Mic</span>
              </Button>
            )}
          </form>
        </div>
      </div>
    </PageContainer>
  );
}
