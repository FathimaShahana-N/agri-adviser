// Plant-part disambiguation for Diagnosis Agent's FALLBACK follow-up path
// only (used when Plant.id doesn't supply its own yes/no question and
// confidence is low). Before asking symptom questions, we first ask which
// part of the plant is affected, then pick the matching question set -
// asking leaf-only questions about a root or fruit problem doesn't make
// sense. Same pre-translated pattern as diagnosisQuestions.ts; the "leaf"
// set deliberately reuses that file's existing 3 questions rather than
// duplicating them.
import { SupportedLanguageCode } from "../types";
import { getFollowUpQuestions } from "./diagnosisQuestions";

export type PlantPart = "leaf" | "fruit" | "stem" | "root" | "flower";
export const PLANT_PARTS: readonly PlantPart[] = ["leaf", "fruit", "stem", "root", "flower"];

const PLANT_PART_PROMPT: Record<SupportedLanguageCode, string> = {
  en: "What part of the plant does this show? (Leaf / Fruit or Pod / Stem / Root / Flower or Ear)",
  es: "¿Qué parte de la planta muestra esto? (Hoja / Fruto o vaina / Tallo / Raíz / Flor o mazorca)",
  fr: "Quelle partie de la plante est concernée ? (Feuille / Fruit ou gousse / Tige / Racine / Fleur ou épi)",
  sw: "Sehemu gani ya mmea inaonyesha hili? (Jani / Tunda au ganda / Shina / Mzizi / Ua au gunzi)",
  hi: "यह पौधे के किस हिस्से में दिख रहा है? (पत्ती / फल या फली / तना / जड़ / फूल या भुट्टा)",
  ml: "ഇത് ചെടിയുടെ ഏത് ഭാഗത്താണ് കാണുന്നത്? (ഇല / പഴം അല്ലെങ്കിൽ കായ് / തണ്ട് / വേര് / പൂവ് അല്ലെങ്കിൽ കതിര്)",
  bn: "এটি গাছের কোন অংশে দেখা যাচ্ছে? (পাতা / ফল বা শুঁটি / কাণ্ড / শিকড় / ফুল বা মোচা)",
};

// Words checked (whole-word, not substring) against the farmer's reply to
// detect which part they picked.
const PLANT_PART_OPTION_WORDS: Record<PlantPart, Record<SupportedLanguageCode, string[]>> = {
  leaf: {
    en: ["leaf", "leaves"],
    es: ["hoja", "hojas"],
    fr: ["feuille", "feuilles"],
    sw: ["jani", "majani"],
    hi: ["पत्ती", "पत्तियां", "पत्ते"],
    ml: ["ഇല", "ഇലകൾ"],
    bn: ["পাতা"],
  },
  fruit: {
    en: ["fruit", "fruits", "pod", "pods"],
    es: ["fruto", "frutos", "fruta", "frutas", "vaina", "vainas"],
    fr: ["fruit", "fruits", "gousse", "gousses"],
    sw: ["tunda", "matunda", "ganda", "maganda"],
    hi: ["फल", "फली", "फलियां"],
    ml: ["പഴം", "പഴങ്ങൾ", "കായ്", "കായകൾ"],
    bn: ["ফল", "শুঁটি"],
  },
  stem: {
    en: ["stem", "stalk"],
    es: ["tallo"],
    fr: ["tige"],
    sw: ["shina"],
    hi: ["तना"],
    ml: ["തണ്ട്"],
    bn: ["কাণ্ড", "কান্ড"],
  },
  root: {
    en: ["root", "roots"],
    es: ["raíz", "raíces", "raiz", "raices"],
    fr: ["racine", "racines"],
    sw: ["mzizi", "mizizi"],
    hi: ["जड़", "जड़ें"],
    ml: ["വേര്", "വേരുകൾ"],
    bn: ["শিকড়", "মূল"],
  },
  flower: {
    en: ["flower", "flowers", "ear", "ears", "cob", "cobs"],
    es: ["flor", "flores", "mazorca", "mazorcas"],
    fr: ["fleur", "fleurs", "épi", "épis"],
    sw: ["ua", "maua", "gunzi", "magunzi"],
    hi: ["फूल", "भुट्टा", "भुट्टे"],
    ml: ["പൂവ്", "പൂക്കൾ", "കതിര്", "കതിരുകൾ"],
    bn: ["ফুল", "মোচা"],
  },
};

