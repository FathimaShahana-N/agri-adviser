// =============================================================================
// Agent 1 - Intake Agent
//
// Responsibility: accept a farmer's raw turn (text and/or an image, plus
// optional location), validate/sanitize it, and detect the language the
// farmer is communicating in so every downstream agent can reply in that
// same language for the rest of the conversation.
//
// This agent does NOT diagnose crops, fetch weather, or draft a farmer-
// facing reply - that is Agents 2, 3, and 4's job respectively. Keeping
// this agent narrow is what makes the pipeline auditable step by step.
// =============================================================================

import { AgentTrace } from "../utils/logger";
import { sanitizeEnumValue, sanitizeLocationName, sanitizeText, validateImage } from "../utils/validation";
import { detectLanguageFromText, SUPPORTED_LANGUAGES } from "../utils/languageDetect";
import { getSessionLanguage, setSessionLanguage } from "../sessionStore";
import { GROWTH_STAGES, IntakeResult, RawFarmerInput, SUPPORTED_CROP_SLUGS } from "../types";

export async function runIntakeAgent(
  input: RawFarmerInput,
  trace: AgentTrace
): Promise<IntakeResult> {
  const warnings: string[] = [];

  // Step 1: sanitize whatever text the farmer typed.
  const textResult = sanitizeText(input.text);
  warnings.push(...textResult.warnings);
  trace.log(
    "IntakeAgent",
    textResult.value ? "Accepted text input" : "No usable text provided",
    textResult.value
      ? `Sanitized farmer text to ${textResult.value.length} chars.`
      : "Text was empty, missing, or stripped to nothing during sanitization."
  );

  // Step 2: validate whatever image the farmer uploaded, checking real
  // file bytes rather than trusting the declared mimetype/extension.
  const imageResult = await validateImage(
    input.image
      ? {
          buffer: input.image.buffer,
          originalname: input.image.originalName,
          size: input.image.sizeBytes,
        }
      : undefined
  );
  warnings.push(...imageResult.warnings);
  trace.log(
    "IntakeAgent",
    imageResult.value ? "Accepted image upload" : "No usable image provided",
    imageResult.value
      ? `Verified magic bytes match ${imageResult.value.mimeType}, size ${imageResult.value.sizeBytes} bytes.`
      : input.image
      ? "Image was rejected (failed type/size validation)."
      : "No image was uploaded for this turn."
  );

  if (!textResult.value && !imageResult.value) {
    trace.log(
      "IntakeAgent",
      "Rejected turn: no valid input",
      "Farmer submitted neither usable text nor a usable image after validation."
    );
  }

  // Step 2b: sanitize whatever location (city name) the farmer typed. Empty/
  // missing stays null - Weather Agent must never guess a default location.
  const locationResult = sanitizeLocationName(input.location);
  warnings.push(...locationResult.warnings);
  trace.log(
    "IntakeAgent",
    locationResult.value ? "Accepted location" : "No location provided",
    locationResult.value
      ? `Farmer-provided location: "${locationResult.value}".`
      : "No location was given this turn; Weather Agent will skip weather advice rather than guessing."
  );

  // Step 2c: sanitize the optional growth-stage/crop selector values used by
  // the preventive-tips feature. This is entirely separate from the
  // diagnosis flow above - both stay null (no-op downstream) if the farmer
  // didn't touch these selectors, so existing behavior is unaffected.
  const growthStage = sanitizeEnumValue(input.growthStage, GROWTH_STAGES);
  const selectedCrop = sanitizeEnumValue(input.selectedCrop, SUPPORTED_CROP_SLUGS);
  trace.log(
    "IntakeAgent",
    growthStage ? `Accepted growth stage: ${growthStage}` : "No growth stage provided",
    growthStage
      ? `Farmer selected growth stage "${growthStage}"${selectedCrop ? ` for crop "${selectedCrop}"` : ""}; Response Agent may attach a preventive tip.`
      : "No growth stage was selected this turn; preventive-tips feature stays inactive."
  );

  // Step 3: detect language. Prefer detecting fresh from this turn's text;
  // fall back to whatever language this session was already speaking;
  // fall back to English only as a last resort (e.g. image-only, first turn).
  let language = SUPPORTED_LANGUAGES.en;
  let confidence = 0;
  let source: IntakeResult["languageSource"];

  if (textResult.value) {
    const detection = detectLanguageFromText(textResult.value);
    language = detection.language;
    confidence = detection.confidence;
    source = detection.source === "text-script" ? "text-script" : "text-statistical";
    trace.log(
      "IntakeAgent",
      `Detected language: ${language.name}`,
      `Detection source: ${detection.source}, confidence ${detection.confidence.toFixed(2)}.`
    );
    setSessionLanguage(input.sessionId, language);
  } else {
    const carried = getSessionLanguage(input.sessionId);
    if (carried) {
      language = carried;
      confidence = 1;
      source = "session-carryover";
      trace.log(
        "IntakeAgent",
        `Carried over language: ${language.name}`,
        "No text this turn (likely image-only follow-up); reusing the language already established for this session."
      );
    } else {
      language = SUPPORTED_LANGUAGES.en;
      confidence = 0;
      source = "default-fallback";
      trace.log(
        "IntakeAgent",
        "Defaulted language to English",
        "No text was provided and this session has no established language yet; defaulting until the farmer provides text."
      );
    }
  }

  const result: IntakeResult = {
    sessionId: input.sessionId,
    cleanText: textResult.value,
    hasImage: imageResult.value !== null,
    image: imageResult.value,
    language,
    languageConfidence: confidence,
    languageSource: source,
    location: locationResult.value,
    growthStage,
    selectedCrop,
    warnings,
  };

  trace.log(
    "IntakeAgent",
    "Intake complete, handing off to Diagnosis Agent",
    `Payload: hasText=${!!result.cleanText}, hasImage=${result.hasImage}, language=${result.language.code}, hasLocation=${!!result.location}.`
  );

  return result;
}
