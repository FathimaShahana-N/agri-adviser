// Curated, pre-translated {description, treatment} content for the most
// common diseases across our 5 supported crops, so Response Agent doesn't
// have to fall back to Plant.id's English-only text when it can avoid it.
// No LLM call - this is hand-authored reference content per disease per
// language, matched fuzzily against whatever name Plant.id returned.
//
// Not exhaustive: only the 3-5 most common diseases per crop are covered.
// When a diagnosed disease isn't in this table, responseAgent.ts falls back
// to Plant.id's original English text and adds a translated note (see
// englishFallbackNote() in responseTemplates.ts) so the farmer knows why
// part of the message is in English rather than assuming it's a bug.
import { DiseaseTreatmentInfo, SupportedCropSlug, SupportedLanguageCode } from "../types";

export interface DiseaseContent {
  description: string;
  treatment: DiseaseTreatmentInfo;
  // Cost/accessibility framing for smallholder farmers, shown alongside the
  // matching treatment list. chemical is null for the rare disease where
  // there's no real chemical option to weigh against cost (see
  // NO_CHEMICAL_OPTION_COST_NOTE / hasChemicalOption below).
  costNote: {
    biological: string;
    chemical: string | null;
  };
}

// Stored per-language content omits costNote - it's the same generic
// biological/organic-vs-chemical cost guidance for nearly every disease
// (a cost difference driven by treatment TYPE, not the specific disease),
// so it's kept as one shared, translated phrase pair below rather than
// hand-duplicated 20 times. findTranslatedDiseaseContent() attaches it.
type StoredDiseaseContent = Omit<DiseaseContent, "costNote">;

interface DiseaseEntry {
  crop: SupportedCropSlug;
  // lowercase substrings matched against Plant.id's disease name/common names
  matchAliases: string[];
  // Set to false for the rare disease where no chemical product is really
  // being recommended (e.g. bacterial wilt, common scab - the "chemical"
  // treatment entry there is itself just "no reliable cure exists"), so the
  // generic "chemical costs more" framing doesn't get attached to it.
  hasChemicalOption?: boolean;
  translations: Record<SupportedLanguageCode, StoredDiseaseContent>;
}

const BIOLOGICAL_COST_NOTE: Record<SupportedLanguageCode, string> = {
  en: "These are usually the cheaper, more accessible option, often using things already on hand.",
  es: "Estas suelen ser la opción más barata y accesible, a menudo usando cosas que ya tiene a mano.",
  fr: "Ce sont généralement les options les moins chères et les plus accessibles, souvent avec ce que vous avez déjà sous la main.",
  sw: "Chaguo hizi kwa kawaida ni nafuu zaidi na rahisi kupatikana, mara nyingi zikitumia vitu ulivyo navyo tayari.",
  hi: "ये आमतौर पर सस्ते और आसानी से उपलब्ध विकल्प होते हैं, जिनमें अक्सर आपके पास पहले से मौजूद चीज़ों का उपयोग होता है।",
  ml: "ഇവ സാധാരണയായി വിലക്കുറവുള്ളതും എളുപ്പത്തിൽ ലഭ്യമാകുന്നതുമായ ഓപ്ഷനുകളാണ്, പലപ്പോഴും നിങ്ങളുടെ പക്കൽ ഇതിനകം ഉള്ള വസ്തുക്കൾ ഉപയോഗിച്ച്.",
  bn: "এগুলো সাধারণত সস্তা ও সহজলভ্য বিকল্প, প্রায়ই আপনার কাছে আগে থেকেই থাকা জিনিসপত্র ব্যবহার করে।",
};

const CHEMICAL_COST_NOTE: Record<SupportedLanguageCode, string> = {
  en: "This usually costs more and needs to be bought, but can act faster if the case is severe.",
  es: "Esto suele costar más y hay que comprarlo, pero puede actuar más rápido si el caso es grave.",
  fr: "Cela coûte généralement plus cher et doit être acheté, mais peut agir plus vite si le cas est grave.",
  sw: "Hii kwa kawaida hugharimu zaidi na inahitaji kununuliwa, lakini inaweza kufanya kazi haraka zaidi ikiwa hali ni mbaya.",
  hi: "इसकी कीमत आमतौर पर अधिक होती है और इसे खरीदना पड़ता है, लेकिन गंभीर स्थिति में यह तेज़ी से असर कर सकता है।",
  ml: "ഇതിന് സാധാരണയായി കൂടുതൽ ചെലവ് വരും, വാങ്ങേണ്ടിവരും, എന്നാൽ കാര്യം ഗുരുതരമാണെങ്കിൽ വേഗത്തിൽ ഫലം നൽകും.",
  bn: "এর দাম সাধারণত বেশি এবং কিনতে হয়, তবে পরিস্থিতি গুরুতর হলে এটি দ্রুত কাজ করতে পারে।",
};

const NO_CHEMICAL_OPTION_COST_NOTE: Record<SupportedLanguageCode, string> = {
  en: "There's no cost-effective chemical option for this - the low-cost prevention steps above matter most.",
  es: "No existe una opción química rentable para esto - los pasos de prevención de bajo costo mencionados arriba son lo más importante.",
  fr: "Il n'existe pas d'option chimique rentable pour ce cas - les mesures de prévention à faible coût ci-dessus sont les plus importantes.",
  sw: "Hakuna chaguo la kemikali lenye gharama nafuu kwa hili - hatua za kinga za gharama ndogo zilizotajwa hapo juu ndizo muhimu zaidi.",
  hi: "इसके लिए कोई किफ़ायती रासायनिक विकल्प नहीं है - ऊपर बताए गए कम लागत वाले रोकथाम के उपाय ही सबसे महत्वपूर्ण हैं।",
  ml: "ഇതിന് ചെലവ് കുറഞ്ഞ ഫലപ്രദമായ രാസ ഓപ്ഷൻ ഒന്നും ഇല്ല - മുകളിൽ പറഞ്ഞ കുറഞ്ഞ ചെലവിലുള്ള പ്രതിരോധ നടപടികളാണ് ഏറ്റവും പ്രധാനം.",
  bn: "এর জন্য সাশ্রয়ী কোনো রাসায়নিক বিকল্প নেই - উপরে উল্লিখিত কম খরচের প্রতিরোধ ব্যবস্থাগুলোই সবচেয়ে গুরুত্বপূর্ণ।",
};