const FRUIT_QUESTIONS: Record<SupportedLanguageCode, string[]> = {
  en: [
    "What color are the affected fruits/pods (yellow, brown, black spots, etc.)?",
    "Is the damage on the surface (spots, scarring) or does it go into the flesh (rot, mushy)?",
    "How many days ago did you first notice the damage?",
  ],
  es: [
    "¿De qué color están los frutos/vainas afectados (amarillo, marrón, manchas negras, etc.)?",
    "¿El daño está en la superficie (manchas, cicatrices) o llega hasta la pulpa (podredumbre, blandura)?",
    "¿Hace cuántos días notó el daño por primera vez?",
  ],
  fr: [
    "Quelle est la couleur des fruits/gousses touchés (jaune, brun, taches noires, etc.) ?",
    "Les dégâts sont-ils en surface (taches, cicatrices) ou atteignent-ils la chair (pourriture, ramollissement) ?",
    "Il y a combien de jours avez-vous remarqué les dégâts pour la première fois ?",
  ],
  sw: [
    "Matunda/maganda yaliyoathirika yana rangi gani (manjano, kahawia, madoa meusi, n.k.)?",
    "Je, uharibifu uko juu ya uso (madoa, makovu) au umefika ndani ya nyama (kuoza, kulainika)?",
    "Ni siku ngapi zilizopita tangu uone uharibifu kwa mara ya kwanza?",
  ],
  hi: [
    "प्रभावित फलों/फलियों का रंग कैसा है (पीला, भूरा, काले धब्बे, आदि)?",
    "क्या नुकसान सतह पर है (धब्बे, निशान) या गूदे तक पहुंच गया है (सड़न, गलनयुक्त)?",
    "आपने नुकसान पहली बार कितने दिन पहले देखा था?",
  ],
  ml: [
    "ബാധിച്ച പഴങ്ങൾ/കായകൾ ഏത് നിറത്തിലാണ് (മഞ്ഞ, തവിട്ട്, കറുത്ത പുള്ളികൾ മുതലായവ)?",
    "കേടുപാട് ഉപരിതലത്തിൽ മാത്രമാണോ (പാടുകൾ, പോറലുകൾ) അതോ ഉള്ളിലേക്ക് എത്തിയോ (അഴുകൽ, മൃദുത്വം)?",
    "എത്ര ദിവസം മുമ്പാണ് നിങ്ങൾ കേടുപാട് ആദ്യമായി ശ്രദ്ധിച്ചത്?",
  ],
  bn: [
    "আক্রান্ত ফল/শুঁটির রং কেমন (হলুদ, বাদামী, কালো দাগ, ইত্যাদি)?",
    "ক্ষতি কি পৃষ্ঠে (দাগ, ক্ষত) নাকি ভেতরের শাঁস পর্যন্ত পৌঁছেছে (পচন, নরম হয়ে যাওয়া)?",
    "আপনি কত দিন আগে প্রথম ক্ষতি লক্ষ্য করেছিলেন?",
  ],
};

