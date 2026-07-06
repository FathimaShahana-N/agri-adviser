// =============================================================================
// MCP Server demonstration (course concept)
//
// This exposes OpenWeatherMap access as a single MCP tool, get_current_weather,
// using the official @modelcontextprotocol/sdk - the same tool-registration
// API a real external MCP server (e.g. a filesystem or GitHub MCP server)
// would use. Weather Agent no longer calls weatherClient.ts directly; it
// goes through weatherMcpClient.ts, which talks to THIS server over the
// actual MCP protocol (tool schema, JSON-RPC-shaped requests/responses,
// content blocks) via weatherMcpClient.ts.
//
// weatherClient.ts's HTTP/mock/error-handling logic is completely
// unchanged and reused as-is here - only the calling convention between
// Weather Agent and that logic changed, from a plain function call to an
// MCP tool call.
// =============================================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getCurrentWeather, WeatherApiResult } from "../services/weatherClient";

const weatherApiResultShape = {
  resolvedLocationName: z.string().nullable(),
  humidityPct: z.number().nullable(),
  temperatureC: z.number().nullable(),
  conditions: z.string().nullable(),
  conditionsMain: z.string().nullable(),
  recentRainfallMm: z.number().nullable(),
};

export function createWeatherMcpServer(): McpServer {
  const server = new McpServer({ name: "agriadvisor-weather", version: "1.0.0" });

  server.registerTool(
    "get_current_weather",
    {
      title: "Get current weather",
      description:
        "Gets current weather conditions (humidity, temperature, conditions, recent rainfall) for a city name via OpenWeatherMap. Returns { ok: true, data } on success or { ok: false, error } if the location can't be resolved or the API call fails.",
      inputSchema: { location: z.string().describe("City name, e.g. 'Nairobi'") },
      outputSchema: {
        ok: z.boolean(),
        data: z.object(weatherApiResultShape).nullable(),
        error: z.string().nullable(),
      },
    },
    async ({ location }: { location: string }) => {
      const outcome = await getCurrentWeather(location);

      const structured = outcome.ok
        ? { ok: true, data: outcome.data as WeatherApiResult, error: null }
        : { ok: false, data: null, error: outcome.error };

      return {
        // Text content mirrors the exact WeatherOutcome shape the rest of
        // the app already uses (weatherMcpClient.ts parses this directly),
        // so behavior stays identical to the pre-MCP direct-call version.
        content: [{ type: "text" as const, text: JSON.stringify(outcome) }],
        // structuredContent must match outputSchema's flattened shape
        // (Zod tool schemas describe object fields, not a top-level
        // discriminated union) - included to demonstrate structured tool
        // output, not required for weatherMcpClient.ts's parsing.
        structuredContent: structured,
      };
    }
  );

  return server;
}
