// Thin client for the Plant.id v3 API (https://api.plant.id/v3/identification).
// Pure and side-effect-free aside from the network call itself - no trace
// logging here, that's Diagnosis Agent's job. Reads its API key only from
// process.env.PLANT_ID_API_KEY, and never calls the network at all when
// MOCK_PLANT_ID is enabled (see plantIdMockFixtures.ts).
import { DiseaseTreatmentInfo } from "../types";
import { getMockPlantIdResponse } from "./plantIdMockFixtures";

const PLANT_ID_BASE_URL = "https://api.plant.id/v3";
const REQUEST_TIMEOUT_MS = 20000;

export interface PlantIdSuggestion {
  id: string | null; // Plant.id's entity_id (e.g. "da:1082") - lets us match a yes/no question option back to a suggestion
  name: string;
  probability: number;
  description: string | null;
  commonNames: string[];
  treatment: DiseaseTreatmentInfo | null;
}

// A targeted yes/no disambiguation question Plant.id sometimes includes
// alongside disease.suggestions when the top candidates are close - each
// answer maps directly to a specific disease entity, so when present we
// should use THIS instead of our own generic 3-question template.
export interface PlantIdQuestionOption {
  entityId: string | null;
  name: string;
}

export interface PlantIdQuestion {
  text: string;
  yes: PlantIdQuestionOption;
  no: PlantIdQuestionOption;
}

export interface PlantIdApiResult {
  isPlant: boolean | null;
  isPlantProbability: number | null;
  classificationSuggestions: PlantIdSuggestion[];
  isHealthy: boolean | null;
  isHealthyProbability: number | null;
  diseaseSuggestions: PlantIdSuggestion[];
  question: PlantIdQuestion | null;
}

export type PlantIdOutcome = { ok: true; data: PlantIdApiResult } | { ok: false; error: string };

// --- Raw response shape (only the fields we actually read) ---------------

interface RawSuggestionDetails {
  common_names?: string[] | null;
  description?: string | null;
  treatment?: { biological?: string[]; chemical?: string[]; prevention?: string[] } | null;
}

interface RawSuggestion {
  id?: string;
  name: string;
  probability: number;
  details?: RawSuggestionDetails | null;
}

interface RawQuestionOption {
  entity_id?: string;
  name?: string;
}

interface RawQuestion {
  text?: string;
  options?: {
    yes?: RawQuestionOption;
    no?: RawQuestionOption;
  };
}

interface RawPlantIdResponse {
  result?: {
    is_plant?: { binary?: boolean; probability?: number };
    classification?: { suggestions?: RawSuggestion[] };
    is_healthy?: { binary?: boolean; probability?: number };
    disease?: { suggestions?: RawSuggestion[]; question?: RawQuestion };
  };
}

function toSuggestion(raw: RawSuggestion): PlantIdSuggestion {
  const details = raw.details ?? null;
  const treatment = details?.treatment
    ? {
        biological: details.treatment.biological ?? [],
        chemical: details.treatment.chemical ?? [],
        prevention: details.treatment.prevention ?? [],
      }
    : null;

  return {
    id: raw.id ?? null,
    name: raw.name,
    probability: raw.probability,
    description: details?.description ?? null,
    commonNames: details?.common_names ?? [],
    treatment,
  };
}

// Only treated as usable when it has real text and both a named yes and no
// option - a partial/malformed question isn't safe to act on.
function toQuestion(raw: RawQuestion | undefined): PlantIdQuestion | null {
  if (!raw?.text || !raw.options?.yes?.name || !raw.options?.no?.name) {
    return null;
  }
  return {
    text: raw.text,
    yes: { entityId: raw.options.yes.entity_id ?? null, name: raw.options.yes.name },
    no: { entityId: raw.options.no.entity_id ?? null, name: raw.options.no.name },
  };
}

function parsePlantIdResponse(raw: RawPlantIdResponse): PlantIdApiResult {
  const result = raw.result ?? {};
  return {
    isPlant: result.is_plant?.binary ?? null,
    isPlantProbability: result.is_plant?.probability ?? null,
    classificationSuggestions: (result.classification?.suggestions ?? []).map(toSuggestion),
    isHealthy: result.is_healthy?.binary ?? null,
    isHealthyProbability: result.is_healthy?.probability ?? null,
    diseaseSuggestions: (result.disease?.suggestions ?? []).map(toSuggestion),
    question: toQuestion(result.disease?.question),
  };
}

// --- Public API ------------------------------------------------------------

// Identifies the crop and any disease from a single image via Plant.id's
// combined identification+health endpoint (health=all). Never throws -
// network/timeout/non-2xx failures are reported via the returned outcome so
// the caller can degrade gracefully instead of crashing the pipeline.
export async function identifyPlantDisease(imageBuffer: Buffer): Promise<PlantIdOutcome> {
  if (process.env.MOCK_PLANT_ID === "true") {
    const raw = getMockPlantIdResponse(process.env.MOCK_PLANT_ID_SCENARIO) as RawPlantIdResponse;
    return { ok: true, data: parsePlantIdResponse(raw) };
  }

  const apiKey = process.env.PLANT_ID_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "PLANT_ID_API_KEY is not configured." };
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    // "health" is a JSON body field, not a query parameter - confirmed
    // against the official kindwise Python SDK (AsyncPlantApi._build_payload
    // sets payload['health'] = health). Passing it as ?health=all was
    // silently ignored by the API, which is why is_healthy/disease were
    // missing from real responses despite Plant.health being enabled on the
    // key. Only details/language/async belong in the query string.
    const body = {
      images: [imageBuffer.toString("base64")],
      health: "all",
    };

    const requestUrl = `${PLANT_ID_BASE_URL}/identification?details=common_names,description,treatment`;

    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      return {
        ok: false,
        error: `Plant.id API returned HTTP ${response.status}: ${bodyText.slice(0, 300)}`,
      };
    }

    const json = (await response.json()) as RawPlantIdResponse;
    return { ok: true, data: parsePlantIdResponse(json) };
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      error: isAbort
        ? `Plant.id API call timed out after ${REQUEST_TIMEOUT_MS}ms.`
        : `Plant.id API call failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}
