/**
 * Voice Assistant API Client
 * Handles communication with the voice assistant service
 */

import { api } from './env';

export interface VoiceQueryRequest {
  query: string;
  language?: 'en' | 'si';
}

export interface VoiceQueryResponse {
  query: string;
  language: string;
  response: string;
  intent: string;
  confidence: number;
  timestamp: string;
}

export interface SpeechToTextRequest {
  audio: string; // Base64 encoded audio
  language?: 'en' | 'si';
}

export interface SpeechToTextResponse {
  text: string;
  language: string;
  confidence: number;
  duration: number;
}

export interface TextToSpeechRequest {
  text: string;
  language?: 'en' | 'si';
}

export interface TextToSpeechResponse {
  audioUrl: string;
  text: string;
  language: string;
  duration: number;
}

export interface AssistantCapabilities {
  languages: string[];
  features: string[];
  model: string;
}

class AssistantClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = api.getBaseUrl();
  }

  /**
   * Send a text query to the voice assistant
   */
  async sendQuery(request: VoiceQueryRequest): Promise<VoiceQueryResponse> {
    const response = await fetch(`${this.baseUrl}/api/assistant/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to send query: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Convert speech to text
   */
  async speechToText(request: SpeechToTextRequest): Promise<SpeechToTextResponse> {
    const response = await fetch(`${this.baseUrl}/api/assistant/speech-to-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to convert speech to text: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Convert text to speech
   */
  async textToSpeech(request: TextToSpeechRequest): Promise<TextToSpeechResponse> {
    const response = await fetch(`${this.baseUrl}/api/assistant/text-to-speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to convert text to speech: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get assistant capabilities
   */
  async getCapabilities(): Promise<AssistantCapabilities> {
    const response = await fetch(`${this.baseUrl}/api/assistant/capabilities`);

    if (!response.ok) {
      throw new Error(`Failed to get capabilities: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Check assistant health
   */
  async checkHealth(): Promise<{ status: string; service: string }> {
    const response = await fetch(`${this.baseUrl}/api/assistant/health`);

    if (!response.ok) {
      throw new Error(`Failed to check health: ${response.statusText}`);
    }

    return response.json();
  }
}

export const assistantClient = new AssistantClient();