const STEM_QUESTIONS: Record<SupportedLanguageCode, string[]> = {
  en: [
    "Where on the stem is the damage (near the base, middle, or near the top)?",
    "Is the stem soft/mushy, cracked, or discolored (dark streaks, cankers)?",
    "How many days ago did you first notice the problem?",
  ],
  es: [
    "¿En qué parte del tallo está el daño (cerca de la base, en el medio o cerca de la parte superior)?",
    "¿El tallo está blando/pastoso, agrietado o descolorido (rayas oscuras, chancros)?",
    "¿Hace cuántos días notó el problema por primera vez?",
  ],
  fr: [
    "À quel endroit de la tige se trouvent les dégâts (près de la base, au milieu ou près du sommet) ?",
    "La tige est-elle molle/pâteuse, fissurée ou décolorée (stries sombres, chancres) ?",
    "Il y a combien de jours avez-vous remarqué le problème pour la première fois ?",
  ],
  sw: [
    "Uharibifu uko sehemu gani ya shina (karibu na msingi, katikati, au karibu na juu)?",
    "Je, shina ni laini/limelegea, limepasuka, au limebadilika rangi (mistari myeusi, vidonda)?",
    "Ni siku ngapi zilizopita tangu uone tatizo kwa mara ya kwanza?",
  ],
  hi: [
    "तने पर नुकसान कहाँ है (आधार के पास, बीच में, या ऊपर के पास)?",
    "क्या तना नरम/गलनयुक्त, फटा हुआ, या रंगहीन (गहरी धारियाँ, नासूर) है?",
    "आपने समस्या पहली बार कितने दिन पहले देखी थी?",
  ],
  ml: [
    "തണ്ടിൽ എവിടെയാണ് കേടുപാട് (ചുവട്ടിൽ, നടുവിൽ, അല്ലെങ്കിൽ മുകളിൽ)?",
    "തണ്ട് മൃദുവായതോ/കുഴഞ്ഞതോ, വിണ്ടുകീറിയതോ, നിറം മാറിയതോ (ഇരുണ്ട വരകൾ, വൃണങ്ങൾ) ആണോ?",
    "എത്ര ദിവസം മുമ്പാണ് നിങ്ങൾ പ്രശ്നം ആദ്യമായി ശ്രദ്ധിച്ചത്?",
  ],
  bn: [
    "কাণ্ডের কোন অংশে ক্ষতি হয়েছে (গোড়ার কাছে, মাঝখানে, নাকি উপরের দিকে)?",
    "কাণ্ড কি নরম/গলে যাওয়া, ফাটা, নাকি বিবর্ণ (গাঢ় দাগ, ক্ষত)?",
    "আপনি কত দিন আগে সমস্যাটি প্রথম লক্ষ্য করেছিলেন?",
  ],
};

const ROOT_QUESTIONS: Record<SupportedLanguageCode, string[]> = {
  en: [
    "Are the roots soft, mushy, or discolored compared to healthy roots?",
    "Is there a bad smell coming from the roots?",
    "How many days ago did you first notice the plant struggling?",
  ],
  es: [
    "¿Las raíces están blandas, pastosas o descoloridas comparadas con raíces sanas?",
    "¿Hay mal olor proveniente de las raíces?",
    "¿Hace cuántos días notó que la planta empezaba a decaer?",
  ],
  fr: [
    "Les racines sont-elles molles, pâteuses ou décolorées par rapport à des racines saines ?",
    "Y a-t-il une mauvaise odeur provenant des racines ?",
    "Il y a combien de jours avez-vous remarqué que la plante commençait à dépérir ?",
  ],
  sw: [
    "Je, mizizi ni laini, iliyolegea, au imebadilika rangi ikilinganishwa na mizizi yenye afya?",
    "Je, kuna harufu mbaya inayotoka kwenye mizizi?",
    "Ni siku ngapi zilizopita tangu uone mmea ukianza kudhoofika?",
  ],
  hi: [
    "स्वस्थ जड़ों की तुलना में क्या जड़ें नरम, गलनयुक्त, या रंगहीन हैं?",
    "क्या जड़ों से बदबू आ रही है?",
    "आपने पौधे को कमजोर होते हुए पहली बार कितने दिन पहले देखा था?",
  ],
  ml: [
    "ആരോഗ്യമുള്ള വേരുകളുമായി താരതമ്യം ചെയ്യുമ്പോൾ വേരുകൾ മൃദുവായോ, കുഴഞ്ഞോ, നിറം മാറിയോ ഇരിക്കുന്നുണ്ടോ?",
    "വേരുകളിൽ നിന്ന് ദുർഗന്ധം വരുന്നുണ്ടോ?",
    "ചെടി ദുർബലമാകുന്നത് നിങ്ങൾ എത്ര ദിവസം മുമ്പാണ് ആദ്യമായി ശ്രദ്ധിച്ചത്?",
  ],
  bn: [
    "সুস্থ শিকড়ের তুলনায় শিকড় কি নরম, গলে যাওয়া, বা বিবর্ণ?",
    "শিকড় থেকে কি দুর্গন্ধ আসছে?",
    "আপনি কত দিন আগে গাছটি দুর্বল হতে শুরু করেছে দেখেছিলেন?",
  ],
};

