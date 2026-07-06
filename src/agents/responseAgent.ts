// =============================================================================
// Agent 4 - Response Agent
//
// Responsibility: combine Diagnosis Agent's and Weather Agent's results into
// ONE coherent, farmer-facing message in the farmer's language. No external
// LLM call - the message is assembled from structured, pre-translated
// templates (see responseTemplates.ts), the same pattern already used for
// Diagnosis Agent's follow-up questions.
//
// Deliberately split into two steps, each logged separately, so the
// reasoning stays inspectable:
//   1. buildResponsePlan() - language-agnostic: decides WHAT to say (which
//      sections, which qualitative severity/risk level) from the raw
//      diagnosis/weather data. No translated text is chosen here.
//   2. renderPlan() - language-specific: turns that plan into farmer-facing
//      text by looking up phrases in responseTemplates.ts.
// =============================================================================

import { AgentTrace } from "../utils/logger";
import { getCropLabel, getResponseTemplates, ResponseTemplateSet, SeverityLevel } from "./responseTemplates";
import { findTranslatedDiseaseContent } from "./diseaseContentTranslations";
import { getPreventiveTip } from "./preventiveTips";
import {
  DiagnosisResult,
  DiseaseTreatmentInfo,
  FarmerResponse,
  IntakeResult,
  SupportedCropSlug,
  SupportedLanguageCode,
  WeatherResult,
} from "../types";

type ResponsePlan =
  | {
      kind: "diagnosed";
      cropSlug: SupportedCropSlug;
      disease: string;
      description: string | null;
      treatment: DiseaseTreatmentInfo | null;
      severity: SeverityLevel;
      weatherRisk: SeverityLevel | null;
      rainDelay: boolean;
      // Set by resolveDiseaseContent(): true when no curated translation was
      // found for this disease and languageCode isn't English, meaning the
      // description/treatment above are Plant.id's original English text.
      usedEnglishFallback: boolean;
      // Set by resolveDiseaseContent() when a curated translation was found;
      // null otherwise (we don't guess cost framing for untranslated
      // Plant.id diseases - that's out of scope for the curated table).
      costNote: { biological: string; chemical: string | null } | null;
      // Set by determinePreventiveTip() when a growth stage was provided
      // alongside this diagnosis; null if no growth stage this turn.
      preventiveTip: string | null;
    }
  | { kind: "needs_followup"; followUpQuestions: string[] }
  | { kind: "no_image_provided"; followUpQuestions: string[] }
  | { kind: "out_of_scope" }
  | { kind: "unavailable" }
  // Optional preventive-tips feature (independent of the diagnosis flow):
  // no image/diagnosis this turn, but the farmer selected a crop + growth
  // stage and just wants proactive guidance, not a disease check.
  | { kind: "preventive_tip_only"; tip: string };

// Severity is Response Agent's own inference from diagnosis confidence
// blended with weather-driven spread risk - Plant.id has no "severity"
// field, and Weather Agent's risk is about spread likelihood, not how bad
// this particular case already is. Simple rule-based combination, not ML.
function computeSeverity(diagnosisConfidence: number, weather: WeatherResult): SeverityLevel {
  const rank: Record<SeverityLevel, number> = { low: 0, moderate: 1, high: 2 };
  let level: SeverityLevel = diagnosisConfidence >= 0.85 ? "high" : diagnosisConfidence >= 0.6 ? "moderate" : "low";

  if (weather.status === "available" && weather.diseaseSpreadRisk && rank[weather.diseaseSpreadRisk] > rank[level]) {
    level = weather.diseaseSpreadRisk;
  }

  return level;
}

// Optional preventive-tips feature: entirely independent of the diagnosis
// flow above. Only engages when the farmer actually used the growth-stage
// selector, and only in the two situations the feature is scoped to:
//   - alongside a completed diagnosis (tip appended after treatment/cost)
//   - alone, when no image/diagnosis happened this turn but the farmer also
//     picked a crop (tip is the entire response, no diagnosis attempted)
// Every other diagnosis status (needs_followup/out_of_scope/unavailable, or
// no growth stage at all) leaves this returning null - fully non-breaking.
function determinePreventiveTip(
  diagnosis: DiagnosisResult,
  intake: IntakeResult,
  trace: AgentTrace
): { crop: SupportedCropSlug; tip: string; standalone: boolean } | null {
  if (!intake.growthStage) {
    trace.log("ResponseAgent", "Preventive tip: not triggered", "No growth stage was provided this turn.");
    return null;
  }

  if (diagnosis.status === "diagnosed" && diagnosis.crop) {
    const tip = getPreventiveTip(diagnosis.crop, intake.growthStage, intake.language.code);
    trace.log(
      "ResponseAgent",
      "Preventive tip: appended to diagnosis",
      `Growth stage "${intake.growthStage}" provided alongside a diagnosis for ${diagnosis.crop}; appending a preventive tip after the treatment/cost content.`
    );
    return { crop: diagnosis.crop, tip, standalone: false };
  }

  if (diagnosis.status === "no_image_provided") {
    if (!intake.selectedCrop) {
      trace.log(
        "ResponseAgent",
        "Preventive tip: not triggered",
        `Growth stage "${intake.growthStage}" was provided, but no crop was selected and no image/diagnosis happened this turn, so no tip can be looked up.`
      );
      return null;
    }
    const tip = getPreventiveTip(intake.selectedCrop, intake.growthStage, intake.language.code);
    trace.log(
      "ResponseAgent",
      "Preventive tip: standalone",
      `No image/diagnosis this turn; using farmer-selected crop=${intake.selectedCrop} and growth stage="${intake.growthStage}" to return a standalone preventive tip instead of the usual "send a photo" prompt.`
    );
    return { crop: intake.selectedCrop, tip, standalone: true };
  }

  trace.log(
    "ResponseAgent",
    "Preventive tip: not triggered",
    `Growth stage "${intake.growthStage}" was provided, but diagnosis.status="${diagnosis.status}" isn't one of the two statuses this feature applies to ("diagnosed" or "no_image_provided").`
  );
  return null;
}

