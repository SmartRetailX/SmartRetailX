import { Check, Copy, Expand, Loader2, MessageCircle, Mic, MicOff, Send, X } from 'lucide-react'
import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/contexts/AuthContext'
import { useVoiceChatRuntime } from '@/hooks/useVoiceChatRuntime'

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

export default function AgentChatWidget() {
  const { user, isCustomer } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const copyResetTimeoutRef = useRef<number | null>(null)
  const messageListRef = useRef<HTMLDivElement | null>(null)

  if (!isCustomer) {
    return null
  }

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
    if (!open) {
      return
    }

    const target = messageListRef.current
    if (!target) {
      return
    }

    target.scrollTop = target.scrollHeight
  }, [messages, open])

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

  const openFullAssistant = () => {
    setOpen(false)
    navigate('/assistant')
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
    <>
      {open ? (
        <div className="fixed bottom-24 right-6 z-50 flex h-[32rem] w-[22rem] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold">AI Voice and Text Assistant</p>
              <p className="text-xs text-muted-foreground">Use voice or text in one secure thread</p>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={openFullAssistant}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                aria-label="Open full screen assistant"
                title="Open full assistant"
              >
                <Expand className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div ref={messageListRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {isLoadingSession ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Loading chat history...</span>
              </div>
            ) : null}

            {!isLoadingSession && messages.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                Start with text or voice. Voice messages are stored with transcript.
              </div>
            ) : null}

            {messages.map((message) => {
              const isUser = message.role === 'user'
              const copied = copiedMessageId === message.id
              const messageTime = formatMessageTime(message.createdAt)

              return (
                <div
                  key={message.id}
                  className={`group flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {isUser ? message.text : <AssistantMarkdownMessage text={message.text} />}
                  </div>

                  <div
                    className={`mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 ${
                      isUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span>{messageTime}</span>
                    <button
                      type="button"
                      onClick={() => void handleCopyMessage(message.id, message.text)}
                      className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-accent hover:text-accent-foreground"
                      aria-label="Copy message"
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {liveTranscript ? (
            <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              Live: {liveTranscript}
            </div>
          ) : null}
          {error ? <div className="px-3 pb-2 text-xs text-destructive">{error}</div> : null}

          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isRunning}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  isRecording ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'
                }`}
                aria-label={isRecording ? 'Stop voice recording' : 'Start voice recording'}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => void handleKeyDown(event)}
                placeholder="Type a message..."
                className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                disabled={isRunning}
              />

              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!input.trim() || isRunning}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105"
        aria-label="Toggle chat assistant"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </>
  )
}