const FLOWER_QUESTIONS: Record<SupportedLanguageCode, string[]> = {
  en: [
    "Are the flowers or developing ears/cobs discolored, deformed, or dropping early?",
    "Is there any powdery, moldy, or sticky residue on the flowers/ears?",
    "How many days ago did you first notice the problem?",
  ],
  es: [
    "¿Las flores o las mazorcas/vainas en desarrollo están descoloridas, deformadas o cayendo temprano?",
    "¿Hay algún residuo polvoriento, mohoso o pegajoso en las flores/mazorcas?",
    "¿Hace cuántos días notó el problema por primera vez?",
  ],
  fr: [
    "Les fleurs ou les épis/gousses en développement sont-ils décolorés, déformés ou tombent-ils prématurément ?",
    "Y a-t-il un résidu poudreux, moisi ou collant sur les fleurs/épis ?",
    "Il y a combien de jours avez-vous remarqué le problème pour la première fois ?",
  ],
  sw: [
    "Je, maua au magunzi/maganda yanayokua yamebadilika rangi, yamepotoka umbo, au yanadondoka mapema?",
    "Je, kuna mabaki ya unga, ukungu, au yanayonata kwenye maua/magunzi?",
    "Ni siku ngapi zilizopita tangu uone tatizo kwa mara ya kwanza?",
  ],
  hi: [
    "क्या फूल या विकसित हो रहे भुट्टे/फलियां रंगहीन, विकृत, या जल्दी गिर रहे हैं?",
    "क्या फूलों/भुट्टों पर पाउडर जैसा, फफूंदयुक्त, या चिपचिपा अवशेष है?",
    "आपने समस्या पहली बार कितने दिन पहले देखी थी?",
  ],
  ml: [
    "പൂക്കളോ വളരുന്ന കതിരുകളോ/കായകളോ നിറം മാറിയോ, രൂപഭേദം വന്നോ, നേരത്തെ കൊഴിയുന്നുണ്ടോ?",
    "പൂക്കളിലോ കതിരുകളിലോ പൊടി പോലുള്ളതോ പൂപ്പൽ പോലുള്ളതോ ഒട്ടിപ്പിടിക്കുന്നതോ ആയ അവശിഷ്ടം ഉണ്ടോ?",
    "എത്ര ദിവസം മുമ്പാണ് നിങ്ങൾ പ്രശ്നം ആദ്യമായി ശ്രദ്ധിച്ചത്?",
  ],
  bn: [
    "ফুল বা বেড়ে ওঠা মোচা/শুঁটি কি বিবর্ণ, বিকৃত, বা তাড়াতাড়ি ঝরে যাচ্ছে?",
    "ফুল/মোচায় কি গুঁড়ো, ছাতাযুক্ত, বা আঠালো অবশিষ্টাংশ আছে?",
    "আপনি কত দিন আগে সমস্যাটি প্রথম লক্ষ্য করেছিলেন?",
  ],
};