// Step 1: decide WHAT to say. Pure data in, structured plan out - no
// translated strings are chosen here, only which of the fixed set of
// sections/levels applies.
function buildResponsePlan(
  diagnosis: DiagnosisResult,
  weather: WeatherResult,
  intake: IntakeResult,
  trace: AgentTrace
): ResponsePlan {
  const preventive = determinePreventiveTip(diagnosis, intake, trace);

  // Standalone tip overrides the usual "no image provided" prompt entirely -
  // the farmer asked for proactive guidance, not a disease check, so there's
  // nothing else to say this turn.
  if (preventive?.standalone) {
    return { kind: "preventive_tip_only", tip: preventive.tip };
  }

  if (diagnosis.status === "diagnosed" && diagnosis.crop && diagnosis.disease) {
    return {
      kind: "diagnosed",
      cropSlug: diagnosis.crop,
      disease: diagnosis.disease,
      description: diagnosis.diseaseDescription,
      treatment: diagnosis.treatment,
      severity: computeSeverity(diagnosis.confidence, weather),
      weatherRisk: weather.status === "available" ? weather.diseaseSpreadRisk : null,
      rainDelay: weather.status === "available" && weather.delayTreatmentAdvice,
      usedEnglishFallback: false, // resolved by resolveDiseaseContent()
      costNote: null, // resolved by resolveDiseaseContent()
      preventiveTip: preventive?.tip ?? null,
    };
  }

  if (diagnosis.status === "needs_followup") {
    return { kind: "needs_followup", followUpQuestions: diagnosis.followUpQuestions };
  }

  if (diagnosis.status === "no_image_provided") {
    return { kind: "no_image_provided", followUpQuestions: diagnosis.followUpQuestions };
  }

  if (diagnosis.status === "out_of_scope") {
    return { kind: "out_of_scope" };
  }

  // "unavailable", or a "diagnosed" status missing crop/disease (shouldn't
  // happen given Diagnosis Agent's contract, but fail safe rather than crash).
  return { kind: "unavailable" };
}

// Step 1.5: for a diagnosed plan, look up curated translated content for
// this disease/language (diseaseContentTranslations.ts). Plant.id's
// description/treatment are always in English; this is where that gap
// gets closed when we have a curated translation, and clearly marked when
// we don't. Separate from both buildResponsePlan (language-agnostic) and
// renderPlan (pure phrasing) since it's a language-aware DATA substitution,
// not a phrasing decision.
function resolveDiseaseContent(
  plan: ResponsePlan,
  languageCode: SupportedLanguageCode,
  trace: AgentTrace
): ResponsePlan {
  if (plan.kind !== "diagnosed") return plan;

  const override = findTranslatedDiseaseContent(plan.cropSlug, plan.disease, languageCode);

  if (override) {
    trace.log(
      "ResponseAgent",
      "Disease content translation: override found",
      `Found curated ${languageCode} content for "${plan.disease}" (${plan.cropSlug}); using translated description/treatment plus cost-context notes instead of Plant.id's English text.`
    );
    return {
      ...plan,
      description: override.description,
      treatment: override.treatment,
      usedEnglishFallback: false,
      costNote: override.costNote,
    };
  }

  const usedEnglishFallback = languageCode !== "en";
  trace.log(
    "ResponseAgent",
    usedEnglishFallback ? "Disease content translation: English fallback" : "Disease content translation: not needed (English)",
    usedEnglishFallback
      ? `No curated ${languageCode} translation found for "${plan.disease}" (${plan.cropSlug}); keeping Plant.id's original English description/treatment and noting this to the farmer.`
      : `Farmer's language is English, so Plant.id's original description/treatment is used directly - no translation gap to flag.`
  );
  return { ...plan, usedEnglishFallback };
}

