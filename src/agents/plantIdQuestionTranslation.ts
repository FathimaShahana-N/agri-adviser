// Plant.id sometimes returns a targeted yes/no disambiguation question
// specific to the photo's candidate diseases (see plantIdClient.ts's
// PlantIdQuestion). That text is dynamic - generated per-image by Plant.id,
// not something we can pre-translate exhaustively like diagnosisQuestions.ts.
//
// Simple, honest approach: match the English question against a small set
// of common disambiguation patterns (odor, wilting, root condition, etc.)
// and substitute a pre-translated equivalent; if nothing matches, fall back
// to showing the original English text with a translated wrapper note so
// the farmer knows why part of the message is in English, rather than
// silently mistranslating or crashing.
import { SupportedLanguageCode } from "../types";

export interface TranslatedYesNoQuestion {
  text: string;
  yesWord: string;
  noWord: string;
  usedFallback: boolean; // true = no pattern matched; text is English (with a translated wrapper note if not English itself)
}

interface QuestionPattern {
  keywords: string[]; // matched case-insensitively as substrings of Plant.id's English question text
  templates: Record<SupportedLanguageCode, string>;
}

const YES_NO_WORDS: Record<SupportedLanguageCode, { yes: string; no: string }> = {
  en: { yes: "Yes", no: "No" },
  es: { yes: "Sí", no: "No" },
  fr: { yes: "Oui", no: "Non" },
  sw: { yes: "Ndiyo", no: "Hapana" },
  hi: { yes: "हां", no: "नहीं" },
  ml: { yes: "അതെ", no: "ഇല്ല" },
  bn: { yes: "হ্যাঁ", no: "না" },
};

const QUESTION_PATTERNS: QuestionPattern[] = [
  {
    keywords: ["odor", "odour", "smell"],
    templates: {
      en: "Do the affected parts have an unpleasant smell?",
      es: "¿Las partes afectadas tienen un olor desagradable?",
      fr: "Les parties affectées ont-elles une mauvaise odeur ?",
      sw: "Je, sehemu zilizoathirika zina harufu mbaya?",
      hi: "क्या प्रभावित हिस्सों से बदबू आती है?",
      ml: "ബാധിച്ച ഭാഗങ്ങൾക്ക് അസുഖകരമായ ഗന്ധം ഉണ്ടോ?",
      bn: "আক্রান্ত অংশে কি দুর্গন্ধ আছে?",
    },
  },
  {
    keywords: ["wilt"],
    templates: {
      en: "Is the whole plant wilting?",
      es: "¿Toda la planta se está marchitando?",
      fr: "La plante entière est-elle flétrie ?",
      sw: "Je, mmea mzima unanyauka?",
      hi: "क्या पूरा पौधा मुरझा रहा है?",
      ml: "ചെടി മുഴുവൻ വാടിപ്പോകുന്നുണ്ടോ?",
      bn: "পুরো গাছ কি নেতিয়ে পড়ছে?",
    },
  },
  {
    keywords: ["root"],
    templates: {
      en: "Are the roots soft, mushy, or discolored?",
      es: "¿Las raíces están blandas, pastosas o descoloridas?",
      fr: "Les racines sont-elles molles, pâteuses ou décolorées ?",
      sw: "Je, mizizi ni laini, iliyolegea, au imebadilika rangi?",
      hi: "क्या जड़ें नरम, गलनयुक्त या रंगहीन हो गई हैं?",
      ml: "വേരുകൾ മൃദുവായോ, കുഴഞ്ഞോ, നിറം മാറിയോ ഇരിക്കുന്നുണ്ടോ?",
      bn: "শিকড় কি নরম, গলে যাওয়া বা বিবর্ণ হয়ে গেছে?",
    },
  },
  {
    keywords: ["powder", "powdery", "fuzzy", "mold", "mould"],
    templates: {
      en: "Is there a white powdery or fuzzy coating on the leaves?",
      es: "¿Hay una capa blanca polvorienta o vellosa en las hojas?",
      fr: "Y a-t-il un revêtement blanc poudreux ou duveteux sur les feuilles ?",
      sw: "Je, kuna mfuniko mweupe wa unga au wenye pamba kwenye majani?",
      hi: "क्या पत्तियों पर सफेद पाउडर जैसी या रोयेंदार परत है?",
      ml: "ഇലകളിൽ വെളുത്ത പൊടി പോലുള്ളതോ രോമം പോലുള്ളതോ ആയ ആവരണം ഉണ്ടോ?",
      bn: "পাতায় কি সাদা গুঁড়ো বা তুলতুলে আবরণ আছে?",
    },
  },
  {
    keywords: ["spot"],
    templates: {
      en: "Do the spots have a ring or target-like pattern?",
      es: "¿Las manchas tienen un patrón en forma de anillo o diana?",
      fr: "Les taches ont-elles un motif en anneaux ou en cible ?",
      sw: "Je, madoa yana mfumo wa duara au kama shabaha?",
      hi: "क्या धब्बों में छल्ले जैसा या निशाने जैसा पैटर्न है?",
      ml: "പാടുകൾക്ക് വളയമോ ലക്ഷ്യം പോലുള്ളതോ ആയ പാറ്റേൺ ഉണ്ടോ?",
      bn: "দাগগুলোতে কি বলয় বা লক্ষ্যবস্তুর মতো নকশা আছে?",
    },
  },
  {
    keywords: ["yellow", "curl"],
    templates: {
      en: "Are the leaves yellowing or curling?",
      es: "¿Las hojas se están volviendo amarillas o enrollando?",
      fr: "Les feuilles jaunissent-elles ou s'enroulent-elles ?",
      sw: "Je, majani yanageuka manjano au kujikunja?",
      hi: "क्या पत्तियां पीली पड़ रही हैं या मुड़ रही हैं?",
      ml: "ഇലകൾ മഞ്ഞളിക്കുകയോ ചുരുളുകയോ ചെയ്യുന്നുണ്ടോ?",
      bn: "পাতাগুলো কি হলুদ হয়ে যাচ্ছে বা কুঁচকে যাচ্ছে?",
    },
  },
  {
    keywords: ["sticky", "insect", "pest"],
    templates: {
      en: "Is there a sticky residue or visible insects on the plant?",
      es: "¿Hay un residuo pegajoso o insectos visibles en la planta?",
      fr: "Y a-t-il un résidu collant ou des insectes visibles sur la plante ?",
      sw: "Je, kuna uchafu unaonata au wadudu wanaoonekana kwenye mmea?",
      hi: "क्या पौधे पर चिपचिपा पदार्थ या दिखने वाले कीड़े हैं?",
      ml: "ചെടിയിൽ ഒട്ടിപ്പിടിക്കുന്ന അവശിഷ്ടമോ ദൃശ്യമായ കീടങ്ങളോ ഉണ്ടോ?",
      bn: "গাছে কি আঠালো পদার্থ বা দৃশ্যমান পোকা আছে?",
    },
  },
];

