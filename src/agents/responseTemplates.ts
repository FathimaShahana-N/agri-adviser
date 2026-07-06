// Per-language phrase templates for Agent 4 (Response Agent), pre-translated
// like diagnosisQuestions.ts so replies stay in the farmer's language
// without calling any external LLM. This file only holds TEXT - deciding
// which phrases apply to a given diagnosis/weather combination is
// responseAgent.ts's job (the "compose" step), kept deliberately separate
// from this "template" lookup step.
//
// Caveat: disease names/descriptions/treatment steps come from Plant.id in
// English. For the diseases covered by diseaseContentTranslations.ts,
// responseAgent.ts substitutes curated translated content instead; for
// anything not in that (necessarily incomplete) table, Plant.id's English
// text is kept as-is with englishFallbackNote() prepended so the farmer
// knows why part of the message is in English rather than assuming a bug.
import { SupportedCropSlug, SupportedLanguageCode } from "../types";

export type SeverityLevel = "low" | "moderate" | "high";

export interface ResponseTemplateSet {
  diagnosisIntro(cropLabel: string, disease: string): string;
  descriptionLabel(): string;
  englishFallbackNote(): string;
  organicTreatmentLabel(): string;
  chemicalTreatmentLabel(): string;
  noTreatmentInfo(): string;
  severityLabel(): string;
  severityPhrase(level: SeverityLevel): string;
  weatherRiskPhrase(level: SeverityLevel): string;
  weatherRainDelay(): string;
  needsFollowUpIntro(): string;
  outOfScopeMessage(): string;
  unavailableMessage(): string;
  agronomistReminder(): string;
  preventiveTipLabel(): string;
}

const CROP_LABELS: Record<SupportedCropSlug, Record<SupportedLanguageCode, string>> = {
  rice: { en: "rice", es: "arroz", fr: "riz", sw: "mpunga", hi: "चावल", ml: "നെല്ല്", bn: "ধান" },
  maize: { en: "maize", es: "maíz", fr: "maïs", sw: "mahindi", hi: "मक्का", ml: "ചോളം", bn: "ভুট্টা" },
  tomato: { en: "tomato", es: "tomate", fr: "tomate", sw: "nyanya", hi: "टमाटर", ml: "തക്കാളി", bn: "টমেটো" },
  potato: { en: "potato", es: "papa", fr: "pomme de terre", sw: "viazi", hi: "आलू", ml: "ഉരുളക്കിഴങ്ങ്", bn: "আলু" },
  pepper: { en: "pepper", es: "pimiento", fr: "piment", sw: "pilipili", hi: "मिर्च", ml: "മുളക്", bn: "মরিচ" },
};

export function getCropLabel(crop: SupportedCropSlug, code: SupportedLanguageCode): string {
  return CROP_LABELS[crop][code] ?? CROP_LABELS[crop].en;
}