const DISEASE_TRANSLATIONS: DiseaseEntry[] = [
  // ---------------------------------------------------------------- RICE --
  {
    crop: "rice",
    matchAliases: ["bacterial leaf blight", "bacterial blight", "xanthomonas oryzae"],
    translations: {
      en: {
        description:
          "A bacterial disease causing water-soaked streaks on leaf edges that turn yellow to white and dry out, often starting after storms or flooding.",
        treatment: {
          biological: [
            "Drain and dry the field between irrigations to reduce bacterial spread.",
            "Remove and destroy infected plant debris after harvest.",
          ],
          chemical: ["Apply a copper-based bactericide if the infection is spreading rapidly."],
          prevention: [
            "Use certified disease-free seed and resistant varieties.",
            "Avoid excess nitrogen fertilizer, which makes plants more susceptible.",
          ],
        },
      },
      es: {
        description:
          "Una enfermedad bacteriana que causa rayas empapadas de agua en los bordes de las hojas, que se vuelven amarillas a blancas y se secan, a menudo después de tormentas o inundaciones.",
        treatment: {
          biological: [
            "Drene y seque el campo entre riegos para reducir la propagación bacteriana.",
            "Retire y destruya los restos de plantas infectadas después de la cosecha.",
          ],
          chemical: ["Aplique un bactericida a base de cobre si la infección se propaga rápidamente."],
          prevention: [
            "Use semilla certificada libre de enfermedades y variedades resistentes.",
            "Evite el exceso de fertilizante nitrogenado, que hace las plantas más susceptibles.",
          ],
        },
      },
      fr: {
        description:
          "Une maladie bactérienne provoquant des stries détrempées sur les bords des feuilles, qui deviennent jaunes puis blanches et se dessèchent, souvent après des tempêtes ou des inondations.",
        treatment: {
          biological: [
            "Drainez et asséchez le champ entre les irrigations pour réduire la propagation bactérienne.",
            "Retirez et détruisez les débris de plantes infectées après la récolte.",
          ],
          chemical: ["Appliquez un bactéricide à base de cuivre si l'infection se propage rapidement."],
          prevention: [
            "Utilisez des semences certifiées exemptes de maladies et des variétés résistantes.",
            "Évitez l'excès d'engrais azoté, qui rend les plantes plus sensibles.",
          ],
        },
      },
      sw: {
        description:
          "Ugonjwa wa bakteria unaosababisha michirizi yenye maji kwenye kingo za majani, ambayo hubadilika kuwa manjano hadi meupe na kukauka, mara nyingi baada ya dhoruba au mafuriko.",
        treatment: {
          biological: [
            "Toa maji na kukausha shamba kati ya umwagiliaji ili kupunguza kuenea kwa bakteria.",
            "Ondoa na haribu mabaki ya mimea iliyoambukizwa baada ya mavuno.",
          ],
          chemical: ["Tumia dawa ya bakteria yenye shaba (copper) ikiwa maambukizi yanaenea haraka."],
          prevention: [
            "Tumia mbegu zilizothibitishwa kuwa hazina magonjwa na aina zinazostahimili.",
            "Epuka mbolea nyingi ya nitrojeni, ambayo hufanya mimea kuwa rahisi kuathirika.",
          ],
        },
      },
      hi: {
        description:
          "एक जीवाणु रोग जो पत्तियों के किनारों पर पानी से भीगी धारियाँ बनाता है, जो पीली से सफेद होकर सूख जाती हैं, अक्सर तूफान या बाढ़ के बाद।",
        treatment: {
          biological: [
            "बैक्टीरिया के प्रसार को कम करने के लिए सिंचाई के बीच खेत को सुखाएं।",
            "कटाई के बाद संक्रमित पौधों के अवशेष हटाकर नष्ट करें।",
          ],
          chemical: ["यदि संक्रमण तेज़ी से फैल रहा हो तो कॉपर आधारित जीवाणुनाशक का प्रयोग करें।"],
          prevention: [
            "प्रमाणित रोग-मुक्त बीज और प्रतिरोधी किस्मों का उपयोग करें।",
            "अधिक नाइट्रोजन उर्वरक से बचें, जो पौधों को अधिक संवेदनशील बनाता है।",
          ],
        },
      },
      ml: {
        description:
          "ഇലയുടെ അരികുകളിൽ ജലാംശമുള്ള വരകൾ ഉണ്ടാക്കുന്ന ഒരു ബാക്ടീരിയൽ രോഗം, ഇവ മഞ്ഞയായി പിന്നീട് വെളുത്ത് ഉണങ്ങും, പലപ്പോഴും കൊടുങ്കാറ്റ് അല്ലെങ്കിൽ വെള്ളപ്പൊക്കത്തിന് ശേഷം.",
        treatment: {
          biological: [
            "ബാക്ടീരിയ പടരുന്നത് കുറയ്ക്കാൻ ജലസേചനങ്ങൾക്കിടയിൽ വയൽ വറ്റിച്ച് ഉണക്കുക.",
            "വിളവെടുപ്പിന് ശേഷം ബാധിച്ച ചെടികളുടെ അവശിഷ്ടങ്ങൾ നീക്കം ചെയ്ത് നശിപ്പിക്കുക.",
          ],
          chemical: ["അണുബാധ വേഗത്തിൽ പടരുകയാണെങ്കിൽ കോപ്പർ അടിസ്ഥാനമാക്കിയുള്ള ബാക്ടീരിയനാശിനി പ്രയോഗിക്കുക."],
          prevention: [
            "സാക്ഷ്യപ്പെടുത്തിയ രോഗരഹിത വിത്തും പ്രതിരോധശേഷിയുള്ള ഇനങ്ങളും ഉപയോഗിക്കുക.",
            "അധിക നൈട്രജൻ വളം ഒഴിവാക്കുക, ഇത് ചെടികളെ കൂടുതൽ ദുർബലമാക്കും.",
          ],
        },
      },
      bn: {
        description:
          "একটি ব্যাকটেরিয়াজনিত রোগ যা পাতার কিনারায় জলভেজা ডোরা তৈরি করে, যা হলুদ থেকে সাদা হয়ে শুকিয়ে যায়, প্রায়ই ঝড় বা বন্যার পরে।",
        treatment: {
          biological: [
            "ব্যাকটেরিয়ার বিস্তার কমাতে সেচের মাঝে জমি শুকিয়ে নিন।",
            "ফসল কাটার পর আক্রান্ত গাছের অবশিষ্টাংশ সরিয়ে ধ্বংস করুন।",
          ],
          chemical: ["সংক্রমণ দ্রুত ছড়ালে তামা-ভিত্তিক ব্যাকটেরিয়ানাশক প্রয়োগ করুন।"],
          prevention: [
            "প্রত্যয়িত রোগমুক্ত বীজ ও প্রতিরোধী জাত ব্যবহার করুন।",
            "অতিরিক্ত নাইট্রোজেন সার এড়িয়ে চলুন, যা গাছকে বেশি সংবেদনশীল করে তোলে।",
          ],
        },
      },
    },
  },
  {
    crop: "rice",
    matchAliases: ["rice blast", "blast", "magnaporthe"],
    translations: {
      en: {
        description:
          "A fungal disease causing diamond-shaped gray-centered lesions on leaves, and can also infect the neck of the panicle, cutting off grain filling.",
        treatment: {
          biological: [
            "Remove and destroy infected leaves and stubble after harvest.",
            "Apply well-balanced fertilization, avoiding excess nitrogen.",
          ],
          chemical: ["Apply a tricyclazole or azoxystrobin-based fungicide at early signs of infection."],
          prevention: ["Plant blast-resistant rice varieties.", "Maintain proper water management; avoid drought stress."],
        },
      },
      es: {
        description:
          "Una enfermedad fúngica que causa lesiones en forma de diamante con centro gris en las hojas, y también puede infectar el cuello de la panícula, cortando el llenado del grano.",
        treatment: {
          biological: [
            "Retire y destruya las hojas y rastrojos infectados después de la cosecha.",
            "Aplique una fertilización equilibrada, evitando el exceso de nitrógeno.",
          ],
          chemical: ["Aplique un fungicida a base de tricyclazol o azoxistrobina ante los primeros signos de infección."],
          prevention: ["Siembre variedades de arroz resistentes al añublo.", "Mantenga un buen manejo del agua; evite el estrés por sequía."],
        },
      },
      fr: {
        description:
          "Une maladie fongique provoquant des lésions en forme de losange à centre gris sur les feuilles, pouvant aussi infecter le col de la panicule, empêchant le remplissage du grain.",
        treatment: {
          biological: [
            "Retirez et détruisez les feuilles et chaumes infectés après la récolte.",
            "Appliquez une fertilisation équilibrée, en évitant l'excès d'azote.",
          ],
          chemical: ["Appliquez un fongicide à base de tricyclazole ou d'azoxystrobine dès les premiers signes d'infection."],
          prevention: ["Plantez des variétés de riz résistantes à la pyriculariose.", "Maintenez une bonne gestion de l'eau ; évitez le stress hydrique."],
        },
      },
      sw: {
        description:
          "Ugonjwa wa fangasi unaosababisha madoa yenye umbo la almasi na kitovu cha kijivu kwenye majani, na unaweza pia kuathiri shingo ya suke, hivyo kuzuia mbegu kujaa.",
        treatment: {
          biological: [
            "Ondoa na haribu majani na mabua yaliyoambukizwa baada ya mavuno.",
            "Tumia mbolea yenye uwiano mzuri, ukiepuka nitrojeni nyingi.",
          ],
          chemical: ["Tumia dawa ya fangasi yenye tricyclazole au azoxystrobin mapema mara dalili zinapoonekana."],
          prevention: ["Panda aina za mpunga zinazostahimili blast.", "Dhibiti maji vizuri; epuka ukame."],
        },
      },
      hi: {
        description:
          "एक फफूंद रोग जो पत्तियों पर हीरे के आकार के भूरे-केंद्र वाले धब्बे बनाता है, और बाली की गर्दन को भी संक्रमित कर सकता है, जिससे दाना भरना रुक जाता है।",
        treatment: {
          biological: [
            "कटाई के बाद संक्रमित पत्तियों और ठूंठ को हटाकर नष्ट करें।",
            "संतुलित उर्वरक का प्रयोग करें, अधिक नाइट्रोजन से बचें।",
          ],
          chemical: ["संक्रमण के शुरुआती लक्षणों पर ट्राइसाइक्लाज़ोल या एज़ोक्सिस्ट्रोबिन आधारित फफूंदनाशक का प्रयोग करें।"],
          prevention: ["ब्लास्ट प्रतिरोधी चावल की किस्में लगाएं।", "उचित जल प्रबंधन बनाए रखें; सूखे तनाव से बचें।"],
        },
      },
      ml: {
        description:
          "ഇലകളിൽ വജ്രാകൃതിയിലുള്ള ചാരനിറ കേന്ദ്രമുള്ള പാടുകൾ ഉണ്ടാക്കുന്ന ഒരു ഫംഗസ് രോഗം, ഇത് കതിരിന്റെ കഴുത്തിനെയും ബാധിക്കാം, ധാന്യം നിറയുന്നത് തടസ്സപ്പെടുത്തും.",
        treatment: {
          biological: [
            "വിളവെടുപ്പിന് ശേഷം ബാധിച്ച ഇലകളും കുറ്റിയും നീക്കം ചെയ്ത് നശിപ്പിക്കുക.",
            "അധിക നൈട്രജൻ ഒഴിവാക്കി സമീകൃത വളപ്രയോഗം നടത്തുക.",
          ],
          chemical: ["അണുബാധയുടെ ആദ്യ ലക്ഷണങ്ങളിൽ ട്രൈസൈക്ലാസോൾ അല്ലെങ്കിൽ അസോക്സിസ്ട്രോബിൻ അടിസ്ഥാനമാക്കിയുള്ള കുമിൾനാശിനി പ്രയോഗിക്കുക."],
          prevention: ["ബ്ലാസ്റ്റ് പ്രതിരോധശേഷിയുള്ള നെല്ല് ഇനങ്ങൾ നടുക.", "ശരിയായ ജലപരിപാലനം നിലനിർത്തുക; വരൾച്ച സമ്മർദ്ദം ഒഴിവാക്കുക."],
        },
      },
      bn: {
        description:
          "একটি ছত্রাকজনিত রোগ যা পাতায় হীরার আকৃতির ধূসর-কেন্দ্রিক ক্ষত তৈরি করে, এবং শীষের গলাতেও সংক্রমণ ঘটাতে পারে, যা শস্য ভরাট বন্ধ করে দেয়।",
        treatment: {
          biological: [
            "ফসল কাটার পর আক্রান্ত পাতা ও নাড়া সরিয়ে ধ্বংস করুন।",
            "অতিরিক্ত নাইট্রোজেন এড়িয়ে সুষম সার প্রয়োগ করুন।",
          ],
          chemical: ["সংক্রমণের প্রাথমিক লক্ষণে ট্রাইসাইক্লাজোল বা অ্যাজোক্সিস্ট্রোবিন-ভিত্তিক ছত্রাকনাশক প্রয়োগ করুন।"],
          prevention: ["ব্লাস্ট প্রতিরোধী ধানের জাত রোপণ করুন।", "সঠিক জল ব্যবস্থাপনা বজায় রাখুন; খরা চাপ এড়িয়ে চলুন।"],
        },
      },
    },
  },
  {
    crop: "rice",
    matchAliases: ["brown spot", "bipolaris"],
    translations: {
      en: {
        description: "A fungal disease causing small oval brown spots on leaves and grains, often linked to poor soil nutrition.",
        treatment: {
          biological: [
            "Improve soil fertility with balanced potassium and nitrogen application.",
            "Remove infected crop residue after harvest.",
          ],
          chemical: ["Apply a mancozeb or propiconazole-based fungicide if spots are spreading."],
          prevention: ["Use certified, disease-free seed.", "Avoid water stress and maintain balanced soil nutrients."],
        },
      },
      es: {
        description:
          "Una enfermedad fúngica que causa pequeñas manchas ovaladas de color marrón en hojas y granos, a menudo relacionada con una nutrición deficiente del suelo.",
        treatment: {
          biological: [
            "Mejore la fertilidad del suelo con una aplicación equilibrada de potasio y nitrógeno.",
            "Retire los residuos de cultivo infectados después de la cosecha.",
          ],
          chemical: ["Aplique un fungicida a base de mancozeb o propiconazol si las manchas se propagan."],
          prevention: ["Use semilla certificada y libre de enfermedades.", "Evite el estrés hídrico y mantenga nutrientes equilibrados en el suelo."],
        },
      },
      fr: {
        description:
          "Une maladie fongique provoquant de petites taches ovales brunes sur les feuilles et les grains, souvent liée à une mauvaise nutrition du sol.",
        treatment: {
          biological: [
            "Améliorez la fertilité du sol avec un apport équilibré de potassium et d'azote.",
            "Retirez les résidus de culture infectés après la récolte.",
          ],
          chemical: ["Appliquez un fongicide à base de mancozèbe ou de propiconazole si les taches se propagent."],
          prevention: ["Utilisez des semences certifiées et exemptes de maladies.", "Évitez le stress hydrique et maintenez des nutriments équilibrés dans le sol."],
        },
      },
      sw: {
        description:
          "Ugonjwa wa fangasi unaosababisha madoa madogo ya mviringo ya kahawia kwenye majani na nafaka, mara nyingi huhusiana na lishe duni ya udongo.",
        treatment: {
          biological: [
            "Boresha rutuba ya udongo kwa kutumia potasiamu na nitrojeni kwa uwiano mzuri.",
            "Ondoa mabaki ya mazao yaliyoambukizwa baada ya mavuno.",
          ],
          chemical: ["Tumia dawa ya fangasi yenye mancozeb au propiconazole ikiwa madoa yanaenea."],
          prevention: ["Tumia mbegu zilizothibitishwa kuwa hazina magonjwa.", "Epuka mkazo wa maji na dumisha virutubisho vya udongo kwa uwiano."],
        },
      },
      hi: {
        description:
          "एक फफूंद रोग जो पत्तियों और दानों पर छोटे अंडाकार भूरे धब्बे बनाता है, जो अक्सर मिट्टी में खराब पोषण से जुड़ा होता है।",
        treatment: {
          biological: [
            "संतुलित पोटेशियम और नाइट्रोजन प्रयोग से मिट्टी की उर्वरता सुधारें।",
            "कटाई के बाद संक्रमित फसल अवशेष हटाएं।",
          ],
          chemical: ["यदि धब्बे फैल रहे हों तो मैंकोज़ेब या प्रोपिकोनाज़ोल आधारित फफूंदनाशक का प्रयोग करें।"],
          prevention: ["प्रमाणित, रोग-मुक्त बीज का उपयोग करें।", "जल तनाव से बचें और मिट्टी के पोषक तत्वों को संतुलित रखें।"],
        },
      },
      ml: {
        description:
          "ഇലകളിലും ധാന്യങ്ങളിലും ചെറിയ ദീർഘവൃത്താകൃതിയിലുള്ള തവിട്ട് പാടുകൾ ഉണ്ടാക്കുന്ന ഒരു ഫംഗസ് രോഗം, ഇത് പലപ്പോഴും മണ്ണിലെ മോശം പോഷണവുമായി ബന്ധപ്പെട്ടിരിക്കുന്നു.",
        treatment: {
          biological: [
            "പൊട്ടാസ്യവും നൈട്രജനും സമീകൃതമായി ഉപയോഗിച്ച് മണ്ണിന്റെ ഫലഭൂയിഷ്ഠത മെച്ചപ്പെടുത്തുക.",
            "വിളവെടുപ്പിന് ശേഷം ബാധിച്ച വിള അവശിഷ്ടങ്ങൾ നീക്കം ചെയ്യുക.",
          ],
          chemical: ["പാടുകൾ പടരുകയാണെങ്കിൽ മാൻകോസെബ് അല്ലെങ്കിൽ പ്രോപികോണസോൾ അടിസ്ഥാനമാക്കിയുള്ള കുമിൾനാശിനി പ്രയോഗിക്കുക."],
          prevention: ["സാക്ഷ്യപ്പെടുത്തിയ, രോഗരഹിത വിത്ത് ഉപയോഗിക്കുക.", "ജലസമ്മർദ്ദം ഒഴിവാക്കി മണ്ണിലെ പോഷകങ്ങൾ സന്തുലിതമായി നിലനിർത്തുക."],
        },
      },
      bn: {
        description:
          "একটি ছত্রাকজনিত রোগ যা পাতা ও শস্যে ছোট ডিম্বাকার বাদামী দাগ তৈরি করে, যা প্রায়ই মাটির দুর্বল পুষ্টির সাথে সম্পর্কিত।",
        treatment: {
          biological: [
            "সুষম পটাশিয়াম ও নাইট্রোজেন প্রয়োগ করে মাটির উর্বরতা উন্নত করুন।",
            "ফসল কাটার পর আক্রান্ত ফসলের অবশিষ্টাংশ সরিয়ে ফেলুন।",
          ],
          chemical: ["দাগ ছড়াতে থাকলে ম্যানকোজেব বা প্রোপিকোনাজোল-ভিত্তিক ছত্রাকনাশক প্রয়োগ করুন।"],
          prevention: ["প্রত্যয়িত, রোগমুক্ত বীজ ব্যবহার করুন।", "জলের চাপ এড়িয়ে মাটির পুষ্টি সুষম রাখুন।"],
        },
      },
    },
  },
  {
    crop: "rice",
    matchAliases: ["sheath blight", "rhizoctonia"],
    translations: {
      en: {
        description:
          "A fungal disease causing greenish-gray lesions on the leaf sheath near the waterline, which can spread up the plant in humid, densely planted fields.",
        treatment: {
          biological: [
            "Reduce plant density to improve air circulation.",
            "Remove infected sheaths and destroy crop residue after harvest.",
          ],
          chemical: ["Apply a validamycin or hexaconazole-based fungicide at early signs."],
          prevention: ["Avoid excessive nitrogen fertilizer.", "Maintain proper spacing between plants."],
        },
      },
      es: {
        description:
          "Una enfermedad fúngica que causa lesiones verde-grisáceas en la vaina de la hoja cerca del nivel del agua, que puede subir por la planta en campos húmedos y densamente sembrados.",
        treatment: {
          biological: [
            "Reduzca la densidad de siembra para mejorar la circulación de aire.",
            "Retire las vainas infectadas y destruya los residuos del cultivo después de la cosecha.",
          ],
          chemical: ["Aplique un fungicida a base de validamicina o hexaconazol ante los primeros signos."],
          prevention: ["Evite el exceso de fertilizante nitrogenado.", "Mantenga un espaciamiento adecuado entre plantas."],
        },
      },
      fr: {
        description:
          "Une maladie fongique provoquant des lésions gris-verdâtre sur la gaine foliaire près du niveau de l'eau, pouvant remonter la plante dans les champs humides et densément plantés.",
        treatment: {
          biological: [
            "Réduisez la densité de plantation pour améliorer la circulation de l'air.",
            "Retirez les gaines infectées et détruisez les résidus de culture après la récolte.",
          ],
          chemical: ["Appliquez un fongicide à base de validamycine ou d'hexaconazole dès les premiers signes."],
          prevention: ["Évitez l'excès d'engrais azoté.", "Maintenez un espacement adéquat entre les plants."],
        },
      },
      sw: {
        description:
          "Ugonjwa wa fangasi unaosababisha madoa ya kijivu-kijani kwenye ala ya jani karibu na usawa wa maji, ambayo yanaweza kupanda juu ya mmea kwenye mashamba yenye unyevu na yaliyopandwa kwa karibu sana.",
        treatment: {
          biological: [
            "Punguza msongamano wa mimea ili kuboresha mzunguko wa hewa.",
            "Ondoa ala zilizoambukizwa na haribu mabaki ya mazao baada ya mavuno.",
          ],
          chemical: ["Tumia dawa ya fangasi yenye validamycin au hexaconazole mapema dalili zinapoonekana."],
          prevention: ["Epuka mbolea nyingi ya nitrojeni.", "Dumisha nafasi sahihi kati ya mimea."],
        },
      },
      hi: {
        description:
          "एक फफूंद रोग जो पानी की सतह के पास पत्ती के आवरण (शीथ) पर हरे-भूरे धब्बे बनाता है, जो नम, घनी बोई गई फसल में पौधे पर ऊपर तक फैल सकता है।",
        treatment: {
          biological: [
            "हवा के संचार को बेहतर बनाने के लिए पौधों का घनत्व कम करें।",
            "कटाई के बाद संक्रमित शीथ हटाएं और फसल अवशेष नष्ट करें।",
          ],
          chemical: ["शुरुआती लक्षणों पर वैलिडामाइसिन या हेक्साकोनाज़ोल आधारित फफूंदनाशक का प्रयोग करें।"],
          prevention: ["अत्यधिक नाइट्रोजन उर्वरक से बचें।", "पौधों के बीच उचित दूरी बनाए रखें।"],
        },
      },
      ml: {
        description:
          "ജലനിരപ്പിന് സമീപം ഇലയുടെ ഷീത്തിൽ പച്ച-ചാര നിറത്തിലുള്ള പാടുകൾ ഉണ്ടാക്കുന്ന ഒരു ഫംഗസ് രോഗം, ഇത് ഈർപ്പമുള്ളതും ഇടതൂർന്നതുമായ വയലുകളിൽ ചെടിയിലേക്ക് മുകളിലേക്ക് പടരാം.",
        treatment: {
          biological: [
            "വായു സഞ്ചാരം മെച്ചപ്പെടുത്താൻ ചെടികളുടെ സാന്ദ്രത കുറയ്ക്കുക.",
            "വിളവെടുപ്പിന് ശേഷം ബാധിച്ച ഷീത്തുകൾ നീക്കം ചെയ്ത് വിള അവശിഷ്ടങ്ങൾ നശിപ്പിക്കുക.",
          ],
          chemical: ["ആദ്യ ലക്ഷണങ്ങളിൽ വാലിഡാമൈസിൻ അല്ലെങ്കിൽ ഹെക്സാകോണസോൾ അടിസ്ഥാനമാക്കിയുള്ള കുമിൾനാശിനി പ്രയോഗിക്കുക."],
          prevention: ["അധിക നൈട്രജൻ വളം ഒഴിവാക്കുക.", "ചെടികൾക്കിടയിൽ ശരിയായ അകലം നിലനിർത്തുക."],
        },
      },
      bn: {
        description:
          "জলরেখার কাছে পাতার আবরণে (শীথ) সবুজাভ-ধূসর ক্ষত তৈরি করে এমন একটি ছত্রাকজনিত রোগ, যা আর্দ্র ও ঘন রোপণ করা জমিতে গাছের উপরের দিকে ছড়িয়ে পড়তে পারে।",
        treatment: {
          biological: [
            "বায়ু চলাচল উন্নত করতে গাছের ঘনত্ব কমান।",
            "ফসল কাটার পর আক্রান্ত শীথ সরিয়ে ফসলের অবশিষ্টাংশ ধ্বংস করুন।",
          ],
          chemical: ["প্রাথমিক লক্ষণে ভ্যালিডামাইসিন বা হেক্সাকোনাজোল-ভিত্তিক ছত্রাকনাশক প্রয়োগ করুন।"],
          prevention: ["অতিরিক্ত নাইট্রোজেন সার এড়িয়ে চলুন।", "গাছের মধ্যে সঠিক দূরত্ব বজায় রাখুন।"],
        },
      },
    },
  },
  // --------------------------------------------------------------- MAIZE --
  {
    crop: "maize",
    matchAliases: ["northern corn leaf blight", "northern leaf blight"],
    translations: {
      en: {
        description:
          "A fungal disease producing long, elliptical grayish-green to tan lesions on leaves, often starting on lower leaves.",
        treatment: {
          biological: [
            "Remove and destroy heavily infected leaves where practical.",
            "Rotate with a non-host crop for at least one season.",
          ],
          chemical: ["Apply a strobilurin or triazole fungicide if lesions are spreading rapidly."],
          prevention: ["Plant resistant maize hybrids.", "Avoid dense planting to improve airflow."],
        },
      },
      es: {
        description:
          "Una enfermedad fúngica que produce lesiones largas y elípticas de color verde grisáceo a beige en las hojas, que suele comenzar en las hojas inferiores.",
        treatment: {
          biological: [
            "Retire y destruya las hojas muy infectadas cuando sea posible.",
            "Rote con un cultivo no hospedante durante al menos una temporada.",
          ],
          chemical: ["Aplique un fungicida de estrobilurina o triazol si las lesiones se propagan rápidamente."],
          prevention: ["Siembre híbridos de maíz resistentes.", "Evite la siembra densa para mejorar la circulación de aire."],
        },
      },
      fr: {
        description:
          "Une maladie fongique produisant de longues lésions elliptiques gris-vert à beige sur les feuilles, commençant souvent sur les feuilles inférieures.",
        treatment: {
          biological: [
            "Retirez et détruisez les feuilles fortement infectées si possible.",
            "Faites une rotation avec une culture non hôte pendant au moins une saison.",
          ],
          chemical: ["Appliquez un fongicide à base de strobilurine ou de triazole si les lésions se propagent rapidement."],
          prevention: ["Plantez des hybrides de maïs résistants.", "Évitez la plantation dense pour améliorer la circulation de l'air."],
        },
      },
      sw: {
        description:
          "Ugonjwa wa fangasi unaosababisha madoa marefu ya mviringo ya rangi ya kijivu-kijani hadi hudhurungi kwenye majani, mara nyingi huanzia kwenye majani ya chini.",
        treatment: {
          biological: [
            "Ondoa na haribu majani yaliyoambukizwa sana pale inapowezekana.",
            "Zungusha na zao lisilo mwenyeji kwa msimu mmoja angalau.",
          ],
          chemical: ["Tumia dawa ya fangasi yenye strobilurin au triazole ikiwa madoa yanaenea haraka."],
          prevention: ["Panda mbegu za mahindi zinazostahimili.", "Epuka upandaji wa karibu sana ili kuboresha mzunguko wa hewa."],
        },
      },
      hi: {
        description:
          "एक फफूंद रोग जो पत्तियों पर लंबे, अंडाकार भूरे-हरे से भूरे रंग के धब्बे बनाता है, जो अक्सर निचली पत्तियों से शुरू होता है।",
        treatment: {
          biological: [
            "जहां संभव हो अत्यधिक संक्रमित पत्तियों को हटाकर नष्ट करें।",
            "कम से कम एक मौसम के लिए गैर-मेजबान फसल के साथ फसल चक्र अपनाएं।",
          ],
          chemical: ["यदि धब्बे तेज़ी से फैल रहे हों तो स्ट्रोबिलुरिन या ट्राइज़ोल फफूंदनाशक का प्रयोग करें।"],
          prevention: ["प्रतिरोधी मक्का संकर किस्में लगाएं।", "हवा के प्रवाह के लिए घनी बुवाई से बचें।"],
        },
      },
      ml: {
        description:
          "ഇലകളിൽ നീണ്ട, ദീർഘവൃത്താകൃതിയിലുള്ള ചാര-പച്ച മുതൽ തവിട്ട് നിറം വരെയുള്ള പാടുകൾ ഉണ്ടാക്കുന്ന ഒരു ഫംഗസ് രോഗം, ഇത് പലപ്പോഴും താഴെയുള്ള ഇലകളിൽ നിന്ന് ആരംഭിക്കുന്നു.",
        treatment: {
          biological: [
            "സാധ്യമാകുന്നിടത്ത് കടുത്ത ബാധയുള്ള ഇലകൾ നീക്കം ചെയ്ത് നശിപ്പിക്കുക.",
            "കുറഞ്ഞത് ഒരു സീസണെങ്കിലും ആതിഥേയമല്ലാത്ത വിളയുമായി വിളപരിക്രമം നടത്തുക.",
          ],
          chemical: ["പാടുകൾ വേഗത്തിൽ പടരുകയാണെങ്കിൽ സ്ട്രോബിലുറിൻ അല്ലെങ്കിൽ ട്രയസോൾ കുമിൾനാശിനി പ്രയോഗിക്കുക."],
          prevention: ["പ്രതിരോധശേഷിയുള്ള ചോളം സങ്കരയിനങ്ങൾ നടുക.", "വായുസഞ്ചാരം മെച്ചപ്പെടുത്താൻ ഇടതൂർന്ന നടീൽ ഒഴിവാക്കുക."],
        },
      },
      bn: {
        description:
          "একটি ছত্রাকজনিত রোগ যা পাতায় লম্বা, উপবৃত্তাকার ধূসর-সবুজ থেকে বাদামী ক্ষত তৈরি করে, যা প্রায়ই নিচের পাতা থেকে শুরু হয়।",
        treatment: {
          biological: [
            "যেখানে সম্ভব ভারী আক্রান্ত পাতা সরিয়ে ধ্বংস করুন।",
            "কমপক্ষে এক মৌসুমের জন্য অ-হোস্ট ফসলের সাথে আবর্তন করুন।",
          ],
          chemical: ["ক্ষত দ্রুত ছড়ালে স্ট্রোবিলুরিন বা ট্রায়াজোল ছত্রাকনাশক প্রয়োগ করুন।"],
          prevention: ["প্রতিরোধী ভুট্টা হাইব্রিড রোপণ করুন।", "বায়ু চলাচলের জন্য ঘন রোপণ এড়িয়ে চলুন।"],
        },
      },
    },
  },
  {
    crop: "maize",
    matchAliases: ["gray leaf spot", "grey leaf spot"],
    translations: {
      en: {
        description: "A fungal disease causing small, rectangular tan-to-gray lesions that run parallel to leaf veins.",
        treatment: {
          biological: [
            "Rotate crops away from maize for at least one season.",
            "Manage crop residue by tilling it into the soil.",
          ],
          chemical: ["Apply a foliar fungicide labeled for gray leaf spot if disease pressure is high."],
          prevention: ["Use resistant hybrids.", "Avoid dense planting to improve air circulation."],
        },
      },
      es: {
        description:
          "Una enfermedad fúngica que causa pequeñas lesiones rectangulares de color beige a gris que corren paralelas a las venas de la hoja.",
        treatment: {
          biological: [
            "Rote los cultivos alejándose del maíz durante al menos una temporada.",
            "Maneje los residuos del cultivo incorporándolos al suelo.",
          ],
          chemical: ["Aplique un fungicida foliar indicado para mancha gris si la presión de la enfermedad es alta."],
          prevention: ["Use híbridos resistentes.", "Evite la siembra densa para mejorar la circulación de aire."],
        },
      },
      fr: {
        description: "Une maladie fongique provoquant de petites lésions rectangulaires beige à gris parallèles aux nervures des feuilles.",
        treatment: {
          biological: [
            "Faites une rotation des cultures en évitant le maïs pendant au moins une saison.",
            "Gérez les résidus de culture en les incorporant au sol.",
          ],
          chemical: ["Appliquez un fongicide foliaire homologué contre la cercosporiose si la pression de la maladie est élevée."],
          prevention: ["Utilisez des hybrides résistants.", "Évitez la plantation dense pour améliorer la circulation de l'air."],
        },
      },
      sw: {
        description:
          "Ugonjwa wa fangasi unaosababisha madoa madogo ya mstatili ya rangi ya hudhurungi hadi kijivu yanayofuata mstari sambamba na mishipa ya jani.",
        treatment: {
          biological: [
            "Zungusha mazao mbali na mahindi kwa msimu mmoja angalau.",
            "Dhibiti mabaki ya mazao kwa kuyachanganya na udongo.",
          ],
          chemical: ["Tumia dawa ya fangasi ya majani iliyoainishwa kwa gray leaf spot ikiwa maambukizi ni makali."],
          prevention: ["Tumia mbegu chotara zinazostahimili.", "Epuka upandaji wa karibu sana ili kuboresha mzunguko wa hewa."],
        },
      },
      hi: {
        description: "एक फफूंद रोग जो पत्ती की शिराओं के समानांतर चलने वाले छोटे, आयताकार भूरे-भूरे से भूरे-भूरे धब्बे बनाता है।",
        treatment: {
          biological: [
            "कम से कम एक मौसम के लिए मक्का से दूर फसल चक्र अपनाएं।",
            "फसल अवशेषों को मिट्टी में मिलाकर प्रबंधित करें।",
          ],
          chemical: ["यदि रोग का दबाव अधिक हो तो ग्रे लीफ स्पॉट के लिए अनुमोदित पत्ती फफूंदनाशक का प्रयोग करें।"],
          prevention: ["प्रतिरोधी संकर किस्मों का उपयोग करें।", "हवा के संचार के लिए घनी बुवाई से बचें।"],
        },
      },
      ml: {
        description: "ഇലയുടെ ഞരമ്പുകൾക്ക് സമാന്തരമായി ഓടുന്ന ചെറിയ, ചതുരാകൃതിയിലുള്ള തവിട്ട്-ചാര പാടുകൾ ഉണ്ടാക്കുന്ന ഒരു ഫംഗസ് രോഗം.",
        treatment: {
          biological: [
            "കുറഞ്ഞത് ഒരു സീസണെങ്കിലും ചോളത്തിൽ നിന്ന് മാറി വിളപരിക്രമം നടത്തുക.",
            "വിള അവശിഷ്ടങ്ങൾ മണ്ണിൽ ഉഴുതുമറിച്ച് കൈകാര്യം ചെയ്യുക.",
          ],
          chemical: ["രോഗസമ്മർദ്ദം കൂടുതലാണെങ്കിൽ ഗ്രേ ലീഫ് സ്പോട്ടിന് അനുയോജ്യമായ ഇല കുമിൾനാശിനി പ്രയോഗിക്കുക."],
          prevention: ["പ്രതിരോധശേഷിയുള്ള സങ്കരയിനങ്ങൾ ഉപയോഗിക്കുക.", "വായുസഞ്ചാരം മെച്ചപ്പെടുത്താൻ ഇടതൂർന്ന നടീൽ ഒഴിവാക്കുക."],
        },
      },
      bn: {
        description: "একটি ছত্রাকজনিত রোগ যা পাতার শিরার সমান্তরালে ছোট, আয়তাকার বাদামী থেকে ধূসর ক্ষত তৈরি করে।",
        treatment: {
          biological: [
            "কমপক্ষে এক মৌসুমের জন্য ভুট্টা থেকে দূরে ফসল আবর্তন করুন।",
            "ফসলের অবশিষ্টাংশ মাটিতে চাষ করে ব্যবস্থাপনা করুন।",
          ],
          chemical: ["রোগের চাপ বেশি হলে গ্রে লিফ স্পটের জন্য অনুমোদিত পাতার ছত্রাকনাশক প্রয়োগ করুন।"],
          prevention: ["প্রতিরোধী হাইব্রিড ব্যবহার করুন।", "বায়ু চলাচলের জন্য ঘন রোপণ এড়িয়ে চলুন।"],
        },
      },
    },
  },
  {
    crop: "maize",
    matchAliases: ["common rust", "puccinia sorghi", "rust"],
    translations: {
      en: {
        description: "A fungal disease causing small, reddish-brown powdery pustules on both sides of the leaves.",
        treatment: {
          biological: ["Remove volunteer maize plants that can carry the fungus between seasons."],
          chemical: ["Apply a triazole or strobilurin fungicide if pustules are spreading quickly."],
          prevention: ["Plant rust-resistant maize varieties.", "Avoid late planting, which increases exposure to rust spores."],
        },
      },
      es: {
        description: "Una enfermedad fúngica que causa pequeñas pústulas polvorientas de color marrón rojizo en ambos lados de las hojas.",
        treatment: {
          biological: ["Elimine las plantas de maíz voluntarias que puedan transportar el hongo entre temporadas."],
          chemical: ["Aplique un fungicida de triazol o estrobilurina si las pústulas se propagan rápidamente."],
          prevention: ["Siembre variedades de maíz resistentes a la roya.", "Evite la siembra tardía, que aumenta la exposición a las esporas de roya."],
        },
      },
      fr: {
        description: "Une maladie fongique provoquant de petites pustules poudreuses brun-rougeâtre des deux côtés des feuilles.",
        treatment: {
          biological: ["Éliminez les repousses spontanées de maïs qui peuvent transporter le champignon d'une saison à l'autre."],
          chemical: ["Appliquez un fongicide à base de triazole ou de strobilurine si les pustules se propagent rapidement."],
          prevention: ["Plantez des variétés de maïs résistantes à la rouille.", "Évitez les semis tardifs, qui augmentent l'exposition aux spores de rouille."],
        },
      },
      sw: {
        description: "Ugonjwa wa fangasi unaosababisha vipele vidogo vya unga vya rangi ya kahawia-nyekundu pande zote mbili za jani.",
        treatment: {
          biological: ["Ondoa mimea ya mahindi ya kujitokea yenyewe ambayo yanaweza kubeba fangasi kati ya misimu."],
          chemical: ["Tumia dawa ya fangasi ya triazole au strobilurin ikiwa vipele vinaenea haraka."],
          prevention: ["Panda aina za mahindi zinazostahimili kutu.", "Epuka upandaji wa kuchelewa, ambao huongeza mfiduo wa spora za kutu."],
        },
      },
      hi: {
        description: "एक फफूंद रोग जो पत्तियों के दोनों तरफ छोटे, लाल-भूरे रंग के पाउडर जैसे फफोले बनाता है।",
        treatment: {
          biological: ["स्वयं उगे मक्के के पौधों को हटाएं जो फफूंद को मौसमों के बीच ले जा सकते हैं।"],
          chemical: ["यदि फफोले तेज़ी से फैल रहे हों तो ट्राइज़ोल या स्ट्रोबिलुरिन फफूंदनाशक का प्रयोग करें।"],
          prevention: ["रस्ट-प्रतिरोधी मक्का किस्में लगाएं।", "देर से बुवाई से बचें, जिससे रस्ट बीजाणुओं का संपर्क बढ़ता है।"],
        },
      },
      ml: {
        description: "ഇലയുടെ ഇരുവശത്തും ചെറിയ, ചുവപ്പ്-തവിട്ട് നിറത്തിലുള്ള പൊടി പോലുള്ള കുരുക്കൾ ഉണ്ടാക്കുന്ന ഒരു ഫംഗസ് രോഗം.",
        treatment: {
          biological: ["സീസണുകൾക്കിടയിൽ ഫംഗസ് വഹിക്കാൻ കഴിയുന്ന സ്വയം മുളച്ച ചോളച്ചെടികൾ നീക്കം ചെയ്യുക."],
          chemical: ["കുരുക്കൾ വേഗത്തിൽ പടരുകയാണെങ്കിൽ ട്രയസോൾ അല്ലെങ്കിൽ സ്ട്രോബിലുറിൻ കുമിൾനാശിനി പ്രയോഗിക്കുക."],
          prevention: ["തുരുമ്പ്-പ്രതിരോധശേഷിയുള്ള ചോളം ഇനങ്ങൾ നടുക.", "വൈകി നടുന്നത് ഒഴിവാക്കുക, ഇത് തുരുമ്പ് ബീജങ്ങളുമായുള്ള സമ്പർക്കം വർദ്ധിപ്പിക്കും."],
        },
      },
      bn: {
        description: "একটি ছত্রাকজনিত রোগ যা পাতার উভয় পাশে ছোট, লালচে-বাদামী গুঁড়ো ফোস্কা তৈরি করে।",
        treatment: {
          biological: ["মৌসুমের মধ্যে ছত্রাক বহন করতে পারে এমন স্বতঃস্ফূর্ত ভুট্টা গাছ সরিয়ে ফেলুন।"],
          chemical: ["ফোস্কা দ্রুত ছড়ালে ট্রায়াজোল বা স্ট্রোবিলুরিন ছত্রাকনাশক প্রয়োগ করুন।"],
          prevention: ["মরিচা-প্রতিরোধী ভুট্টার জাত রোপণ করুন।", "দেরিতে রোপণ এড়িয়ে চলুন, যা মরিচার স্পোরের সংস্পর্শ বাড়ায়।"],
        },
      },
    },
  },
  // -------------------------------------------------------------- TOMATO --
  {
    crop: "tomato",
    matchAliases: ["early blight", "alternaria solani", "alternaria leaf spot"],
    translations: {
      en: {
        description: "A fungal disease causing dark concentric-ring spots on older leaves, which yellow and drop as the disease progresses.",
        treatment: {
          biological: [
            "Remove and destroy infected lower leaves as soon as spots appear.",
            "Apply a copper-based or Bacillus subtilis biofungicide.",
          ],
          chemical: ["If the infection is severe, apply a chlorothalonil or mancozeb-based fungicide following label instructions."],
          prevention: [
            "Rotate crops away from tomato/potato family plants for at least 2 years.",
            "Avoid overhead watering; water at the base of the plant.",
            "Space plants for good air circulation.",
          ],
        },
      },
      es: {
        description:
          "Una enfermedad fúngica que causa manchas oscuras en forma de anillos concéntricos en las hojas más viejas, que amarillean y caen a medida que avanza la enfermedad.",
        treatment: {
          biological: [
            "Retire y destruya las hojas inferiores infectadas tan pronto como aparezcan las manchas.",
            "Aplique un biofungicida a base de cobre o Bacillus subtilis.",
          ],
          chemical: ["Si la infección es grave, aplique un fungicida a base de clorotalonil o mancozeb siguiendo las instrucciones de la etiqueta."],
          prevention: [
            "Rote los cultivos alejándose de plantas de la familia del tomate/papa durante al menos 2 años.",
            "Evite el riego por aspersión; riegue en la base de la planta.",
            "Espacie las plantas para una buena circulación de aire.",
          ],
        },
      },
      fr: {
        description:
          "Une maladie fongique provoquant des taches sombres en anneaux concentriques sur les feuilles plus âgées, qui jaunissent et tombent à mesure que la maladie progresse.",
        treatment: {
          biological: [
            "Retirez et détruisez les feuilles inférieures infectées dès l'apparition des taches.",
            "Appliquez un biofongicide à base de cuivre ou de Bacillus subtilis.",
          ],
          chemical: ["Si l'infection est grave, appliquez un fongicide à base de chlorothalonil ou de mancozèbe selon les instructions de l'étiquette."],
          prevention: [
            "Faites une rotation des cultures en évitant les plantes de la famille tomate/pomme de terre pendant au moins 2 ans.",
            "Évitez l'arrosage par le haut ; arrosez à la base de la plante.",
            "Espacez les plants pour une bonne circulation de l'air.",
          ],
        },
      },
      sw: {
        description:
          "Ugonjwa wa fangasi unaosababisha madoa meusi ya duara zenye tabaka kwenye majani makubwa, ambayo hubadilika manjano na kudondoka ugonjwa unavyoendelea.",
        treatment: {
          biological: [
            "Ondoa na haribu majani ya chini yaliyoambukizwa mara madoa yanapoonekana.",
            "Tumia dawa ya kibiolojia yenye shaba au Bacillus subtilis.",
          ],
          chemical: ["Ikiwa maambukizi ni makali, tumia dawa ya fangasi yenye chlorothalonil au mancozeb ukifuata maelekezo ya lebo."],
          prevention: [
            "Zungusha mazao mbali na familia ya nyanya/viazi kwa angalau miaka 2.",
            "Epuka kumwagilia juu ya majani; mwagilia chini ya mmea.",
            "Panda kwa nafasi ili kuboresha mzunguko wa hewa.",
          ],
        },
      },
      hi: {
        description: "एक फफूंद रोग जो पुरानी पत्तियों पर गहरे संकेंद्रित छल्लेदार धब्बे बनाता है, जो रोग बढ़ने के साथ पीली होकर गिर जाती हैं।",
        treatment: {
          biological: [
            "धब्बे दिखते ही संक्रमित निचली पत्तियों को हटाकर नष्ट करें।",
            "कॉपर आधारित या बैसिलस सबटिलिस जैव-फफूंदनाशक का प्रयोग करें।",
          ],
          chemical: ["यदि संक्रमण गंभीर हो, तो लेबल निर्देशों का पालन करते हुए क्लोरोथैलोनिल या मैंकोज़ेब आधारित फफूंदनाशक का प्रयोग करें।"],
          prevention: [
            "टमाटर/आलू परिवार के पौधों से कम से कम 2 वर्षों के लिए फसल चक्र अपनाएं।",
            "ऊपर से पानी देने से बचें; पौधे के आधार पर पानी दें।",
            "अच्छे वायु संचार के लिए पौधों में उचित दूरी रखें।",
          ],
        },
      },
      ml: {
        description: "പഴയ ഇലകളിൽ ഇരുണ്ട കേന്ദ്രീകൃത വലയങ്ങളുള്ള പാടുകൾ ഉണ്ടാക്കുന്ന ഒരു ഫംഗസ് രോഗം, രോഗം മൂർച്ഛിക്കുന്നതോടെ ഇവ മഞ്ഞയായി കൊഴിയും.",
        treatment: {
          biological: [
            "പാടുകൾ കാണുന്ന ഉടൻ ബാധിച്ച താഴത്തെ ഇലകൾ നീക്കം ചെയ്ത് നശിപ്പിക്കുക.",
            "കോപ്പർ അല്ലെങ്കിൽ ബാസിലസ് സബ്റ്റിലിസ് ജൈവകുമിൾനാശിനി പ്രയോഗിക്കുക.",
          ],
          chemical: ["അണുബാധ ഗുരുതരമാണെങ്കിൽ, ലേബൽ നിർദ്ദേശങ്ങൾ പാലിച്ച് ക്ലോറോതലോനിൽ അല്ലെങ്കിൽ മാൻകോസെബ് അടിസ്ഥാനമാക്കിയുള്ള കുമിൾനാശിനി പ്രയോഗിക്കുക."],
          prevention: [
            "തക്കാളി/ഉരുളക്കിഴങ്ങ് കുടുംബത്തിലെ ചെടികളിൽ നിന്ന് കുറഞ്ഞത് 2 വർഷമെങ്കിലും വിളപരിക്രമം നടത്തുക.",
            "മുകളിൽ നിന്ന് നനയ്ക്കുന്നത് ഒഴിവാക്കുക; ചെടിയുടെ ചുവട്ടിൽ നനയ്ക്കുക.",
            "നല്ല വായുസഞ്ചാരത്തിന് ചെടികൾക്കിടയിൽ അകലം നൽകുക.",
          ],
        },
      },
      bn: {
        description: "পুরনো পাতায় গাঢ় কেন্দ্রীভূত বলয়যুক্ত দাগ তৈরি করে এমন একটি ছত্রাকজনিত রোগ, যা রোগ বাড়ার সাথে সাথে হলুদ হয়ে ঝরে পড়ে।",
        treatment: {
          biological: [
            "দাগ দেখা দিলেই আক্রান্ত নিচের পাতা সরিয়ে ধ্বংস করুন।",
            "তামা-ভিত্তিক বা ব্যাসিলাস সাবটিলিস জৈব-ছত্রাকনাশক প্রয়োগ করুন।",
          ],
          chemical: ["সংক্রমণ গুরুতর হলে, লেবেলের নির্দেশ অনুসরণ করে ক্লোরোথালোনিল বা ম্যানকোজেব-ভিত্তিক ছত্রাকনাশক প্রয়োগ করুন।"],
          prevention: [
            "টমেটো/আলু পরিবারের গাছ থেকে অন্তত ২ বছরের জন্য ফসল আবর্তন করুন।",
            "উপর থেকে জল দেওয়া এড়িয়ে চলুন; গাছের গোড়ায় জল দিন।",
            "ভালো বায়ু চলাচলের জন্য গাছের মধ্যে ফাঁকা রাখুন।",
          ],
        },
      },
    },
  },
  {
    crop: "tomato",
    matchAliases: ["late blight", "phytophthora infestans"],
    translations: {
      en: {
        description:
          "A fast-spreading fungal-like disease causing large, water-soaked, dark green to brown blotches on leaves and stems, often with white fuzzy growth on the underside in humid weather.",
        treatment: {
          biological: [
            "Remove and destroy infected plants immediately to stop spread.",
            "Apply a copper-based fungicide preventively during humid weather.",
          ],
          chemical: ["Apply a chlorothalonil or mancozeb-based fungicide at first sign of infection; severe cases may need a systemic fungicide."],
          prevention: ["Avoid overhead irrigation and prolonged leaf wetness.", "Space plants well for airflow and avoid planting near potatoes."],
        },
      },
      es: {
        description:
          "Una enfermedad de tipo fúngico de rápida propagación que causa grandes manchas empapadas de agua, de color verde oscuro a marrón, en hojas y tallos, a menudo con un crecimiento blanco y velloso en el envés en clima húmedo.",
        treatment: {
          biological: [
            "Retire y destruya las plantas infectadas de inmediato para detener la propagación.",
            "Aplique un fungicida a base de cobre de forma preventiva durante el clima húmedo.",
          ],
          chemical: ["Aplique un fungicida a base de clorotalonil o mancozeb ante el primer signo de infección; los casos graves pueden necesitar un fungicida sistémico."],
          prevention: ["Evite el riego por aspersión y la humedad prolongada en las hojas.", "Espacie bien las plantas para la circulación de aire y evite sembrar cerca de papas."],
        },
      },
      fr: {
        description:
          "Une maladie de type fongique à propagation rapide provoquant de grandes taches détrempées, vert foncé à brun, sur les feuilles et les tiges, souvent avec une croissance blanche duveteuse sur la face inférieure par temps humide.",
        treatment: {
          biological: [
            "Retirez et détruisez immédiatement les plantes infectées pour arrêter la propagation.",
            "Appliquez un fongicide à base de cuivre à titre préventif par temps humide.",
          ],
          chemical: ["Appliquez un fongicide à base de chlorothalonil ou de mancozèbe dès le premier signe d'infection ; les cas graves peuvent nécessiter un fongicide systémique."],
          prevention: ["Évitez l'irrigation par aspersion et l'humidité prolongée des feuilles.", "Espacez bien les plants pour la circulation de l'air et évitez de planter près des pommes de terre."],
        },
      },
      sw: {
        description:
          "Ugonjwa unaofanana na fangasi unaoenea haraka, unaosababisha madoa makubwa yenye maji, ya kijani kirefu hadi hudhurungi, kwenye majani na mashina, mara nyingi na ukuaji mweupe wenye pamba chini ya jani wakati wa hali ya unyevu.",
        treatment: {
          biological: [
            "Ondoa na haribu mimea iliyoambukizwa mara moja ili kuzuia kuenea.",
            "Tumia dawa ya fangasi yenye shaba kama kinga wakati wa hali ya unyevu.",
          ],
          chemical: ["Tumia dawa ya fangasi yenye chlorothalonil au mancozeb dalili za kwanza zinapoonekana; hali mbaya zinaweza kuhitaji dawa ya kimfumo."],
          prevention: ["Epuka kumwagilia juu ya majani na unyevu wa muda mrefu kwenye majani.", "Panda kwa nafasi nzuri kwa mzunguko wa hewa na epuka kupanda karibu na viazi."],
        },
      },
      hi: {
        description:
          "एक तेज़ी से फैलने वाला फफूंद जैसा रोग जो पत्तियों और तनों पर बड़े, पानी से भीगे, गहरे हरे से भूरे धब्बे बनाता है, अक्सर नम मौसम में निचली सतह पर सफेद रोयेंदार वृद्धि के साथ।",
        treatment: {
          biological: [
            "फैलाव रोकने के लिए संक्रमित पौधों को तुरंत हटाकर नष्ट करें।",
            "नम मौसम में निवारक रूप से कॉपर आधारित फफूंदनाशक का प्रयोग करें।",
          ],
          chemical: ["संक्रमण के पहले संकेत पर क्लोरोथैलोनिल या मैंकोज़ेब आधारित फफूंदनाशक का प्रयोग करें; गंभीर मामलों में सिस्टमिक फफूंदनाशक की आवश्यकता हो सकती है।"],
          prevention: ["ऊपर से सिंचाई और पत्तियों पर लंबे समय तक नमी से बचें।", "हवा के प्रवाह के लिए पौधों में उचित दूरी रखें और आलू के पास बुवाई से बचें।"],
        },
      },
      ml: {
        description:
          "വേഗത്തിൽ പടരുന്ന ഒരു കുമിൾ സമാന രോഗം, ഇലകളിലും തണ്ടുകളിലും വലിയ, ജലാംശമുള്ള, കടും പച്ച മുതൽ തവിട്ട് നിറം വരെയുള്ള പാടുകൾ ഉണ്ടാക്കുന്നു, ഈർപ്പമുള്ള കാലാവസ്ഥയിൽ പലപ്പോഴും അടിഭാഗത്ത് വെളുത്ത രോമം പോലുള്ള വളർച്ചയോടെ.",
        treatment: {
          biological: [
            "പടരുന്നത് തടയാൻ ബാധിച്ച ചെടികൾ ഉടൻ നീക്കം ചെയ്ത് നശിപ്പിക്കുക.",
            "ഈർപ്പമുള്ള കാലാവസ്ഥയിൽ പ്രതിരോധമായി കോപ്പർ അടിസ്ഥാനമാക്കിയുള്ള കുമിൾനാശിനി പ്രയോഗിക്കുക.",
          ],
          chemical: ["അണുബാധയുടെ ആദ്യ ലക്ഷണത്തിൽ ക്ലോറോതലോനിൽ അല്ലെങ്കിൽ മാൻകോസെബ് അടിസ്ഥാനമാക്കിയുള്ള കുമിൾനാശിനി പ്രയോഗിക്കുക; ഗുരുതരമായ കേസുകൾക്ക് സിസ്റ്റമിക് കുമിൾനാശിനി വേണ്ടിവന്നേക്കാം."],
          prevention: ["മുകളിൽ നിന്ന് നനയ്ക്കുന്നതും ഇലകളിൽ ദീർഘനേരം ഈർപ്പം നിലനിൽക്കുന്നതും ഒഴിവാക്കുക.", "വായുസഞ്ചാരത്തിന് ചെടികൾക്കിടയിൽ നല്ല അകലം നൽകുകയും ഉരുളക്കിഴങ്ങിനടുത്ത് നടുന്നത് ഒഴിവാക്കുകയും ചെയ്യുക."],
        },
      },
      bn: {
        description:
          "একটি দ্রুত ছড়িয়ে পড়া ছত্রাক-সদৃশ রোগ যা পাতা ও কাণ্ডে বড়, জলভেজা, গাঢ় সবুজ থেকে বাদামী দাগ তৈরি করে, আর্দ্র আবহাওয়ায় প্রায়ই নিচের দিকে সাদা তুলতুলে বৃদ্ধি সহ।",
        treatment: {
          biological: [
            "বিস্তার রোধ করতে আক্রান্ত গাছ অবিলম্বে সরিয়ে ধ্বংস করুন।",
            "আর্দ্র আবহাওয়ায় প্রতিরোধমূলকভাবে তামা-ভিত্তিক ছত্রাকনাশক প্রয়োগ করুন।",
          ],
          chemical: ["সংক্রমণের প্রথম লক্ষণে ক্লোরোথালোনিল বা ম্যানকোজেব-ভিত্তিক ছত্রাকনাশক প্রয়োগ করুন; গুরুতর ক্ষেত্রে সিস্টেমিক ছত্রাকনাশক প্রয়োজন হতে পারে।"],
          prevention: ["উপর থেকে সেচ ও পাতায় দীর্ঘস্থায়ী আর্দ্রতা এড়িয়ে চলুন।", "বায়ু চলাচলের জন্য গাছের মধ্যে ভালো ফাঁকা রাখুন এবং আলুর কাছে রোপণ এড়িয়ে চলুন।"],
        },
      },
    },
  },
  {
    crop: "tomato",
    matchAliases: ["bacterial spot", "xanthomonas"],
    translations: {
      en: {
        description: "A bacterial disease causing small, dark, water-soaked spots on leaves and fruit that can merge into larger lesions.",
        treatment: {
          biological: ["Remove and destroy infected leaves and fruit.", "Apply a copper-based bactericide, ideally before infection spreads."],
          chemical: ["Copper-based products combined with mancozeb can slow bacterial spread in severe cases."],
          prevention: ["Use certified disease-free seed and resistant varieties.", "Avoid working in the field when plants are wet."],
        },
      },
      es: {
        description: "Una enfermedad bacteriana que causa pequeñas manchas oscuras y empapadas de agua en hojas y frutos, que pueden fusionarse en lesiones más grandes.",
        treatment: {
          biological: ["Retire y destruya las hojas y frutos infectados.", "Aplique un bactericida a base de cobre, idealmente antes de que la infección se propague."],
          chemical: ["Los productos a base de cobre combinados con mancozeb pueden ralentizar la propagación bacteriana en casos graves."],
          prevention: ["Use semilla certificada libre de enfermedades y variedades resistentes.", "Evite trabajar en el campo cuando las plantas estén mojadas."],
        },
      },
      fr: {
        description: "Une maladie bactérienne provoquant de petites taches sombres et détrempées sur les feuilles et les fruits, pouvant fusionner en lésions plus grandes.",
        treatment: {
          biological: ["Retirez et détruisez les feuilles et fruits infectés.", "Appliquez un bactéricide à base de cuivre, idéalement avant que l'infection ne se propage."],
          chemical: ["Les produits à base de cuivre combinés au mancozèbe peuvent ralentir la propagation bactérienne dans les cas graves."],
          prevention: ["Utilisez des semences certifiées exemptes de maladies et des variétés résistantes.", "Évitez de travailler dans le champ lorsque les plants sont mouillés."],
        },
      },
      sw: {
        description: "Ugonjwa wa bakteria unaosababisha madoa madogo, meusi, yenye maji kwenye majani na matunda ambayo yanaweza kuungana na kuwa madoa makubwa.",
        treatment: {
          biological: ["Ondoa na haribu majani na matunda yaliyoambukizwa.", "Tumia dawa ya bakteria yenye shaba, vyema kabla ya maambukizi kuenea."],
          chemical: ["Bidhaa za shaba pamoja na mancozeb zinaweza kupunguza kasi ya kuenea kwa bakteria katika hali mbaya."],
          prevention: ["Tumia mbegu zilizothibitishwa kuwa hazina magonjwa na aina zinazostahimili.", "Epuka kufanya kazi shambani wakati mimea ina unyevu."],
        },
      },
      hi: {
        description: "एक जीवाणु रोग जो पत्तियों और फलों पर छोटे, गहरे, पानी से भीगे धब्बे बनाता है जो आपस में मिलकर बड़े घाव बना सकते हैं।",
        treatment: {
          biological: ["संक्रमित पत्तियों और फलों को हटाकर नष्ट करें।", "कॉपर आधारित जीवाणुनाशक का प्रयोग करें, आदर्श रूप से संक्रमण फैलने से पहले।"],
          chemical: ["गंभीर मामलों में मैंकोज़ेब के साथ मिश्रित कॉपर आधारित उत्पाद जीवाणु के प्रसार को धीमा कर सकते हैं।"],
          prevention: ["प्रमाणित रोग-मुक्त बीज और प्रतिरोधी किस्मों का उपयोग करें।", "पौधे गीले होने पर खेत में काम करने से बचें।"],
        },
      },
      ml: {
        description: "ഇലകളിലും പഴങ്ങളിലും ചെറിയ, ഇരുണ്ട, ജലാംശമുള്ള പാടുകൾ ഉണ്ടാക്കുന്ന ഒരു ബാക്ടീരിയൽ രോഗം, ഇവ കൂടിച്ചേർന്ന് വലിയ മുറിവുകളായി മാറാം.",
        treatment: {
          biological: ["ബാധിച്ച ഇലകളും പഴങ്ങളും നീക്കം ചെയ്ത് നശിപ്പിക്കുക.", "അണുബാധ പടരുന്നതിന് മുമ്പ് കോപ്പർ അടിസ്ഥാനമാക്കിയുള്ള ബാക്ടീരിയനാശിനി പ്രയോഗിക്കുന്നതാണ് ഉത്തമം."],
          chemical: ["ഗുരുതരമായ കേസുകളിൽ മാൻകോസെബുമായി സംയോജിപ്പിച്ച കോപ്പർ ഉൽപ്പന്നങ്ങൾ ബാക്ടീരിയയുടെ വ്യാപനം മന്ദഗതിയിലാക്കും."],
          prevention: ["സാക്ഷ്യപ്പെടുത്തിയ രോഗരഹിത വിത്തും പ്രതിരോധശേഷിയുള്ള ഇനങ്ങളും ഉപയോഗിക്കുക.", "ചെടികൾ നനഞ്ഞിരിക്കുമ്പോൾ വയലിൽ ജോലി ചെയ്യുന്നത് ഒഴിവാക്കുക."],
        },
      },
      bn: {
        description: "একটি ব্যাকটেরিয়াজনিত রোগ যা পাতা ও ফলে ছোট, গাঢ়, জলভেজা দাগ তৈরি করে যা একত্রিত হয়ে বড় ক্ষত তৈরি করতে পারে।",
        treatment: {
          biological: ["আক্রান্ত পাতা ও ফল সরিয়ে ধ্বংস করুন।", "সংক্রমণ ছড়ানোর আগে তামা-ভিত্তিক ব্যাকটেরিয়ানাশক প্রয়োগ করা ভালো।"],
          chemical: ["গুরুতর ক্ষেত্রে ম্যানকোজেবের সাথে মিশ্রিত তামা-ভিত্তিক পণ্য ব্যাকটেরিয়ার বিস্তার ধীর করতে পারে।"],
          prevention: ["প্রত্যয়িত রোগমুক্ত বীজ ও প্রতিরোধী জাত ব্যবহার করুন।", "গাছ ভেজা অবস্থায় জমিতে কাজ করা এড়িয়ে চলুন।"],
        },
      },
    },
  },
  {
    crop: "tomato",
    matchAliases: ["septoria leaf spot", "septoria"],
    translations: {
      en: {
        description: "A fungal disease causing small, circular spots with dark borders and tan centers, usually starting on lower leaves.",
        treatment: {
          biological: ["Remove and destroy infected lower leaves promptly.", "Mulch around plants to reduce soil splash onto leaves."],
          chemical: ["Apply a chlorothalonil-based fungicide if the spots continue spreading."],
          prevention: ["Rotate crops and avoid planting tomatoes in the same spot each year.", "Water at the base of the plant, not overhead."],
        },
      },
      es: {
        description: "Una enfermedad fúngica que causa pequeñas manchas circulares con bordes oscuros y centros de color beige, que suele comenzar en las hojas inferiores.",
        treatment: {
          biological: ["Retire y destruya rápidamente las hojas inferiores infectadas.", "Aplique mantillo alrededor de las plantas para reducir las salpicaduras de tierra sobre las hojas."],
          chemical: ["Aplique un fungicida a base de clorotalonil si las manchas siguen propagándose."],
          prevention: ["Rote los cultivos y evite sembrar tomates en el mismo lugar cada año.", "Riegue en la base de la planta, no por encima."],
        },
      },
      fr: {
        description: "Une maladie fongique provoquant de petites taches circulaires à bordures sombres et centres beige, commençant généralement sur les feuilles inférieures.",
        treatment: {
          biological: ["Retirez et détruisez rapidement les feuilles inférieures infectées.", "Paillez autour des plants pour réduire les éclaboussures de terre sur les feuilles."],
          chemical: ["Appliquez un fongicide à base de chlorothalonil si les taches continuent de se propager."],
          prevention: ["Effectuez une rotation des cultures et évitez de planter des tomates au même endroit chaque année.", "Arrosez à la base de la plante, pas par le dessus."],
        },
      },
      sw: {
        description: "Ugonjwa wa fangasi unaosababisha madoa madogo ya duara yenye kingo nyeusi na vitovu vya hudhurungi, kwa kawaida huanzia kwenye majani ya chini.",
        treatment: {
          biological: ["Ondoa na haribu haraka majani ya chini yaliyoambukizwa.", "Weka matandazo karibu na mimea ili kupunguza udongo kurushwa juu ya majani."],
          chemical: ["Tumia dawa ya fangasi yenye chlorothalonil ikiwa madoa yanaendelea kuenea."],
          prevention: ["Zungusha mazao na epuka kupanda nyanya mahali pamoja kila mwaka.", "Mwagilia chini ya mmea, si juu ya majani."],
        },
      },
      hi: {
        description: "एक फफूंद रोग जो गहरे किनारों और भूरे केंद्रों वाले छोटे, गोल धब्बे बनाता है, जो आमतौर पर निचली पत्तियों से शुरू होता है।",
        treatment: {
          biological: ["संक्रमित निचली पत्तियों को तुरंत हटाकर नष्ट करें।", "पत्तियों पर मिट्टी के छींटे कम करने के लिए पौधों के चारों ओर मल्च बिछाएं।"],
          chemical: ["यदि धब्बे फैलते रहें तो क्लोरोथैलोनिल आधारित फफूंदनाशक का प्रयोग करें।"],
          prevention: ["फसल चक्र अपनाएं और हर साल एक ही स्थान पर टमाटर लगाने से बचें।", "ऊपर से नहीं, पौधे के आधार पर पानी दें।"],
        },
      },
      ml: {
        description: "ഇരുണ്ട അതിരുകളും തവിട്ട് കേന്ദ്രവുമുള്ള ചെറിയ, വൃത്താകൃതിയിലുള്ള പാടുകൾ ഉണ്ടാക്കുന്ന ഒരു ഫംഗസ് രോഗം, സാധാരണയായി താഴെയുള്ള ഇലകളിൽ നിന്ന് ആരംഭിക്കുന്നു.",
        treatment: {
          biological: ["ബാധിച്ച താഴത്തെ ഇലകൾ വേഗത്തിൽ നീക്കം ചെയ്ത് നശിപ്പിക്കുക.", "ഇലകളിലേക്ക് മണ്ണ് തെറിക്കുന്നത് കുറയ്ക്കാൻ ചെടികൾക്ക് ചുറ്റും പുതയിടുക."],
          chemical: ["പാടുകൾ തുടർന്നും പടരുകയാണെങ്കിൽ ക്ലോറോതലോനിൽ അടിസ്ഥാനമാക്കിയുള്ള കുമിൾനാശിനി പ്രയോഗിക്കുക."],
          prevention: ["വിളപരിക്രമം നടത്തുകയും എല്ലാ വർഷവും ഒരേ സ്ഥലത്ത് തക്കാളി നടുന്നത് ഒഴിവാക്കുകയും ചെയ്യുക.", "മുകളിൽ നിന്നല്ല, ചെടിയുടെ ചുവട്ടിൽ നനയ്ക്കുക."],
        },
      },
      bn: {
        description: "গাঢ় সীমানা ও বাদামী কেন্দ্রবিশিষ্ট ছোট, বৃত্তাকার দাগ তৈরি করে এমন একটি ছত্রাকজনিত রোগ, যা সাধারণত নিচের পাতা থেকে শুরু হয়।",
        treatment: {
          biological: ["আক্রান্ত নিচের পাতা দ্রুত সরিয়ে ধ্বংস করুন।", "পাতায় মাটির ছিটা কমাতে গাছের চারপাশে মালচ ব্যবহার করুন।"],
          chemical: ["দাগ ছড়াতে থাকলে ক্লোরোথালোনিল-ভিত্তিক ছত্রাকনাশক প্রয়োগ করুন।"],
          prevention: ["ফসল আবর্তন করুন এবং প্রতি বছর একই জায়গায় টমেটো রোপণ এড়িয়ে চলুন।", "উপর থেকে নয়, গাছের গোড়ায় জল দিন।"],
        },
      },
    },
  },
  {
    crop: "tomato",
    matchAliases: ["powdery mildew"],
    translations: {
      en: {
        description: "A fungal disease causing white, powder-like patches on leaves and stems, which can weaken the plant if untreated.",
        treatment: {
          biological: ["Apply a diluted milk spray or potassium bicarbonate solution weekly.", "Remove heavily infected leaves to reduce spore spread."],
          chemical: ["Apply a sulfur-based or myclobutanil fungicide if the mildew keeps spreading."],
          prevention: ["Space plants for good air circulation.", "Avoid excess nitrogen fertilizer, which encourages soft, susceptible growth."],
        },
      },
      es: {
        description: "Una enfermedad fúngica que causa parches blancos y polvorientos en hojas y tallos, que pueden debilitar la planta si no se tratan.",
        treatment: {
          biological: ["Aplique semanalmente un aerosol de leche diluida o una solución de bicarbonato de potasio.", "Retire las hojas muy infectadas para reducir la propagación de esporas."],
          chemical: ["Aplique un fungicida a base de azufre o miclobutanil si el mildiú sigue propagándose."],
          prevention: ["Espacie las plantas para una buena circulación de aire.", "Evite el exceso de fertilizante nitrogenado, que favorece un crecimiento blando y susceptible."],
        },
      },
      fr: {
        description: "Une maladie fongique provoquant des taches blanches poudreuses sur les feuilles et les tiges, pouvant affaiblir la plante si elle n'est pas traitée.",
        treatment: {
          biological: ["Appliquez chaque semaine un spray de lait dilué ou une solution de bicarbonate de potassium.", "Retirez les feuilles fortement infectées pour réduire la propagation des spores."],
          chemical: ["Appliquez un fongicide à base de soufre ou de myclobutanil si l'oïdium continue de se propager."],
          prevention: ["Espacez les plants pour une bonne circulation de l'air.", "Évitez l'excès d'engrais azoté, qui favorise une croissance tendre et sensible."],
        },
      },
      sw: {
        description: "Ugonjwa wa fangasi unaosababisha vipande vyeupe kama unga kwenye majani na mashina, ambao unaweza kudhoofisha mmea usipotibiwa.",
        treatment: {
          biological: ["Tumia dawa ya maziwa yaliyochanganywa na maji au suluhisho la potassium bicarbonate kila wiki.", "Ondoa majani yaliyoambukizwa sana ili kupunguza kuenea kwa spora."],
          chemical: ["Tumia dawa ya fangasi yenye salfa au myclobutanil ikiwa ukungu unaendelea kuenea."],
          prevention: ["Panda kwa nafasi kwa mzunguko mzuri wa hewa.", "Epuka mbolea nyingi ya nitrojeni, ambayo huchochea ukuaji laini na rahisi kuathirika."],
        },
      },
      hi: {
        description: "एक फफूंद रोग जो पत्तियों और तनों पर सफेद, पाउडर जैसे धब्बे बनाता है, जो उपचार न करने पर पौधे को कमजोर कर सकता है।",
        treatment: {
          biological: ["साप्ताहिक रूप से पतला दूध स्प्रे या पोटेशियम बाइकार्बोनेट घोल लगाएं।", "बीजाणु फैलाव कम करने के लिए अत्यधिक संक्रमित पत्तियों को हटाएं।"],
          chemical: ["यदि फफूंदी फैलती रहे तो सल्फर आधारित या मायक्लोबुटानिल फफूंदनाशक का प्रयोग करें।"],
          prevention: ["अच्छे वायु संचार के लिए पौधों में उचित दूरी रखें।", "अधिक नाइट्रोजन उर्वरक से बचें, जो नरम, संवेदनशील वृद्धि को बढ़ावा देता है।"],
        },
      },
      ml: {
        description: "ഇലകളിലും തണ്ടുകളിലും വെളുത്ത, പൊടി പോലുള്ള പാടുകൾ ഉണ്ടാക്കുന്ന ഒരു ഫംഗസ് രോഗം, ചികിത്സിച്ചില്ലെങ്കിൽ ചെടിയെ ദുർബലമാക്കും.",
        treatment: {
          biological: ["നേർപ്പിച്ച പാൽ സ്പ്രേ അല്ലെങ്കിൽ പൊട്ടാസ്യം ബൈകാർബണേറ്റ് ലായനി ആഴ്ചതോറും പ്രയോഗിക്കുക.", "ബീജ വ്യാപനം കുറയ്ക്കാൻ കടുത്ത ബാധയുള്ള ഇലകൾ നീക്കം ചെയ്യുക."],
          chemical: ["പൂപ്പൽ പടരുന്നത് തുടരുകയാണെങ്കിൽ സൾഫർ അടിസ്ഥാനമാക്കിയുള്ള അല്ലെങ്കിൽ മൈക്ലോബ്യൂട്ടാനിൽ കുമിൾനാശിനി പ്രയോഗിക്കുക."],
          prevention: ["നല്ല വായുസഞ്ചാരത്തിന് ചെടികൾക്കിടയിൽ അകലം നൽകുക.", "മൃദുവായ, ദുർബലമായ വളർച്ചയെ പ്രോത്സാഹിപ്പിക്കുന്ന അധിക നൈട്രജൻ വളം ഒഴിവാക്കുക."],
        },
      },
      bn: {
        description: "পাতা ও কাণ্ডে সাদা, গুঁড়োর মতো ছোপ তৈরি করে এমন একটি ছত্রাকজনিত রোগ, যা চিকিৎসা না করলে গাছকে দুর্বল করে দিতে পারে।",
        treatment: {
          biological: ["সাপ্তাহিকভাবে পাতলা দুধের স্প্রে বা পটাশিয়াম বাইকার্বোনেট দ্রবণ প্রয়োগ করুন।", "স্পোর বিস্তার কমাতে ভারী আক্রান্ত পাতা সরিয়ে ফেলুন।"],
          chemical: ["মিলডিউ ছড়াতে থাকলে সালফার-ভিত্তিক বা মাইক্লোবুটানিল ছত্রাকনাশক প্রয়োগ করুন।"],
          prevention: ["ভালো বায়ু চলাচলের জন্য গাছের মধ্যে ফাঁকা রাখুন।", "অতিরিক্ত নাইট্রোজেন সার এড়িয়ে চলুন, যা নরম, সংবেদনশীল বৃদ্ধি ঘটায়।"],
        },
      },
    },
  },
  // -------------------------------------------------------------- POTATO --
  {
    crop: "potato",
    matchAliases: ["late blight", "phytophthora infestans"],
    translations: {
      en: {
        description:
          "A fast-spreading disease causing dark, water-soaked blotches on leaves and stems, with tubers developing reddish-brown rot in storage.",
        treatment: {
          biological: [
            "Remove and destroy infected plants and volunteer potatoes immediately.",
            "Apply a copper-based fungicide preventively in humid weather.",
          ],
          chemical: ["Apply a chlorothalonil or mancozeb-based fungicide at the first sign of infection."],
          prevention: ["Plant certified disease-free seed potatoes.", "Hill soil over tubers to protect them from spores washing down."],
        },
      },
      es: {
        description:
          "Una enfermedad de rápida propagación que causa manchas oscuras y empapadas de agua en hojas y tallos, con tubérculos que desarrollan pudrición marrón rojiza durante el almacenamiento.",
        treatment: {
          biological: [
            "Retire y destruya de inmediato las plantas infectadas y las papas voluntarias.",
            "Aplique un fungicida a base de cobre de forma preventiva en clima húmedo.",
          ],
          chemical: ["Aplique un fungicida a base de clorotalonil o mancozeb ante el primer signo de infección."],
          prevention: ["Siembre papas de semilla certificada libre de enfermedades.", "Aporque tierra sobre los tubérculos para protegerlos de las esporas que se filtran."],
        },
      },
      fr: {
        description:
          "Une maladie à propagation rapide provoquant des taches sombres et détrempées sur les feuilles et les tiges, les tubercules développant une pourriture brun-rougeâtre en stockage.",
        treatment: {
          biological: [
            "Retirez et détruisez immédiatement les plants infectés et les repousses spontanées de pommes de terre.",
            "Appliquez un fongicide à base de cuivre à titre préventif par temps humide.",
          ],
          chemical: ["Appliquez un fongicide à base de chlorothalonil ou de mancozèbe dès le premier signe d'infection."],
          prevention: ["Plantez des pommes de terre de semence certifiées exemptes de maladies.", "Butter la terre sur les tubercules pour les protéger des spores qui s'infiltrent."],
        },
      },
      sw: {
        description:
          "Ugonjwa unaoenea haraka unaosababisha madoa meusi yenye maji kwenye majani na mashina, huku viazi vikianza kuoza rangi ya kahawia-nyekundu wakati wa kuhifadhiwa.",
        treatment: {
          biological: [
            "Ondoa na haribu mara moja mimea iliyoambukizwa na viazi vya kujitokea vyenyewe.",
            "Tumia dawa ya fangasi yenye shaba kama kinga wakati wa hali ya unyevu.",
          ],
          chemical: ["Tumia dawa ya fangasi yenye chlorothalonil au mancozeb dalili za kwanza za maambukizi zinapoonekana."],
          prevention: ["Panda viazi vya mbegu vilivyothibitishwa kuwa havina magonjwa.", "Panda kilima cha udongo juu ya viazi ili kuvilinda dhidi ya spora zinazomwagika chini."],
        },
      },
      hi: {
        description:
          "एक तेज़ी से फैलने वाला रोग जो पत्तियों और तनों पर गहरे, पानी से भीगे धब्बे बनाता है, जिसमें भंडारण के दौरान कंद लाल-भूरे सड़न विकसित करते हैं।",
        treatment: {
          biological: [
            "संक्रमित पौधों और स्वयं उगे आलू को तुरंत हटाकर नष्ट करें।",
            "नम मौसम में निवारक रूप से कॉपर आधारित फफूंदनाशक का प्रयोग करें।",
          ],
          chemical: ["संक्रमण के पहले संकेत पर क्लोरोथैलोनिल या मैंकोज़ेब आधारित फफूंदनाशक का प्रयोग करें।"],
          prevention: ["प्रमाणित रोग-मुक्त बीज आलू लगाएं।", "बीजाणुओं को कंदों तक बहने से रोकने के लिए कंदों पर मिट्टी चढ़ाएं।"],
        },
      },
      ml: {
        description:
          "വേഗത്തിൽ പടരുന്ന ഒരു രോഗം, ഇലകളിലും തണ്ടുകളിലും ഇരുണ്ട, ജലാംശമുള്ള പാടുകൾ ഉണ്ടാക്കുന്നു, സംഭരണത്തിൽ കിഴങ്ങുകൾക്ക് ചുവപ്പ്-തവിട്ട് അഴുകൽ ഉണ്ടാകുന്നു.",
        treatment: {
          biological: [
            "ബാധിച്ച ചെടികളും സ്വയം മുളച്ച ഉരുളക്കിഴങ്ങുകളും ഉടൻ നീക്കം ചെയ്ത് നശിപ്പിക്കുക.",
            "ഈർപ്പമുള്ള കാലാവസ്ഥയിൽ പ്രതിരോധമായി കോപ്പർ അടിസ്ഥാനമാക്കിയുള്ള കുമിൾനാശിനി പ്രയോഗിക്കുക.",
          ],
          chemical: ["അണുബാധയുടെ ആദ്യ ലക്ഷണത്തിൽ ക്ലോറോതലോനിൽ അല്ലെങ്കിൽ മാൻകോസെബ് അടിസ്ഥാനമാക്കിയുള്ള കുമിൾനാശിനി പ്രയോഗിക്കുക."],
          prevention: ["സാക്ഷ്യപ്പെടുത്തിയ രോഗരഹിത വിത്ത് ഉരുളക്കിഴങ്ങ് നടുക.", "ബീജങ്ങൾ ഒലിച്ചിറങ്ങുന്നതിൽ നിന്ന് സംരക്ഷിക്കാൻ കിഴങ്ങുകൾക്ക് മുകളിൽ മണ്ണ് കൂട്ടുക."],
        },
      },
      bn: {
        description:
          "একটি দ্রুত ছড়িয়ে পড়া রোগ যা পাতা ও কাণ্ডে গাঢ়, জলভেজা দাগ তৈরি করে, সংরক্ষণের সময় আলুতে লালচে-বাদামী পচন ধরে।",
        treatment: {
          biological: [
            "আক্রান্ত গাছ ও স্বতঃস্ফূর্ত আলু অবিলম্বে সরিয়ে ধ্বংস করুন।",
            "আর্দ্র আবহাওয়ায় প্রতিরোধমূলকভাবে তামা-ভিত্তিক ছত্রাকনাশক প্রয়োগ করুন।",
          ],
          chemical: ["সংক্রমণের প্রথম লক্ষণে ক্লোরোথালোনিল বা ম্যানকোজেব-ভিত্তিক ছত্রাকনাশক প্রয়োগ করুন।"],
          prevention: ["প্রত্যয়িত রোগমুক্ত বীজ আলু রোপণ করুন।", "স্পোর গড়িয়ে পড়া থেকে রক্ষা করতে আলুর উপর মাটি তুলে দিন।"],
        },
      },
    },
  },
  {
    crop: "potato",
    matchAliases: ["early blight", "alternaria solani"],
    translations: {
      en: {
        description: "A fungal disease causing dark, concentric-ring spots on older leaves, which can reduce yield if it spreads before harvest.",
        treatment: {
          biological: ["Remove and destroy infected lower leaves.", "Rotate crops away from potato/tomato family plants."],
          chemical: ["Apply a chlorothalonil or mancozeb-based fungicide if spots are spreading rapidly."],
          prevention: [
            "Use balanced fertilization; avoid nitrogen deficiency, which increases susceptibility.",
            "Avoid overhead irrigation late in the day.",
          ],
        },
      },
      es: {
        description: "Una enfermedad fúngica que causa manchas oscuras en forma de anillos concéntricos en las hojas más viejas, que puede reducir el rendimiento si se propaga antes de la cosecha.",
        treatment: {
          biological: ["Retire y destruya las hojas inferiores infectadas.", "Rote los cultivos alejándose de plantas de la familia papa/tomate."],
          chemical: ["Aplique un fungicida a base de clorotalonil o mancozeb si las manchas se propagan rápidamente."],
          prevention: [
            "Use una fertilización equilibrada; evite la deficiencia de nitrógeno, que aumenta la susceptibilidad.",
            "Evite el riego por aspersión al final del día.",
          ],
        },
      },
      fr: {
        description: "Une maladie fongique provoquant des taches sombres en anneaux concentriques sur les feuilles plus âgées, pouvant réduire le rendement si elle se propage avant la récolte.",
        treatment: {
          biological: ["Retirez et détruisez les feuilles inférieures infectées.", "Faites une rotation des cultures en évitant les plantes de la famille pomme de terre/tomate."],
          chemical: ["Appliquez un fongicide à base de chlorothalonil ou de mancozèbe si les taches se propagent rapidement."],
          prevention: [
            "Utilisez une fertilisation équilibrée ; évitez la carence en azote, qui augmente la sensibilité.",
            "Évitez l'irrigation par aspersion en fin de journée.",
          ],
        },
      },
      sw: {
        description: "Ugonjwa wa fangasi unaosababisha madoa meusi ya duara zenye tabaka kwenye majani makubwa, ambao unaweza kupunguza mavuno ukienea kabla ya mavuno.",
        treatment: {
          biological: ["Ondoa na haribu majani ya chini yaliyoambukizwa.", "Zungusha mazao mbali na familia ya viazi/nyanya."],
          chemical: ["Tumia dawa ya fangasi yenye chlorothalonil au mancozeb ikiwa madoa yanaenea haraka."],
          prevention: [
            "Tumia mbolea yenye uwiano mzuri; epuka upungufu wa nitrojeni, ambao huongeza uwezekano wa kuathirika.",
            "Epuka kumwagilia juu ya majani mwishoni mwa siku.",
          ],
        },
      },
      hi: {
        description: "एक फफूंद रोग जो पुरानी पत्तियों पर गहरे, संकेंद्रित छल्लेदार धब्बे बनाता है, जो कटाई से पहले फैलने पर उपज कम कर सकता है।",
        treatment: {
          biological: ["संक्रमित निचली पत्तियों को हटाकर नष्ट करें।", "आलू/टमाटर परिवार के पौधों से फसल चक्र अपनाएं।"],
          chemical: ["यदि धब्बे तेज़ी से फैल रहे हों तो क्लोरोथैलोनिल या मैंकोज़ेब आधारित फफूंदनाशक का प्रयोग करें।"],
          prevention: [
            "संतुलित उर्वरक का उपयोग करें; नाइट्रोजन की कमी से बचें, जो संवेदनशीलता बढ़ाती है।",
            "दिन के अंत में ऊपर से सिंचाई से बचें।",
          ],
        },
      },
      ml: {
        description: "പഴയ ഇലകളിൽ ഇരുണ്ട, കേന്ദ്രീകൃത വലയങ്ങളുള്ള പാടുകൾ ഉണ്ടാക്കുന്ന ഒരു ഫംഗസ് രോഗം, വിളവെടുപ്പിന് മുമ്പ് പടർന്നാൽ വിളവ് കുറയ്ക്കാം.",
        treatment: {
          biological: ["ബാധിച്ച താഴത്തെ ഇലകൾ നീക്കം ചെയ്ത് നശിപ്പിക്കുക.", "ഉരുളക്കിഴങ്ങ്/തക്കാളി കുടുംബത്തിലെ ചെടികളിൽ നിന്ന് വിളപരിക്രമം നടത്തുക."],
          chemical: ["പാടുകൾ വേഗത്തിൽ പടരുകയാണെങ്കിൽ ക്ലോറോതലോനിൽ അല്ലെങ്കിൽ മാൻകോസെബ് അടിസ്ഥാനമാക്കിയുള്ള കുമിൾനാശിനി പ്രയോഗിക്കുക."],
          prevention: [
            "സമീകൃത വളപ്രയോഗം നടത്തുക; ദുർബലതയ്ക്ക് കാരണമാകുന്ന നൈട്രജൻ കുറവ് ഒഴിവാക്കുക.",
            "ദിവസാവസാനം മുകളിൽ നിന്ന് നനയ്ക്കുന്നത് ഒഴിവാക്കുക.",
          ],
        },
      },
      bn: {
        description: "পুরনো পাতায় গাঢ়, কেন্দ্রীভূত বলয়যুক্ত দাগ তৈরি করে এমন একটি ছত্রাকজনিত রোগ, যা ফসল কাটার আগে ছড়ালে ফলন কমাতে পারে।",
        treatment: {
          biological: ["আক্রান্ত নিচের পাতা সরিয়ে ধ্বংস করুন।", "আলু/টমেটো পরিবারের গাছ থেকে ফসল আবর্তন করুন।"],
          chemical: ["দাগ দ্রুত ছড়ালে ক্লোরোথালোনিল বা ম্যানকোজেব-ভিত্তিক ছত্রাকনাশক প্রয়োগ করুন।"],
          prevention: [
            "সুষম সার ব্যবহার করুন; নাইট্রোজেনের ঘাটতি এড়িয়ে চলুন, যা সংবেদনশীলতা বাড়ায়।",
            "দিনের শেষে উপর থেকে সেচ এড়িয়ে চলুন।",
          ],
        },
      },
    },
  },
  {
    crop: "potato",
    matchAliases: ["bacterial wilt", "ralstonia"],
    hasChemicalOption: false, // treatment.chemical below is "no reliable cure exists", not a real product
    translations: {
      en: {
        description:
          "A soil-borne bacterial disease causing sudden wilting of the whole plant, often with no yellowing beforehand, and brown discoloration inside the stem.",
        treatment: {
          biological: [
            "Remove and destroy wilted plants immediately, including roots.",
            "Avoid replanting potatoes/tomatoes in the same soil for several seasons.",
          ],
          chemical: ["No reliable chemical cure exists; focus on removal and prevention."],
          prevention: ["Use certified disease-free seed potatoes.", "Improve field drainage, since the bacteria spread in waterlogged soil."],
        },
      },
      es: {
        description:
          "Una enfermedad bacteriana transmitida por el suelo que causa el marchitamiento repentino de toda la planta, a menudo sin amarillamiento previo, y decoloración marrón dentro del tallo.",
        treatment: {
          biological: [
            "Retire y destruya de inmediato las plantas marchitas, incluidas las raíces.",
            "Evite volver a sembrar papas/tomates en el mismo suelo durante varias temporadas.",
          ],
          chemical: ["No existe una cura química confiable; concéntrese en la eliminación y la prevención."],
          prevention: ["Use papas de semilla certificada libre de enfermedades.", "Mejore el drenaje del campo, ya que la bacteria se propaga en suelo encharcado."],
        },
      },
      fr: {
        description:
          "Une maladie bactérienne transmise par le sol provoquant un flétrissement soudain de toute la plante, souvent sans jaunissement préalable, avec une décoloration brune à l'intérieur de la tige.",
        treatment: {
          biological: [
            "Retirez et détruisez immédiatement les plants flétris, y compris les racines.",
            "Évitez de replanter des pommes de terre/tomates dans le même sol pendant plusieurs saisons.",
          ],
          chemical: ["Il n'existe pas de traitement chimique fiable ; concentrez-vous sur le retrait et la prévention."],
          prevention: ["Utilisez des pommes de terre de semence certifiées exemptes de maladies.", "Améliorez le drainage du champ, car la bactérie se propage dans un sol détrempé."],
        },
      },
      sw: {
        description:
          "Ugonjwa wa bakteria unaotokana na udongo unaosababisha kunyauka ghafla kwa mmea mzima, mara nyingi bila kubadilika manjano kabla, na kubadilika rangi ya kahawia ndani ya shina.",
        treatment: {
          biological: [
            "Ondoa na haribu mara moja mimea iliyonyauka, ikiwemo mizizi.",
            "Epuka kupanda tena viazi/nyanya kwenye udongo huo huo kwa misimu kadhaa.",
          ],
          chemical: ["Hakuna tiba ya kemikali ya kuaminika; zingatia uondoaji na kinga."],
          prevention: ["Tumia viazi vya mbegu vilivyothibitishwa kuwa havina magonjwa.", "Boresha mifereji ya maji shambani, kwani bakteria huenea kwenye udongo uliojaa maji."],
        },
      },
      hi: {
        description:
          "एक मिट्टी-जनित जीवाणु रोग जो पूरे पौधे को अचानक मुरझा देता है, अक्सर पहले पीलापन दिखाए बिना, और तने के अंदर भूरे रंग का धुंधलापन होता है।",
        treatment: {
          biological: [
            "मुरझाए पौधों को तुरंत हटाकर नष्ट करें, जड़ों सहित।",
            "कई मौसमों तक उसी मिट्टी में आलू/टमाटर दोबारा लगाने से बचें।",
          ],
          chemical: ["कोई विश्वसनीय रासायनिक इलाज मौजूद नहीं है; हटाने और रोकथाम पर ध्यान दें।"],
          prevention: ["प्रमाणित रोग-मुक्त बीज आलू का उपयोग करें।", "खेत की जल निकासी में सुधार करें, क्योंकि बैक्टीरिया जलभराव वाली मिट्टी में फैलते हैं।"],
        },
      },
      ml: {
        description:
          "മണ്ണിലൂടെ പകരുന്ന ഒരു ബാക്ടീരിയൽ രോഗം, ചെടി മുഴുവൻ പെട്ടെന്ന് വാടിപ്പോകുന്നു, പലപ്പോഴും മുമ്പ് മഞ്ഞളിപ്പ് ഇല്ലാതെ തന്നെ, തണ്ടിനുള്ളിൽ തവിട്ട് നിറവ്യത്യാസത്തോടെ.",
        treatment: {
          biological: [
            "വാടിയ ചെടികൾ വേരുകൾ ഉൾപ്പെടെ ഉടൻ നീക്കം ചെയ്ത് നശിപ്പിക്കുക.",
            "പല സീസണുകളിൽ അതേ മണ്ണിൽ ഉരുളക്കിഴങ്ങ്/തക്കാളി വീണ്ടും നടുന്നത് ഒഴിവാക്കുക.",
          ],
          chemical: ["വിശ്വസനീയമായ രാസ ചികിത്സയില്ല; നീക്കം ചെയ്യലിലും പ്രതിരോധത്തിലും ശ്രദ്ധ കേന്ദ്രീകരിക്കുക."],
          prevention: ["സാക്ഷ്യപ്പെടുത്തിയ രോഗരഹിത വിത്ത് ഉരുളക്കിഴങ്ങ് ഉപയോഗിക്കുക.", "ബാക്ടീരിയ വെള്ളക്കെട്ടുള്ള മണ്ണിൽ പടരുന്നതിനാൽ വയലിലെ ജലനിർഗമനം മെച്ചപ്പെടുത്തുക."],
        },
      },
      bn: {
        description:
          "মাটিবাহিত একটি ব্যাকটেরিয়াজনিত রোগ যা সমগ্র গাছের হঠাৎ ঢলে পড়া ঘটায়, প্রায়ই আগে থেকে হলুদ না হয়েই, এবং কাণ্ডের ভেতরে বাদামী বিবর্ণতা দেখা দেয়।",
        treatment: {
          biological: [
            "ঢলে পড়া গাছ মূলসহ অবিলম্বে সরিয়ে ধ্বংস করুন।",
            "কয়েক মৌসুম একই মাটিতে আলু/টমেটো পুনরায় রোপণ এড়িয়ে চলুন।",
          ],
          chemical: ["কোনো নির্ভরযোগ্য রাসায়নিক নিরাময় নেই; অপসারণ ও প্রতিরোধের উপর মনোযোগ দিন।"],
          prevention: ["প্রত্যয়িত রোগমুক্ত বীজ আলু ব্যবহার করুন।", "জমির নিষ্কাশন উন্নত করুন, কারণ ব্যাকটেরিয়া জলাবদ্ধ মাটিতে ছড়ায়।"],
        },
      },
    },
  },
  {
    crop: "potato",
    matchAliases: ["common scab", "scab", "streptomyces"],
    hasChemicalOption: false, // treatment.chemical below is "no effective chemical treatment", not a real product
    translations: {
      en: {
        description: "A soil-borne disease causing rough, corky, raised patches on the tuber skin; it mainly affects appearance, not the plant's growth.",
        treatment: {
          biological: ["Keep soil consistently moist during tuber formation to reduce scab severity."],
          chemical: ["No effective chemical treatment; prevention and soil management are key."],
          prevention: [
            "Avoid liming soil right before planting potatoes, since scab favors less acidic soil.",
            "Rotate crops and avoid planting potatoes in the same soil for 3+ years.",
          ],
        },
      },
      es: {
        description: "Una enfermedad transmitida por el suelo que causa parches ásperos, corchosos y elevados en la piel del tubérculo; afecta principalmente la apariencia, no el crecimiento de la planta.",
        treatment: {
          biological: ["Mantenga el suelo constantemente húmedo durante la formación de los tubérculos para reducir la gravedad de la sarna."],
          chemical: ["No existe un tratamiento químico eficaz; la prevención y el manejo del suelo son clave."],
          prevention: [
            "Evite encalar el suelo justo antes de sembrar papas, ya que la sarna prefiere suelos menos ácidos.",
            "Rote los cultivos y evite sembrar papas en el mismo suelo durante 3 años o más.",
          ],
        },
      },
      fr: {
        description: "Une maladie transmise par le sol provoquant des taches rugueuses, liégeuses et surélevées sur la peau du tubercule ; elle affecte surtout l'apparence, pas la croissance de la plante.",
        treatment: {
          biological: ["Maintenez le sol constamment humide pendant la formation des tubercules pour réduire la gravité de la gale."],
          chemical: ["Il n'existe pas de traitement chimique efficace ; la prévention et la gestion du sol sont essentielles."],
          prevention: [
            "Évitez de chauler le sol juste avant de planter les pommes de terre, car la gale préfère les sols moins acides.",
            "Faites une rotation des cultures et évitez de planter des pommes de terre dans le même sol pendant 3 ans ou plus.",
          ],
        },
      },
      sw: {
        description: "Ugonjwa unaotokana na udongo unaosababisha vipande vigumu, kama gome, vilivyoinuka kwenye ngozi ya kiazi; huathiri zaidi mwonekano, si ukuaji wa mmea.",
        treatment: {
          biological: ["Weka udongo na unyevu wa kudumu wakati wa uundaji wa viazi ili kupunguza ukali wa upele."],
          chemical: ["Hakuna tiba bora ya kemikali; kinga na usimamizi wa udongo ndio muhimu."],
          prevention: [
            "Epuka kuweka chokaa kwenye udongo kabla ya kupanda viazi, kwani upele hupendelea udongo usio na tindikali kali.",
            "Zungusha mazao na epuka kupanda viazi kwenye udongo huo huo kwa miaka 3 au zaidi.",
          ],
        },
      },
      hi: {
        description: "एक मिट्टी-जनित रोग जो कंद की त्वचा पर खुरदुरे, कॉर्क जैसे, उभरे हुए धब्बे बनाता है; यह मुख्य रूप से दिखावट को प्रभावित करता है, पौधे की वृद्धि को नहीं।",
        treatment: {
          biological: ["स्कैब की गंभीरता कम करने के लिए कंद बनने के दौरान मिट्टी को लगातार नम रखें।"],
          chemical: ["कोई प्रभावी रासायनिक उपचार नहीं है; रोकथाम और मिट्टी प्रबंधन ही महत्वपूर्ण हैं।"],
          prevention: [
            "आलू बोने से ठीक पहले मिट्टी में चूना डालने से बचें, क्योंकि स्कैब कम अम्लीय मिट्टी को पसंद करता है।",
            "फसल चक्र अपनाएं और 3+ वर्षों तक उसी मिट्टी में आलू लगाने से बचें।",
          ],
        },
      },
      ml: {
        description: "മണ്ണിലൂടെ പകരുന്ന ഒരു രോഗം, കിഴങ്ങിന്റെ തൊലിയിൽ പരുപരുത്ത, കോർക്ക് പോലുള്ള, ഉയർന്ന പാടുകൾ ഉണ്ടാക്കുന്നു; ഇത് പ്രധാനമായും രൂപത്തെയാണ് ബാധിക്കുന്നത്, ചെടിയുടെ വളർച്ചയെയല്ല.",
        treatment: {
          biological: ["സ്കാബിന്റെ തീവ്രത കുറയ്ക്കാൻ കിഴങ്ങ് രൂപപ്പെടുന്ന സമയത്ത് മണ്ണ് സ്ഥിരമായി ഈർപ്പമുള്ളതായി നിലനിർത്തുക."],
          chemical: ["ഫലപ്രദമായ രാസ ചികിത്സയില്ല; പ്രതിരോധവും മണ്ണ് പരിപാലനവുമാണ് പ്രധാനം."],
          prevention: [
            "ഉരുളക്കിഴങ്ങ് നടുന്നതിന് തൊട്ടുമുമ്പ് മണ്ണിൽ കുമ്മായം ചേർക്കുന്നത് ഒഴിവാക്കുക, കാരണം സ്കാബ് കുറഞ്ഞ അമ്ലത്വമുള്ള മണ്ണിനെ ഇഷ്ടപ്പെടുന്നു.",
            "വിളപരിക്രമം നടത്തുകയും 3+ വർഷത്തേക്ക് അതേ മണ്ണിൽ ഉരുളക്കിഴങ്ങ് നടുന്നത് ഒഴിവാക്കുകയും ചെയ്യുക.",
          ],
        },
      },
      bn: {
        description: "মাটিবাহিত একটি রোগ যা কন্দের ত্বকে রুক্ষ, কর্কের মতো, উঁচু ছোপ তৈরি করে; এটি মূলত চেহারাকে প্রভাবিত করে, গাছের বৃদ্ধিকে নয়।",
        treatment: {
          biological: ["স্ক্যাবের তীব্রতা কমাতে কন্দ গঠনের সময় মাটি সবসময় আর্দ্র রাখুন।"],
          chemical: ["কোনো কার্যকর রাসায়নিক চিকিৎসা নেই; প্রতিরোধ ও মাটি ব্যবস্থাপনাই মূল।"],
          prevention: [
            "আলু রোপণের ঠিক আগে মাটিতে চুন প্রয়োগ এড়িয়ে চলুন, কারণ স্ক্যাব কম অম্লীয় মাটি পছন্দ করে।",
            "ফসল আবর্তন করুন এবং ৩+ বছর একই মাটিতে আলু রোপণ এড়িয়ে চলুন।",
          ],
        },
      },
    },
  },
  // -------------------------------------------------------------- PEPPER --
  {
    crop: "pepper",
    matchAliases: ["bacterial spot", "xanthomonas"],
    translations: {
      en: {
        description: "A bacterial disease causing small, dark, water-soaked spots on leaves and fruit that can cause leaves to drop.",
        treatment: {
          biological: ["Remove and destroy infected leaves and fruit.", "Apply a copper-based bactericide before infection spreads further."],
          chemical: ["Copper combined with mancozeb can help slow spread in severe outbreaks."],
          prevention: ["Use certified disease-free seed and resistant varieties.", "Avoid overhead watering and working in wet fields."],
        },
      },
      es: {
        description: "Una enfermedad bacteriana que causa pequeñas manchas oscuras y empapadas de agua en hojas y frutos, que puede provocar la caída de las hojas.",
        treatment: {
          biological: ["Retire y destruya las hojas y frutos infectados.", "Aplique un bactericida a base de cobre antes de que la infección se propague más."],
          chemical: ["El cobre combinado con mancozeb puede ayudar a ralentizar la propagación en brotes graves."],
          prevention: ["Use semilla certificada libre de enfermedades y variedades resistentes.", "Evite el riego por aspersión y trabajar en campos mojados."],
        },
      },
      fr: {
        description: "Une maladie bactérienne provoquant de petites taches sombres et détrempées sur les feuilles et les fruits, pouvant entraîner la chute des feuilles.",
        treatment: {
          biological: ["Retirez et détruisez les feuilles et fruits infectés.", "Appliquez un bactéricide à base de cuivre avant que l'infection ne se propage davantage."],
          chemical: ["Le cuivre combiné au mancozèbe peut aider à ralentir la propagation lors d'épidémies graves."],
          prevention: ["Utilisez des semences certifiées exemptes de maladies et des variétés résistantes.", "Évitez l'arrosage par le haut et de travailler dans des champs mouillés."],
        },
      },
      sw: {
        description: "Ugonjwa wa bakteria unaosababisha madoa madogo, meusi, yenye maji kwenye majani na matunda ambayo yanaweza kusababisha majani kudondoka.",
        treatment: {
          biological: ["Ondoa na haribu majani na matunda yaliyoambukizwa.", "Tumia dawa ya bakteria yenye shaba kabla ya maambukizi kuenea zaidi."],
          chemical: ["Shaba pamoja na mancozeb inaweza kusaidia kupunguza kasi ya kuenea katika milipuko mikali."],
          prevention: ["Tumia mbegu zilizothibitishwa kuwa hazina magonjwa na aina zinazostahimili.", "Epuka kumwagilia juu ya majani na kufanya kazi kwenye mashamba yenye unyevu."],
        },
      },
      hi: {
        description: "एक जीवाणु रोग जो पत्तियों और फलों पर छोटे, गहरे, पानी से भीगे धब्बे बनाता है जिससे पत्तियां गिर सकती हैं।",
        treatment: {
          biological: ["संक्रमित पत्तियों और फलों को हटाकर नष्ट करें।", "संक्रमण और फैलने से पहले कॉपर आधारित जीवाणुनाशक का प्रयोग करें।"],
          chemical: ["गंभीर प्रकोप में मैंकोज़ेब के साथ मिश्रित कॉपर प्रसार को धीमा करने में मदद कर सकता है।"],
          prevention: ["प्रमाणित रोग-मुक्त बीज और प्रतिरोधी किस्मों का उपयोग करें।", "ऊपर से पानी देने और गीले खेतों में काम करने से बचें।"],
        },
      },
      ml: {
        description: "ഇലകളിലും പഴങ്ങളിലും ചെറിയ, ഇരുണ്ട, ജലാംശമുള്ള പാടുകൾ ഉണ്ടാക്കുന്ന ഒരു ബാക്ടീരിയൽ രോഗം, ഇത് ഇലകൾ കൊഴിയാൻ കാരണമാകും.",
        treatment: {
          biological: ["ബാധിച്ച ഇലകളും പഴങ്ങളും നീക്കം ചെയ്ത് നശിപ്പിക്കുക.", "അണുബാധ കൂടുതൽ പടരുന്നതിന് മുമ്പ് കോപ്പർ അടിസ്ഥാനമാക്കിയുള്ള ബാക്ടീരിയനാശിനി പ്രയോഗിക്കുക."],
          chemical: ["ഗുരുതരമായ പൊട്ടിപ്പുറപ്പെടലുകളിൽ മാൻകോസെബുമായി സംയോജിപ്പിച്ച കോപ്പർ വ്യാപനം മന്ദഗതിയിലാക്കാൻ സഹായിക്കും."],
          prevention: ["സാക്ഷ്യപ്പെടുത്തിയ രോഗരഹിത വിത്തും പ്രതിരോധശേഷിയുള്ള ഇനങ്ങളും ഉപയോഗിക്കുക.", "മുകളിൽ നിന്ന് നനയ്ക്കുന്നതും നനഞ്ഞ വയലുകളിൽ ജോലി ചെയ്യുന്നതും ഒഴിവാക്കുക."],
        },
      },
      bn: {
        description: "একটি ব্যাকটেরিয়াজনিত রোগ যা পাতা ও ফলে ছোট, গাঢ়, জলভেজা দাগ তৈরি করে যা পাতা ঝরে পড়ার কারণ হতে পারে।",
        treatment: {
          biological: ["আক্রান্ত পাতা ও ফল সরিয়ে ধ্বংস করুন।", "সংক্রমণ আরও ছড়ানোর আগে তামা-ভিত্তিক ব্যাকটেরিয়ানাশক প্রয়োগ করুন।"],
          chemical: ["গুরুতর প্রাদুর্ভাবে ম্যানকোজেবের সাথে তামা মিশ্রিত করলে বিস্তার ধীর করতে সাহায্য করতে পারে।"],
          prevention: ["প্রত্যয়িত রোগমুক্ত বীজ ও প্রতিরোধী জাত ব্যবহার করুন।", "উপর থেকে জল দেওয়া ও ভেজা জমিতে কাজ করা এড়িয়ে চলুন।"],
        },
      },
    },
  },
  {
    crop: "pepper",
    matchAliases: ["powdery mildew"],
    translations: {
      en: {
        description: "A fungal disease causing white, powdery patches on the underside of leaves, which can cause leaf drop if untreated.",
        treatment: {
          biological: ["Apply a diluted milk spray or potassium bicarbonate solution weekly.", "Remove heavily infected leaves."],
          chemical: ["Apply a sulfur-based fungicide if mildew keeps spreading."],
          prevention: ["Space plants well for airflow.", "Avoid excess nitrogen fertilizer."],
        },
      },
      es: {
        description: "Una enfermedad fúngica que causa parches blancos y polvorientos en el envés de las hojas, que puede provocar la caída de las hojas si no se trata.",
        treatment: {
          biological: ["Aplique semanalmente un aerosol de leche diluida o una solución de bicarbonato de potasio.", "Retire las hojas muy infectadas."],
          chemical: ["Aplique un fungicida a base de azufre si el mildiú sigue propagándose."],
          prevention: ["Espacie bien las plantas para la circulación de aire.", "Evite el exceso de fertilizante nitrogenado."],
        },
      },
      fr: {
        description: "Une maladie fongique provoquant des taches blanches poudreuses sur la face inférieure des feuilles, pouvant entraîner leur chute si elle n'est pas traitée.",
        treatment: {
          biological: ["Appliquez chaque semaine un spray de lait dilué ou une solution de bicarbonate de potassium.", "Retirez les feuilles fortement infectées."],
          chemical: ["Appliquez un fongicide à base de soufre si l'oïdium continue de se propager."],
          prevention: ["Espacez bien les plants pour la circulation de l'air.", "Évitez l'excès d'engrais azoté."],
        },
      },
      sw: {
        description: "Ugonjwa wa fangasi unaosababisha vipande vyeupe kama unga chini ya majani, ambao unaweza kusababisha majani kudondoka usipotibiwa.",
        treatment: {
          biological: ["Tumia dawa ya maziwa yaliyochanganywa na maji au suluhisho la potassium bicarbonate kila wiki.", "Ondoa majani yaliyoambukizwa sana."],
          chemical: ["Tumia dawa ya fangasi yenye salfa ikiwa ukungu unaendelea kuenea."],
          prevention: ["Panda kwa nafasi nzuri kwa mzunguko wa hewa.", "Epuka mbolea nyingi ya nitrojeni."],
        },
      },
      hi: {
        description: "एक फफूंद रोग जो पत्तियों की निचली सतह पर सफेद, पाउडर जैसे धब्बे बनाता है, जो उपचार न करने पर पत्तियों के गिरने का कारण बन सकता है।",
        treatment: {
          biological: ["साप्ताहिक रूप से पतला दूध स्प्रे या पोटेशियम बाइकार्बोनेट घोल लगाएं।", "अत्यधिक संक्रमित पत्तियों को हटाएं।"],
          chemical: ["यदि फफूंदी फैलती रहे तो सल्फर आधारित फफूंदनाशक का प्रयोग करें।"],
          prevention: ["हवा के प्रवाह के लिए पौधों में अच्छी दूरी रखें।", "अधिक नाइट्रोजन उर्वरक से बचें।"],
        },
      },
      ml: {
        description: "ഇലയുടെ അടിവശത്ത് വെളുത്ത, പൊടി പോലുള്ള പാടുകൾ ഉണ്ടാക്കുന്ന ഒരു ഫംഗസ് രോഗം, ചികിത്സിച്ചില്ലെങ്കിൽ ഇല കൊഴിയാൻ കാരണമാകും.",
        treatment: {
          biological: ["നേർപ്പിച്ച പാൽ സ്പ്രേ അല്ലെങ്കിൽ പൊട്ടാസ്യം ബൈകാർബണേറ്റ് ലായനി ആഴ്ചതോറും പ്രയോഗിക്കുക.", "കടുത്ത ബാധയുള്ള ഇലകൾ നീക്കം ചെയ്യുക."],
          chemical: ["പൂപ്പൽ പടരുന്നത് തുടരുകയാണെങ്കിൽ സൾഫർ അടിസ്ഥാനമാക്കിയുള്ള കുമിൾനാശിനി പ്രയോഗിക്കുക."],
          prevention: ["വായുസഞ്ചാരത്തിന് ചെടികൾക്കിടയിൽ നല്ല അകലം നൽകുക.", "അധിക നൈട്രജൻ വളം ഒഴിവാക്കുക."],
        },
      },
      bn: {
        description: "পাতার নিচের দিকে সাদা, গুঁড়োর মতো ছোপ তৈরি করে এমন একটি ছত্রাকজনিত রোগ, যা চিকিৎসা না করলে পাতা ঝরে যেতে পারে।",
        treatment: {
          biological: ["সাপ্তাহিকভাবে পাতলা দুধের স্প্রে বা পটাশিয়াম বাইকার্বোনেট দ্রবণ প্রয়োগ করুন।", "ভারী আক্রান্ত পাতা সরিয়ে ফেলুন।"],
          chemical: ["মিলডিউ ছড়াতে থাকলে সালফার-ভিত্তিক ছত্রাকনাশক প্রয়োগ করুন।"],
          prevention: ["বায়ু চলাচলের জন্য গাছের মধ্যে ভালো ফাঁকা রাখুন।", "অতিরিক্ত নাইট্রোজেন সার এড়িয়ে চলুন।"],
        },
      },
    },
  },
  {
    crop: "pepper",
    matchAliases: ["anthracnose", "colletotrichum"],
    translations: {
      en: {
        description: "A fungal disease causing sunken, dark, circular lesions on ripening fruit, which can spread quickly in warm, wet weather.",
        treatment: {
          biological: ["Remove and destroy infected fruit promptly to reduce spore spread.", "Apply a copper-based fungicide preventively during wet weather."],
          chemical: ["Apply a chlorothalonil or azoxystrobin-based fungicide if lesions continue spreading."],
          prevention: ["Rotate crops and avoid overhead irrigation.", "Harvest ripe fruit promptly to reduce infection risk."],
        },
      },
      es: {
        description: "Una enfermedad fúngica que causa lesiones hundidas, oscuras y circulares en frutos que están madurando, que puede propagarse rápidamente en clima cálido y húmedo.",
        treatment: {
          biological: ["Retire y destruya rápidamente los frutos infectados para reducir la propagación de esporas.", "Aplique un fungicida a base de cobre de forma preventiva durante el clima húmedo."],
          chemical: ["Aplique un fungicida a base de clorotalonil o azoxistrobina si las lesiones siguen propagándose."],
          prevention: ["Rote los cultivos y evite el riego por aspersión.", "Coseche los frutos maduros con prontitud para reducir el riesgo de infección."],
        },
      },
      fr: {
        description: "Une maladie fongique provoquant des lésions enfoncées, sombres et circulaires sur les fruits en cours de maturation, pouvant se propager rapidement par temps chaud et humide.",
        treatment: {
          biological: ["Retirez et détruisez rapidement les fruits infectés pour réduire la propagation des spores.", "Appliquez un fongicide à base de cuivre à titre préventif par temps humide."],
          chemical: ["Appliquez un fongicide à base de chlorothalonil ou d'azoxystrobine si les lésions continuent de se propager."],
          prevention: ["Faites une rotation des cultures et évitez l'irrigation par aspersion.", "Récoltez rapidement les fruits mûrs pour réduire le risque d'infection."],
        },
      },
      sw: {
        description: "Ugonjwa wa fangasi unaosababisha madonda yaliyozama, meusi, ya duara kwenye matunda yanayoiva, ambayo yanaweza kuenea haraka wakati wa hali ya joto na unyevu.",
        treatment: {
          biological: ["Ondoa na haribu matunda yaliyoambukizwa haraka ili kupunguza kuenea kwa spora.", "Tumia dawa ya fangasi yenye shaba kama kinga wakati wa hali ya unyevu."],
          chemical: ["Tumia dawa ya fangasi yenye chlorothalonil au azoxystrobin ikiwa madonda yanaendelea kuenea."],
          prevention: ["Zungusha mazao na epuka kumwagilia juu ya majani.", "Vuna matunda yaliyoiva haraka ili kupunguza hatari ya maambukizi."],
        },
      },
      hi: {
        description: "एक फफूंद रोग जो पकते हुए फलों पर धंसे हुए, गहरे, गोल घाव बनाता है, जो गर्म, नम मौसम में तेज़ी से फैल सकता है।",
        treatment: {
          biological: ["बीजाणु फैलाव कम करने के लिए संक्रमित फलों को तुरंत हटाकर नष्ट करें।", "नम मौसम में निवारक रूप से कॉपर आधारित फफूंदनाशक का प्रयोग करें।"],
          chemical: ["यदि घाव फैलते रहें तो क्लोरोथैलोनिल या एज़ोक्सिस्ट्रोबिन आधारित फफूंदनाशक का प्रयोग करें।"],
          prevention: ["फसल चक्र अपनाएं और ऊपर से सिंचाई से बचें।", "संक्रमण जोखिम कम करने के लिए पके फलों की तुरंत कटाई करें।"],
        },
      },
      ml: {
        description: "പഴുക്കുന്ന പഴങ്ങളിൽ താഴ്ന്ന, ഇരുണ്ട, വൃത്താകൃതിയിലുള്ള മുറിവുകൾ ഉണ്ടാക്കുന്ന ഒരു ഫംഗസ് രോഗം, ചൂടുള്ളതും ഈർപ്പമുള്ളതുമായ കാലാവസ്ഥയിൽ ഇത് വേഗത്തിൽ പടരാം.",
        treatment: {
          biological: ["ബീജ വ്യാപനം കുറയ്ക്കാൻ ബാധിച്ച പഴങ്ങൾ വേഗത്തിൽ നീക്കം ചെയ്ത് നശിപ്പിക്കുക.", "ഈർപ്പമുള്ള കാലാവസ്ഥയിൽ പ്രതിരോധമായി കോപ്പർ അടിസ്ഥാനമാക്കിയുള്ള കുമിൾനാശിനി പ്രയോഗിക്കുക."],
          chemical: ["മുറിവുകൾ തുടർന്നും പടരുകയാണെങ്കിൽ ക്ലോറോതലോനിൽ അല്ലെങ്കിൽ അസോക്സിസ്ട്രോബിൻ അടിസ്ഥാനമാക്കിയുള്ള കുമിൾനാശിനി പ്രയോഗിക്കുക."],
          prevention: ["വിളപരിക്രമം നടത്തുകയും മുകളിൽ നിന്ന് നനയ്ക്കുന്നത് ഒഴിവാക്കുകയും ചെയ്യുക.", "അണുബാധാ സാധ്യത കുറയ്ക്കാൻ പഴുത്ത പഴങ്ങൾ വേഗത്തിൽ വിളവെടുക്കുക."],
        },
      },
      bn: {
        description: "পাকা ফলে দেবে যাওয়া, গাঢ়, বৃত্তাকার ক্ষত তৈরি করে এমন একটি ছত্রাকজনিত রোগ, যা উষ্ণ, ভেজা আবহাওয়ায় দ্রুত ছড়াতে পারে।",
        treatment: {
          biological: ["স্পোর বিস্তার কমাতে আক্রান্ত ফল দ্রুত সরিয়ে ধ্বংস করুন।", "ভেজা আবহাওয়ায় প্রতিরোধমূলকভাবে তামা-ভিত্তিক ছত্রাকনাশক প্রয়োগ করুন।"],
          chemical: ["ক্ষত ছড়াতে থাকলে ক্লোরোথালোনিল বা অ্যাজোক্সিস্ট্রোবিন-ভিত্তিক ছত্রাকনাশক প্রয়োগ করুন।"],
          prevention: ["ফসল আবর্তন করুন এবং উপর থেকে সেচ এড়িয়ে চলুন।", "সংক্রমণের ঝুঁকি কমাতে পাকা ফল দ্রুত সংগ্রহ করুন।"],
        },
      },
    },
  },
  {
    crop: "pepper",
    matchAliases: ["phytophthora blight", "phytophthora capsici", "phytophthora"],
    translations: {
      en: {
        description: "A fast-spreading disease causing sudden wilting, dark water-soaked lesions on stems, and fruit rot, especially in waterlogged soil.",
        treatment: {
          biological: ["Improve field drainage immediately; remove and destroy wilted plants.", "Avoid working in wet fields to prevent spreading the pathogen."],
          chemical: ["Apply a fungicide containing mefenoxam or a phosphonate product at the first sign of infection."],
          prevention: ["Plant on raised beds to improve drainage.", "Rotate crops away from pepper/tomato family plants for at least 2 years."],
        },
      },
      es: {
        description: "Una enfermedad de rápida propagación que causa marchitamiento repentino, lesiones oscuras y empapadas de agua en los tallos, y pudrición de frutos, especialmente en suelo encharcado.",
        treatment: {
          biological: ["Mejore el drenaje del campo de inmediato; retire y destruya las plantas marchitas.", "Evite trabajar en campos mojados para prevenir la propagación del patógeno."],
          chemical: ["Aplique un fungicida que contenga mefenoxam o un producto a base de fosfonato ante el primer signo de infección."],
          prevention: ["Siembre en camas elevadas para mejorar el drenaje.", "Rote los cultivos alejándose de plantas de la familia pimiento/tomate durante al menos 2 años."],
        },
      },
      fr: {
        description: "Une maladie à propagation rapide provoquant un flétrissement soudain, des lésions sombres et détrempées sur les tiges, et une pourriture des fruits, surtout en sol détrempé.",
        treatment: {
          biological: ["Améliorez immédiatement le drainage du champ ; retirez et détruisez les plants flétris.", "Évitez de travailler dans des champs mouillés pour éviter de propager le pathogène."],
          chemical: ["Appliquez un fongicide contenant du méfénoxam ou un produit à base de phosphonate dès le premier signe d'infection."],
          prevention: ["Plantez sur des buttes surélevées pour améliorer le drainage.", "Faites une rotation des cultures en évitant les plantes de la famille piment/tomate pendant au moins 2 ans."],
        },
      },
      sw: {
        description: "Ugonjwa unaoenea haraka unaosababisha kunyauka ghafla, madonda meusi yenye maji kwenye mashina, na kuoza kwa matunda, hasa kwenye udongo uliojaa maji.",
        treatment: {
          biological: ["Boresha mifereji ya maji shambani mara moja; ondoa na haribu mimea iliyonyauka.", "Epuka kufanya kazi kwenye mashamba yenye unyevu ili kuzuia kuenea kwa kisababishi cha ugonjwa."],
          chemical: ["Tumia dawa ya fangasi yenye mefenoxam au bidhaa ya phosphonate dalili za kwanza za maambukizi zinapoonekana."],
          prevention: ["Panda kwenye matuta yaliyoinuka ili kuboresha mifereji ya maji.", "Zungusha mazao mbali na familia ya pilipili/nyanya kwa angalau miaka 2."],
        },
      },
      hi: {
        description: "एक तेज़ी से फैलने वाला रोग जो अचानक मुरझाव, तनों पर गहरे पानी से भीगे घाव, और फलों की सड़न का कारण बनता है, विशेष रूप से जलभराव वाली मिट्टी में।",
        treatment: {
          biological: ["तुरंत खेत की जल निकासी में सुधार करें; मुरझाए पौधों को हटाकर नष्ट करें।", "रोगजनक के प्रसार को रोकने के लिए गीले खेतों में काम करने से बचें।"],
          chemical: ["संक्रमण के पहले संकेत पर मेफेनोक्सम या फॉस्फोनेट युक्त फफूंदनाशक का प्रयोग करें।"],
          prevention: ["जल निकासी सुधारने के लिए ऊंची क्यारियों पर बुवाई करें।", "मिर्च/टमाटर परिवार के पौधों से कम से कम 2 वर्षों के लिए फसल चक्र अपनाएं।"],
        },
      },
      ml: {
        description: "പെട്ടെന്ന് വാടിപ്പോകുന്നതും തണ്ടുകളിൽ ഇരുണ്ട ജലാംശമുള്ള മുറിവുകളും പഴങ്ങളുടെ അഴുകലും ഉണ്ടാക്കുന്ന വേഗത്തിൽ പടരുന്ന ഒരു രോഗം, പ്രത്യേകിച്ച് വെള്ളക്കെട്ടുള്ള മണ്ണിൽ.",
        treatment: {
          biological: ["വയലിലെ ജലനിർഗമനം ഉടൻ മെച്ചപ്പെടുത്തുക; വാടിയ ചെടികൾ നീക്കം ചെയ്ത് നശിപ്പിക്കുക.", "രോഗാണു പടരുന്നത് തടയാൻ നനഞ്ഞ വയലുകളിൽ ജോലി ചെയ്യുന്നത് ഒഴിവാക്കുക."],
          chemical: ["അണുബാധയുടെ ആദ്യ ലക്ഷണത്തിൽ മെഫെനോക്സാം അല്ലെങ്കിൽ ഫോസ്ഫോണേറ്റ് ഉൽപ്പന്നം അടങ്ങിയ കുമിൾനാശിനി പ്രയോഗിക്കുക."],
          prevention: ["ജലനിർഗമനം മെച്ചപ്പെടുത്താൻ ഉയർത്തിയ തടങ്ങളിൽ നടുക.", "മുളക്/തക്കാളി കുടുംബത്തിലെ ചെടികളിൽ നിന്ന് കുറഞ്ഞത് 2 വർഷമെങ്കിലും വിളപരിക്രമം നടത്തുക."],
        },
      },
      bn: {
        description: "হঠাৎ ঢলে পড়া, কাণ্ডে গাঢ় জলভেজা ক্ষত, এবং ফল পচন ঘটায় এমন একটি দ্রুত ছড়িয়ে পড়া রোগ, বিশেষত জলাবদ্ধ মাটিতে।",
        treatment: {
          biological: ["অবিলম্বে জমির নিষ্কাশন উন্নত করুন; ঢলে পড়া গাছ সরিয়ে ধ্বংস করুন।", "রোগজীবাণুর বিস্তার রোধ করতে ভেজা জমিতে কাজ করা এড়িয়ে চলুন।"],
          chemical: ["সংক্রমণের প্রথম লক্ষণে মেফেনক্সাম বা ফসফোনেট পণ্যযুক্ত ছত্রাকনাশক প্রয়োগ করুন।"],
          prevention: ["নিষ্কাশন উন্নত করতে উঁচু বেডে রোপণ করুন।", "মরিচ/টমেটো পরিবারের গাছ থেকে অন্তত ২ বছরের জন্য ফসল আবর্তন করুন।"],
        },
      },
    },
  },
];

// Fuzzy, case-insensitive substring match: checks both directions so a
// short Plant.id name ("Blast") matches a longer alias and vice versa.
export function findTranslatedDiseaseContent(
  crop: SupportedCropSlug,
  diseaseName: string,
  languageCode: SupportedLanguageCode
): DiseaseContent | null {
  const nameLower = diseaseName.toLowerCase();
  const entry = DISEASE_TRANSLATIONS.find(
    (e) => e.crop === crop && e.matchAliases.some((alias) => nameLower.includes(alias) || alias.includes(nameLower))
  );
  if (!entry) return null;

  const stored = entry.translations[languageCode] ?? entry.translations.en;
  const hasChemicalOption = entry.hasChemicalOption ?? true;

  return {
    ...stored,
    costNote: {
      biological: BIOLOGICAL_COST_NOTE[languageCode] ?? BIOLOGICAL_COST_NOTE.en,
      chemical: hasChemicalOption
        ? CHEMICAL_COST_NOTE[languageCode] ?? CHEMICAL_COST_NOTE.en
        : NO_CHEMICAL_OPTION_COST_NOTE[languageCode] ?? NO_CHEMICAL_OPTION_COST_NOTE.en,
    },
  };
}
