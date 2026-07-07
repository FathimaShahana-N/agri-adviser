import { DiseaseTreatmentInfo, SupportedCropSlug, SupportedLanguage } from "./types";

// Minimal in-memory session state so a conversation keeps replying in the
// language it was first detected in, even on later turns with no text
// (e.g. a farmer who follows up with just another photo), and so Weather
// Agent can still use a location the farmer only mentioned once (e.g. the
// same turn as the photo) even on a later turn that finalizes the
// diagnosis after follow-up questions, when the farmer isn't expected to
// retype their city name every reply.
interface SessionState {
  language?: SupportedLanguage;
  location?: string;
  lastSeen: number;
}

const sessions = new Map<string, SessionState>();

export function getSessionLanguage(sessionId: string): SupportedLanguage | null {
  return sessions.get(sessionId)?.language ?? null;
}

// Merges into any existing session state rather than replacing it outright,
// so setting the language on a turn never wipes out a location already
// stored for this session (and vice versa via setSessionLocation below).
export function setSessionLanguage(sessionId: string, language: SupportedLanguage): void {
  const existing = sessions.get(sessionId);
  sessions.set(sessionId, { ...existing, language, lastSeen: Date.now() });
}

export function getSessionLocation(sessionId: string): string | null {
  return sessions.get(sessionId)?.location ?? null;
}

export function setSessionLocation(sessionId: string, location: string): void {
  const existing = sessions.get(sessionId);
  sessions.set(sessionId, { ...existing, location, lastSeen: Date.now() });
}

// A disease candidate carried forward from an ambiguous Plant.id result,
// kept around so a later turn's follow-up answer can be matched against it.
export interface DiagnosisCandidate {
  entityId: string | null; // Plant.id's entity_id, used to match a question's yes/no option back to this candidate
  name: string;
  probability: number;
  description: string | null;
  commonNames: string[];
  treatment: DiseaseTreatmentInfo | null;
}

// Plant.id's own targeted yes/no disambiguation question, carried forward
// so the farmer's next-turn answer can be matched directly against it
// instead of our generic keyword-overlap scoring.
export interface PendingPlantIdQuestion {
  text: string; // original English text, kept for logging/re-display if needed
  yes: { entityId: string | null; name: string };
  no: { entityId: string | null; name: string };
}

interface PendingDiagnosisState {
  crop: SupportedCropSlug;
  cropRawName: string;
  candidates: DiagnosisCandidate[];
  followUpQuestions: string[];
  plantIdQuestion: PendingPlantIdQuestion | null;
  // Fallback-path-only (never set when plantIdQuestion is set): true means
  // the farmer's next reply should be interpreted as a plant-part choice
  // (Leaf/Fruit.../Stem/Root/Flower...), not yet an answer to symptom
  // questions - those get asked in a follow-up turn once the part is known.
  awaitingPlantPart: boolean;
  askedAt: number;
}

const pendingDiagnoses = new Map<string, PendingDiagnosisState>();

// Diagnosis Agent uses this to recognize that a farmer's plain-text reply is
// answering follow-up questions from an in-progress diagnosis, rather than
// being an unrelated new message.
export function getPendingDiagnosis(sessionId: string): PendingDiagnosisState | null {
  return pendingDiagnoses.get(sessionId) ?? null;
}

export function setPendingDiagnosis(sessionId: string, state: PendingDiagnosisState): void {
  pendingDiagnoses.set(sessionId, state);
}

export function clearPendingDiagnosis(sessionId: string): void {
  pendingDiagnoses.delete(sessionId);
}
