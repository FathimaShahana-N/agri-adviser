// Curated, pre-translated preventive tips for the optional growth-stage
// feature (see IntakeResult.growthStage/selectedCrop). Entirely separate
// content from diseaseContentTranslations.ts - one concise, realistic tip
// per crop x growth-stage combination (5 crops x 4 stages = 20), each
// translated into all 7 supported languages. No LLM call.
//
// Kept deliberately simple and consistent (one sentence per tip) rather
// than varied/elaborate, since correctness and coverage across 140 strings
// matters more here than writing flair.
import { GrowthStage, SupportedCropSlug, SupportedLanguageCode } from "../types";

type TipsByLanguage = Record<SupportedLanguageCode, string>;
type TipsByStage = Record<GrowthStage, TipsByLanguage>;

const PREVENTIVE_TIPS: Record<SupportedCropSlug, TipsByStage> = {
  rice: {
    seedling: {
      en: "Keep the soil consistently moist (not flooded) and watch for pests like stem borers on young shoots.",
      es: "Mantenga el suelo constantemente húmedo (sin inundar) y vigile plagas como el barrenador del tallo en los brotes jóvenes.",
      fr: "Gardez le sol constamment humide (sans inonder) et surveillez les ravageurs comme les foreurs de tige sur les jeunes pousses.",
      sw: "Weka udongo na unyevu wa kudumu (bila kujaa maji) na angalia wadudu kama vibonzi vya shina kwenye machipukizi machanga.",
      hi: "मिट्टी को लगातार नम रखें (जलमग्न नहीं) और युवा अंकुरों पर तना छेदक जैसे कीटों पर नज़र रखें।",
      ml: "മണ്ണ് സ്ഥിരമായി ഈർപ്പമുള്ളതായി സൂക്ഷിക്കുക (വെള്ളം കെട്ടിനിൽക്കാതെ), ഇളം മുളകളിൽ തണ്ട് തുരപ്പൻ പോലുള്ള കീടങ്ങളെ ശ്രദ്ധിക്കുക.",
      bn: "মাটি সবসময় আর্দ্র রাখুন (জলাবদ্ধ নয়) এবং কচি চারায় কাণ্ড ছিদ্রকারী পোকার মতো কীটপতঙ্গের দিকে নজর রাখুন।",
    },
    vegetative: {
      en: "Maintain 2-3 cm of standing water and apply nitrogen in split doses to support tillering.",
      es: "Mantenga entre 2 y 3 cm de agua estancada y aplique nitrógeno en dosis divididas para favorecer el ahijamiento.",
      fr: "Maintenez 2 à 3 cm d'eau stagnante et appliquez l'azote en doses fractionnées pour favoriser le tallage.",
      sw: "Dumisha maji ya sentimita 2-3 shambani na tumia mbolea ya nitrojeni kwa awamu ili kusaidia kuchipua kwa matawi.",
      hi: "2-3 सेमी खड़ा पानी बनाए रखें और कल्ले फूटने में मदद के लिए नाइट्रोजन को विभाजित मात्रा में डालें।",
      ml: "2-3 സെന്റീമീറ്റർ വെള്ളം നിലനിർത്തുകയും ചിനപ്പ് പൊട്ടൽ പിന്തുണയ്ക്കാൻ നൈട്രജൻ പലതവണയായി നൽകുകയും ചെയ്യുക.",
      bn: "২-৩ সেমি দাঁড়ানো পানি বজায় রাখুন এবং কুশি ছাড়াতে সাহায্য করতে নাইট্রোজেন ভাগে ভাগে প্রয়োগ করুন।",
    },
    flowering: {
      en: "Avoid water stress during flowering - even short dry spells can reduce grain set.",
      es: "Evite el estrés hídrico durante la floración: incluso periodos cortos de sequía pueden reducir la formación de granos.",
      fr: "Évitez le stress hydrique pendant la floraison - même de courtes périodes sèches peuvent réduire la formation des grains.",
      sw: "Epuka mkazo wa maji wakati wa kuchanua - hata ukame mfupi unaweza kupunguza uundaji wa nafaka.",
      hi: "फूल आने के दौरान जल तनाव से बचें - थोड़े समय का सूखा भी दाना बनने को कम कर सकता है।",
      ml: "പൂവിടുന്ന സമയത്ത് ജലസമ്മർദ്ദം ഒഴിവാക്കുക - ചെറിയ വരൾച്ച പോലും ധാന്യരൂപീകരണം കുറയ്ക്കാം.",
      bn: "ফুল ফোটার সময় জলের চাপ এড়িয়ে চলুন - সামান্য শুষ্ক সময়ও শস্য গঠন কমাতে পারে।",
    },
    fruiting: {
      en: "Drain the field a week or two before harvest and watch for lodging in heavy rain/wind.",
      es: "Drene el campo una o dos semanas antes de la cosecha y esté atento al vuelco de las plantas por lluvia o viento fuerte.",
      fr: "Drainez le champ une à deux semaines avant la récolte et surveillez la verse en cas de pluie ou de vent forts.",
      sw: "Toa maji shambani wiki moja au mbili kabla ya mavuno na angalia mimea kuanguka wakati wa mvua kubwa au upepo.",
      hi: "कटाई से एक या दो सप्ताह पहले खेत से पानी निकालें और तेज़ बारिश/हवा में पौधों के गिरने पर नज़र रखें।",
      ml: "വിളവെടുപ്പിന് ഒന്നോ രണ്ടോ ആഴ്ച മുമ്പ് വയലിലെ വെള്ളം വറ്റിക്കുകയും കനത്ത മഴ/കാറ്റിൽ ചെടികൾ വീഴുന്നത് ശ്രദ്ധിക്കുകയും ചെയ്യുക.",
      bn: "ফসল কাটার এক-দুই সপ্তাহ আগে জমি থেকে পানি সরান এবং ভারী বৃষ্টি/বাতাসে গাছ হেলে পড়া লক্ষ্য রাখুন।",
    },
  },
  maize: {
    seedling: {
      en: "Thin seedlings to the recommended spacing early and watch for cutworms near the base of young plants.",
      es: "Aclare las plántulas al espaciamiento recomendado desde el principio y vigile los gusanos cortadores cerca de la base de las plantas jóvenes.",
      fr: "Éclaircissez les semis à l'espacement recommandé dès le début et surveillez les vers gris près de la base des jeunes plants.",
      sw: "Punguza miche mapema kufikia nafasi inayopendekezwa na angalia wadudu wakata (cutworms) karibu na msingi wa mimea michanga.",
      hi: "पौधों को जल्दी अनुशंसित दूरी पर पतला करें और युवा पौधों के आधार के पास कटवर्म कीट पर नज़र रखें।",
      ml: "ചെടികളെ നേരത്തെ ശുപാർശ ചെയ്ത അകലത്തിലേക്ക് നേർപ്പിക്കുകയും ഇളം ചെടികളുടെ ചുവട്ടിൽ കട്ട്‌വേം കീടങ്ങളെ ശ്രദ്ധിക്കുകയും ചെയ്യുക.",
      bn: "চারাগুলো শীঘ্রই প্রস্তাবিত দূরত্বে পাতলা করুন এবং কচি গাছের গোড়ার কাছে কাটওয়ার্ম পোকার দিকে নজর রাখুন।",
    },
    vegetative: {
      en: "Side-dress with nitrogen once plants are knee-high and keep weeds down so they don't compete for nutrients.",
      es: "Aplique nitrógeno en banda cuando las plantas alcancen la altura de la rodilla y controle las malezas para que no compitan por nutrientes.",
      fr: "Apportez de l'azote en bande lorsque les plants atteignent la hauteur du genou et maîtrisez les mauvaises herbes pour qu'elles ne rivalisent pas pour les nutriments.",
      sw: "Weka mbolea ya nitrojeni pembeni mara mimea inapofikia urefu wa goti na dhibiti magugu ili yasishindane kwa virutubisho.",
      hi: "जब पौधे घुटने जितने ऊंचे हो जाएं तो नाइट्रोजन साइड-ड्रेसिंग करें और खरपतवार को नियंत्रित रखें ताकि वे पोषक तत्वों के लिए प्रतिस्पर्धा न करें।",
      ml: "ചെടികൾ മുട്ട് വരെ ഉയരമെത്തുമ്പോൾ വശങ്ങളിൽ നൈട്രജൻ വളപ്രയോഗം നടത്തുകയും കളകൾ പോഷകങ്ങൾക്കായി മത്സരിക്കാതിരിക്കാൻ നിയന്ത്രിക്കുകയും ചെയ്യുക.",
      bn: "গাছ হাঁটু-সমান উচ্চতায় পৌঁছালে পাশ দিয়ে নাইট্রোজেন সার দিন এবং আগাছা দমন করুন যাতে তারা পুষ্টির জন্য প্রতিযোগিতা না করে।",
    },
    flowering: {
      en: "Ensure the crop isn't short on water during tasseling and silking - this stage is the most drought-sensitive.",
      es: "Asegúrese de que el cultivo no carezca de agua durante la floración masculina y femenina (panojas y estigmas): esta etapa es la más sensible a la sequía.",
      fr: "Assurez-vous que la culture ne manque pas d'eau pendant la floraison mâle et femelle (panicules et soies) - c'est le stade le plus sensible à la sécheresse.",
      sw: "Hakikisha zao halina upungufu wa maji wakati wa kutoa maua (tasseling na silking) - hatua hii ndiyo nyeti zaidi kwa ukame.",
      hi: "सुनिश्चित करें कि टैसलिंग और सिल्किंग के दौरान फसल में पानी की कमी न हो - यह चरण सूखे के प्रति सबसे संवेदनशील होता है।",
      ml: "ടാസലിംഗിലും സിൽക്കിംഗിലും വിളയ്ക്ക് വെള്ളത്തിന്റെ കുറവ് ഇല്ലെന്ന് ഉറപ്പാക്കുക - ഈ ഘട്ടം വരൾച്ചയോട് ഏറ്റവും സെൻസിറ്റീവ് ആണ്.",
      bn: "ট্যাসেলিং ও সিল্কিং-এর সময় ফসলে যেন পানির অভাব না হয় তা নিশ্চিত করুন - এই পর্যায়টি খরার প্রতি সবচেয়ে সংবেদনশীল।",
    },
    fruiting: {
      en: "Watch developing cobs for signs of earworm damage and reduce irrigation slightly as cobs mature.",
      es: "Vigile las mazorcas en desarrollo por signos de daño del gusano de la mazorca y reduzca ligeramente el riego a medida que maduran.",
      fr: "Surveillez les épis en développement pour détecter les dégâts de la chenille de l'épi et réduisez légèrement l'irrigation à mesure qu'ils mûrissent.",
      sw: "Angalia magunzi yanayokua kwa dalili za uharibifu wa funza na punguza kidogo umwagiliaji magunzi yanapokomaa.",
      hi: "विकसित हो रहे भुट्टों में इयरवर्म क्षति के संकेतों पर नज़र रखें और भुट्टे पकने पर सिंचाई थोड़ी कम करें।",
      ml: "വളരുന്ന ചോളക്കതിരുകളിൽ ഇയർവേം നാശത്തിന്റെ ലക്ഷണങ്ങൾ ശ്രദ്ധിക്കുകയും കതിരുകൾ പാകമാകുമ്പോൾ ജലസേചനം അല്പം കുറയ്ക്കുകയും ചെയ്യുക.",
      bn: "বেড়ে ওঠা ভুট্টার মোচায় ইয়ারওয়ার্ম ক্ষতির লক্ষণ লক্ষ্য রাখুন এবং মোচা পাকতে থাকলে সেচ কিছুটা কমান।",
    },
  },
  tomato: {
    seedling: {
      en: "Harden off seedlings gradually before transplanting and space them well to reduce early fungal risk.",
      es: "Endurezca las plántulas gradualmente antes de trasplantarlas y déjeles buen espacio para reducir el riesgo temprano de hongos.",
      fr: "Endurcissez progressivement les plants avant la transplantation et espacez-les bien pour réduire le risque fongique précoce.",
      sw: "Zoesha miche taratibu kabla ya kuipandikiza na ipe nafasi nzuri ili kupunguza hatari ya mapema ya fangasi.",
      hi: "रोपाई से पहले पौधों को धीरे-धीरे कठोर बनाएं और फफूंद के शुरुआती जोखिम को कम करने के लिए उन्हें अच्छी दूरी पर रखें।",
      ml: "പറിച്ചുനടുന്നതിന് മുമ്പ് തൈകളെ ക്രമേണ കാഠിന്യപ്പെടുത്തുകയും നേരത്തെയുള്ള കുമിൾ അപകടസാധ്യത കുറയ്ക്കാൻ നല്ല അകലം നൽകുകയും ചെയ്യുക.",
      bn: "রোপণের আগে চারাগুলোকে ধীরে ধীরে শক্ত করুন এবং প্রাথমিক ছত্রাক ঝুঁকি কমাতে ভালো ফাঁকা রেখে বসান।",
    },
    vegetative: {
      en: "Stake or cage plants early and water at the base to keep leaves dry and reduce disease risk.",
      es: "Entutore o enjaule las plantas temprano y riegue en la base para mantener las hojas secas y reducir el riesgo de enfermedades.",
      fr: "Tuteurez ou encagez les plants tôt et arrosez à la base pour garder les feuilles sèches et réduire le risque de maladie.",
      sw: "Weka miti ya kuegemeza au vizimba mapema na mwagilia chini ya mmea ili kuweka majani makavu na kupunguza hatari ya magonjwa.",
      hi: "पौधों को जल्दी सहारा दें या पिंजरे में रखें और पत्तियों को सूखा रखने और रोग जोखिम कम करने के लिए आधार पर पानी दें।",
      ml: "ചെടികൾക്ക് നേരത്തെ താങ്ങ് നൽകുകയോ കൂട് വയ്ക്കുകയോ ചെയ്യുകയും ഇലകൾ ഉണങ്ങിയിരിക്കാനും രോഗസാധ്യത കുറയ്ക്കാനും ചുവട്ടിൽ നനയ്ക്കുകയും ചെയ്യുക.",
      bn: "গাছে তাড়াতাড়ি খুঁটি বা খাঁচা দিন এবং পাতা শুকনো রাখতে ও রোগ ঝুঁকি কমাতে গোড়ায় জল দিন।",
    },
    flowering: {
      en: "Keep watering consistent - irregular watering during flowering can cause blossom drop.",
      es: "Mantenga un riego constante: un riego irregular durante la floración puede provocar la caída de las flores.",
      fr: "Maintenez un arrosage constant - un arrosage irrégulier pendant la floraison peut provoquer la chute des fleurs.",
      sw: "Dumisha umwagiliaji wa kawaida - umwagiliaji usio na mpangilio wakati wa kuchanua unaweza kusababisha maua kudondoka.",
      hi: "पानी देना नियमित रखें - फूल आने के दौरान अनियमित सिंचाई से फूल झड़ सकते हैं।",
      ml: "നനയ്ക്കൽ സ്ഥിരമായി തുടരുക - പൂവിടുന്ന സമയത്ത് ക്രമരഹിതമായ നന പൂക്കൾ കൊഴിയാൻ കാരണമാകും.",
      bn: "সেচ নিয়মিত রাখুন - ফুল ফোটার সময় অনিয়মিত সেচ ফুল ঝরে যাওয়ার কারণ হতে পারে।",
    },
    fruiting: {
      en: "Watch for blossom end rot (linked to uneven watering/calcium) and pick ripe fruit regularly to encourage more fruiting.",
      es: "Vigile la pudrición apical (relacionada con riego irregular/calcio) y recoja los frutos maduros con regularidad para fomentar más fructificación.",
      fr: "Surveillez la pourriture apicale (liée à un arrosage irrégulier/au calcium) et récoltez régulièrement les fruits mûrs pour encourager une production continue.",
      sw: "Angalia kuoza kwa ncha ya tunda (blossom end rot, kinachohusiana na umwagiliaji usio sawa/kalisi) na chuma matunda yaliyoiva mara kwa mara ili kuhamasisha uzalishaji zaidi.",
      hi: "ब्लॉसम एंड रॉट (असमान सिंचाई/कैल्शियम से जुड़ा) पर नज़र रखें और अधिक फल लगने को बढ़ावा देने के लिए पके फलों को नियमित रूप से तोड़ें।",
      ml: "ബ്ലോസം എൻഡ് റോട്ട് (ക്രമരഹിതമായ നന/കാൽസ്യവുമായി ബന്ധപ്പെട്ടത്) ശ്രദ്ധിക്കുകയും കൂടുതൽ കായ്ക്ക് പ്രോത്സാഹിപ്പിക്കാൻ പഴുത്ത പഴങ്ങൾ പതിവായി പറിക്കുകയും ചെയ്യുക.",
      bn: "ব্লসম এন্ড রট (অসম সেচ/ক্যালসিয়ামের সাথে সম্পর্কিত) লক্ষ্য রাখুন এবং আরও ফলনের জন্য পাকা ফল নিয়মিত তুলুন।",
    },
  },
  potato: {
    seedling: {
      en: "Hill soil around young shoots as they emerge to protect them and support tuber formation later.",
      es: "Aporque tierra alrededor de los brotes jóvenes a medida que emergen para protegerlos y favorecer la formación de tubérculos más adelante.",
      fr: "Buttez la terre autour des jeunes pousses à mesure qu'elles émergent pour les protéger et favoriser la formation des tubercules plus tard.",
      sw: "Panda kilima cha udongo karibu na machipukizi machanga yanapoota ili kuyalinda na kusaidia uundaji wa viazi baadaye.",
      hi: "युवा अंकुरों के निकलते ही उनके चारों ओर मिट्टी चढ़ाएं ताकि उनकी सुरक्षा हो और बाद में कंद बनने में मदद मिले।",
      ml: "ഇളം മുളകൾ പുറത്തുവരുമ്പോൾ അവയെ സംരക്ഷിക്കാനും പിന്നീട് കിഴങ്ങ് രൂപീകരണത്തെ പിന്തുണയ്ക്കാനും അവയ്ക്ക് ചുറ്റും മണ്ണ് കൂട്ടുക.",
      bn: "কচি চারা বের হওয়ার সাথে সাথে সেগুলোর চারপাশে মাটি তুলে দিন যাতে সুরক্ষা পায় এবং পরে কন্দ গঠনে সাহায্য হয়।",
    },
    vegetative: {
      en: "Keep hilling soil over the row as plants grow to prevent tubers from turning green in the light.",
      es: "Siga aporcando tierra sobre la hilera a medida que las plantas crecen para evitar que los tubérculos se pongan verdes con la luz.",
      fr: "Continuez à butter la terre sur le rang à mesure que les plants poussent pour éviter que les tubercules ne verdissent à la lumière.",
      sw: "Endelea kupanda kilima cha udongo juu ya mstari mimea inavyokua ili kuzuia viazi kubadilika kijani kwenye mwanga.",
      hi: "पौधों के बढ़ने के साथ पंक्ति पर मिट्टी चढ़ाना जारी रखें ताकि कंद प्रकाश में हरे न हो जाएं।",
      ml: "ചെടികൾ വളരുന്നതിനനുസരിച്ച് വരിക്കുമുകളിൽ മണ്ണ് കൂട്ടിക്കൊണ്ടിരിക്കുക, കിഴങ്ങുകൾ വെളിച്ചത്തിൽ പച്ചയാകുന്നത് തടയാൻ.",
      bn: "গাছ বাড়ার সাথে সাথে সারির উপর মাটি তুলতে থাকুন যাতে আলোতে কন্দ সবুজ না হয়ে যায়।",
    },
    flowering: {
      en: "Flowering usually signals tuber formation has started - keep watering steady and avoid water stress.",
      es: "La floración suele indicar que ha comenzado la formación de tubérculos: mantenga un riego constante y evite el estrés hídrico.",
      fr: "La floraison indique généralement que la formation des tubercules a commencé - maintenez un arrosage régulier et évitez le stress hydrique.",
      sw: "Kuchanua kwa kawaida huashiria kuwa uundaji wa viazi umeanza - dumisha umwagiliaji thabiti na epuka mkazo wa maji.",
      hi: "फूल आना आमतौर पर संकेत देता है कि कंद बनना शुरू हो गया है - सिंचाई स्थिर रखें और जल तनाव से बचें।",
      ml: "പൂവിടൽ സാധാരണയായി കിഴങ്ങ് രൂപീകരണം ആരംഭിച്ചു എന്നതിന്റെ സൂചനയാണ് - സ്ഥിരമായി നനയ്ക്കുകയും ജലസമ്മർദ്ദം ഒഴിവാക്കുകയും ചെയ്യുക.",
      bn: "ফুল ফোটা সাধারণত নির্দেশ করে যে কন্দ গঠন শুরু হয়েছে - সেচ স্থির রাখুন এবং পানির চাপ এড়িয়ে চলুন।",
    },
    fruiting: {
      en: "Reduce watering as vines start to yellow and die back, and let skins set before harvesting.",
      es: "Reduzca el riego cuando las guías empiecen a amarillear y secarse, y deje que la piel se asiente antes de cosechar.",
      fr: "Réduisez l'arrosage lorsque les fanes commencent à jaunir et à sécher, et laissez la peau se raffermir avant la récolte.",
      sw: "Punguza umwagiliaji mizabibu inapoanza kubadilika manjano na kunyauka, na ruhusu ganda kuwa gumu kabla ya kuvuna.",
      hi: "जब बेलें पीली पड़कर सूखने लगें तो सिंचाई कम करें, और कटाई से पहले छिलके को सख्त होने दें।",
      ml: "വള്ളികൾ മഞ്ഞളിച്ച് ഉണങ്ങാൻ തുടങ്ങുമ്പോൾ നന കുറയ്ക്കുകയും വിളവെടുപ്പിന് മുമ്പ് തൊലി ഉറയ്ക്കാൻ അനുവദിക്കുകയും ചെയ്യുക.",
      bn: "লতা হলুদ হয়ে শুকাতে শুরু করলে সেচ কমান এবং ফসল তোলার আগে খোসা শক্ত হতে দিন।",
    },
  },
  pepper: {
    seedling: {
      en: "Transplant seedlings after the risk of cold has passed and space them to allow good airflow.",
      es: "Trasplante las plántulas después de que haya pasado el riesgo de frío y déjeles espacio para permitir una buena circulación de aire.",
      fr: "Transplantez les plants après que le risque de froid soit passé et espacez-les pour permettre une bonne circulation de l'air.",
      sw: "Panda miche baada ya hatari ya baridi kupita na ipe nafasi kuruhusu mzunguko mzuri wa hewa.",
      hi: "ठंड का खतरा टलने के बाद पौधों की रोपाई करें और अच्छे वायु संचार के लिए उन्हें दूरी पर रखें।",
      ml: "തണുപ്പിന്റെ അപകടസാധ്യത കഴിഞ്ഞ ശേഷം തൈകൾ പറിച്ചുനടുകയും നല്ല വായുസഞ്ചാരത്തിന് അകലം നൽകുകയും ചെയ്യുക.",
      bn: "ঠান্ডার ঝুঁকি কেটে যাওয়ার পর চারা রোপণ করুন এবং ভালো বায়ু চলাচলের জন্য ফাঁকা রেখে বসান।",
    },
    vegetative: {
      en: "Stake taller varieties early and water consistently to support steady vegetative growth.",
      es: "Entutore temprano las variedades más altas y riegue de manera constante para favorecer un crecimiento vegetativo estable.",
      fr: "Tuteurez tôt les variétés hautes et arrosez régulièrement pour favoriser une croissance végétative stable.",
      sw: "Weka miti ya kuegemeza kwa aina ndefu mapema na mwagilia maji kwa kawaida ili kusaidia ukuaji thabiti wa mmea.",
      hi: "लंबी किस्मों को जल्दी सहारा दें और स्थिर वानस्पतिक वृद्धि के लिए लगातार पानी दें।",
      ml: "ഉയരമുള്ള ഇനങ്ങൾക്ക് നേരത്തെ താങ്ങ് നൽകുകയും സ്ഥിരമായ ഇലവളർച്ചയ്ക്ക് സ്ഥിരമായി നനയ്ക്കുകയും ചെയ്യുക.",
      bn: "লম্বা জাতগুলোতে তাড়াতাড়ি খুঁটি দিন এবং স্থিতিশীল কাঠামোগত বৃদ্ধির জন্য নিয়মিত সেচ দিন।",
    },
    flowering: {
      en: "Avoid heat and water stress during flowering, which can cause flowers to drop before fruiting.",
      es: "Evite el estrés por calor y agua durante la floración, ya que puede provocar la caída de las flores antes de la fructificación.",
      fr: "Évitez le stress thermique et hydrique pendant la floraison, qui peut provoquer la chute des fleurs avant la fructification.",
      sw: "Epuka mkazo wa joto na maji wakati wa kuchanua, ambao unaweza kusababisha maua kudondoka kabla ya kutoa matunda.",
      hi: "फूल आने के दौरान गर्मी और जल तनाव से बचें, जिससे फल लगने से पहले फूल झड़ सकते हैं।",
      ml: "പൂവിടുന്ന സമയത്ത് ചൂടും ജലസമ്മർദ്ദവും ഒഴിവാക്കുക, ഇത് കായ്ക്കുന്നതിന് മുമ്പ് പൂക്കൾ കൊഴിയാൻ ഇടയാക്കും.",
      bn: "ফুল ফোটার সময় তাপ ও পানির চাপ এড়িয়ে চলুন, যা ফলন শুরুর আগেই ফুল ঝরিয়ে দিতে পারে।",
    },
    fruiting: {
      en: "Harvest fruit regularly once they reach the desired size/color to encourage the plant to keep producing.",
      es: "Coseche los frutos con regularidad una vez que alcancen el tamaño/color deseado para animar a la planta a seguir produciendo.",
      fr: "Récoltez les fruits régulièrement une fois qu'ils atteignent la taille/couleur souhaitée pour encourager la plante à continuer de produire.",
      sw: "Vuna matunda mara kwa mara yanapofikia ukubwa/rangi inayotakiwa ili kuhamasisha mmea kuendelea kuzalisha.",
      hi: "वांछित आकार/रंग तक पहुंचने पर फलों को नियमित रूप से तोड़ें ताकि पौधा उत्पादन जारी रखे।",
      ml: "ആവശ്യമുള്ള വലിപ്പം/നിറം എത്തുമ്പോൾ പഴങ്ങൾ പതിവായി വിളവെടുക്കുക, ചെടി തുടർന്നും ഉൽപ്പാദിപ്പിക്കാൻ പ്രോത്സാഹിപ്പിക്കാൻ.",
      bn: "কাঙ্ক্ষিত আকার/রং পেলে নিয়মিত ফল তুলুন যাতে গাছ উৎপাদন চালিয়ে যেতে উৎসাহিত হয়।",
    },
  },
};

export function getPreventiveTip(
  crop: SupportedCropSlug,
  stage: GrowthStage,
  languageCode: SupportedLanguageCode
): string {
  const tipsByLanguage = PREVENTIVE_TIPS[crop][stage];
  return tipsByLanguage[languageCode] ?? tipsByLanguage.en;
}
