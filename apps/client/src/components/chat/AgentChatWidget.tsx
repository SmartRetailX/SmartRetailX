import { Loader2, MessageCircle, Mic, MicOff, Send, X } from 'lucide-react'
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { useVoiceChatRuntime } from '@/hooks/useVoiceChatRuntime'

export default function AgentChatWidget() {
  const { user, isCustomer } = useAuth()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
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

  return (
    <>
      {open ? (
        <div className="fixed bottom-24 right-6 z-50 flex h-[32rem] w-[22rem] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <div>
              <p className="text-sm font-semibold">AI Voice and Text Assistant</p>
              <p className="text-xs text-gray-500">Use voice or text in one secure thread</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={messageListRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {isLoadingSession ? (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Loading chat history...</span>
              </div>
            ) : null}

            {!isLoadingSession && messages.length === 0 ? (
              <div className="rounded-md border border-dashed border-gray-300 p-3 text-xs text-gray-500 dark:border-gray-700">
                Start with text or voice. Voice messages are stored with transcript.
              </div>
            ) : null}

            {messages.map((message) => {
              const isUser = message.role === 'user'
              return (
                <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              )
            })}
          </div>

          {liveTranscript ? (
            <div className="border-t border-gray-200 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">
              Live: {liveTranscript}
            </div>
          ) : null}
          {error ? <div className="px-3 pb-2 text-xs text-red-600">{error}</div> : null}

          <div className="border-t border-gray-200 p-3 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isRunning}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'
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
                className="h-9 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-primary dark:border-gray-600 dark:bg-gray-800"
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
