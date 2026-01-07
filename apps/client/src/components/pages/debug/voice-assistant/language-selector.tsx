import { Languages } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { LanguageMode } from '@/types/voice-assistant';

interface LanguageSelectorProps {
  languageMode: LanguageMode;
  onLanguageChange: (mode: LanguageMode) => void;
}

export function LanguageSelector({ languageMode, onLanguageChange }: LanguageSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => onLanguageChange(languageMode === 'si' ? 'en' : 'si')}
      >
        <Languages className="mr-2 h-4 w-4" />
        {languageMode === 'si' ? 'සිංහල' : 'English'}
      </Button>
      <Badge variant="secondary">{languageMode === 'si' ? 'Sinhala' : 'English'}</Badge>
    </div>
  );
}
