// Sample OpenWeatherMap "current weather" responses (shaped like the real
// /data/2.5/weather payload) used when MOCK_WEATHER=true, so the pipeline
// can be exercised end to end without spending real API credits. Select a
// scenario with MOCK_WEATHER_SCENARIO (default: "normal").

type MockScenario = "high_risk" | "normal";

// Hot and humid with active rain - favorable for fungal/bacterial spread,
// and rain means treatment should be delayed until a dry window.
const HIGH_RISK_RAINY = {
  cod: 200,
  name: "Kisumu",
  weather: [{ main: "Rain", description: "light rain" }],
  main: { temp: 27.4, humidity: 88 },
  rain: { "1h": 1.2 },
};

// Mild and dry - low disease-spread risk, no treatment-timing concerns.
const NORMAL_DRY = {
  cod: 200,
  name: "Nairobi",
  weather: [{ main: "Clear", description: "clear sky" }],
  main: { temp: 21.0, humidity: 45 },
};

const SCENARIOS: Record<MockScenario, unknown> = {
  high_risk: HIGH_RISK_RAINY,
  normal: NORMAL_DRY,
};

export function getMockWeatherResponse(scenarioEnv: string | undefined): unknown {
  const scenario = (scenarioEnv as MockScenario) in SCENARIOS ? (scenarioEnv as MockScenario) : "normal";
  return SCENARIOS[scenario];
}
