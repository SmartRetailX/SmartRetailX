import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  /**
   * Process voice query using AI assistant
   */
  /**
   * Process voice query using AI assistant
   */
  async processVoiceQuery(query: string, language = 'en') {
    this.logger.log(`Processing voice query: "${query}" in ${language}`);

    // Simple Intent Detection for Low Resource / Budget Friendly approach
    // We check for keywords in Sinhala
    const normalizedQuery = query.toLowerCase().trim();

    // Intent: Last Purchase
    // Keywords: "අවසන්" (last), "මිලදී" (purchase/buy), "ගැනීම්" (items/buying), "කුමක්ද" (what)
    // Query: "මගේ අවසන් මිලදී ගැනීම් ලැයිස්තුව කුමක්ද?"
    if (
      normalizedQuery.includes('අවසන්') &&
      (normalizedQuery.includes('මිලදී') || normalizedQuery.includes('ගන්න'))
    ) {
      return this.getLastPurchaseResponse(language);
    }

    // Default response if not understood
    return {
      query,
      language,
      response:
        language === 'si'
          ? 'මට ඔබේ ප්‍රශ්නය තේරුම් ගැනීමට අපහසුයි. කරුණාකර නැවත කියන්න.'
          : "I'm sorry, I didn't catch that. Could you please repeat?",
      intent: 'unknown',
      confidence: 0.0,
      timestamp: new Date().toISOString(),
    };
  }

  private getLastPurchaseResponse(language: string) {
    // Mock Database Result
    const lastOrder = {
      id: 'ORD-12345',
      items: [
        { name: 'Samsung Galaxy S24', price: 250000, qty: 1 },
        { name: 'Tempered Glass', price: 1500, qty: 1 },
      ],
      total: 251500,
      date: '2025-12-29',
    };

    if (language === 'si') {
      // Construct Sinhala Response
      const itemNames = lastOrder.items.map((i) => i.name).join(', ');
      const responseText = `ඔබගේ අවසන් ඇණවුම ${lastOrder.date} දින සිදු කර ඇත. එහි ${itemNames} අඩංගු අතර සම්පූර්ණ එකතුව රුපියල් ${lastOrder.total} කි.`;

      return {
        query: 'Last Purchase Query',
        language,
        response: responseText,
        data: lastOrder,
        intent: 'last_purchase',
        confidence: 0.95,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      query: 'Last Purchase Query',
      language,
      response: `Your last order was on ${lastOrder.date}. It contains ${lastOrder.items.map((i) => i.name).join(', ')} and the total is Rs. ${lastOrder.total}.`,
      data: lastOrder,
      intent: 'last_purchase',
      confidence: 0.95,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Convert speech to text
   */
  async speechToText(audioData: string, language = 'si') {
    this.logger.log(`Processing speech-to-text in ${language}`);

    // TODO: Integrate with speech recognition service
    return {
      text: 'Transcribed text will appear here',
      language,
      confidence: 0.9,
      duration: 0,
    };
  }

  /**
   * Convert text to speech
   */
  async textToSpeech(text: string, language = 'si') {
    this.logger.log(`Generating speech for: "${text}" in ${language}`);

    // TODO: Integrate with text-to-speech service
    return {
      audioUrl: 'https://example.com/audio/response.mp3',
      text,
      language,
      duration: 5,
    };
  }

  /**
   * Get service data
   */
  getData(): { message: string; service: string } {
    return {
      message: 'Voice Assistant Service Ready',
      service: 'assistant-service',
    };
  }
}