const TEMPLATES: Record<SupportedLanguageCode, ResponseTemplateSet> = {
  en: {
    diagnosisIntro: (cropLabel, disease) => `We found signs of ${disease} in your ${cropLabel} crop.`,
    descriptionLabel: () => "About this problem:",
    englishFallbackNote: () =>
      "(We don't have a translation of the detailed disease information yet, so it's shown below in English.)",
    organicTreatmentLabel: () => "Try these organic/natural treatments first:",
    chemicalTreatmentLabel: () => "If the problem continues, you can also use:",
    noTreatmentInfo: () =>
      "We don't have specific treatment steps for this yet - please ask your local agricultural extension officer for guidance.",
    severityLabel: () => "Severity:",
    severityPhrase: (level) =>
      ({
        low: "This looks like a mild or early-stage case. With prompt care, your crop should recover well.",
        moderate: "This is a moderate case that needs timely attention so it doesn't get worse.",
        high: "This looks like a serious case that could spread quickly and cause significant damage if not treated promptly.",
      })[level],
    weatherRiskPhrase: (level) =>
      ({
        low: "Current weather conditions are not especially favorable for this disease to spread quickly, so there's no urgent rush - but keep monitoring the plant.",
        moderate: "Current weather conditions could allow this disease to spread at a moderate pace, so it's a good idea to start treatment soon.",
        high: "It's currently humid and warm - ideal conditions for this disease to spread quickly. Treat as soon as possible.",
      })[level],
    weatherRainDelay: () =>
      "It's raining right now, so hold off on spraying until you have a dry day - rain will wash off most treatments before they can work.",
    needsFollowUpIntro: () => "Before I can confirm the diagnosis, I need a bit more information:",
    outOfScopeMessage: () =>
      "This app currently only supports rice, maize, tomato, potato, and pepper. The photo you sent doesn't appear to be one of these crops, so we can't diagnose it yet.",
    unavailableMessage: () => "Sorry, we couldn't complete the diagnosis right now. Please try again in a little while.",
    agronomistReminder: () => "Please consult your local agronomist to confirm.",
    preventiveTipLabel: () => "Tip for this growth stage:",
  },
  es: {
    diagnosisIntro: (cropLabel, disease) => `Encontramos signos de ${disease} en su cultivo de ${cropLabel}.`,
    descriptionLabel: () => "Sobre este problema:",
    englishFallbackNote: () =>
      "(Todavía no tenemos una traducción de la información detallada de la enfermedad, así que se muestra a continuación en inglés.)",
    organicTreatmentLabel: () => "Pruebe primero estos tratamientos orgánicos/naturales:",
    chemicalTreatmentLabel: () => "Si el problema continúa, también puede usar:",
    noTreatmentInfo: () =>
      "Todavía no tenemos pasos de tratamiento específicos para esto - consulte a su extensionista agrícola local para obtener orientación.",
    severityLabel: () => "Gravedad:",
    severityPhrase: (level) =>
      ({
        low: "Parece ser un caso leve o en etapa temprana. Con cuidado oportuno, su cultivo debería recuperarse bien.",
        moderate: "Este es un caso moderado que necesita atención oportuna para que no empeore.",
        high: "Este parece ser un caso grave que podría propagarse rápidamente y causar daños importantes si no se trata de inmediato.",
      })[level],
    weatherRiskPhrase: (level) =>
      ({
        low: "Las condiciones climáticas actuales no son especialmente favorables para que esta enfermedad se propague rápido, así que no hay prisa urgente - pero siga observando la planta.",
        moderate: "Las condiciones climáticas actuales podrían permitir que esta enfermedad se propague a un ritmo moderado, así que es buena idea comenzar el tratamiento pronto.",
        high: "Actualmente hace calor y hay mucha humedad - condiciones ideales para que esta enfermedad se propague rápido. Trate la planta lo antes posible.",
      })[level],
    weatherRainDelay: () =>
      "Está lloviendo en este momento, así que espere a un día seco antes de fumigar - la lluvia lavará la mayoría de los tratamientos antes de que puedan actuar.",
    needsFollowUpIntro: () => "Antes de poder confirmar el diagnóstico, necesito un poco más de información:",
    outOfScopeMessage: () =>
      "Esta aplicación actualmente solo admite arroz, maíz, tomate, papa y pimiento. La foto que envió no parece ser uno de estos cultivos, así que todavía no podemos diagnosticarla.",
    unavailableMessage: () => "Lo sentimos, no pudimos completar el diagnóstico en este momento. Por favor, inténtelo de nuevo en un momento.",
    agronomistReminder: () => "Por favor, consulte a su agrónomo local para confirmar.",
    preventiveTipLabel: () => "Consejo para esta etapa de crecimiento:",
  },
  fr: {
    diagnosisIntro: (cropLabel, disease) => `Nous avons trouvé des signes de ${disease} sur votre culture de ${cropLabel}.`,
    descriptionLabel: () => "À propos de ce problème :",
    englishFallbackNote: () =>
      "(Nous n'avons pas encore de traduction des informations détaillées sur la maladie, elles sont donc présentées ci-dessous en anglais.)",
    organicTreatmentLabel: () => "Essayez d'abord ces traitements biologiques/naturels :",
    chemicalTreatmentLabel: () => "Si le problème persiste, vous pouvez aussi utiliser :",
    noTreatmentInfo: () =>
      "Nous n'avons pas encore d'étapes de traitement précises pour ce cas - veuillez demander conseil à votre agent agricole local.",
    severityLabel: () => "Gravité :",
    severityPhrase: (level) =>
      ({
        low: "Il s'agit probablement d'un cas léger ou à un stade précoce. Avec des soins rapides, votre culture devrait bien se rétablir.",
        moderate: "Il s'agit d'un cas modéré qui nécessite une attention rapide pour éviter qu'il ne s'aggrave.",
        high: "Il s'agit d'un cas grave qui pourrait se propager rapidement et causer des dégâts importants s'il n'est pas traité rapidement.",
      })[level],
    weatherRiskPhrase: (level) =>
      ({
        low: "Les conditions météorologiques actuelles ne favorisent pas particulièrement une propagation rapide de cette maladie, donc pas d'urgence particulière - mais continuez à surveiller la plante.",
        moderate: "Les conditions météorologiques actuelles pourraient permettre à cette maladie de se propager à un rythme modéré ; il est donc conseillé de commencer le traitement bientôt.",
        high: "Il fait actuellement chaud et humide - des conditions idéales pour une propagation rapide de cette maladie. Traitez dès que possible.",
      })[level],
    weatherRainDelay: () =>
      "Il pleut actuellement, attendez donc un jour sec avant de pulvériser - la pluie éliminera la plupart des traitements avant qu'ils n'agissent.",
    needsFollowUpIntro: () => "Avant de pouvoir confirmer le diagnostic, j'ai besoin d'un peu plus d'informations :",
    outOfScopeMessage: () =>
      "Cette application ne prend actuellement en charge que le riz, le maïs, la tomate, la pomme de terre et le piment. La photo envoyée ne semble pas correspondre à l'une de ces cultures, nous ne pouvons donc pas encore établir de diagnostic.",
    unavailableMessage: () => "Désolé, nous n'avons pas pu terminer le diagnostic pour le moment. Veuillez réessayer dans un instant.",
    agronomistReminder: () => "Veuillez consulter votre agronome local pour confirmer.",
    preventiveTipLabel: () => "Conseil pour ce stade de croissance :",
  },
  sw: {
    diagnosisIntro: (cropLabel, disease) => `Tumepata dalili za ${disease} kwenye zao lako la ${cropLabel}.`,
    descriptionLabel: () => "Kuhusu tatizo hili:",
    englishFallbackNote: () =>
      "(Bado hatuna tafsiri ya taarifa za kina za ugonjwa huu, hivyo zimeonyeshwa hapa chini kwa Kiingereza.)",
    organicTreatmentLabel: () => "Jaribu matibabu haya ya asili/kikaboni kwanza:",
    chemicalTreatmentLabel: () => "Ikiwa tatizo linaendelea, unaweza pia kutumia:",
    noTreatmentInfo: () =>
      "Hatuna hatua maalum za matibabu kwa hili bado - tafadhali muulize afisa wa ugani wa kilimo wa eneo lako kwa ushauri.",
    severityLabel: () => "Ukali wa tatizo:",
    severityPhrase: (level) =>
      ({
        low: "Hili linaonekana kuwa tatizo dogo au la mwanzo. Kwa uangalizi wa haraka, zao lako linapaswa kupona vizuri.",
        moderate: "Hili ni tatizo la wastani linalohitaji uangalizi wa haraka ili lisizidi kuwa baya.",
        high: "Hili linaonekana kuwa tatizo kubwa ambalo linaweza kuenea haraka na kusababisha uharibifu mkubwa kama halitatibiwa mapema.",
      })[level],
    weatherRiskPhrase: (level) =>
      ({
        low: "Hali ya hewa ya sasa haifai sana kueneza ugonjwa huu haraka, kwa hivyo hakuna haraka kubwa - lakini endelea kuchunguza mmea.",
        moderate: "Hali ya hewa ya sasa inaweza kuruhusu ugonjwa huu kuenea kwa kasi ya wastani, hivyo ni vyema kuanza matibabu hivi karibuni.",
        high: "Kwa sasa kuna unyevu na joto - hali nzuri kwa ugonjwa huu kuenea haraka. Tibu haraka iwezekanavyo.",
      })[level],
    weatherRainDelay: () =>
      "Kwa sasa kunanyesha mvua, hivyo subiri siku isiyo na mvua kabla ya kunyunyizia dawa - mvua itaosha matibabu mengi kabla hayajafanya kazi.",
    needsFollowUpIntro: () => "Kabla ya kuthibitisha uchunguzi, ninahitaji maelezo zaidi kidogo:",
    outOfScopeMessage: () =>
      "Programu hii kwa sasa inasaidia tu mpunga, mahindi, nyanya, viazi, na pilipili. Picha uliyotuma haionekani kuwa mojawapo ya mazao haya, kwa hivyo hatuwezi kuichunguza bado.",
    unavailableMessage: () => "Samahani, hatukuweza kukamilisha uchunguzi kwa sasa. Tafadhali jaribu tena baada ya muda mfupi.",
    agronomistReminder: () => "Tafadhali wasiliana na afisa kilimo wa eneo lako kuthibitisha.",
    preventiveTipLabel: () => "Ushauri kwa hatua hii ya ukuaji:",
  },
  hi: {
    diagnosisIntro: (cropLabel, disease) => `हमें आपकी ${cropLabel} की फसल में ${disease} के लक्षण मिले हैं।`,
    descriptionLabel: () => "इस समस्या के बारे में:",
    englishFallbackNote: () =>
      "(इस रोग की विस्तृत जानकारी का अभी आपकी भाषा में अनुवाद उपलब्ध नहीं है, इसलिए यह नीचे अंग्रेज़ी में दिखाई गई है।)",
    organicTreatmentLabel: () => "पहले ये जैविक/प्राकृतिक उपचार आज़माएँ:",
    chemicalTreatmentLabel: () => "अगर समस्या बनी रहे, तो आप यह भी उपयोग कर सकते हैं:",
    noTreatmentInfo: () =>
      "अभी इसके लिए हमारे पास विशिष्ट उपचार चरण नहीं हैं - कृपया मार्गदर्शन के लिए अपने स्थानीय कृषि विस्तार अधिकारी से संपर्क करें।",
    severityLabel: () => "गंभीरता:",
    severityPhrase: (level) =>
      ({
        low: "यह हल्का या शुरुआती चरण का मामला लगता है। समय पर देखभाल से आपकी फसल अच्छी तरह ठीक हो जानी चाहिए।",
        moderate: "यह एक मध्यम मामला है जिस पर समय रहते ध्यान देना ज़रूरी है ताकि यह और न बिगड़े।",
        high: "यह एक गंभीर मामला लगता है जो जल्दी फैल सकता है और समय पर इलाज न करने पर काफी नुकसान पहुंचा सकता है।",
      })[level],
    weatherRiskPhrase: (level) =>
      ({
        low: "मौजूदा मौसम की स्थितियाँ इस बीमारी के तेज़ी से फैलने के लिए विशेष रूप से अनुकूल नहीं हैं, इसलिए ज़्यादा जल्दबाज़ी की ज़रूरत नहीं - लेकिन पौधे पर नज़र रखें।",
        moderate: "मौजूदा मौसम की स्थितियों में यह बीमारी मध्यम गति से फैल सकती है, इसलिए जल्द ही उपचार शुरू करना अच्छा रहेगा।",
        high: "अभी काफी उमस और गर्मी है - इस बीमारी के तेज़ी से फैलने के लिए आदर्श स्थिति। जल्द से जल्द उपचार करें।",
      })[level],
    weatherRainDelay: () =>
      "अभी बारिश हो रही है, इसलिए छिड़काव के लिए किसी सूखे दिन का इंतज़ार करें - बारिश ज़्यादातर उपचार को असर करने से पहले ही धो देगी।",
    needsFollowUpIntro: () => "निदान की पुष्टि करने से पहले, मुझे थोड़ी और जानकारी चाहिए:",
    outOfScopeMessage: () =>
      "यह ऐप फिलहाल केवल चावल, मक्का, टमाटर, आलू और मिर्च के लिए काम करता है। आपकी भेजी गई फ़ोटो इनमें से किसी फसल की नहीं लगती, इसलिए हम अभी इसका निदान नहीं कर सकते।",
    unavailableMessage: () => "क्षमा करें, हम अभी निदान पूरा नहीं कर सके। कृपया थोड़ी देर बाद फिर से कोशिश करें।",
    agronomistReminder: () => "पुष्टि के लिए कृपया अपने स्थानीय कृषि विशेषज्ञ (एग्रोनॉमिस्ट) से सलाह लें।",
    preventiveTipLabel: () => "इस विकास चरण के लिए सुझाव:",
  },
  ml: {
    diagnosisIntro: (cropLabel, disease) => `നിങ്ങളുടെ ${cropLabel} വിളയിൽ ${disease}-ന്റെ ലക്ഷണങ്ങൾ ഞങ്ങൾ കണ്ടെത്തി.`,
    descriptionLabel: () => "ഈ പ്രശ്നത്തെക്കുറിച്ച്:",
    englishFallbackNote: () =>
      "(ഈ രോഗത്തിന്റെ വിശദമായ വിവരങ്ങൾ നിങ്ങളുടെ ഭാഷയിൽ ഇതുവരെ ലഭ്യമല്ല, അതിനാൽ അത് താഴെ ഇംഗ്ലീഷിൽ കാണിച്ചിരിക്കുന്നു.)",
    organicTreatmentLabel: () => "ആദ്യം ഈ ജൈവ/പ്രകൃതിദത്ത ചികിത്സകൾ പരീക്ഷിക്കുക:",
    chemicalTreatmentLabel: () => "പ്രശ്നം തുടരുകയാണെങ്കിൽ, നിങ്ങൾക്ക് ഇവയും ഉപയോഗിക്കാം:",
    noTreatmentInfo: () =>
      "ഇതിന് പ്രത്യേക ചികിത്സാ ഘട്ടങ്ങൾ ഞങ്ങളുടെ പക്കൽ ഇപ്പോൾ ഇല്ല - മാർഗ്ഗനിർദ്ദേശത്തിനായി നിങ്ങളുടെ പ്രാദേശിക കാർഷിക വിപുലീകരണ ഓഫീസറെ സമീപിക്കുക.",
    severityLabel: () => "തീവ്രത:",
    severityPhrase: (level) =>
      ({
        low: "ഇത് നേരിയതോ ആദ്യഘട്ടത്തിലുള്ളതോ ആയ ഒരു കേസ് ആയി തോന്നുന്നു. സമയബന്ധിതമായ പരിചരണത്തിലൂടെ നിങ്ങളുടെ വിള നന്നായി സുഖം പ്രാപിക്കും.",
        moderate: "ഇത് ഒരു മിതമായ കേസാണ്, ഇത് കൂടുതൽ വഷളാകാതിരിക്കാൻ സമയബന്ധിതമായ ശ്രദ്ധ ആവശ്യമാണ്.",
        high: "ഇത് ഗുരുതരമായ ഒരു കേസായി തോന്നുന്നു, വേഗത്തിൽ ചികിത്സിച്ചില്ലെങ്കിൽ ഇത് വേഗത്തിൽ പടരുകയും കാര്യമായ നാശനഷ്ടം ഉണ്ടാക്കുകയും ചെയ്യാം.",
      })[level],
    weatherRiskPhrase: (level) =>
      ({
        low: "ഇപ്പോഴത്തെ കാലാവസ്ഥ ഈ രോഗം വേഗത്തിൽ പടരാൻ പ്രത്യേകിച്ച് അനുകൂലമല്ല, അതിനാൽ വലിയ തിടുക്കമില്ല - എന്നാൽ ചെടി നിരീക്ഷിച്ചുകൊണ്ടിരിക്കുക.",
        moderate: "ഇപ്പോഴത്തെ കാലാവസ്ഥ ഈ രോഗം മിതമായ വേഗതയിൽ പടരാൻ അനുവദിച്ചേക്കാം, അതിനാൽ ഉടൻ ചികിത്സ ആരംഭിക്കുന്നത് നല്ലതാണ്.",
        high: "ഇപ്പോൾ നല്ല ഈർപ്പവും ചൂടും ഉണ്ട് - ഈ രോഗം വേഗത്തിൽ പടരാൻ അനുയോജ്യമായ സാഹചര്യം. കഴിയുന്നത്ര വേഗം ചികിത്സിക്കുക.",
      })[level],
    weatherRainDelay: () =>
      "ഇപ്പോൾ മഴ പെയ്യുന്നുണ്ട്, അതിനാൽ സ്പ്രേ ചെയ്യുന്നതിന് മുമ്പ് ഒരു വരണ്ട ദിവസത്തിനായി കാത്തിരിക്കുക - മഴ മിക്ക ചികിത്സകളും ഫലിക്കുന്നതിന് മുമ്പ് കഴുകിക്കളയും.",
    needsFollowUpIntro: () => "രോഗനിർണയം സ്ഥിരീകരിക്കുന്നതിന് മുമ്പ്, എനിക്ക് കുറച്ചുകൂടി വിവരങ്ങൾ ആവശ്യമാണ്:",
    outOfScopeMessage: () =>
      "ഈ ആപ്പ് നിലവിൽ നെല്ല്, ചോളം, തക്കാളി, ഉരുളക്കിഴങ്ങ്, മുളക് എന്നിവയെ മാത്രമേ പിന്തുണയ്ക്കുന്നുള്ളൂ. നിങ്ങൾ അയച്ച ഫോട്ടോ ഇവയിലൊന്നായി തോന്നുന്നില്ല, അതിനാൽ ഞങ്ങൾക്ക് ഇത് ഇപ്പോൾ രോഗനിർണയം നടത്താൻ കഴിയില്ല.",
    unavailableMessage: () => "ക്ഷമിക്കണം, ഞങ്ങൾക്ക് ഇപ്പോൾ രോഗനിർണയം പൂർത്തിയാക്കാൻ കഴിഞ്ഞില്ല. ദയവായി കുറച്ച് സമയം കഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കുക.",
    agronomistReminder: () => "സ്ഥിരീകരിക്കാൻ ദയവായി നിങ്ങളുടെ പ്രാദേശിക കാർഷിക വിദഗ്ധനെ (അഗ്രോണമിസ്റ്റ്) സമീപിക്കുക.",
    preventiveTipLabel: () => "ഈ വളർച്ചാ ഘട്ടത്തിനുള്ള നിർദ്ദേശം:",
  },
  bn: {
    diagnosisIntro: (cropLabel, disease) => `আপনার ${cropLabel} ফসলে আমরা ${disease}-এর লক্ষণ পেয়েছি।`,
    descriptionLabel: () => "এই সমস্যা সম্পর্কে:",
    englishFallbackNote: () =>
      "(এই রোগের বিস্তারিত তথ্যের অনুবাদ এখনও আমাদের কাছে নেই, তাই এটি নিচে ইংরেজিতে দেখানো হয়েছে।)",
    organicTreatmentLabel: () => "প্রথমে এই জৈব/প্রাকৃতিক চিকিৎসাগুলো চেষ্টা করুন:",
    chemicalTreatmentLabel: () => "সমস্যা চলতে থাকলে, আপনি এগুলোও ব্যবহার করতে পারেন:",
    noTreatmentInfo: () =>
      "এর জন্য আমাদের কাছে এখনো নির্দিষ্ট চিকিৎসার ধাপ নেই - অনুগ্রহ করে পরামর্শের জন্য আপনার স্থানীয় কৃষি সম্প্রসারণ কর্মকর্তার সাথে যোগাযোগ করুন।",
    severityLabel: () => "তীব্রতা:",
    severityPhrase: (level) =>
      ({
        low: "এটি একটি হালকা বা প্রাথমিক পর্যায়ের সমস্যা বলে মনে হচ্ছে। সময়মতো যত্ন নিলে আপনার ফসল ভালোভাবে সেরে উঠবে।",
        moderate: "এটি একটি মাঝারি মাত্রার সমস্যা, যা আরও খারাপ না হওয়ার জন্য সময়মতো মনোযোগ প্রয়োজন।",
        high: "এটি একটি গুরুতর সমস্যা বলে মনে হচ্ছে, যা দ্রুত ছড়িয়ে পড়তে পারে এবং সময়মতো চিকিৎসা না করলে উল্লেখযোগ্য ক্ষতি করতে পারে।",
      })[level],
    weatherRiskPhrase: (level) =>
      ({
        low: "বর্তমান আবহাওয়া এই রোগ দ্রুত ছড়ানোর জন্য বিশেষভাবে অনুকূল নয়, তাই খুব তাড়াহুড়োর দরকার নেই - তবে গাছটি পর্যবেক্ষণ করতে থাকুন।",
        moderate: "বর্তমান আবহাওয়া এই রোগকে মাঝারি গতিতে ছড়াতে সাহায্য করতে পারে, তাই শীঘ্রই চিকিৎসা শুরু করা ভালো।",
        high: "এখন বেশ আর্দ্র ও গরম আবহাওয়া - এই রোগ দ্রুত ছড়ানোর জন্য আদর্শ পরিস্থিতি। যত দ্রুত সম্ভব চিকিৎসা করুন।",
      })[level],
    weatherRainDelay: () =>
      "এখন বৃষ্টি হচ্ছে, তাই স্প্রে করার আগে একটি শুকনো দিনের জন্য অপেক্ষা করুন - বৃষ্টি বেশিরভাগ চিকিৎসা কাজ করার আগেই ধুয়ে ফেলবে।",
    needsFollowUpIntro: () => "রোগ নির্ণয় নিশ্চিত করার আগে, আমার আরেকটু তথ্য দরকার:",
    outOfScopeMessage: () =>
      "এই অ্যাপটি বর্তমানে শুধুমাত্র ধান, ভুট্টা, টমেটো, আলু এবং মরিচ সমর্থন করে। আপনার পাঠানো ছবিটি এই ফসলগুলোর একটি বলে মনে হচ্ছে না, তাই আমরা এখনো এটি নির্ণয় করতে পারছি না।",
    unavailableMessage: () => "দুঃখিত, আমরা এখন রোগ নির্ণয় সম্পূর্ণ করতে পারিনি। অনুগ্রহ করে কিছুক্ষণ পরে আবার চেষ্টা করুন।",
    agronomistReminder: () => "নিশ্চিত করার জন্য অনুগ্রহ করে আপনার স্থানীয় কৃষিবিদের সাথে পরামর্শ করুন।",
    preventiveTipLabel: () => "এই বৃদ্ধির পর্যায়ের জন্য পরামর্শ:",
  },
};

export function getResponseTemplates(code: SupportedLanguageCode): ResponseTemplateSet {
  return TEMPLATES[code] ?? TEMPLATES.en;
}
