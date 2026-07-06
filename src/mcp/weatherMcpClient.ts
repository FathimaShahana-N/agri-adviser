// =============================================================================
// MCP Server demonstration (course concept) - client side
//
// Weather Agent calls getCurrentWeatherViaMcp() instead of weatherClient's
// getCurrentWeather() directly. Under the hood this connects an MCP Client
// to the MCP Server defined in weatherMcpServer.ts and issues a real
// tools/call request for get_current_weather - the same client API used to
// talk to any external MCP server, just wired to an in-process one here
// (via InMemoryTransport) rather than a separate OS process, so the whole
// app still runs as a single Node process with no extra deployment moving
// parts. The connection is established once and reused.
// =============================================================================

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createWeatherMcpServer } from "./weatherMcpServer";
import { WeatherOutcome } from "../services/weatherClient";

let clientPromise: Promise<Client> | null = null;

function getClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const server = createWeatherMcpServer();
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      const client = new Client({ name: "agriadvisor-weather-agent", version: "1.0.0" });

      await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

      return client;
    })();
  }
  return clientPromise;
}

// Same signature/behavior as weatherClient.ts's getCurrentWeather(): never
// throws, returns the identical WeatherOutcome shape (network/timeout/
// non-2xx/unresolvable-location failures still surface as { ok: false,
// error } rather than as thrown errors or MCP protocol errors).
export async function getCurrentWeatherViaMcp(cityName: string): Promise<WeatherOutcome> {
  const client = await getClient();

  const result = await client.callTool({ name: "get_current_weather", arguments: { location: cityName } });

  const textBlock = Array.isArray(result.content) ? result.content.find((c) => c.type === "text") : undefined;
  if (!textBlock || typeof textBlock.text !== "string") {
    return { ok: false, error: "MCP get_current_weather tool returned no usable content." };
  }

  try {
    return JSON.parse(textBlock.text) as WeatherOutcome;
  } catch {
    return { ok: false, error: "MCP get_current_weather tool returned unparseable content." };
  }
}
