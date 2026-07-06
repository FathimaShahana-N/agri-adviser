import { franc } from "franc-min";
import { SupportedLanguage, SupportedLanguageCode } from "../types";

export const SUPPORTED_LANGUAGES: Record<SupportedLanguageCode, SupportedLanguage> = {
  en: { code: "en", name: "English" },
  ml: { code: "ml", name: "Malayalam" },
  hi: { code: "hi", name: "Hindi" },
  es: { code: "es", name: "Spanish" },
  sw: { code: "sw", name: "Swahili" },
  fr: { code: "fr", name: "French" },
  bn: { code: "bn", name: "Bengali" },
};

// franc reports ISO 639-3 codes; map the ones we support to our app's codes.
const FRANC_TO_SUPPORTED: Record<string, SupportedLanguageCode> = {
  eng: "en",
  mal: "ml",
  hin: "hi",
  spa: "es",
  swh: "sw",
  fra: "fr",
  ben: "bn",
};

// Unicode script blocks let us identify Malayalam/Hindi/Bengali reliably
// even from very short text, where statistical detectors like franc are
// unreliable. Latin-script languages (English/Spanish/Swahili/French)
// still need further disambiguation below since they share a script.
const SCRIPT_PATTERNS: Array<{ code: SupportedLanguageCode; pattern: RegExp }> = [
  { code: "ml", pattern: /[ഀ-ൿ]/ },
  { code: "hi", pattern: /[ऀ-ॿ]/ },
  { code: "bn", pattern: /[ঀ-৿]/ },
];

// Common function words for the Latin-script languages we support. franc's
// trigram model is unreliable on short, casual farmer messages (a 6-word
// English sentence can score higher against the French model than the
// English one). Stopword overlap is cheap, explainable, and in practice
// much more robust on short text, so we try it first and only fall back to
// franc when no stopwords match.
const LATIN_STOPWORDS: Record<"en" | "es" | "fr" | "sw", Set<string>> = {
  en: new Set([
    "the", "is", "are", "have", "has", "my", "and", "in", "on", "with",
    "this", "that", "of", "to", "it", "was", "were", "not", "for", "from",
    "leaves", "plant", "plants", "why", "what", "how", "please", "help",
  ]),
  es: new Set([
    "el", "la", "los", "las", "es", "son", "tiene", "tienen", "mi", "mis",
    "y", "en", "con", "este", "esta", "de", "del", "un", "una", "por",
    "para", "no", "que", "hola", "ayuda",
  ]),
  fr: new Set([
    "le", "la", "les", "est", "sont", "ont", "mon", "ma", "mes", "et",
    "en", "avec", "ce", "cette", "de", "du", "des", "un", "une", "pour",
    "pas", "que", "bonjour", "aide",
  ]),
  sw: new Set([
    "na", "ya", "wa", "ni", "ana", "wana", "yangu", "wangu", "katika",
    "kwa", "hii", "hiyo", "la", "cha", "vya", "mimea", "majani", "tafadhali",
    "msaada",
  ]),
};

function scoreStopwords(text: string): { code: SupportedLanguageCode; score: number } | null {
  const words = text.toLowerCase().match(/[a-z']+/g);
  if (!words || words.length === 0) return null;

  const scores: Record<string, number> = { en: 0, es: 0, fr: 0, sw: 0 };
  for (const word of words) {
    for (const lang of Object.keys(LATIN_STOPWORDS) as Array<keyof typeof LATIN_STOPWORDS>) {
      if (LATIN_STOPWORDS[lang].has(word)) scores[lang] += 1;
    }
  }

  let best: { code: SupportedLanguageCode; score: number } | null = null;
  for (const [code, score] of Object.entries(scores)) {
    if (score > 0 && (!best || score > best.score)) {
      best = { code: code as SupportedLanguageCode, score };
    }
  }
  return best;
}

export interface LanguageDetection {
  language: SupportedLanguage;
  confidence: number; // 0-1
  source: "text-script" | "text-stopwords" | "text-statistical" | "default-fallback";
}

// Detects the farmer's language from free text, restricted to the app's
// supported set. Falls back to English with low confidence when the text
// is too short/ambiguous for any detector to be sure.
export function detectLanguageFromText(text: string): LanguageDetection {
  for (const { code, pattern } of SCRIPT_PATTERNS) {
    if (pattern.test(text)) {
      return { language: SUPPORTED_LANGUAGES[code], confidence: 0.95, source: "text-script" };
    }
  }

  const stopwordResult = scoreStopwords(text);
  if (stopwordResult && stopwordResult.score >= 1) {
    return {
      language: SUPPORTED_LANGUAGES[stopwordResult.code],
      confidence: Math.min(0.6 + stopwordResult.score * 0.1, 0.9),
      source: "text-stopwords",
    };
  }

  // Restrict candidates to our supported set (franc otherwise chooses among
  // ~180 languages, which hurts accuracy on short farmer messages).
  const francCode = franc(text, { only: Object.keys(FRANC_TO_SUPPORTED) });
  const mapped = FRANC_TO_SUPPORTED[francCode];
  if (mapped) {
    return { language: SUPPORTED_LANGUAGES[mapped], confidence: 0.7, source: "text-statistical" };
  }

  return { language: SUPPORTED_LANGUAGES.en, confidence: 0.3, source: "default-fallback" };
}
