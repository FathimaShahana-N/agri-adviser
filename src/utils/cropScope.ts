import { SupportedCropSlug } from "../types";

// Agent 2 only diagnoses these 5 crops. Plant.id's classification names are
// scientific binomials (sometimes with a common name in `details.common_names`),
// so we match against both, case-insensitively, via substring aliases.
const CROP_ALIASES: Record<SupportedCropSlug, string[]> = {
  rice: ["oryza sativa", "rice", "paddy"],
  maize: ["zea mays", "maize", "corn", "sweetcorn", "sweet corn"],
  tomato: ["solanum lycopersicum", "lycopersicon esculentum", "tomato"],
  potato: ["solanum tuberosum", "potato"],
  pepper: [
    "capsicum annuum",
    "capsicum frutescens",
    "capsicum",
    "pepper",
    "chili",
    "chile",
    "chilli",
    "bell pepper",
  ],
};

// Maps a Plant.id classification result to one of our 5 supported crops, or
// null if it falls outside that set (e.g. an ornamental plant). Checks the
// scientific name plus any common names Plant.id returned.
export function mapToSupportedCrop(
  scientificName: string,
  commonNames: string[] = []
): SupportedCropSlug | null {
  const haystack = [scientificName, ...commonNames].map((s) => s.toLowerCase());

  for (const [slug, aliases] of Object.entries(CROP_ALIASES) as Array<
    [SupportedCropSlug, string[]]
  >) {
    if (haystack.some((h) => aliases.some((alias) => h.includes(alias)))) {
      return slug;
    }
  }
  return null;
}
