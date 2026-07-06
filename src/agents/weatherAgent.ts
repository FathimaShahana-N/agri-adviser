// =============================================================================
// Agent 3 - Weather Agent
//
// Responsibility: fetch current weather for the farmer's location (a plain
// city name from Intake Agent) via OpenWeatherMap, and turn it into a
// simple, rule-based disease-spread risk assessment whenever Diagnosis
// Agent has already identified (or tentatively identified) a disease.
// Never guesses a location - if the farmer didn't give one, this agent is a
// complete no-op for the turn.
//
// MCP Server demonstration (course concept): the actual OpenWeatherMap call
// no longer happens via a direct function call to weatherClient.ts. It goes
// through weatherMcpClient.ts, which calls a local MCP server (see
// src/mcp/weatherMcpServer.ts) over the real MCP protocol - tool schema,
// tools/call request, structured content response - exactly like it would
// for any external MCP server, just running in-process. Error handling,
// mock-mode support, and the WeatherResult shape produced below are
// unchanged; only the transport between this agent and the OpenWeatherMap
// lookup changed.
//
// The OpenWeatherMap API key is read from process.env.OPENWEATHER_API_KEY
// inside weatherClient.ts - never hardcoded here or there.
// =============================================================================

import { AgentTrace } from "../utils/logger";
import { getCurrentWeatherViaMcp } from "../mcp/weatherMcpClient";
import { WeatherApiResult } from "../services/weatherClient";
import { DiagnosisResult, IntakeResult, WeatherResult } from "../types";

// Humidity/temperature band generally favorable to fungal/bacterial spread
// on leaf crops. Deliberately simple and rule-based (not a disease-specific
// model) per the spec - just enough to give the farmer a sensible nudge.
const HIGH_RISK_HUMIDITY_PCT = 80;
const MODERATE_RISK_HUMIDITY_PCT = 60;
const HIGH_RISK_MIN_TEMP_C = 20;
const HIGH_RISK_MAX_TEMP_C = 32;
const RAINY_CONDITIONS = new Set(["Rain", "Drizzle", "Thunderstorm"]);

function emptyResult(overrides: Partial<WeatherResult>): WeatherResult {
  return {
    status: "skipped_no_location",
    locationQuery: null,
    humidityPct: null,
    temperatureC: null,
    conditions: null,
    recentRainfallMm: null,
    diseaseSpreadRisk: null,
    delayTreatmentAdvice: false,
    ...overrides,
  };
}

function isCurrentlyRaining(weather: WeatherApiResult): boolean {
  return (weather.recentRainfallMm ?? 0) > 0 || RAINY_CONDITIONS.has(weather.conditionsMain ?? "");
}

function assessDiseaseSpreadRisk(weather: WeatherApiResult): "low" | "moderate" | "high" {
  if (
    weather.humidityPct !== null &&
    weather.humidityPct >= HIGH_RISK_HUMIDITY_PCT &&
    weather.temperatureC !== null &&
    weather.temperatureC >= HIGH_RISK_MIN_TEMP_C &&
    weather.temperatureC <= HIGH_RISK_MAX_TEMP_C
  ) {
    return "high";
  }
  if (weather.humidityPct !== null && weather.humidityPct >= MODERATE_RISK_HUMIDITY_PCT) {
    return "moderate";
  }
  return "low";
}

export async function runWeatherAgent(
  intake: IntakeResult,
  diagnosis: DiagnosisResult,
  trace: AgentTrace
): Promise<WeatherResult> {
  if (!intake.location) {
    trace.log(
      "WeatherAgent",
      "Skipped: no location provided",
      "Farmer did not provide a location this turn; skipping weather advice entirely rather than guessing a default location."
    );
    return emptyResult({ status: "skipped_no_location" });
  }

  trace.log(
    "WeatherAgent",
    "Calling get_current_weather via MCP",
    `Invoking the get_current_weather MCP tool for farmer-provided location "${intake.location}" (see src/mcp/weatherMcpServer.ts).`
  );

  const outcome = await getCurrentWeatherViaMcp(intake.location);

  if (!outcome.ok) {
    trace.log("WeatherAgent", "MCP get_current_weather call failed", outcome.error);
    return emptyResult({ status: "unavailable", locationQuery: intake.location });
  }

  const weather = outcome.data;
  trace.log(
    "WeatherAgent",
    "Received weather data",
    `Resolved "${intake.location}" to ${weather.resolvedLocationName ?? "unknown location"}: ` +
      `humidity=${weather.humidityPct}%, temperature=${weather.temperatureC}°C, conditions="${weather.conditions}".`
  );

  const hasDiagnosis = diagnosis.disease !== null;

  if (!hasDiagnosis) {
    trace.log(
      "WeatherAgent",
      "No disease-spread risk assessment",
      "No diagnosed (or tentative) disease is available yet from Diagnosis Agent, so returning general weather conditions without disease-specific risk commentary."
    );
    return {
      status: "available",
      locationQuery: intake.location,
      humidityPct: weather.humidityPct,
      temperatureC: weather.temperatureC,
      conditions: weather.conditions,
      recentRainfallMm: weather.recentRainfallMm,
      diseaseSpreadRisk: null,
      delayTreatmentAdvice: false,
    };
  }

  const diseaseSpreadRisk = assessDiseaseSpreadRisk(weather);
  const isRaining = isCurrentlyRaining(weather);

  trace.log(
    "WeatherAgent",
    `Disease spread risk: ${diseaseSpreadRisk}`,
    `Humidity ${weather.humidityPct}% and temperature ${weather.temperatureC}°C combined with diagnosed disease "${diagnosis.disease}" -> ${diseaseSpreadRisk} spread risk. ` +
      (isRaining
        ? `Rain is currently present (${weather.conditions}), so also recommending the farmer delay spraying/treatment until a dry window.`
        : "No rain currently reported, so no treatment-timing delay recommended.")
  );

  return {
    status: "available",
    locationQuery: intake.location,
    humidityPct: weather.humidityPct,
    temperatureC: weather.temperatureC,
    conditions: weather.conditions,
    recentRainfallMm: weather.recentRainfallMm,
    diseaseSpreadRisk,
    delayTreatmentAdvice: isRaining,
  };
}
