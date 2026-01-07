import { useState } from 'react';
import { Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import type { LanguageMode } from '@/types/voice-assistant';

import { LanguageSelector } from './language-selector';

interface TextQueryCardProps {
  languageMode: LanguageMode;
  onLanguageChange: (mode: LanguageMode) => void;
  onSubmit: (query: string, language: LanguageMode) => Promise<void>;
  isLoading: boolean;
}

export function TextQueryCard({
  languageMode,
  onLanguageChange,
  onSubmit,
  isLoading,
}: TextQueryCardProps) {
  const [textInput, setTextInput] = useState('');

  const handleSubmit = async () => {
    if (!textInput.trim()) return;
    await onSubmit(textInput.trim(), languageMode);
    setTextInput('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Text Query
        </CardTitle>
        <CardDescription>Send a text query directly to the assistant</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LanguageSelector languageMode={languageMode} onLanguageChange={onLanguageChange} />

        <Textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Type your query here..."
          className="min-h-24"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />

        <Button onClick={handleSubmit} disabled={!textInput.trim() || isLoading} className="w-full">
          {isLoading ? 'Sending...' : 'Send Text Query'}
        </Button>
      </CardContent>
    </Card>
  );
}
