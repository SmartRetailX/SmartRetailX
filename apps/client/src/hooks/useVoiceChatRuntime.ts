import { type AppendMessage, type ThreadMessageLike, useExternalStoreRuntime } from '@assistant-ui/react'
import { type VoiceChatResponseDto } from '@smart-retail-x/shared-types'
import { useCallback, useEffect, useRef, useState } from 'react'

import apiClient from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/constants'

type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
}

type VoiceRuntimeMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt: string
}

type VoiceChatRuntimeOptions = {
  language?: string
  user?: {
    id?: string
    name?: string
    email?: string
    role?: string
  } | null
  intents?: string[]
}

const toThreadMessage = (message: VoiceRuntimeMessage): ThreadMessageLike => ({
  id: message.id,
  role: message.role,
  content: [{ type: 'text', text: message.text }],
  createdAt: new Date(message.createdAt),
})

const getAppendMessageText = (message: AppendMessage): string => {
  if (!Array.isArray(message.content)) {
    return ''
  }

  return message.content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join(' ')
    .trim()
}

export function useVoiceChatRuntime(options?: VoiceChatRuntimeOptions) {
  const defaultLanguage = options?.language || 'auto'
  const userRole = options?.user?.role?.toLowerCase() || 'guest'
  const intents =
    options?.intents || ['offers', 'order_history', 'buying_suggestions', 'prices', 'product_search']

  const [messages, setMessages] = useState<VoiceRuntimeMessage[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [liveTranscript, setLiveTranscript] = useState('')

  const sessionIdRef = useRef(`voice-${Date.now()}`)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const finalTranscriptRef = useRef('')
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const recordingStartedAtRef = useRef<number>(0)
  const lastAudioUrlRef = useRef<string | null>(null)
  const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null)

  const appendMessage = useCallback((role: VoiceRuntimeMessage['role'], text: string) => {
    const next: VoiceRuntimeMessage = {
      id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      role,
      text,
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, next])
  }, [])

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const stopRecognition = useCallback(() => {
    try {
      recognitionRef.current?.stop()
    } catch {
      // noop
    }
  }, [])

  const sendAudioBlob = useCallback(
    async (blob: Blob, transcriptText?: string) => {
      const formData = new FormData()
      formData.append('audio', blob, `voice-${Date.now()}.webm`)
      formData.append('language', defaultLanguage)
      formData.append('sessionId', sessionIdRef.current)
      formData.append('userRole', userRole)
      if (options?.user?.id) {
        formData.append('userId', options.user.id)
      }
      formData.append('intents', intents.join(','))
      if (transcriptText?.trim()) {
        formData.append('transcriptText', transcriptText.trim())
      }

      setIsRunning(true)
      setError(null)

      try {
        const { data } = await apiClient.post<VoiceChatResponseDto>(API_ENDPOINTS.VOICE.CHAT, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000,
        })

        if (!data.success) {
          throw new Error(data.error || 'Voice processing failed')
        }

        if (data.transcription) {
          appendMessage('user', data.transcription)
        }

        if (data.response) {
          appendMessage('assistant', data.response)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Voice request failed'
        setError(message)
      } finally {
        setIsRunning(false)
      }
    },
    [appendMessage, defaultLanguage, intents, options?.user?.id, userRole],
  )

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Audio recording is not supported in this browser')
      return
    }

    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
      })

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      finalTranscriptRef.current = ''
      setLiveTranscript('')
      streamRef.current = stream
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        const recordedMs = Date.now() - recordingStartedAtRef.current
        stopRecognition()
        const audioBlob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        chunksRef.current = []
        if (lastAudioUrlRef.current) {
          URL.revokeObjectURL(lastAudioUrlRef.current)
        }
        const nextUrl = URL.createObjectURL(audioBlob)
        lastAudioUrlRef.current = nextUrl
        setLastAudioUrl(nextUrl)
        stopTracks()
        if (recordedMs < 2500) {
          setError('Please speak for at least 2-3 seconds and try again.')
          return
        }
        await sendAudioBlob(audioBlob, finalTranscriptRef.current)
      }

      const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
      if (RecognitionCtor) {
        const recognition = new RecognitionCtor()
        recognition.lang = defaultLanguage.startsWith('en') ? 'en-US' : 'si-LK'
        recognition.interimResults = true
        recognition.continuous = true
        recognition.onresult = (event) => {
          let interimText = ''
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const text = event.results[i]?.[0]?.transcript ?? ''
            if (event.results[i].isFinal) {
              finalTranscriptRef.current = `${finalTranscriptRef.current} ${text}`.trim()
            } else {
              interimText += text
            }
          }
          const preview = `${finalTranscriptRef.current} ${interimText}`.trim()
          setLiveTranscript(preview)
        }
        recognition.onerror = () => {
          // Keep audio fallback path; no hard failure here.
        }
        recognitionRef.current = recognition
        recognition.start()
      }

      recorder.start()
      recordingStartedAtRef.current = Date.now()
      setIsRecording(true)
    } catch (err) {
      setIsRecording(false)
      stopTracks()
      const message = err instanceof Error ? err.message : 'Unable to access microphone'
      setError(message)
    }
  }, [defaultLanguage, sendAudioBlob, stopRecognition, stopTracks])

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (!recorder) {
      return
    }

    if (recorder.state !== 'inactive') {
      stopRecognition()
      recorder.stop()
    }

    setIsRecording(false)
  }, [stopRecognition])

  const replayLastRecording = useCallback(() => {
    if (!lastAudioUrlRef.current) {
      return
    }
    const player = new Audio(lastAudioUrlRef.current)
    void player.play()
  }, [])

  useEffect(() => {
    return () => {
      if (lastAudioUrlRef.current) {
        URL.revokeObjectURL(lastAudioUrlRef.current)
      }
      stopRecognition()
    }
  }, [stopRecognition])

  const runtime = useExternalStoreRuntime<VoiceRuntimeMessage>({
    messages,
    isRunning,
    convertMessage: toThreadMessage,
    setMessages,
    onNew: async (message) => {
      const text = getAppendMessageText(message)
      if (!text) {
        return
      }

      appendMessage('user', text)
      appendMessage('assistant', 'Voice pipeline expects recorded audio. Please use the microphone button.')
    },
  })

  return {
    runtime,
    isRecording,
    isRunning,
    error,
    liveTranscript,
    hasLastRecording: Boolean(lastAudioUrl),
    startRecording,
    stopRecording,
    replayLastRecording,
  }
}
