// Coordinates the four agents in sequence for a single farmer turn.
// Each agent is an independent, testable module - this file only wires
// them together and records the shared reasoning trace.

import { runIntakeAgent } from "./agents/intakeAgent";
import { runDiagnosisAgent } from "./agents/diagnosisAgent";
import { runWeatherAgent } from "./agents/weatherAgent";
import { runResponseAgent } from "./agents/responseAgent";
import { AgentTrace } from "./utils/logger";
import { AgentTraceEntry, DiagnosisResult, FarmerResponse, RawFarmerInput, WeatherResult } from "./types";

export interface PipelineResult {
  response: FarmerResponse;
  diagnosis: DiagnosisResult;
  weather: WeatherResult;
  trace: AgentTraceEntry[];
}

export async function runPipeline(input: RawFarmerInput): Promise<PipelineResult> {
  const trace = new AgentTrace();

  const intake = await runIntakeAgent(input, trace);
  const diagnosis = await runDiagnosisAgent(intake, trace);
  const weather = await runWeatherAgent(intake, diagnosis, trace);
  const response = await runResponseAgent(intake, diagnosis, weather, trace);

  return { response, diagnosis, weather, trace: trace.getEntries() };
}
