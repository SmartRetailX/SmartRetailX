import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks';
import { createFileRoute, Link } from '@tanstack/react-router';
import { HelpCircle, ImageOff, Mic, Pause, Play, Send, Square, Users } from 'lucide-react';
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

type VoiceProduct = {
  product_id: string;
  name: string;
  name_si?: string | null;
  price: number;
  stock_quantity?: number | null;
  brand?: string | null;
  category?: string | null;
  image_url?: string | null;
  avg_discount?: number | null;
  purchase_frequency?: string | null;
  recommendation_source?: string | null;
};

type ProductPagination = {
  intent?: 'prices' | 'product_search' | 'offers' | 'buying_suggestions' | string;
  query?: string | null;
  categoryHint?: string | null;
  offset?: number;
  limit?: number;
  nextOffset?: number;
  total?: number;
  hasMore?: boolean;
};

type VoiceMessage = {
  id: string;
  role: 'user' | 'assistant';
  channel: 'text' | 'voice';
  content: string;
  transcription: string | null;
  audioUrl?: string | null;
  createdAt: string;
  suggestions?: string[] | null;
  products?: VoiceProduct[] | null;
  productPagination?: ProductPagination | null;
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
  suggestions?: string[] | null;
  products?: VoiceProduct[] | null;
  productPagination?: ProductPagination | null;
  data?: {
    response?: string;
    transcription?: string;
    audioUrl?: string;
    suggestions?: string[] | null;
    products?: VoiceProduct[] | null;
    productPagination?: ProductPagination | null;
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
const PRODUCT_PAGE_COMMAND_PREFIX = '__srx_product_page__:';
const PRODUCT_DETAIL_COMMAND_PREFIX = '__srx_product_detail__:';
const PRODUCT_PAGE_SIZE = 5;

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

function resolveImageUrl(imageUrl?: string | null) {
  if (!imageUrl) return null;
  const raw = imageUrl.trim();
  if (!raw) return null;

  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    raw.startsWith('http://')
  ) {
    return `https://${raw.slice('http://'.length)}`;
  }
  return raw;
}

function buildProductPageCommand(paging: ProductPagination) {
  const payload = {
    intent: paging.intent || 'product_search',
    query: paging.query || null,
    categoryHint: paging.categoryHint || null,
    offset: paging.nextOffset ?? (paging.offset ?? 0) + (paging.limit ?? PRODUCT_PAGE_SIZE),
    limit: paging.limit ?? PRODUCT_PAGE_SIZE,
  };
  return `${PRODUCT_PAGE_COMMAND_PREFIX}${JSON.stringify(payload)}`;
}

function buildProductDetailCommand(product: VoiceProduct) {
  const payload = {
    productId: product.product_id,
    productName: product.name,
  };
  return `${PRODUCT_DETAIL_COMMAND_PREFIX}${JSON.stringify(payload)}`;
}

function splitMessageExplanation(content: string) {
  const marker = '\n\n---\n\n**🔍';
  const index = content.indexOf(marker);
  if (index < 0) {
    return { body: content, explanation: '' };
  }
  return {
    body: content.slice(0, index).trim(),
    explanation: content.slice(index).trim(),
  };
}

function inferIntentFromContent(content: string): ProductPagination['intent'] {
  const lowered = content.toLowerCase();
  if (lowered.includes('මිල ගණන්')) return 'prices';
  if (lowered.includes('සෙවීමේ ප්‍රතිඵල') || lowered.includes('භාණ්ඩ ලැයිස්තුව'))
    return 'product_search';
  if (lowered.includes('offers')) return 'offers';
  if (lowered.includes('නිර්දේශ')) return 'buying_suggestions';
  return 'product_search';
}

function inferQueryFromContent(content: string) {
  const quoted = content.match(/["“](.+?)["”]\s*[-–—]/);
  if (quoted?.[1]) return quoted[1].trim();

  const priceHeader = content.match(/###\s*💰\s*(.+?)\s*[-–—]\s*මිල\s*ගණන්/i);
  if (priceHeader?.[1]) return priceHeader[1].trim();

  const sinhalaForMatch = content.match(/^(.+?)\s+සඳහා\s+/);
  if (sinhalaForMatch?.[1]) return sinhalaForMatch[1].trim().replace(/^"+|"+$/g, '');

  return '';
}

function isControlShowMoreText(text: string) {
  const normalized = text.trim().toLowerCase();
  return (
    normalized.startsWith('show more products for') ||
    normalized.startsWith('තවත් භාණ්ඩ පෙන්වන්න') ||
    normalized.includes('සඳහා තවත් භාණ්ඩ පෙන්වන්න')
  );
}

function resolvePaginationForMessage(
  message: VoiceMessage,
  sortedMessages: VoiceMessage[],
  messageIndex: number,
): ProductPagination | null {
  if (message.productPagination) return message.productPagination;
  if (!message.products || message.products.length === 0) return null;

  let inferredQuery = inferQueryFromContent(message.content || '');
  if (!inferredQuery) {
    for (let i = messageIndex - 1; i >= 0; i -= 1) {
      const prev = sortedMessages[i];
      if (prev.role === 'user' && prev.content.trim() && !isControlShowMoreText(prev.content)) {
        inferredQuery = prev.content.trim();
        break;
      }
    }
  }

  const content = message.content || '';
  const ofTotalMatch = content.match(/\bof\s+(\d+)\b/i);
  const rangeMatch = content.match(/(\d+)\s*-\s*(\d+)\s*of\s*(\d+)/i);
  const inferredTotal = rangeMatch?.[3]
    ? Number(rangeMatch[3])
    : ofTotalMatch?.[1]
      ? Number(ofTotalMatch[1])
      : message.products.length;
  const inferredStart = rangeMatch?.[1] ? Number(rangeMatch[1]) : 1;
  const inferredLimit =
    rangeMatch?.[1] && rangeMatch?.[2]
      ? Math.max(1, Number(rangeMatch[2]) - Number(rangeMatch[1]) + 1)
      : PRODUCT_PAGE_SIZE;
  const nextOffset = Math.max(0, inferredStart - 1) + inferredLimit;
  const hasMore = Number.isFinite(inferredTotal) && nextOffset < inferredTotal;

  return {
    intent: inferIntentFromContent(message.content || ''),
    query: inferredQuery || null,
    offset: Math.max(0, inferredStart - 1),
    limit: inferredLimit,
    nextOffset,
    total: Number.isFinite(inferredTotal) ? inferredTotal : message.products.length,
    hasMore,
  };
}

function buildMoreProductsPrompt(message: VoiceMessage, paging: ProductPagination) {
  const total = paging.total ?? message.products?.length ?? 0;
  const shownCount = Math.min(PRODUCT_PAGE_SIZE, message.products?.length ?? 0);
  const query = (paging.query || '').trim();
  const queryPrefix = query ? `${query} ` : '';
  return `ඔබට ${queryPrefix}මිල ගණන් පිළිබඳ විවිධ විකල්ප ${shownCount}ක් පෙන්වා ඇත (${total}න්). තවත් අවශ්‍යද?`;
}

function toImmediateMessages(
  payload: VoiceChatResponse,
  channel: 'text' | 'voice',
): VoiceMessage[] {
  const transcription = (payload.transcription ?? payload.data?.transcription ?? '').trim();
  const response = (payload.response ?? payload.data?.response ?? '').trim();
  const audioUrl = (payload.audioUrl ?? payload.data?.audioUrl ?? '').trim() || null;
  const suggestions = payload.suggestions ?? payload.data?.suggestions ?? null;
  const products = payload.products ?? payload.data?.products ?? null;
  const productPagination = payload.productPagination ?? payload.data?.productPagination ?? null;
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
      suggestions: suggestions && suggestions.length > 0 ? suggestions : null,
      products: products && products.length > 0 ? products : null,
      productPagination,
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

function SuggestionChips({
  suggestions,
  onSelect,
  disabled,
}: {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(suggestion)}
          className="rounded-full border border-primary/30 bg-primary/8 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15 hover:border-primary/50 disabled:pointer-events-none disabled:opacity-50"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}

function ProductThumb({ imageUrl, name }: { imageUrl?: string | null; name: string }) {
  const [hasError, setHasError] = useState(false);
  const [retryWithHttps, setRetryWithHttps] = useState(false);
  const resolvedUrl = resolveImageUrl(imageUrl);
  const src =
    retryWithHttps && resolvedUrl?.startsWith('http://')
      ? resolvedUrl.replace(/^http:\/\//i, 'https://')
      : resolvedUrl;

  if (!src || hasError) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted text-muted-foreground">
        <ImageOff className="h-5 w-5" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (!retryWithHttps && src.startsWith('http://')) {
          setRetryWithHttps(true);
          return;
        }
        if (src.startsWith('https://')) {
          setHasError(true);
          return;
        }
        setHasError(true);
      }}
      className="h-14 w-14 shrink-0 rounded-lg border border-border/50 bg-muted/20 object-cover"
    />
  );
}

function ProductCardTable({
  products,
  onRequestDetails,
  disabled,
}: {
  products: VoiceProduct[];
  onRequestDetails?: (product: VoiceProduct) => void;
  disabled?: boolean;
}) {
  const visibleProducts = products.slice(0, PRODUCT_PAGE_SIZE);
  const comparableProducts = visibleProducts.filter(
    (p) => Number.isFinite(p.price) && (p.stock_quantity ?? 0) >= 0,
  );
  const hasComparison = comparableProducts.length > 1;
  const minPriceProduct = hasComparison
    ? comparableProducts.reduce((min, p) => (p.price < min.price ? p : min), comparableProducts[0])
    : null;
  const maxPriceProduct = hasComparison
    ? comparableProducts.reduce((max, p) => (p.price > max.price ? p : max), comparableProducts[0])
    : null;
  const lowestStockProduct = hasComparison
    ? comparableProducts.reduce(
        (min, p) => ((p.stock_quantity ?? 0) < (min.stock_quantity ?? 0) ? p : min),
        comparableProducts[0],
      )
    : null;
  const highestStockProduct = hasComparison
    ? comparableProducts.reduce(
        (max, p) => ((p.stock_quantity ?? 0) > (max.stock_quantity ?? 0) ? p : max),
        comparableProducts[0],
      )
    : null;
  const averagePrice = hasComparison
    ? comparableProducts.reduce((sum, p) => sum + p.price, 0) / comparableProducts.length
    : null;

  return (
    <div className="mt-2.5 flex flex-col gap-2">
      {hasComparison &&
      minPriceProduct &&
      maxPriceProduct &&
      lowestStockProduct &&
      highestStockProduct ? (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-xs text-foreground">
          <p className="font-semibold text-primary">ඉක්මන් සැසඳීම</p>
          <p className="mt-1">
            අඩුම මිල: <strong>{minPriceProduct.name}</strong> (රු.{' '}
            {minPriceProduct.price.toFixed(2)}){' · '}
            වැඩිම මිල: <strong>{maxPriceProduct.name}</strong> (රු.{' '}
            {maxPriceProduct.price.toFixed(2)})
          </p>
          <p className="mt-1">
            සාමාන්‍ය මිල: <strong>රු. {(averagePrice ?? 0).toFixed(2)}</strong>
            {' · '}
            අඩුම stock: <strong>{lowestStockProduct.name}</strong> (
            {lowestStockProduct.stock_quantity ?? 0}){' · '}
            වැඩිම stock: <strong>{highestStockProduct.name}</strong> (
            {highestStockProduct.stock_quantity ?? 0})
          </p>
        </div>
      ) : null}
      {visibleProducts.map((p) => {
        const inStock = (p.stock_quantity ?? 0) > 0;
        const qty = p.stock_quantity ?? 0;
        return (
          <Link
            key={p.product_id}
            to="/products/$productId"
            params={{ productId: p.product_id }}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-border bg-background/80 p-2.5 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <ProductThumb
              key={`${p.product_id}:${p.image_url || 'na'}`}
              imageUrl={p.image_url}
              name={p.name}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight text-foreground">
                {p.name}
              </p>
              {p.name_si ? (
                <p className="truncate text-xs text-muted-foreground">{p.name_si}</p>
              ) : null}
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                {p.brand ? (
                  <span className="text-[11px] text-muted-foreground">{p.brand}</span>
                ) : null}
                {p.category ? (
                  <span className="text-[11px] text-muted-foreground">· {p.category}</span>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onRequestDetails?.(p);
                }}
                disabled={disabled}
                className="mb-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary transition-colors hover:bg-primary/20 disabled:pointer-events-none disabled:opacity-50"
                title="Get product details"
                aria-label={`Get details for ${p.name}`}
              >
                <HelpCircle className="h-full w-full" />
              </button>
              <span className="text-sm font-bold text-foreground">
                රු.&nbsp;{p.price.toFixed(2)}
              </span>
              {p.avg_discount && p.avg_discount > 0 ? (
                <span className="text-[11px] font-medium text-emerald-600">
                  -{p.avg_discount.toFixed(0)}% off
                </span>
              ) : null}
              <span
                className={
                  inStock
                    ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700'
                    : 'rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600'
                }
              >
                {inStock ? `ඇත · ${qty}` : 'නැත'}
              </span>
            </div>
          </Link>
        );
      })}
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
  const [moreProductsChoiceByMessage, setMoreProductsChoiceByMessage] = useState<
    Record<string, 'yes' | 'no'>
  >({});

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

  const sendAutomatedTextRequest = async (displayText: string, requestText: string) => {
    if (!requestText.trim() || inputDisabled) return;

    try {
      setSending(true);
      setError(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `optimistic-automated-${Date.now()}`,
          role: 'user',
          channel: 'text',
          content: displayText,
          transcription: null,
          createdAt: new Date().toISOString(),
        },
      ]);
      const result = await sendTextMessage(requestText, socketRef.current);
      const immediate = toImmediateMessages(result, 'text');
      const assistantMessages = immediate.filter((message) => message.role === 'assistant');
      if (assistantMessages.length > 0) setMessages((prev) => [...prev, ...assistantMessages]);
      await refreshMessages();
    } catch (err) {
      setError((err as Error).message || 'Failed to send request');
    } finally {
      setSending(false);
    }
  };

  const handleRequestMoreProducts = async (paging: ProductPagination, messageId: string) => {
    const command = buildProductPageCommand(paging);
    const displayText = paging.query
      ? `"${paging.query}" සඳහා තවත් භාණ්ඩ පෙන්වන්න`
      : 'තවත් භාණ්ඩ පෙන්වන්න';
    setMoreProductsChoiceByMessage((prev) => ({ ...prev, [messageId]: 'yes' }));
    await sendAutomatedTextRequest(displayText, command);
  };

  const handleDeclineMoreProducts = (messageId: string) => {
    setMoreProductsChoiceByMessage((prev) => ({ ...prev, [messageId]: 'no' }));
  };

  const handleRequestProductDetails = async (product: VoiceProduct) => {
    const command = buildProductDetailCommand(product);
    const displayText = `${product.name} ගැන වැඩි විස්තර`;
    await sendAutomatedTextRequest(displayText, command);
  };

  const handleSuggestionSelect = async (suggestion: string) => {
    const value = suggestion.trim();
    if (!value || inputDisabled) return;
    await sendAutomatedTextRequest(value, value);
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
          emitVoiceTyping(false);
          const transcript = finalTranscript.trim() || latestTranscript.trim();
          const shouldSubmit = shouldSubmitRecognitionRef.current;
          shouldSubmitRecognitionRef.current = true;
          setText('');
          if (shouldSubmit && transcript) {
            void submitRecognizedVoiceText(transcript);
          }
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
              {voiceAccessState && voiceAccessState.connectionCount > 1 ? (
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
              sortedMessages.map((message, messageIndex) => {
                const normalizedContent = message.content.trim();
                const normalizedTranscript = (message.transcription || '').trim();
                const { body: contentBody, explanation } =
                  splitMessageExplanation(normalizedContent);
                const isLatestMessage = messageIndex === sortedMessages.length - 1;
                const messagePaging = resolvePaginationForMessage(
                  message,
                  sortedMessages,
                  messageIndex,
                );
                const hasMoreForMessage =
                  message.role === 'assistant' &&
                  Boolean(message.products?.length) &&
                  Boolean(messagePaging) &&
                  Boolean(messagePaging?.hasMore);
                const moreChoice = moreProductsChoiceByMessage[message.id];
                const moreButtonsDisabled =
                  !isLatestMessage || Boolean(moreChoice) || inputDisabled;
                const hideMainContent =
                  message.channel === 'voice' &&
                  normalizedTranscript.length > 0 &&
                  contentBody.localeCompare(normalizedTranscript, undefined, {
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
                      {!hideMainContent && contentBody ? (
                        <MarkdownMessage content={contentBody} />
                      ) : null}
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
                      {message.role === 'assistant' &&
                      message.products &&
                      message.products.length > 0 ? (
                        <ProductCardTable
                          products={message.products}
                          onRequestDetails={(product) => void handleRequestProductDetails(product)}
                          disabled={inputDisabled}
                        />
                      ) : null}
                      {message.role === 'assistant' &&
                      message.suggestions &&
                      message.suggestions.length > 0 ? (
                        <SuggestionChips
                          suggestions={message.suggestions}
                          onSelect={(s) => void handleSuggestionSelect(s)}
                          disabled={inputDisabled}
                        />
                      ) : null}
                      {message.role === 'assistant' && explanation ? (
                        <div className="mt-2 border-t border-border/60 pt-2">
                          <MarkdownMessage content={explanation} />
                        </div>
                      ) : null}
                      {hasMoreForMessage ? (
                        <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
                          <p className="text-xs text-foreground">
                            {buildMoreProductsPrompt(message, messagePaging as ProductPagination)}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              disabled={moreButtonsDisabled}
                              onClick={() =>
                                messagePaging
                                  ? void handleRequestMoreProducts(messagePaging, message.id)
                                  : undefined
                              }
                              className="inline-flex h-8 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/15 disabled:pointer-events-none disabled:opacity-50"
                            >
                              ඔව්
                            </button>
                            <button
                              type="button"
                              disabled={moreButtonsDisabled}
                              onClick={() => handleDeclineMoreProducts(message.id)}
                              className="inline-flex h-8 items-center justify-center rounded-md border border-muted-foreground/25 bg-background px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                            >
                              නැත
                            </button>
                          </div>
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
