// =============================================================================
// Agent 2 - Diagnosis Agent
//
// Responsibility: identify a crop disease from the farmer's photo, restricted
// to {rice, maize, tomato, potato, pepper}. Calls the Plant.id v3 API
// (combined identification + health assessment). High-confidence results are
// returned immediately; ambiguous ones trigger 2-3 follow-up questions whose
// answers are matched against the candidate diseases on the farmer's next
// turn. Never calls Plant.id without an image - that capability isn't built
// yet, so a text-only turn just asks for a photo/description instead.
//
// The Plant.id API key is read from process.env.PLANT_ID_API_KEY inside
// plantIdClient.ts - never hardcoded here or there.
// =============================================================================

import { AgentTrace } from "../utils/logger";
import { mapToSupportedCrop } from "../utils/cropScope";
import { identifyPlantDisease, PlantIdSuggestion } from "../services/plantIdClient";
import { getNoImagePrompt } from "./diagnosisQuestions";
import { detectYesNoAnswer, translatePlantIdQuestion } from "./plantIdQuestionTranslation";
import { detectPlantPart, getPlantPartConfirmation, getPlantPartPrompt, getPlantPartQuestions } from "./plantPartQuestions";
import {
  DiagnosisCandidate,
  PendingPlantIdQuestion,
  clearPendingDiagnosis,
  getPendingDiagnosis,
  setPendingDiagnosis,
} from "../sessionStore";
import { DiagnosisResult, IntakeResult, SupportedCropSlug } from "../types";

// Below this, Plant.id's top disease guess is treated as ambiguous rather
// than a confident diagnosis.
const CONFIDENCE_THRESHOLD = 0.7;

function emptyResult(overrides: Partial<DiagnosisResult>): DiagnosisResult {
  return {
    status: "unavailable",
    crop: null,
    cropRawName: null,
    disease: null,
    diseaseDescription: null,
    treatment: null,
    isHealthy: null,
    confidence: 0,
    source: "none",
    needsFollowUp: false,
    followUpQuestions: [],
    ...overrides,
  };
}

function toCandidate(s: PlantIdSuggestion): DiagnosisCandidate {
  return {
    entityId: s.id,
    name: s.name,
    probability: s.probability,
    description: s.description,
    commonNames: s.commonNames,
    treatment: s.treatment,
  };
}

// Finds the candidate a Plant.id question's yes/no option refers to -
// prefer matching by entity_id (exact, unambiguous), fall back to matching
// by name if entity_id is missing on either side.
function findCandidateForOption(
  candidates: DiagnosisCandidate[],
  option: { entityId: string | null; name: string }
): DiagnosisCandidate | null {
  if (option.entityId) {
    const byId = candidates.find((c) => c.entityId === option.entityId);
    if (byId) return byId;
  }
  return candidates.find((c) => c.name.toLowerCase() === option.name.toLowerCase()) ?? null;
}

// Scores overlap between the farmer's free-text follow-up answer and a
// candidate disease's name/common names/description. Deliberately simple
// (word-overlap, not an ML re-ranker) so it stays explainable in the trace;
// good enough to break ties between 2-3 Plant.id candidates using symptom
// details (color, pattern, timing) the farmer typed in.
function keywordOverlapScore(answerLower: string, candidate: DiagnosisCandidate): number {
  const candidateText = [candidate.name, ...candidate.commonNames, candidate.description ?? ""]
    .join(" ")
    .toLowerCase();
  const candidateWords = new Set(candidateText.match(/[a-z]{4,}/g) ?? []);
  const answerWords = answerLower.match(/[a-z]{4,}/g) ?? [];

  let score = 0;
  for (const word of answerWords) {
    if (candidateWords.has(word)) score += 1;
  }
  return score;
}