// Shown as the first line before the part-specific follow-up questions, so
// the farmer gets visible confirmation of what detectPlantPart() understood
// from their reply - if detection is ever wrong, a mismatched confirmation
// sentence makes that immediately obvious, instead of the farmer just seeing
// unexplained questions that don't match their actual problem.
const PLANT_PART_CONFIRMATION: Record<PlantPart, Record<SupportedLanguageCode, string>> = {
  leaf: {
    en: "Since this shows the leaf, I have a few more specific questions:",
    es: "Como esto muestra la hoja, tengo algunas preguntas más específicas:",
    fr: "Comme cela concerne la feuille, j'ai quelques questions plus précises :",
    sw: "Kwa kuwa hili linaonyesha jani, nina maswali machache zaidi mahususi:",
    hi: "चूंकि यह पत्ती दिखा रहा है, मेरे पास कुछ और विशिष्ट सवाल हैं:",
    ml: "ഇത് ഇല കാണിക്കുന്നതിനാൽ, എനിക്ക് കുറച്ചുകൂടി വ്യക്തമായ ചോദ്യങ്ങളുണ്ട്:",
    bn: "যেহেতু এটি পাতা দেখাচ্ছে, আমার আরও কিছু নির্দিষ্ট প্রশ্ন আছে:",
  },
  fruit: {
    en: "Since this shows the fruit/pod, I have a few more specific questions:",
    es: "Como esto muestra el fruto/vaina, tengo algunas preguntas más específicas:",
    fr: "Comme cela concerne le fruit/la gousse, j'ai quelques questions plus précises :",
    sw: "Kwa kuwa hili linaonyesha tunda/ganda, nina maswali machache zaidi mahususi:",
    hi: "चूंकि यह फल/फली दिखा रहा है, मेरे पास कुछ और विशिष्ट सवाल हैं:",
    ml: "ഇത് പഴം/കായ് കാണിക്കുന്നതിനാൽ, എനിക്ക് കുറച്ചുകൂടി വ്യക്തമായ ചോദ്യങ്ങളുണ്ട്:",
    bn: "যেহেতু এটি ফল/শুঁটি দেখাচ্ছে, আমার আরও কিছু নির্দিষ্ট প্রশ্ন আছে:",
  },
  stem: {
    en: "Since this shows the stem, I have a few more specific questions:",
    es: "Como esto muestra el tallo, tengo algunas preguntas más específicas:",
    fr: "Comme cela concerne la tige, j'ai quelques questions plus précises :",
    sw: "Kwa kuwa hili linaonyesha shina, nina maswali machache zaidi mahususi:",
    hi: "चूंकि यह तना दिखा रहा है, मेरे पास कुछ और विशिष्ट सवाल हैं:",
    ml: "ഇത് തണ്ട് കാണിക്കുന്നതിനാൽ, എനിക്ക് കുറച്ചുകൂടി വ്യക്തമായ ചോദ്യങ്ങളുണ്ട്:",
    bn: "যেহেতু এটি কাণ্ড দেখাচ্ছে, আমার আরও কিছু নির্দিষ্ট প্রশ্ন আছে:",
  },
  root: {
    en: "Since this shows the root, I have a few more specific questions:",
    es: "Como esto muestra la raíz, tengo algunas preguntas más específicas:",
    fr: "Comme cela concerne la racine, j'ai quelques questions plus précises :",
    sw: "Kwa kuwa hili linaonyesha mzizi, nina maswali machache zaidi mahususi:",
    hi: "चूंकि यह जड़ दिखा रहा है, मेरे पास कुछ और विशिष्ट सवाल हैं:",
    ml: "ഇത് വേര് കാണിക്കുന്നതിനാൽ, എനിക്ക് കുറച്ചുകൂടി വ്യക്തമായ ചോദ്യങ്ങളുണ്ട്:",
    bn: "যেহেতু এটি শিকড় দেখাচ্ছে, আমার আরও কিছু নির্দিষ্ট প্রশ্ন আছে:",
  },
  flower: {
    en: "Since this shows the flower/ear, I have a few more specific questions:",
    es: "Como esto muestra la flor/mazorca, tengo algunas preguntas más específicas:",
    fr: "Comme cela concerne la fleur/l'épi, j'ai quelques questions plus précises :",
    sw: "Kwa kuwa hili linaonyesha ua/gunzi, nina maswali machache zaidi mahususi:",
    hi: "चूंकि यह फूल/भुट्टा दिखा रहा है, मेरे पास कुछ और विशिष्ट सवाल हैं:",
    ml: "ഇത് പൂവ്/കതിര് കാണിക്കുന്നതിനാൽ, എനിക്ക് കുറച്ചുകൂടി വ്യക്തമായ ചോദ്യങ്ങളുണ്ട്:",
    bn: "যেহেতু এটি ফুল/মোচা দেখাচ্ছে, আমার আরও কিছু নির্দিষ্ট প্রশ্ন আছে:",
  },
};

