import { apiClient } from './api-client';

export interface SpeechToTextRequest {
  audio: Blob;
  language: 'si' | 'en';
}

export interface SpeechToTextResponse {
  text: string;
  confidence?: number;
  detectedLanguage?: string;
  duration?: number;
}

export interface AssistantQueryRequest {
  query: string;
  language: 'si' | 'en';
}

export interface AssistantQueryResponse {
  response: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export const assistantService = {
  /**
   * Send audio file for speech-to-text conversion
   */
  speechToText: async (data: SpeechToTextRequest): Promise<SpeechToTextResponse> => {
    const formData = new FormData();
    formData.append('audio', data.audio, 'recording.webm');
    formData.append('language', data.language);

    const response = await apiClient.post<SpeechToTextResponse>(
      '/assistant/speech-to-text',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    return response.data;
  },

  /**
   * Send query to assistant for processing
   */
  query: async (data: AssistantQueryRequest): Promise<AssistantQueryResponse> => {
    const response = await apiClient.post<AssistantQueryResponse>('/assistant/text-query', data);
    return response.data;
  },
};
