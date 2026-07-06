// Sample Plant.id v3 API responses (shaped like the real
// /v3/identification?health=all payload) used when MOCK_PLANT_ID=true, so
// the pipeline can be exercised end to end without spending real API
// credits. Select a scenario with MOCK_PLANT_ID_SCENARIO
// (default: "high_confidence").

type MockScenario = "high_confidence" | "low_confidence" | "out_of_scope" | "low_confidence_with_question";

const HIGH_CONFIDENCE_TOMATO = {
  result: {
    is_plant: { binary: true, probability: 0.99 },
    classification: {
      suggestions: [
        {
          name: "Solanum lycopersicum",
          probability: 0.94,
          details: { common_names: ["Tomato"] },
        },
      ],
    },
    is_healthy: { binary: false, probability: 0.12 },
    disease: {
      suggestions: [
        {
          name: "Early blight",
          probability: 0.86,
          details: {
            common_names: ["Alternaria leaf spot"],
            description:
              "A fungal disease causing dark concentric-ring spots on older leaves, which yellow and drop as the disease progresses.",
            treatment: {
              biological: [
                "Remove and destroy infected lower leaves as soon as spots appear.",
                "Apply a copper-based or Bacillus subtilis biofungicide.",
              ],
              chemical: [
                "If the infection is severe, apply a chlorothalonil or mancozeb-based fungicide following label instructions.",
              ],
              prevention: [
                "Rotate crops away from tomato/potato family plants for at least 2 years.",
                "Avoid overhead watering; water at the base of the plant.",
                "Space plants for good air circulation.",
              ],
            },
          },
        },
        {
          name: "Septoria leaf spot",
          probability: 0.06,
          details: { common_names: [], description: null, treatment: null },
        },
      ],
    },
  },
};

const LOW_CONFIDENCE_MAIZE = {
  result: {
    is_plant: { binary: true, probability: 0.97 },
    classification: {
      suggestions: [{ name: "Zea mays", probability: 0.81, details: { common_names: ["Maize", "Corn"] } }],
    },
    is_healthy: { binary: false, probability: 0.4 },
    disease: {
      suggestions: [
        {
          name: "Northern corn leaf blight",
          probability: 0.38,
          details: {
            common_names: [],
            description:
              "Fungal disease producing long, elliptical grayish-green to tan lesions on leaves, often starting on lower leaves.",
            treatment: {
              biological: ["Remove and destroy heavily infected leaves where practical."],
              chemical: ["Apply a strobilurin or triazole fungicide if lesions are spreading rapidly."],
              prevention: [
                "Plant resistant maize varieties.",
                "Rotate with a non-host crop.",
                "Avoid dense planting to improve airflow.",
              ],
            },
          },
        },
        {
          name: "Gray leaf spot",
          probability: 0.29,
          details: {
            common_names: [],
            description:
              "Fungal disease causing small, rectangular tan-to-gray lesions that run parallel to leaf veins.",
            treatment: {
              chemical: ["Apply a foliar fungicide labeled for gray leaf spot if disease pressure is high."],
              prevention: ["Rotate crops.", "Use resistant hybrids.", "Manage crop residue."],
            },
          },
        },
        {
          name: "nitrogen deficiency",
          probability: 0.15,
          details: {
            common_names: [],
            description: "Pale yellowing starting at the leaf tip and moving along the midrib of older leaves.",
            treatment: {
              biological: ["Apply composted manure or a nitrogen-fixing cover crop ahead of the next planting."],
              chemical: ["Side-dress with a nitrogen fertilizer appropriate for maize growth stage."],
              prevention: ["Soil-test between seasons to match fertilizer application to actual need."],
            },
          },
        },
      ],
    },
  },
};

// Mirrors a real Plant.id response the user observed: alongside close-call
// disease suggestions, Plant.id sometimes includes a targeted yes/no
// disambiguation "question" whose answer options map directly to specific
// disease entity_ids. Late blight (Phytophthora) vs early blight
// (Alternaria) on potato is a realistic fit for an odor-based question -
// late blight tuber rot is often foul-smelling, early blight isn't.
const LOW_CONFIDENCE_POTATO_WITH_QUESTION = {
  result: {
    is_plant: { binary: true, probability: 0.98 },
    classification: {
      suggestions: [{ name: "Solanum tuberosum", probability: 0.88, details: { common_names: ["Potato"] } }],
    },
    is_healthy: { binary: false, probability: 0.35 },
    disease: {
      suggestions: [
        {
          id: "da:1500",
          name: "Late blight",
          probability: 0.45,
          details: {
            common_names: [],
            description: "Mock: fast-spreading blight with foul-smelling tuber rot in humid conditions.",
            treatment: { biological: ["Mock biological step"], chemical: ["Mock chemical step"], prevention: ["Mock prevention step"] },
          },
        },
        {
          id: "da:1501",
          name: "Early blight",
          probability: 0.38,
          details: {
            common_names: [],
            description: "Mock: concentric-ring leaf spots, not associated with root odor.",
            treatment: { biological: ["Mock biological step"], chemical: ["Mock chemical step"], prevention: ["Mock prevention step"] },
          },
        },
      ],
      question: {
        text: "Do the roots emit an unpleasant, offensive odor?",
        options: {
          yes: { entity_id: "da:1500", name: "Late blight" },
          no: { entity_id: "da:1501", name: "Early blight" },
        },
      },
    },
  },
};

const OUT_OF_SCOPE_ROSE = {
  result: {
    is_plant: { binary: true, probability: 0.98 },
    classification: {
      suggestions: [{ name: "Rosa chinensis", probability: 0.91, details: { common_names: ["China rose"] } }],
    },
    is_healthy: { binary: false, probability: 0.3 },
    disease: {
      suggestions: [
        {
          name: "Black spot",
          probability: 0.55,
          details: { common_names: [], description: "Fungal disease common on roses.", treatment: null },
        },
      ],
    },
  },
};

const SCENARIOS: Record<MockScenario, unknown> = {
  high_confidence: HIGH_CONFIDENCE_TOMATO,
  low_confidence: LOW_CONFIDENCE_MAIZE,
  out_of_scope: OUT_OF_SCOPE_ROSE,
  low_confidence_with_question: LOW_CONFIDENCE_POTATO_WITH_QUESTION,
};

export function getMockPlantIdResponse(scenarioEnv: string | undefined): unknown {
  const scenario = (scenarioEnv as MockScenario) in SCENARIOS ? (scenarioEnv as MockScenario) : "high_confidence";
  return SCENARIOS[scenario];
}
