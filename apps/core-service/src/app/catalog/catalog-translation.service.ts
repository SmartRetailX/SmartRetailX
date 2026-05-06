import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@smart-retail-x/config';

type TranslationResult = {
  nameSi: string | null;
  descriptionSi: string | null;
};

type OpenAiResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

@Injectable()
export class CatalogTranslationService {
  private readonly logger = new Logger(CatalogTranslationService.name);
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.model =
      this.configService.get<string>('OPENAI_TRANSLATION_MODEL', 'gpt-4o-mini') ?? 'gpt-4o-mini';
    this.baseUrl =
      this.configService.get<string>('OPENAI_API_BASE_URL', 'https://api.openai.com/v1') ??
      'https://api.openai.com/v1';
  }

  async translateProductFields(input: {
    name?: string | null;
    description?: string | null;
  }): Promise<TranslationResult> {
    const name = input.name?.trim() || '';
    const description = input.description?.trim() || '';

    if (!name && !description) {
      return { nameSi: null, descriptionSi: null };
    }

    if (!this.apiKey) {
      this.logger.warn('OPENAI_API_KEY is missing; Sinhala translation skipped');
      return { nameSi: null, descriptionSi: null };
    }

    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'Translate retail product data from English to Sinhala. Return only valid JSON with keys nameSi and descriptionSi. Keep units, sizes, brand names, numbers, and SKU-like tokens intact. Use natural Sinhala for shopper-facing copy.',
            },
            {
              role: 'user',
              content: JSON.stringify({
                name,
                description,
              }),
            },
          ],
        }),
      });

      if (!response.ok) {
        this.logger.warn(`Translation request failed with status ${response.status}`);
        return { nameSi: null, descriptionSi: null };
      }

      const payload = (await response.json()) as OpenAiResponse;
      const content = payload.choices?.[0]?.message?.content?.trim();
      if (!content) {
        return { nameSi: null, descriptionSi: null };
      }

      const parsed = JSON.parse(content) as {
        nameSi?: string | null;
        descriptionSi?: string | null;
      };
      return {
        nameSi: parsed.nameSi?.trim() || null,
        descriptionSi: parsed.descriptionSi?.trim() || null,
      };
    } catch (error) {
      this.logger.warn(`Translation request failed: ${(error as Error).message}`);
      return { nameSi: null, descriptionSi: null };
    }
  }
}
