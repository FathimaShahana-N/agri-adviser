// Thin client for the OpenWeatherMap "current weather data" API
// (https://api.openweathermap.org/data/2.5/weather). Pure and side-effect-
// free aside from the network call itself - no trace logging here, that's
// Weather Agent's job. Reads its API key only from
// process.env.OPENWEATHER_API_KEY, and never calls the network at all when
// MOCK_WEATHER is enabled (see weatherMockFixtures.ts).
import { getMockWeatherResponse } from "./weatherMockFixtures";

const OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5/weather";
const REQUEST_TIMEOUT_MS = 10000;

export interface WeatherApiResult {
  resolvedLocationName: string | null;
  humidityPct: number | null;
  temperatureC: number | null;
  conditions: string | null; // e.g. "light rain", "clear sky"
  conditionsMain: string | null; // e.g. "Rain", "Clear", "Clouds"
  recentRainfallMm: number | null; // rain volume in the last hour, if any
}

export type WeatherOutcome = { ok: true; data: WeatherApiResult } | { ok: false; error: string };

// --- Raw response shape (only the fields we actually read) ---------------

interface RawWeatherResponse {
  cod?: number | string;
  message?: string;
  name?: string;
  weather?: Array<{ main?: string; description?: string }>;
  main?: { temp?: number; humidity?: number };
  rain?: { "1h"?: number; "3h"?: number };
}

function parseWeatherResponse(raw: RawWeatherResponse): WeatherApiResult {
  const topWeather = raw.weather?.[0];
  return {
    resolvedLocationName: raw.name ?? null,
    humidityPct: raw.main?.humidity ?? null,
    temperatureC: raw.main?.temp ?? null,
    conditions: topWeather?.description ?? null,
    conditionsMain: topWeather?.main ?? null,
    recentRainfallMm: raw.rain?.["1h"] ?? raw.rain?.["3h"] ?? null,
  };
}

// Fetches current weather for a farmer-provided city name. Never throws -
// network/timeout/non-2xx/unresolvable-location failures are reported via
// the returned outcome so the caller can degrade gracefully instead of
// crashing the pipeline.
export async function getCurrentWeather(cityName: string): Promise<WeatherOutcome> {
  if (process.env.MOCK_WEATHER === "true") {
    const raw = getMockWeatherResponse(process.env.MOCK_WEATHER_SCENARIO) as RawWeatherResponse;
    return { ok: true, data: parseWeatherResponse(raw) };
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "OPENWEATHER_API_KEY is not configured." };
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = `${OPENWEATHER_BASE_URL}?q=${encodeURIComponent(cityName)}&units=metric&appid=${apiKey}`;
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      const isNotFound = response.status === 404;
      return {
        ok: false,
        error: isNotFound
          ? `OpenWeatherMap could not resolve location "${cityName}" (HTTP 404).`
          : `OpenWeatherMap API returned HTTP ${response.status}: ${bodyText.slice(0, 300)}`,
      };
    }

    const json = (await response.json()) as RawWeatherResponse;
    return { ok: true, data: parseWeatherResponse(json) };
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      error: isAbort
        ? `OpenWeatherMap API call timed out after ${REQUEST_TIMEOUT_MS}ms.`
        : `OpenWeatherMap API call failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}
