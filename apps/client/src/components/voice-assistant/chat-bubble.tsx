import { useEffect, useRef, useState } from 'react';
import { useAssistantQuery, useSpeechToText } from '@/queries/assistant.queries';
import { Languages, MessageCircle, Mic, Send, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  debug?: {
    recognizedText?: string;
    confidence?: number;
    detectedLanguage?: string;
  };
}

type LanguageMode = 'si' | 'en';

export function VoiceAssistantChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [languageMode, setLanguageMode] = useState<LanguageMode>('si');
  const [recordingStatus, setRecordingStatus] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // TanStack Query mutations
  const speechToTextMutation = useSpeechToText();
  const assistantQueryMutation = useAssistantQuery();

  // Initialize MediaRecorder for audio capture
  useEffect(() => {
    return () => {
      // Cleanup: stop media stream when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    console.log('User message sent:', content.trim());
    console.log('Current messages:', [...messages, userMessage]);

    setInputText('');

    // Process with assistant using TanStack Query mutation
    try {
      const result = await assistantQueryMutation.mutateAsync({
        query: content.trim(),
        language: languageMode,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response || 'No response',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting assistant response:', error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const startListening = async () => {
    if (isListening) return;

    try {
      console.log(`Requesting microphone access...`);
      setRecordingStatus('Requesting microphone...');

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      console.log(`Microphone access granted`);
      setRecordingStatus('Recording...');

      // Create MediaRecorder with supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log(`Audio chunk received: ${event.data.size} bytes`);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log(`Recording stopped, processing audio...`);
        console.log(`Total chunks collected: ${audioChunksRef.current.length}`);
        setRecordingStatus('Processing...');

        if (audioChunksRef.current.length === 0) {
          console.error('No audio data captured!');
          setRecordingStatus('No audio recorded');
          setTimeout(() => setRecordingStatus(''), 2000);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log(`Audio blob created: ${audioBlob.size} bytes, type: ${audioBlob.type}`);

        if (audioBlob.size === 0) {
          console.error('Audio blob is empty!');
          setRecordingStatus('Recording failed');
          setTimeout(() => setRecordingStatus(''), 2000);
          return;
        }

        // Send audio to backend for transcription
        await sendAudioToBackend(audioBlob);

        // Cleanup
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        audioChunksRef.current = [];
        setRecordingStatus('');
      };

      // Start recording with timeslice to get chunks
      mediaRecorder.start(100); // Collect data every 100ms
      setIsListening(true);
      console.log(`Started recording in ${languageMode === 'si' ? 'Sinhala' : 'English'} mode...`);
      console.log('Tip: Speak naturally. Mixed Sinhala-English is supported by AssemblyAI.');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setRecordingStatus('');
      setIsListening(false);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      console.log('Stopping recording...');
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const sendAudioToBackend = async (audioBlob: Blob) => {
    try {
      setRecordingStatus('Processing...');

      console.log(`Sending audio to backend (${audioBlob.size} bytes)...`);

      // Use TanStack Query mutation for speech-to-text
      const result = await speechToTextMutation.mutateAsync({
        audio: audioBlob,
        language: languageMode,
      });

      console.log('Speech-to-text result:', result);

      if (result.text) {
        // Create user message with recognized text
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: result.text,
          timestamp: new Date(),
          debug: {
            recognizedText: result.text,
            confidence: result.confidence,
            detectedLanguage: result.detectedLanguage,
          },
        };

        setMessages((prev) => [...prev, userMessage]);
        console.log('User message added with recognized text:', result.text);
        console.log('Debug info:', {
          confidence: result.confidence,
          detectedLanguage: result.detectedLanguage,
          duration: result.duration,
        });

        // Send to assistant for processing using mutation
        try {
          const assistantResult = await assistantQueryMutation.mutateAsync({
            query: result.text,
            language: languageMode,
          });

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: assistantResult.response || 'No response',
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
          console.error('Error getting assistant response:', error);

          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Sorry, I encountered an error processing your request.',
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, errorMessage]);
        }
      } else {
        console.warn('No text recognized from audio');
        setRecordingStatus('No speech detected');
        setTimeout(() => setRecordingStatus(''), 2000);
      }
    } catch (error) {
      console.error('Error sending audio to backend:', error);
      setRecordingStatus('Error processing audio');
      setTimeout(() => setRecordingStatus(''), 2000);
    } finally {
      setRecordingStatus('');
    }
  };

  const toggleLanguage = () => {
    const newLang: LanguageMode = languageMode === 'si' ? 'en' : 'si';
    setLanguageMode(newLang);
    console.log(`Language switched to: ${newLang === 'si' ? 'Sinhala' : 'English'}`);

    // Don't allow language change while recording
    if (isListening) {
      alert('Please stop recording before changing language');
      return;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputText);
    }
  };

  return (
    <>
      {/* Floating Chat Bubble Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
          }}
          className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-purple-600 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl"
          aria-label="Open voice assistant"
        >
          <MessageCircle className="h-8 w-8" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[600px] w-[400px] flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl bg-linear-to-r from-blue-600 to-purple-600 p-4 text-white">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <h3 className="font-semibold">Sinhala Voice Assistant</h3>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                console.log('Chat bubble closed');
              }}
              className="rounded-full p-1 transition-colors hover:bg-white/20"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-slate-500 dark:text-slate-400">
                <div>
                  <MessageCircle className="mx-auto mb-2 h-12 w-12 opacity-50" />
                  <p className="text-sm">Start a conversation</p>
                  <p className="text-xs">Type or speak in Sinhala</p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-linear-to-br from-blue-600 to-purple-600 text-white'
                        : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    {message.debug && (
                      <div className="mt-2 rounded border border-white/20 bg-black/10 p-2 text-xs">
                        <p className="font-semibold opacity-75">Debug Info:</p>
                        <p className="opacity-75">
                          Confidence:{' '}
                          {message.debug.confidence
                            ? (message.debug.confidence * 100).toFixed(1)
                            : 'N/A'}
                          %
                        </p>
                        <p className="opacity-75">Detected: {message.debug.detectedLanguage}</p>
                      </div>
                    )}
                    <p
                      className={`mt-1 text-xs ${
                        message.role === 'user'
                          ? 'text-white/70'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            {assistantQueryMutation.isPending && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl bg-slate-100 px-4 py-2 dark:bg-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-slate-400"></div>
                    <div
                      className="h-2 w-2 animate-pulse rounded-full bg-slate-400"
                      style={{ animationDelay: '0.2s' }}
                    ></div>
                    <div
                      className="h-2 w-2 animate-pulse rounded-full bg-slate-400"
                      style={{ animationDelay: '0.4s' }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            {isListening && (
              <div className="mb-2 flex items-center justify-between rounded-lg bg-red-50 p-2 text-red-600 dark:bg-red-950 dark:text-red-400">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-red-600"></div>
                  <span className="text-sm font-medium">
                    {recordingStatus ||
                      `Recording in ${languageMode === 'si' ? 'සිංහල' : 'English'}...`}
                  </span>
                </div>
              </div>
            )}

            {speechToTextMutation.isPending && (
              <div className="mb-2 rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-blue-600"></div>
                  <span className="text-sm">Processing speech...</span>
                </div>
              </div>
            )}

            {/* Language Selection */}
            <div className="mb-2 flex items-center gap-2">
              <Button
                onClick={toggleLanguage}
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                disabled={isListening}
              >
                <Languages className="h-3.5 w-3.5" />
                {languageMode === 'si' ? 'සිංහල' : 'English'}
              </Button>
              <span className="text-xs text-slate-500 dark:text-slate-400" hidden>
                Mixed language supported (AssemblyAI)
              </span>
            </div>

            <div className="flex gap-2">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message or use voice..."
                className="min-h-20 resize-none"
                disabled={
                  isListening || speechToTextMutation.isPending || assistantQueryMutation.isPending
                }
              />
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => (isListening ? stopListening() : startListening())}
                  size="icon"
                  variant={isListening ? 'destructive' : 'secondary'}
                  className="h-10 w-10"
                  aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                >
                  <Mic className={isListening ? 'animate-pulse' : ''} />
                </Button>
                <Button
                  onClick={() => handleSendMessage(inputText)}
                  size="icon"
                  disabled={
                    !inputText.trim() ||
                    speechToTextMutation.isPending ||
                    assistantQueryMutation.isPending
                  }
                  className="h-10 w-10"
                  aria-label="Send message"
                >
                  <Send />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
