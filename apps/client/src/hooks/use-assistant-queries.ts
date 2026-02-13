import { useEffect, useRef, useState } from 'react';
import { useAssistantQuery, useSpeechToText } from '@/queries/assistant.queries';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

import type { LanguageMode, QueryLog } from '@/types/voice-assistant';

export function useAssistantQueries() {
  const [logs, setLogs] = useState<QueryLog[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState<LanguageMode>('si');
  const onRecognizedTextRef = useRef<((text: string) => void) | null>(null);
  const hasProcessedRef = useRef(false);

  const speechToTextMutation = useSpeechToText();
  const assistantQueryMutation = useAssistantQuery();

  const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } =
    useSpeechRecognition();

  // Handle when transcript changes
  useEffect(() => {
    if (transcript && !listening && !hasProcessedRef.current) {
      // Recognition has ended and we have a transcript
      hasProcessedRef.current = true;

      if (onRecognizedTextRef.current) {
        onRecognizedTextRef.current(transcript);
      }

      // Send to assistant
      assistantQueryMutation
        .mutateAsync({
          query: transcript,
          language: currentLanguage,
        })
        .then((result) => {
          const log: QueryLog = {
            id: Date.now().toString(),
            timestamp: new Date(),
            query: transcript,
            response: result.response,
            language: currentLanguage,
            method: 'voice',
          };

          setLogs((prev) => [log, ...prev]);
        })
        .catch((error) => {
          console.error('Assistant query failed:', error);
        })
        .finally(() => {
          resetTranscript();
          hasProcessedRef.current = false;
        });
    }
  }, [transcript, listening, currentLanguage, assistantQueryMutation, resetTranscript]);

  const handleTextQuery = async (query: string, language: LanguageMode) => {
    try {
      const result = await assistantQueryMutation.mutateAsync({
        query,
        language,
      });

      const log: QueryLog = {
        id: Date.now().toString(),
        timestamp: new Date(),
        query,
        response: result.response,
        language,
        method: 'text',
      };

      setLogs((prev) => [log, ...prev]);
    } catch (error) {
      console.error('Text query failed:', error);
      throw error;
    }
  };

  const handleVoiceQuery = async (audioBlob: Blob, language: LanguageMode) => {
    try {
      // Send to server for speech-to-text
      const sttResult = await speechToTextMutation.mutateAsync({
        audio: audioBlob,
        language,
      });

      // Check if speech-to-text failed or returned empty text
      if (!sttResult.success || !sttResult.text || sttResult.text.trim().length === 0) {
        const errorMessage = sttResult.error || 'No speech detected in audio';
        console.error('Speech-to-text failed:', errorMessage);
        
        // Log the failed attempt
        const errorLog: QueryLog = {
          id: Date.now().toString(),
          timestamp: new Date(),
          query: '[No speech detected]',
          response: `Error: ${errorMessage}`,
          language,
          method: 'voice',
          confidence: 0,
          detectedLanguage: sttResult.detectedLanguage,
          duration: sttResult.duration,
        };
        
        setLogs((prev) => [errorLog, ...prev]);
        throw new Error(errorMessage);
      }

      // Send recognized text to assistant
      const assistantResult = await assistantQueryMutation.mutateAsync({
        query: sttResult.text,
        language,
      });

      const log: QueryLog = {
        id: Date.now().toString(),
        timestamp: new Date(),
        query: sttResult.text,
        response: assistantResult.response,
        language,
        method: 'voice',
        confidence: sttResult.confidence,
        detectedLanguage: sttResult.detectedLanguage,
        duration: sttResult.duration,
      };

      setLogs((prev) => [log, ...prev]);

      return sttResult;
    } catch (error) {
      console.error('Voice query failed:', error);
      throw error;
    }
  };

  const handleClientSideRecognition = async (
    language: LanguageMode,
    onRecognizedText: (text: string) => void,
  ) => {
    if (!browserSupportsSpeechRecognition) {
      alert('Speech recognition is not supported in this browser');
      return;
    }

    if (language === 'si') {
      console.warn(
        'Note: Sinhala speech recognition support may be limited. For best results, use Chrome browser.',
      );
    }

    try {
      setCurrentLanguage(language);
      onRecognizedTextRef.current = onRecognizedText;
      hasProcessedRef.current = false;

      onRecognizedText(
        `Listening in ${language === 'si' ? 'Sinhala' : 'English'}... Please speak now`,
      );

      resetTranscript();

      await SpeechRecognition.startListening({
        language: language === 'si' ? 'si-LK' : 'en-US',
        continuous: false,
      });
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      alert('Failed to start speech recognition. Please check your browser permissions.');
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return {
    logs,
    isProcessing: speechToTextMutation.isPending || assistantQueryMutation.isPending,
    handleTextQuery,
    handleVoiceQuery,
    handleClientSideRecognition,
    clearLogs,
    copyToClipboard,
  };
}
