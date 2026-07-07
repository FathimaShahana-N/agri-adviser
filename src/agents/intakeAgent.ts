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
import { getSessionLanguage, getSessionLocation, setSessionLanguage, setSessionLocation } from "../sessionStore";
import { GROWTH_STAGES, IntakeResult, RawFarmerInput, SUPPORTED_CROP_SLUGS } from "../types";

// Replies at or below this length never re-trigger language detection once
// a session language is established - see the Step 3 comment below.
const SHORT_REPLY_MAX_WORDS = 5;
// Even a longer reply must clear this confidence bar to override an
// established session language, not just the detector's own normal bar.
const LANGUAGE_SWITCH_CONFIDENCE = 0.9;

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

  // Step 2b: sanitize whatever location (city name) the farmer typed. If
  // none was given this turn, fall back to whatever location this session
  // already established - mirrors the language-carryover pattern below,
  // and for the same reason: a diagnosis often finalizes several turns
  // after the photo+location were first given (follow-up questions), and
  // the farmer isn't expected to retype their city name on every reply.
  // Only a genuine, never-given location stays null - Weather Agent must
  // never guess a default.
  const locationResult = sanitizeLocationName(input.location);
  warnings.push(...locationResult.warnings);

  let location: string | null;
  if (locationResult.value) {
    location = locationResult.value;
    setSessionLocation(input.sessionId, location);
    trace.log(
      "IntakeAgent",
      "Accepted location",
      `Farmer-provided location: "${location}"; saved for this session so later turns (e.g. follow-up answers with no location resent) can still use it for weather.`
    );
  } else {
    const carriedLocation = getSessionLocation(input.sessionId);
    if (carriedLocation) {
      location = carriedLocation;
      trace.log(
        "IntakeAgent",
        "Carried over location",
        `No location given this turn; reusing "${location}" from earlier in this session so Weather Agent can still run.`
      );
    } else {
      location = null;
      trace.log(
        "IntakeAgent",
        "No location provided",
        "No location was given this turn, and none is on record for this session; Weather Agent will skip weather advice rather than guessing."
      );
    }
  }

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

  // Step 3: detect language. Once a session has an established language, it
  // takes priority over fresh per-turn detection - a short reply (a
  // farmer's own follow-up answer like "No", "root", "maybe") is exactly
  // where a stopword/statistical detector is least reliable (e.g. English
  // "No" is also a valid Spanish word), so it must never flip the
  // conversation's language on its own. Only a longer message (more than
  // SHORT_REPLY_MAX_WORDS words) detected with very high confidence
  // (above LANGUAGE_SWITCH_CONFIDENCE) can override an established session
  // language. With no session language yet (first turn), fresh detection is
  // used as-is, since there's nothing to fall back to.
  let language = SUPPORTED_LANGUAGES.en;
  let confidence = 0;
  let source: IntakeResult["languageSource"];

  const sessionLanguage = getSessionLanguage(input.sessionId);

  if (textResult.value) {
    const wordCount = (textResult.value.match(/\S+/g) ?? []).length;

    if (sessionLanguage && wordCount <= SHORT_REPLY_MAX_WORDS) {
      // Short reply with an established session language: inherit outright
      // without even attempting re-detection - detection on 1-5 word text
      // is the least reliable case and must not be given a chance to flip
      // the session's language.
      language = sessionLanguage;
      confidence = 1;
      source = "session-carryover";
      trace.log(
        "IntakeAgent",
        `Kept session language: ${language.name}`,
        `Reply is only ${wordCount} word(s) ("${textResult.value}"); short replies never re-trigger language detection, so the session's established language is kept as-is.`
      );
    } else {
      const detection = detectLanguageFromText(textResult.value);
      const clearsSwitchBar = wordCount > SHORT_REPLY_MAX_WORDS && detection.confidence > LANGUAGE_SWITCH_CONFIDENCE;

      if (sessionLanguage && !clearsSwitchBar) {
        // Longer reply, but not confident enough to override an already-
        // established session language.
        language = sessionLanguage;
        confidence = 1;
        source = "session-carryover";
        trace.log(
          "IntakeAgent",
          `Kept session language: ${language.name}`,
          `Fresh detection suggested "${detection.language.name}" (confidence ${detection.confidence.toFixed(2)}, source ${detection.source}) from a ${wordCount}-word reply, which doesn't clear the >${LANGUAGE_SWITCH_CONFIDENCE} confidence bar required to override an established session language; keeping "${language.name}".`
        );
      } else {
        language = detection.language;
        confidence = detection.confidence;
        source = detection.source === "text-script" ? "text-script" : "text-statistical";
        trace.log(
          "IntakeAgent",
          `Detected language: ${language.name}`,
          `Detection source: ${detection.source}, confidence ${detection.confidence.toFixed(2)}, ${wordCount} word(s).`
        );
        setSessionLanguage(input.sessionId, language);
      }
    }
  } else {
    if (sessionLanguage) {
      language = sessionLanguage;
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
    location,
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
