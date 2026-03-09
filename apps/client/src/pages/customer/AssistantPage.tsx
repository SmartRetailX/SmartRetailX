import { Check, Copy, Loader2, Mic, MicOff, Plus, RefreshCcw, Send } from 'lucide-react'
import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { useVoiceChatRuntime } from '@/hooks/useVoiceChatRuntime'
import { cn } from '@/lib/utils'

function renderInlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g)

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`md-strong-${index}`} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      )
    }

    if (part.startsWith('_') && part.endsWith('_')) {
      return (
        <em key={`md-em-${index}`} className="italic text-muted-foreground">
          {part.slice(1, -1)}
        </em>
      )
    }

    return <span key={`md-text-${index}`}>{part}</span>
  })
}

function AssistantMarkdownMessage({ text }: { text: string }) {
  const lines = text.split('\n')

  return (
    <div className="space-y-1.5 leading-relaxed">
      {lines.map((rawLine, index) => {
        const line = rawLine.trim()
        if (!line) {
          return <div key={`md-space-${index}`} className="h-1" />
        }

        const headingMatch = line.match(/^###\s+(.+)$/)
        if (headingMatch) {
          return (
            <p key={`md-h-${index}`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {renderInlineMarkdown(headingMatch[1])}
            </p>
          )
        }

        const orderedMatch = line.match(/^(\d+)\.\s+(.+)$/)
        if (orderedMatch) {
          return (
            <p key={`md-ol-${index}`} className="pl-0.5">
              <span className="mr-1 font-medium text-muted-foreground">{orderedMatch[1]}.</span>
              {renderInlineMarkdown(orderedMatch[2])}
            </p>
          )
        }

        const bulletMatch = line.match(/^-\s+(.+)$/)
        if (bulletMatch) {
          return (
            <p key={`md-ul-${index}`} className="pl-0.5">
              <span className="mr-1 font-medium text-muted-foreground">•</span>
              {renderInlineMarkdown(bulletMatch[1])}
            </p>
          )
        }

        return <p key={`md-p-${index}`}>{renderInlineMarkdown(line)}</p>
      })}
    </div>
  )
}

function formatMessageTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function AssistantPage() {
  const { user } = useAuth()
  const [input, setInput] = useState('')
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const copyResetTimeoutRef = useRef<number | null>(null)
  const messageEndRef = useRef<HTMLDivElement | null>(null)

  const role = user?.role?.toLowerCase()
  const intents = useMemo(
    () =>
      role === 'customer'
        ? ['offers', 'order_history', 'buying_suggestions', 'prices', 'product_search']
        : ['offers', 'prices', 'product_search', 'general'],
    [role],
  )

  const {
    messages,
    isRecording,
    isRunning,
    isLoadingSession,
    error,
    liveTranscript,
    sendTextMessage,
    startRecording,
    stopRecording,
    refreshSession,
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

  useEffect(() => {
    const target = messageEndRef.current
    if (!target) {
      return
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, liveTranscript])

  const handleSend = async () => {
    const value = input.trim()
    if (!value || isRunning) {
      return
    }

    setInput('')
    await sendTextMessage(value)
  }

  const handleKeyDown = async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) {
      return
    }
    event.preventDefault()
    await handleSend()
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
      return
    }

    void startRecording()
  }

  const handleCopyMessage = async (messageId: string, text: string) => {
    if (!text.trim()) {
      return
    }

    try {
      await navigator.clipboard.writeText(text)
      setCopiedMessageId(messageId)

      if (copyResetTimeoutRef.current) {
        window.clearTimeout(copyResetTimeoutRef.current)
      }

      copyResetTimeoutRef.current = window.setTimeout(() => {
        setCopiedMessageId(null)
      }, 1200)
    } catch {
      // Ignore clipboard errors silently for unsupported environments.
    }
  }

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current) {
        window.clearTimeout(copyResetTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="mx-auto flex min-h-[calc(100vh-113px)] w-full max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Assistant</h1>
          <p className="text-sm text-muted-foreground">
            Advanced voice and text assistant for product discovery, offers, and order help.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/">Back to Shop</Link>
          </Button>
          <Button variant="outline" onClick={() => void refreshSession()} disabled={isLoadingSession || isRunning}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Reload Chat
          </Button>
        </div>
      </div>

      <div className="space-y-4 pb-36">
        {isLoadingSession ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading chat history...
          </div>
        ) : null}

        {!isLoadingSession && messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground">
            Start by typing a message or recording your voice.
          </div>
        ) : null}

        {messages.map((message) => {
          const isUser = message.role === 'user'
          const messageTime = formatMessageTime(message.createdAt)
          const copied = copiedMessageId === message.id

          return (
            <div key={message.id} className={`group flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  isUser
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-background text-foreground'
                }`}
              >
                {isUser ? message.text : <AssistantMarkdownMessage text={message.text} />}
              </div>

              <div
                className={`mt-1 flex items-center gap-2 text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                <span>
                  {isUser ? 'You' : 'Assistant'}
                  {messageTime ? ` • ${messageTime}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => void handleCopyMessage(message.id, message.text)}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-accent hover:text-accent-foreground"
                  aria-label="Copy message"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )
        })}

        <div ref={messageEndRef} />
      </div>

      <div className="sticky bottom-0 z-20 mt-auto backdrop-blur supports-[backdrop-filter]:bg-background/90 pb-4">
        {liveTranscript ? (
          <div className="mb-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Live: {liveTranscript}
          </div>
        ) : null}

        {error ? <div className="mb-2 px-1 text-sm text-destructive">{error}</div> : null}

        <div className="mx-auto w-full">
          <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 shadow-sm">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Add attachment"
            >
              <Plus className="h-4 w-4" />
            </button>

            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => void handleKeyDown(event)}
              placeholder="Ask anything"
              disabled={isRunning}
              className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />

            <button
              type="button"
              onClick={toggleRecording}
              disabled={isRunning}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
              aria-label={isRecording ? 'Stop voice recording' : 'Start voice recording'}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => {
                if (input.trim()) {
                  void handleSend()
                  return
                }

                toggleRecording()
              }}
              disabled={isRunning}
              className={cn(
                'inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors disabled:opacity-50',
                input.trim() ? 'bg-primary hover:bg-primary/90' : 'bg-foreground hover:bg-foreground/90',
              )}
              aria-label={input.trim() ? 'Send message' : isRecording ? 'Stop voice recording' : 'Start voice recording'}
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : input.trim() ? (
                <Send className="h-4 w-4" />
              ) : isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
