import { Injectable } from '@nestjs/common';

type RegexReplacementRule = {
  pattern: RegExp;
  replacement: string;
};

@Injectable()
export class VoiceTranscriptRefinerService {
  private readonly tokenReplacements: ReadonlyArray<readonly [from: string, to: string]> = [
    // Order related Sinhala/English mis-transcriptions
    ['ඇනවුම', 'ඇණවුම'],
    ['ඇනවුම්', 'ඇණවුම්'],
    ['තියෙනව', 'තියෙනවා'],
    ['තියනව', 'තියෙනවා'],
    ['තිනව', 'තියෙනවා'],
    ['නැද්', 'නැද්ද'],
    ['ඔඩර්', 'ඔර්ඩර්'],
    ['ඔඩර්ස්', 'ඔර්ඩර්ස්'],
    ['ඕඩර්', 'ඔර්ඩර්'],
    ['ඕඩර්ස්', 'ඔර්ඩර්ස්'],
    ['ඔඩර', 'ඔර්ඩර්'],
    ['ඔඩරස්', 'ඔර්ඩර්ස්'],
    ['ඕඩර', 'ඔර්ඩර්'],
    ['ඕඩරස්', 'ඔර්ඩර්ස්'],
    ['oder', 'order'],
    ['ordr', 'order'],
    ['ordar', 'order'],
    ['orderz', 'orders'],
    ['orderss', 'orders'],
    ['histry', 'history'],
    ['histroy', 'history'],
    ['detials', 'details'],
    ['deatils', 'details'],

    // Offer/promotion related mis-transcriptions
    ['ඔපර්', 'ඔෆර්'],
    ['ඔපර්ස්', 'ඔෆර්ස්'],
    ['ඔෆස්', 'ඔෆර්ස්'],
    ['ඕෆර්', 'ඔෆර්'],
    ['ඕෆර්ස්', 'ඔෆර්ස්'],
    ['ඔෆර', 'ඔෆර්'],
    ['ඔෆරස්', 'ඔෆර්ස්'],
    ['offerz', 'offers'],
    ['offerss', 'offers'],
    ['offfer', 'offer'],
    ['offfers', 'offers'],
    ['offres', 'offers'],
    ['promotin', 'promotion'],
    ['promtion', 'promotion'],
    ['promosion', 'promotion'],
    ['proomotion', 'promotion'],
    ['disscount', 'discount'],
    ['discout', 'discount'],

    // Recommendation/suggestion related mis-transcriptions
    ['recommand', 'recommend'],
    ['recomend', 'recommend'],
    ['reccomend', 'recommend'],
    ['reccommend', 'recommend'],
    ['sugest', 'suggest'],
    ['suggesion', 'suggestion'],
    ['sugession', 'suggestion'],
    ['නර්දේශ', 'නිර්දේශ'],
    ['නිර්දෙශ', 'නිර්දේශ'],
    ['යොජනා', 'යෝජනා'],
    ['රෙකමන්ඩ්', 'recommend'],
    ['රෙකමෙන්ඩ්', 'recommend'],
    ['රිකමන්ඩ්', 'recommend'],
    ['රිකමෙන්ඩ්', 'recommend'],
    ['සජෙස්ට්', 'suggest'],

    // Product/price/stock/search related mis-transcriptions
    ['prize', 'price'],
    ['prise', 'price'],
    ['praice', 'price'],
    ['prcie', 'price'],
    ['pirce', 'price'],
    ['ප්‍රයිස්', 'price'],
    ['ප්‍රය්ස්', 'price'],
    ['stok', 'stock'],
    ['stoke', 'stock'],
    ['stcok', 'stock'],
    ['ස්ටොක්', 'stock'],
    ['ස්ටාක්', 'stock'],
    ['avalable', 'available'],
    ['availble', 'available'],
    ['avaiable', 'available'],
    ['avaible', 'available'],
    ['avilable', 'available'],
    ['අවේලබල්', 'available'],
    ['ඇවලබල්', 'available'],
    ['අවේලබල්ද', 'available'],
    ['prodcut', 'product'],
    ['pruduct', 'product'],
    ['produck', 'product'],
    ['ප්‍රොඩක්ට්', 'product'],
    ['catagory', 'category'],
    ['categary', 'category'],
    ['categry', 'category'],
    ['කැටගරි', 'category'],
    ['serch', 'search'],
    ['seach', 'search'],
    ['sreach', 'search'],
    ['සර්ච්', 'search'],
  ];

  private readonly regexReplacements: ReadonlyArray<RegexReplacementRule> = [
    // Keep Sinhala diacritics intact and remove hidden whitespace noise from STT.
    { pattern: /[\u200B-\u200D\uFEFF]/gu, replacement: '' },

    // Normalize quote characters that can break token boundaries.
    { pattern: /[\u2018\u2019]/gu, replacement: "'" },
    { pattern: /[\u201C\u201D]/gu, replacement: '"' },

    // Normalize frequently collapsed mixed-language command phrases.
    { pattern: /\border\s*hist(?:ory|roy|ry)\b/giu, replacement: 'order history' },
    { pattern: /\bmy\s+all\s+orders\b/giu, replacement: 'all my orders' },
    { pattern: /\bbuying\s*list\b/giu, replacement: 'buying list' },
    { pattern: /\bshopping\s*list\b/giu, replacement: 'shopping list' },

    // Broad typo normalization for common intent words.
    { pattern: /\bpri(?:ce|se|ze|sce|ice)\b/giu, replacement: 'price' },
    { pattern: /\bsto(?:ck|ke|kc|cke)\b/giu, replacement: 'stock' },
    { pattern: /\bava(?:i|y)?l(?:a)?b(?:l|le|el)\b/giu, replacement: 'available' },
    { pattern: /\brec(?:o)?m{1,2}(?:e)?nd(?:ation|ations|ed|s)?\b/giu, replacement: 'recommend' },
    { pattern: /\bsug+e?s+t(?:ion|ions)?\b/giu, replacement: 'suggestion' },
    { pattern: /\bpro(?:mo)?t(?:ion|ions|in)\b/giu, replacement: 'promotion' },
    { pattern: /\bdisc(?:ou)?nt(?:s)?\b/giu, replacement: 'discount' },

    // Common Sinhala orthography normalization used in mixed voice input.
    { pattern: /ප්ර/gu, replacement: 'ප්‍ර' },
    { pattern: /ත්ය/gu, replacement: 'ත්‍ය' },
  ];

  refine(transcriptText: string | undefined): string | undefined {
    const input = transcriptText?.trim();
    if (!input) {
      return transcriptText?.trim();
    }

    let refined = input.normalize('NFC');

    for (const rule of this.regexReplacements) {
      refined = refined.replace(rule.pattern, rule.replacement);
    }

    for (const [from, to] of this.tokenReplacements) {
      refined = this.replaceToken(refined, from, to);
    }

    refined = refined.replace(/\s+/g, ' ').trim();
    return refined;
  }

  private replaceToken(source: string, from: string, to: string): string {
    if (!source || !from || from === to) {
      return source;
    }

    const escapedFrom = this.escapeRegex(from);
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}\\p{M}])${escapedFrom}(?=$|[^\\p{L}\\p{N}\\p{M}])`, 'giu');

    return source.replace(pattern, (_match, prefix: string) => `${prefix}${to}`);
  }

  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