// When Plant.id supplied its own yes/no disambiguation question, use IT to
// resolve the farmer's answer instead of keyword-overlap scoring - Plant.id
// already told us exactly which answer maps to which disease entity.
function finalizeFromPlantIdQuestion(
  intake: IntakeResult,
  pending: NonNullable<ReturnType<typeof getPendingDiagnosis>>,
  question: PendingPlantIdQuestion,
  trace: AgentTrace
): DiagnosisResult {
  const answer = intake.cleanText ?? "";
  const yesNo = detectYesNoAnswer(answer, intake.language.code);

  let chosenOption: { entityId: string | null; name: string };
  let matchMethod: string;

  if (yesNo === "yes") {
    chosenOption = question.yes;
    matchMethod = `the farmer's reply was detected as "yes"`;
  } else if (yesNo === "no") {
    chosenOption = question.no;
    matchMethod = `the farmer's reply was detected as "no"`;
  } else {
    // No clear yes/no word - check if the reply names one of the two
    // diseases directly (per the spec's "or matching against the two
    // disease names" option).
    const answerLower = answer.toLowerCase();
    const mentionsYes = answerLower.includes(question.yes.name.toLowerCase());
    const mentionsNo = answerLower.includes(question.no.name.toLowerCase());

    if (mentionsYes && !mentionsNo) {
      chosenOption = question.yes;
      matchMethod = `the farmer's reply mentioned "${question.yes.name}" by name`;
    } else if (mentionsNo && !mentionsYes) {
      chosenOption = question.no;
      matchMethod = `the farmer's reply mentioned "${question.no.name}" by name`;
    } else {
      // Still ambiguous - default to whichever option's candidate has the
      // higher original Plant.id probability, same fallback spirit as the
      // keyword-overlap path below.
      const yesProbability = findCandidateForOption(pending.candidates, question.yes)?.probability ?? 0;
      const noProbability = findCandidateForOption(pending.candidates, question.no)?.probability ?? 0;
      chosenOption = yesProbability >= noProbability ? question.yes : question.no;
      matchMethod = `the reply didn't clearly answer yes/no or name either disease; defaulting to the higher-probability option`;
    }
  }

  const winner = findCandidateForOption(pending.candidates, chosenOption);

  trace.log(
    "DiagnosisAgent",
    "Finalized diagnosis from Plant.id's own question",
    `Question was "${question.text}"; ${matchMethod}, resolving to "${chosenOption.name}".` +
      (winner ? "" : " No matching candidate details were found on record; using the option's name only.")
  );

  clearPendingDiagnosis(intake.sessionId);

  return {
    status: "diagnosed",
    crop: pending.crop,
    cropRawName: pending.cropRawName,
    disease: winner?.name ?? chosenOption.name,
    diseaseDescription: winner?.description ?? null,
    treatment: winner?.treatment ?? null,
    isHealthy: null,
    confidence: winner?.probability ?? 0.5,
    source: "image",
    needsFollowUp: false,
    followUpQuestions: [],
  };
}

// Fallback path: no Plant.id question was available, so score the farmer's
// free-text answer against our own fixed 3-question template's candidates.
function finalizeFromKeywordOverlap(
  intake: IntakeResult,
  pending: NonNullable<ReturnType<typeof getPendingDiagnosis>>,
  trace: AgentTrace
): DiagnosisResult {
  const answerLower = (intake.cleanText ?? "").toLowerCase();
  const scored = pending.candidates
    .map((candidate) => ({ candidate, score: keywordOverlapScore(answerLower, candidate) }))
    .sort((a, b) => b.score - a.score);

  const winner = scored[0].candidate;
  const topScore = scored[0].score;

  trace.log(
    "DiagnosisAgent",
    "Finalized diagnosis from follow-up answer",
    topScore > 0
      ? `Farmer's answer matched ${topScore} keyword(s) associated with "${winner.name}", selecting it over ${pending.candidates.length - 1} other candidate(s).`
      : `Farmer's answer didn't clearly match any candidate's description; defaulting to the highest-probability candidate "${winner.name}" from the original Plant.id result.`
  );

  clearPendingDiagnosis(intake.sessionId);

  return {
    status: "diagnosed",
    crop: pending.crop,
    cropRawName: pending.cropRawName,
    disease: winner.name,
    diseaseDescription: winner.description,
    treatment: winner.treatment,
    isHealthy: null,
    confidence: winner.probability,
    source: "image",
    needsFollowUp: false,
    followUpQuestions: [],
  };
}

// Fallback-path-only: the farmer just answered "what part of the plant does
// this show?" - detect which part, then ask its matching question set
// (instead of always defaulting to leaf questions) before finalizing on the
// turn after that. This never runs when Plant.id supplied its own question.
function handlePlantPartSelection(
  intake: IntakeResult,
  pending: NonNullable<ReturnType<typeof getPendingDiagnosis>>,
  trace: AgentTrace
): DiagnosisResult {
  const answer = intake.cleanText ?? "";
  const detected = detectPlantPart(answer, intake.language.code);
  const part = detected ?? "leaf";

  const symptomQuestions = getPlantPartQuestions(part, intake.language.code);
  const confirmation = getPlantPartConfirmation(part, intake.language.code);
  const questions = [confirmation, ...symptomQuestions];

  trace.log(
    "DiagnosisAgent",
    `Plant part selected: ${part}`,
    detected
      ? `Detected plant part "${part}" from the farmer's reply ("${answer}"); showing a translated confirmation of this before asking its ${symptomQuestions.length} matching follow-up question(s) instead of the default leaf-based set.`
      : `Could not clearly detect a plant part from the farmer's reply ("${answer}"); defaulting to "leaf" and showing its confirmation plus ${symptomQuestions.length} follow-up question(s).`
  );

  setPendingDiagnosis(intake.sessionId, {
    ...pending,
    followUpQuestions: questions,
    awaitingPlantPart: false,
    askedAt: Date.now(),
  });

  const topCandidate = pending.candidates[0] ?? null;

  return {
    status: "needs_followup",
    crop: pending.crop,
    cropRawName: pending.cropRawName,
    disease: topCandidate?.name ?? null,
    diseaseDescription: topCandidate?.description ?? null,
    treatment: null,
    isHealthy: null,
    confidence: topCandidate?.probability ?? 0,
    source: "image",
    needsFollowUp: true,
    followUpQuestions: questions,
  };
}

