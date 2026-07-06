// Shared types passed between agents in the pipeline.

export type SupportedLanguageCode = "en" | "ml" | "hi" | "es" | "sw" | "fr" | "bn";

export interface SupportedLanguage {
  code: SupportedLanguageCode;
  name: string;
}

export interface UploadedImage {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

// Crop growth stages for the optional preventive-tips feature. Separate
// from any diagnosis - a farmer can ask for stage-appropriate tips whether
// or not they're also reporting a problem this turn.
export type GrowthStage = "seedling" | "vegetative" | "flowering" | "fruiting";
export const GROWTH_STAGES: readonly GrowthStage[] = ["seedling", "vegetative", "flowering", "fruiting"];

// What the farmer sent in on this turn, before any agent has touched it.
export interface RawFarmerInput {
  sessionId: string;
  text?: string;
  image?: UploadedImage;
  location?: string; // raw city name as typed by the farmer, unsanitized
  growthStage?: string; // raw selector value, unsanitized
  selectedCrop?: string; // raw selector value, unsanitized - only used when no image/diagnosis this turn
}

// Output of Agent 1 (Intake Agent) - the normalized, validated, language-tagged
// package that all downstream agents consume.
export interface IntakeResult {
  sessionId: string;
  cleanText: string | null;
  hasImage: boolean;
  image: UploadedImage | null;
  language: SupportedLanguage;
  languageConfidence: number;
  languageSource: "text-script" | "text-statistical" | "session-carryover" | "default-fallback";
  location: string | null; // sanitized city name, or null if none/empty this turn
  growthStage: GrowthStage | null; // sanitized selector value, or null if none/invalid this turn
  selectedCrop: SupportedCropSlug | null; // sanitized selector value, or null if none/invalid this turn
  warnings: string[];
}

// Crops Agent 2 is allowed to diagnose. Anything Plant.id identifies
// outside this set is reported as out-of-scope rather than diagnosed.
export type SupportedCropSlug = "rice" | "maize" | "tomato" | "potato" | "pepper";
export const SUPPORTED_CROP_SLUGS: readonly SupportedCropSlug[] = ["rice", "maize", "tomato", "potato", "pepper"];

export interface DiseaseTreatmentInfo {
  biological: string[];
  chemical: string[];
  prevention: string[];
}

// Output of Agent 2 (Diagnosis Agent).
export interface DiagnosisResult {
  // "diagnosed": confident final result. "needs_followup": Plant.id result was
  // ambiguous and the farmer must answer follow-up questions first.
  // "no_image_provided": Agent 2 never called Plant.id this turn.
  // "out_of_scope": identified plant isn't one of the 5 supported crops.
  // "unavailable": Plant.id call failed (network/timeout/API error).
  status: "diagnosed" | "needs_followup" | "no_image_provided" | "out_of_scope" | "unavailable";
  crop: SupportedCropSlug | null;
  cropRawName: string | null; // whatever Plant.id actually called the plant, for out-of-scope visibility/debugging
  disease: string | null;
  diseaseDescription: string | null;
  treatment: DiseaseTreatmentInfo | null;
  isHealthy: boolean | null; // Plant.id's own health verdict, when available
  confidence: number; // 0-1, disease.suggestions[0].probability (or crop probability when out-of-scope)
  source: "image" | "none";
  needsFollowUp: boolean;
  followUpQuestions: string[];
}

// Output of Agent 3 (Weather Agent).
export interface WeatherResult {
  // "available": got weather data. "skipped_no_location": farmer gave no
  // location, so Agent 3 never called the API. "unavailable": OpenWeatherMap
  // call failed (bad location name, network/timeout/API error).
  status: "available" | "skipped_no_location" | "unavailable";
  locationQuery: string | null; // the city name Agent 3 searched for
  humidityPct: number | null;
  temperatureC: number | null;
  conditions: string | null; // e.g. "light rain", "clear sky", "overcast clouds"
  recentRainfallMm: number | null; // rain volume in the last hour, if any
  // Both null/false unless a diagnosis (from Agent 2) is already available -
  // Agent 3 never guesses disease-spread risk without a known/candidate disease.
  diseaseSpreadRisk: "low" | "moderate" | "high" | null;
  delayTreatmentAdvice: boolean;
}

// Output of Agent 4 (Response Agent) - the final farmer-facing message.
export interface FarmerResponse {
  language: SupportedLanguage;
  message: string;
}

// A single inspectable reasoning step, emitted by any agent, so the
// multi-agent flow can be demoed/audited turn by turn.
export interface AgentTraceEntry {
  agent: string;
  decision: string;
  reasoning: string;
  timestamp: string;
}
