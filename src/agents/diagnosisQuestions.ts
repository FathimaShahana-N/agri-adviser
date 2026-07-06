// Fixed follow-up questions Diagnosis Agent asks when Plant.id's result is
// ambiguous, pre-translated into every supported language so the farmer
// keeps seeing their own language even before Agent 4 (Response Agent)
// exists to draft freeform replies.
import { SupportedLanguageCode } from "../types";

const FOLLOW_UP_QUESTIONS: Record<SupportedLanguageCode, string[]> = {
  en: [
    "What color are the affected leaves (yellow, brown, black spots, etc.)?",
    "What does the spotting or damage pattern look like (small dots, large patches, edges only, etc.)?",
    "How many days ago did the symptoms first appear?",
  ],
  es: [
    "¿De qué color están las hojas afectadas (amarillas, marrones, con manchas negras, etc.)?",
    "¿Cómo es el patrón de las manchas o el daño (puntos pequeños, manchas grandes, solo en los bordes, etc.)?",
    "¿Hace cuántos días notó los síntomas por primera vez?",
  ],
  fr: [
    "Quelle est la couleur des feuilles touchées (jaune, brun, taches noires, etc.) ?",
    "À quoi ressemble le motif des taches ou des dégâts (petits points, grandes taches, seulement sur les bords, etc.) ?",
    "Il y a combien de jours avez-vous remarqué les symptômes pour la première fois ?",
  ],
  sw: [
    "Majani yaliyoathirika yana rangi gani (njano, kahawia, madoa meusi, n.k.)?",
    "Muundo wa madoa au uharibifu unaonekanaje (vitone vidogo, madoa makubwa, kando tu, n.k.)?",
    "Ni siku ngapi zilizopita tangu uone dalili kwa mara ya kwanza?",
  ],
  hi: [
    "प्रभावित पत्तियों का रंग कैसा है (पीला, भूरा, काले धब्बे, आदि)?",
    "धब्बों या नुकसान का पैटर्न कैसा दिखता है (छोटे बिंदु, बड़े धब्बे, केवल किनारों पर, आदि)?",
    "आपने लक्षण पहली बार कितने दिन पहले देखे थे?",
  ],
  ml: [
    "ബാധിച്ച ഇലകളുടെ നിറം എന്താണ് (മഞ്ഞ, തവിട്ട്, കറുത്ത പുള്ളികൾ മുതലായവ)?",
    "പുള്ളികളുടെയോ കേടുപാടിന്റെയോ രീതി എങ്ങനെയാണ് (ചെറിയ പൊട്ടുകൾ, വലിയ പാടുകൾ, അരികുകളിൽ മാത്രം മുതലായവ)?",
    "എത്ര ദിവസം മുമ്പാണ് നിങ്ങൾ ലക്ഷണങ്ങൾ ആദ്യമായി ശ്രദ്ധിച്ചത്?",
  ],
  bn: [
    "আক্রান্ত পাতার রং কেমন (হলুদ, বাদামী, কালো দাগ, ইত্যাদি)?",
    "দাগ বা ক্ষতির ধরণ কেমন দেখতে (ছোট বিন্দু, বড় দাগ, শুধু কিনারায়, ইত্যাদি)?",
    "আপনি কত দিন আগে প্রথম লক্ষণগুলো লক্ষ্য করেছিলেন?",
  ],
};

const NO_IMAGE_PROMPT: Record<SupportedLanguageCode, string> = {
  en: "We need a clear photo of the affected leaves to run a diagnosis. Please attach a photo, or describe the problem in as much detail as possible (crop, symptoms, when it started).",
  es: "Necesitamos una foto clara de las hojas afectadas para hacer un diagnóstico. Por favor adjunte una foto, o describa el problema con el mayor detalle posible (cultivo, síntomas, cuándo comenzó).",
  fr: "Nous avons besoin d'une photo nette des feuilles touchées pour établir un diagnostic. Veuillez joindre une photo, ou décrire le problème avec le plus de détails possible (culture, symptômes, quand cela a commencé).",
  sw: "Tunahitaji picha wazi ya majani yaliyoathirika ili kufanya uchunguzi. Tafadhali ambatanisha picha, au eleza tatizo kwa undani iwezekanavyo (zao, dalili, lini lilianza).",
  hi: "निदान करने के लिए हमें प्रभावित पत्तियों की एक स्पष्ट तस्वीर चाहिए। कृपया एक फ़ोटो संलग्न करें, या समस्या का यथासंभव विस्तार से वर्णन करें (फसल, लक्षण, यह कब शुरू हुआ)।",
  ml: "രോഗനിർണയത്തിന് ബാധിച്ച ഇലകളുടെ വ്യക്തമായ ഫോട്ടോ ഞങ്ങൾക്ക് ആവശ്യമാണ്. ദയവായി ഒരു ഫോട്ടോ ചേർക്കുക, അല്ലെങ്കിൽ പ്രശ്നം കഴിയുന്നത്ര വിശദമായി വിവരിക്കുക (വിള, ലക്ഷണങ്ങൾ, എപ്പോൾ തുടങ്ങി).",
  bn: "রোগ নির্ণয়ের জন্য আমাদের আক্রান্ত পাতার একটি স্পষ্ট ছবি দরকার। অনুগ্রহ করে একটি ছবি যুক্ত করুন, অথবা সমস্যাটি যতটা সম্ভব বিস্তারিতভাবে বর্ণনা করুন (ফসল, লক্ষণ, কখন শুরু হয়েছিল)।",
};

export function getFollowUpQuestions(code: SupportedLanguageCode): string[] {
  return FOLLOW_UP_QUESTIONS[code] ?? FOLLOW_UP_QUESTIONS.en;
}

export function getNoImagePrompt(code: SupportedLanguageCode): string {
  return NO_IMAGE_PROMPT[code] ?? NO_IMAGE_PROMPT.en;
}