function finalizeFromFollowUp(
  intake: IntakeResult,
  pending: NonNullable<ReturnType<typeof getPendingDiagnosis>>,
  trace: AgentTrace
): DiagnosisResult {
  if (pending.candidates.length === 0) {
    trace.log(
      "DiagnosisAgent",
      "Cannot finalize: no candidates on record",
      "Pending diagnosis had no disease candidates stored for this session; treating as unavailable rather than guessing."
    );
    clearPendingDiagnosis(intake.sessionId);
    return emptyResult({ status: "unavailable", crop: pending.crop, cropRawName: pending.cropRawName, source: "image" });
  }

  // Fallback-path-only intermediate step: resolve which plant part before
  // any finalization happens. Never true when plantIdQuestion is set (that
  // path finalizes in a single follow-up turn, unchanged).
  if (pending.awaitingPlantPart) {
    return handlePlantPartSelection(intake, pending, trace);
  }

  if (pending.plantIdQuestion) {
    return finalizeFromPlantIdQuestion(intake, pending, pending.plantIdQuestion, trace);
  }

  return finalizeFromKeywordOverlap(intake, pending, trace);
}

export async function runDiagnosisAgent(
  intake: IntakeResult,
  trace: AgentTrace
): Promise<DiagnosisResult> {
  const pending = getPendingDiagnosis(intake.sessionId);

  // Case 1: an image-less turn with text while a diagnosis is pending -
  // treat the text as the farmer's answer to our follow-up questions.
  if (pending && !intake.hasImage && intake.cleanText) {
    trace.log(
      "DiagnosisAgent",
      "Resuming in-progress diagnosis",
      `Session has a pending diagnosis for crop "${pending.crop}" awaiting follow-up answers; treating this turn's text as the farmer's reply instead of starting a new Plant.id call.`
    );
    return finalizeFromFollowUp(intake, pending, trace);
  }

  // Case 2: no usable image this turn (and not a follow-up reply) - Agent 2
  // has no text-only diagnosis capability yet, so it never calls Plant.id
  // here; it just asks for a photo/description instead.
  if (!intake.hasImage || !intake.image) {
    trace.log(
      "DiagnosisAgent",
      "Skipped Plant.id call: no image",
      "Intake did not provide a usable image this turn; Plant.id is image-based, so asking the farmer for a photo (or a fuller text description) instead of guessing."
    );
    return emptyResult({
      status: "no_image_provided",
      followUpQuestions: [getNoImagePrompt(intake.language.code)],
    });
  }

  // Case 3: we have an image - call Plant.id. A new image always takes
  // priority over any stale pending follow-up state, which gets overwritten
  // or cleared below depending on this call's outcome.
  trace.log(
    "DiagnosisAgent",
    "Calling Plant.id API",
    `Submitting uploaded image (${intake.image.sizeBytes} bytes, ${intake.image.mimeType}) for combined crop identification + health assessment.`
  );

  const outcome = await identifyPlantDisease(intake.image.buffer);

  if (!outcome.ok) {
    trace.log("DiagnosisAgent", "Plant.id API call failed", outcome.error);
    return emptyResult({ status: "unavailable", source: "image" });
  }

  const data = outcome.data;
  const topClassification = data.classificationSuggestions[0] ?? null;
  const topDisease = data.diseaseSuggestions[0] ?? null;

  trace.log(
    "DiagnosisAgent",
    "Received Plant.id result",
    `Top classification: ${topClassification ? `${topClassification.name} (${topClassification.probability.toFixed(2)})` : "none"}; ` +
      `top disease: ${topDisease ? `${topDisease.name} (${topDisease.probability.toFixed(2)})` : "none"}; ` +
      `isHealthy=${data.isHealthy ?? "unknown"}.`
  );

  const cropSlug: SupportedCropSlug | null = topClassification
    ? mapToSupportedCrop(topClassification.name, topClassification.commonNames)
    : null;

  if (!cropSlug) {
    trace.log(
      "DiagnosisAgent",
      "Out of scope crop",
      `Identified plant "${topClassification?.name ?? "unknown"}" does not map to a supported crop (rice, maize, tomato, potato, pepper); treating this as out-of-scope rather than presenting a confident diagnosis.`
    );
    clearPendingDiagnosis(intake.sessionId);
    return emptyResult({
      status: "out_of_scope",
      cropRawName: topClassification?.name ?? null,
      confidence: topClassification?.probability ?? 0,
      source: "image",
    });
  }

  if (!topDisease) {
    trace.log(
      "DiagnosisAgent",
      "No disease data returned",
      "Plant.id identified the crop but returned no disease suggestions at all; treating this as an incomplete result rather than guessing at a diagnosis."
    );
    clearPendingDiagnosis(intake.sessionId);
    return emptyResult({
      status: "unavailable",
      crop: cropSlug,
      cropRawName: topClassification!.name,
      source: "image",
    });
  }

  const diseaseConfidence = topDisease.probability;

  if (diseaseConfidence >= CONFIDENCE_THRESHOLD) {
    trace.log(
      "DiagnosisAgent",
      "High-confidence diagnosis reached",
      `Disease "${topDisease.name}" at ${diseaseConfidence.toFixed(2)} confidence meets the ${CONFIDENCE_THRESHOLD} threshold; finalizing without follow-up questions.`
    );
    clearPendingDiagnosis(intake.sessionId);
    return {
      status: "diagnosed",
      crop: cropSlug,
      cropRawName: topClassification!.name,
      disease: topDisease.name,
      diseaseDescription: topDisease.description,
      treatment: topDisease.treatment,
      isHealthy: data.isHealthy,
      confidence: diseaseConfidence,
      source: "image",
      needsFollowUp: false,
      followUpQuestions: [],
    };
  }

  // Ambiguous: ask the farmer for more detail before finalizing. If Plant.id
  // supplied its own targeted yes/no disambiguation question for this image,
  // prefer that over our generic 3-question template - it maps directly to
  // the actual candidate diseases rather than asking generically about
  // color/pattern/timing. When using Plant.id's question, keep the FULL
  // disease suggestion list as candidates (not just the top 3) so both the
  // "yes" and "no" entities are guaranteed findable later, whichever the
  // farmer picks.
  const plantIdQuestion: PendingPlantIdQuestion | null = data.question;
  const candidates = plantIdQuestion
    ? data.diseaseSuggestions.map(toCandidate)
    : data.diseaseSuggestions.slice(0, 3).map(toCandidate);

  let questions: string[];
  let awaitingPlantPart = false;
  if (plantIdQuestion) {
    const translated = translatePlantIdQuestion(plantIdQuestion.text, intake.language.code);
    questions = [`${translated.text} (${translated.yesWord} / ${translated.noWord})`];
    trace.log(
      "DiagnosisAgent",
      "Low-confidence result: using Plant.id's own disambiguation question",
      `Top disease "${topDisease.name}" at ${diseaseConfidence.toFixed(2)} confidence is below the ${CONFIDENCE_THRESHOLD} threshold. Plant.id supplied a targeted yes/no question ("${plantIdQuestion.text}" -> yes="${plantIdQuestion.yes.name}", no="${plantIdQuestion.no.name}"); using it instead of our generic template.` +
        (translated.usedFallback ? " No translated pattern matched this question's wording, so it's shown in English with a translated note." : "")
    );
  } else {
    // Fallback path: ask which plant part is affected FIRST, before any
    // symptom questions - the matching question set (leaf/fruit/stem/root/
    // flower) gets picked once the farmer answers, on the next turn.
    questions = [getPlantPartPrompt(intake.language.code)];
    awaitingPlantPart = true;
    trace.log(
      "DiagnosisAgent",
      "Low-confidence result: asking which plant part is affected",
      `Top disease "${topDisease.name}" at ${diseaseConfidence.toFixed(2)} confidence is below the ${CONFIDENCE_THRESHOLD} threshold, and Plant.id did not supply its own disambiguation question. Asking the farmer which plant part is affected (covering ${candidates.length} candidate(s)) before selecting the matching follow-up question set.`
    );
  }

  setPendingDiagnosis(intake.sessionId, {
    crop: cropSlug,
    cropRawName: topClassification!.name,
    candidates,
    followUpQuestions: questions,
    plantIdQuestion,
    awaitingPlantPart,
    askedAt: Date.now(),
  });

  return {
    status: "needs_followup",
    crop: cropSlug,
    cropRawName: topClassification!.name,
    disease: topDisease.name,
    diseaseDescription: topDisease.description,
    treatment: null,
    isHealthy: data.isHealthy,
    confidence: diseaseConfidence,
    source: "image",
    needsFollowUp: true,
    followUpQuestions: questions,
  };
}