export function getPlantPartConfirmation(part: PlantPart, code: SupportedLanguageCode): string {
  const set = PLANT_PART_CONFIRMATION[part];
  return set[code] ?? set.en;
}

export function getPlantPartPrompt(code: SupportedLanguageCode): string {
  return PLANT_PART_PROMPT[code] ?? PLANT_PART_PROMPT.en;
}

export function getPlantPartQuestions(part: PlantPart, code: SupportedLanguageCode): string[] {
  if (part === "leaf") {
    // Reuse diagnosisQuestions.ts's existing leaf-based set rather than
    // duplicating near-identical translated content.
    return getFollowUpQuestions(code);
  }
  const sets: Record<Exclude<PlantPart, "leaf">, Record<SupportedLanguageCode, string[]>> = {
    fruit: FRUIT_QUESTIONS,
    stem: STEM_QUESTIONS,
    root: ROOT_QUESTIONS,
    flower: FLOWER_QUESTIONS,
  };
  const set = sets[part];
  return set[code] ?? set.en;
}

// A character only counts as part of a "word" for boundary purposes if it's
// an ASCII letter/digit. This deliberately avoids Unicode \p{L}/\p{M}
// category regexes (which previously caused a real bug: Malayalam, Hindi,
// and Bengali combining marks - anusvara, vowel signs, virama, nukta,
// candrabindu - are category "Mark" not "Letter", so a \p{L}-only tokenizer
// silently truncated words like "പഴം" down to "പഴ"). Since non-Latin script
// characters are never ASCII word chars, the boundary check below reduces to
// plain substring matching for hi/ml/bn (same style as cropScope.ts), while
// still protecting Latin-alphabet option words like English "ear" from
// matching inside unrelated words like "early".
function isAsciiWordChar(ch: string | undefined): boolean {
  if (!ch) return false;
  const c = ch.toLowerCase();
  return (c >= "a" && c <= "z") || (c >= "0" && c <= "9");
}

function includesAsWholeWord(haystack: string, needle: string): boolean {
  let idx = haystack.indexOf(needle);
  while (idx !== -1) {
    const before = haystack[idx - 1];
    const after = haystack[idx + needle.length];
    if (!isAsciiWordChar(before) && !isAsciiWordChar(after)) {
      return true;
    }
    idx = haystack.indexOf(needle, idx + 1);
  }
  return false;
}

// Direct substring matching against the farmer's raw lowercased reply -
// no tokenization of the answer text at all, so there's no Unicode
// category class that can silently drop characters. Checks the turn's
// detected language first, then every other language's word list, since
// a short multiple-choice reply is hard for the statistical language
// detector to place correctly (same rationale as detectYesNoAnswer).
export function detectPlantPart(answer: string, languageCode: SupportedLanguageCode): PlantPart | null {
  const answerLower = answer.toLowerCase();
  if (!answerLower.trim()) return null;

  const languagesToCheck: SupportedLanguageCode[] = [
    languageCode,
    ...(["en", "es", "fr", "sw", "hi", "ml", "bn"] as SupportedLanguageCode[]),
  ];

  for (const lang of languagesToCheck) {
    for (const part of PLANT_PARTS) {
      const optionWords = PLANT_PART_OPTION_WORDS[part][lang] ?? [];
      if (optionWords.some((w) => includesAsWholeWord(answerLower, w.toLowerCase()))) {
        return part;
      }
    }
  }
  return null;
}
