import { UploadedImage } from "../types";

// file-type is ESM-only; this project compiles to CommonJS, and tsc
// downlevels a plain `import()` into `require()`, which throws
// ERR_REQUIRE_ESM for a pure-ESM package. Routing through `new Function`
// keeps a genuine runtime `import()` that tsc can't rewrite.
const dynamicImport = new Function("specifier", "return import(specifier)") as (
  specifier: string
) => Promise<typeof import("file-type")>;

let fileTypeModulePromise: Promise<typeof import("file-type")> | null = null;
function loadFileType(): Promise<typeof import("file-type")> {
  if (!fileTypeModulePromise) {
    fileTypeModulePromise = dynamicImport("file-type");
  }
  return fileTypeModulePromise;
}

const MAX_TEXT_LENGTH = 4000;
const MAX_LOCATION_LENGTH = 100;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// Matches ASCII control characters other than \n (\x0A) and \t (\x09).
const CONTROL_CHAR_PATTERN = new RegExp(
  "[" + String.fromCharCode(0) + "-" + String.fromCharCode(8) +
  String.fromCharCode(11) + String.fromCharCode(12) +
  String.fromCharCode(14) + "-" + String.fromCharCode(31) +
  String.fromCharCode(127) + "]",
  "g"
);
const MARKUP_TAG_PATTERN = /<[^>]*>/g;

export interface ValidationOutcome<T> {
  value: T | null;
  warnings: string[];
}

function stripControlCharsAndMarkup(raw: string): string {
  return raw.replace(CONTROL_CHAR_PATTERN, "").replace(MARKUP_TAG_PATTERN, "").trim();
}

// Strips control characters and any markup, then trims to a sane length.
// This is a chat field, not a code sandbox: we don't need to allow HTML.
export function sanitizeText(raw: string | undefined | null): ValidationOutcome<string> {
  const warnings: string[] = [];
  if (!raw) {
    return { value: null, warnings };
  }

  let text = stripControlCharsAndMarkup(raw);

  if (text.length === 0) {
    return { value: null, warnings };
  }

  if (text.length > MAX_TEXT_LENGTH) {
    text = text.slice(0, MAX_TEXT_LENGTH);
    warnings.push(`Text truncated to ${MAX_TEXT_LENGTH} characters.`);
  }

  return { value: text, warnings };
}

// Same cleanup as sanitizeText, capped much shorter since this is a city
// name, not a free-text description.
export function sanitizeLocationName(raw: string | undefined | null): ValidationOutcome<string> {
  const warnings: string[] = [];
  if (!raw) {
    return { value: null, warnings };
  }

  let location = stripControlCharsAndMarkup(raw);

  if (location.length === 0) {
    return { value: null, warnings };
  }

  if (location.length > MAX_LOCATION_LENGTH) {
    location = location.slice(0, MAX_LOCATION_LENGTH);
    warnings.push(`Location truncated to ${MAX_LOCATION_LENGTH} characters.`);
  }

  return { value: location, warnings };
}

// Validates a raw selector value (e.g. growth stage, crop) against a fixed
// allowed list, case-insensitively. Returns null for anything missing or
// not recognized, rather than guessing - callers treat null as "not provided".
export function sanitizeEnumValue<T extends string>(
  raw: string | undefined | null,
  allowed: readonly T[]
): T | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  return (allowed as readonly string[]).includes(normalized) ? (normalized as T) : null;
}

// Validates an uploaded image by inspecting its actual magic bytes rather
// than trusting the client-supplied mimetype/extension, and enforces a
// size ceiling to prevent abuse.
export async function validateImage(
  file: { buffer: Buffer; originalname: string; size: number } | undefined
): Promise<ValidationOutcome<UploadedImage>> {
  const warnings: string[] = [];
  if (!file) {
    return { value: null, warnings };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    warnings.push(`Image exceeds ${MAX_IMAGE_BYTES / (1024 * 1024)}MB limit and was rejected.`);
    return { value: null, warnings };
  }

  const { fileTypeFromBuffer } = await loadFileType();
  const detected = await fileTypeFromBuffer(file.buffer);
  if (!detected || !ALLOWED_IMAGE_MIME_TYPES.has(detected.mime)) {
    warnings.push("Uploaded file is not a recognized JPEG/PNG/WEBP image and was rejected.");
    return { value: null, warnings };
  }

  return {
    value: {
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: detected.mime,
      sizeBytes: file.size,
    },
    warnings,
  };
}
