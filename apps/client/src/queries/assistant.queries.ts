import {
  assistantService,
  type AssistantQueryRequest,
  type AssistantQueryResponse,
  type SpeechToTextRequest,
  type SpeechToTextResponse,
} from '@/services/assistant.service';
import { useMutation, type UseMutationOptions } from '@tanstack/react-query';

/**
 * Hook for speech-to-text conversion
 */
export function useSpeechToText(
  options?: UseMutationOptions<SpeechToTextResponse, Error, SpeechToTextRequest>,
) {
  return useMutation({
    mutationFn: (data: SpeechToTextRequest) => assistantService.speechToText(data),
    ...options,
  });
}

/**
 * Hook for assistant query
 */
export function useAssistantQuery(
  options?: UseMutationOptions<AssistantQueryResponse, Error, AssistantQueryRequest>,
) {
  return useMutation({
    mutationFn: (data: AssistantQueryRequest) => assistantService.query(data),
    ...options,
  });
}