// Step 2: turn the plan into farmer-facing text using the language's
// template set. All the "how do we phrase this" decisions live in
// responseTemplates.ts, not here.
function renderPlan(plan: ResponsePlan, t: ResponseTemplateSet, languageCode: SupportedLanguageCode): string {
  const sections: string[] = [];

  switch (plan.kind) {
    case "diagnosed": {
      const cropLabel = getCropLabel(plan.cropSlug, languageCode);
      sections.push(t.diagnosisIntro(cropLabel, plan.disease));

      if (plan.usedEnglishFallback) {
        sections.push(t.englishFallbackNote());
      }

      if (plan.description) {
        sections.push(`${t.descriptionLabel()} ${plan.description}`);
      }

      const biological = plan.treatment?.biological ?? [];
      const chemical = plan.treatment?.chemical ?? [];
      if (biological.length > 0 || chemical.length > 0) {
        if (biological.length > 0) {
          // Cost note joins the same paragraph (single \n) as the bullet
          // list rather than becoming its own section, so it reads as part
          // of that treatment option rather than a bolted-on afterthought.
          let block = `${t.organicTreatmentLabel()}\n${biological.map((s) => `- ${s}`).join("\n")}`;
          if (plan.costNote?.biological) {
            block += `\n${plan.costNote.biological}`;
          }
          sections.push(block);
        }
        if (chemical.length > 0) {
          let block = `${t.chemicalTreatmentLabel()}\n${chemical.map((s) => `- ${s}`).join("\n")}`;
          if (plan.costNote?.chemical) {
            block += `\n${plan.costNote.chemical}`;
          }
          sections.push(block);
        }
      } else {
        sections.push(t.noTreatmentInfo());
      }

      sections.push(`${t.severityLabel()} ${t.severityPhrase(plan.severity)}`);

      if (plan.weatherRisk) {
        sections.push(t.weatherRiskPhrase(plan.weatherRisk));
        if (plan.rainDelay) {
          sections.push(t.weatherRainDelay());
        }
      }

      // Appended after all treatment/cost/severity/weather content, per the
      // preventive-tips feature spec - a closing, forward-looking note
      // rather than mixed into the treatment advice itself.
      if (plan.preventiveTip) {
        sections.push(`${t.preventiveTipLabel()} ${plan.preventiveTip}`);
      }
      break;
    }
    case "needs_followup":
      sections.push(t.needsFollowUpIntro());
      sections.push(plan.followUpQuestions.join("\n"));
      break;
    case "no_image_provided":
      // Diagnosis Agent's prompt is already a complete, translated sentence -
      // relay it as-is rather than wrapping it in another intro line.
      sections.push(plan.followUpQuestions.join("\n"));
      break;
    case "out_of_scope":
      sections.push(t.outOfScopeMessage());
      break;
    case "unavailable":
      sections.push(t.unavailableMessage());
      break;
    case "preventive_tip_only":
      sections.push(`${t.preventiveTipLabel()} ${plan.tip}`);
      break;
  }

  // Only appears on messages that actually conclude something farmer-facing
  // (a diagnosis, or a final apology/explanation) - not on "needs_followup"
  // or "no_image_provided", where the conversation is still in progress and
  // there's nothing yet to confirm.
  if (plan.kind === "diagnosed" || plan.kind === "out_of_scope" || plan.kind === "unavailable") {
    sections.push(t.agronomistReminder());
  }
  return sections.filter(Boolean).join("\n\n");
}

export async function runResponseAgent(
  intake: IntakeResult,
  diagnosis: DiagnosisResult,
  weather: WeatherResult,
  trace: AgentTrace
): Promise<FarmerResponse> {
  const plan = buildResponsePlan(diagnosis, weather, intake, trace);

  trace.log(
    "ResponseAgent",
    `Composed response structure: ${plan.kind}`,
    plan.kind === "diagnosed"
      ? `crop=${plan.cropSlug}, disease="${plan.disease}", severity=${plan.severity}, weatherRisk=${plan.weatherRisk ?? "n/a"}, rainDelay=${plan.rainDelay}, hasTreatment=${!!(plan.treatment?.biological.length || plan.treatment?.chemical.length)}, hasPreventiveTip=${!!plan.preventiveTip}.`
      : plan.kind === "preventive_tip_only"
      ? "Standalone preventive tip (no image/diagnosis this turn)."
      : `Derived from diagnosis.status="${diagnosis.status}" (weather.status="${weather.status}" not used for non-diagnosed outcomes).`
  );

  const resolvedPlan = resolveDiseaseContent(plan, intake.language.code, trace);

  const templates = getResponseTemplates(intake.language.code);
  const message = renderPlan(resolvedPlan, templates, intake.language.code);

  trace.log(
    "ResponseAgent",
    `Applied ${intake.language.name} templates`,
    `Rendered final message (${message.length} chars) from the composed plan using ${intake.language.code} phrase templates.`
  );

  return { language: intake.language, message };
}
