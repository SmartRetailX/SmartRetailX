export type LanguageMode = 'si' | 'en';

export interface QueryLog {
  id: string;
  timestamp: Date;
  query: string;
  response: string;
  language: LanguageMode;
  method: 'text' | 'voice';
  confidence?: number;
  detectedLanguage?: string;
  duration?: number;
}