// Used only when no pattern matched and the language isn't English -
// wraps Plant.id's original English question with a short translated note.
const FALLBACK_WRAPPER: Record<Exclude<SupportedLanguageCode, "en">, string> = {
  es: "Plant.id hizo una pregunta específica sobre esta foto que aún no podemos traducir automáticamente, así que se muestra en inglés: ",
  fr: "Plant.id a posé une question spécifique sur cette photo que nous ne pouvons pas encore traduire automatiquement, elle est donc affichée en anglais : ",
  sw: "Plant.id iliuliza swali mahususi kuhusu picha hii ambalo bado hatuwezi kutafsiri kiotomatiki, hivyo linaonyeshwa kwa Kiingereza: ",
  hi: "Plant.id ने इस फ़ोटो के बारे में एक विशिष्ट प्रश्न पूछा है जिसका हम अभी स्वचालित रूप से अनुवाद नहीं कर सकते, इसलिए यह अंग्रेज़ी में दिखाया गया है: ",
  ml: "ഈ ഫോട്ടോയെക്കുറിച്ച് Plant.id ഒരു പ്രത്യേക ചോദ്യം ചോദിച്ചു, അത് ഞങ്ങൾക്ക് ഇതുവരെ സ്വയമേവ വിവർത്തനം ചെയ്യാൻ കഴിയില്ല, അതിനാൽ ഇത് ഇംഗ്ലീഷിൽ കാണിച്ചിരിക്കുന്നു: ",
  bn: "Plant.id এই ছবি সম্পর্কে একটি নির্দিষ্ট প্রশ্ন করেছে যা আমরা এখনো স্বয়ংক্রিয়ভাবে অনুবাদ করতে পারি না, তাই এটি ইংরেজিতে দেখানো হলো: ",
};

export function translatePlantIdQuestion(
  englishText: string,
  languageCode: SupportedLanguageCode
): TranslatedYesNoQuestion {
  const words = YES_NO_WORDS[languageCode] ?? YES_NO_WORDS.en;
  const lower = englishText.toLowerCase();

  const matched = QUESTION_PATTERNS.find((p) => p.keywords.some((k) => lower.includes(k)));
  if (matched) {
    const template = matched.templates[languageCode] ?? matched.templates.en;
    return { text: template, yesWord: words.yes, noWord: words.no, usedFallback: false };
  }

  if (languageCode === "en") {
    return { text: englishText, yesWord: words.yes, noWord: words.no, usedFallback: false };
  }

  const wrapper = FALLBACK_WRAPPER[languageCode] ?? "";
  return { text: `${wrapper}${englishText}`, yesWord: words.yes, noWord: words.no, usedFallback: true };
}

// Simple yes/no detection for the farmer's reply. Checks the first word
// against a small list of common variants per language. Deliberately checks
// ALL languages' word lists, not just the turn's detected language: a
// one-word reply like "Ndiyo" is exactly the realistic answer to a yes/no
// question, but our statistical language detector is unreliable on single
// short words (it commonly falls back to English for text that short) - so
// trusting only the detected language here would silently break the
// feature for its single most common real input. The word lists don't
// collide across languages/scripts, so checking broadly is safe.
const YES_WORDS: Record<SupportedLanguageCode, string[]> = {
  en: ["yes", "yeah", "yep", "y"],
  es: ["sí", "si"],
  fr: ["oui"],
  sw: ["ndiyo", "ndio"],
  hi: ["हां", "हाँ", "जी"],
  ml: ["അതെ"],
  bn: ["হ্যাঁ", "হ্যা"],
};

const NO_WORDS: Record<SupportedLanguageCode, string[]> = {
  en: ["no", "nope", "n"],
  es: ["no"],
  fr: ["non"],
  sw: ["hapana", "la"],
  hi: ["नहीं", "ना"],
  ml: ["ഇല്ല"],
  bn: ["না"],
};

export function detectYesNoAnswer(answer: string, languageCode: SupportedLanguageCode): "yes" | "no" | null {
  const firstWord = answer.trim().toLowerCase().split(/[\s,.!?]+/)[0] ?? "";
  if (!firstWord) return null;

  // Check the turn's detected language first (most likely correct for
  // longer replies), then every other language's word list as a fallback.
  const languagesToCheck = [languageCode, ...(Object.keys(YES_WORDS) as SupportedLanguageCode[])];

  for (const code of languagesToCheck) {
    if (YES_WORDS[code].includes(firstWord)) return "yes";
    if (NO_WORDS[code].includes(firstWord)) return "no";
  }

  return null;
}
