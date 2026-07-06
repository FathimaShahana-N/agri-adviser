import { AgentTraceEntry } from "../types";

// Records the reasoning trail for one pipeline run so the multi-agent
// flow is inspectable/demoable, not a black box.
export class AgentTrace {
  private entries: AgentTraceEntry[] = [];

  log(agent: string, decision: string, reasoning: string): void {
    const entry: AgentTraceEntry = {
      agent,
      decision,
      reasoning,
      timestamp: new Date().toISOString(),
    };
    this.entries.push(entry);
    // eslint-disable-next-line no-console
    console.log(`[${entry.timestamp}] (${agent}) ${decision} — ${reasoning}`);
  }

  getEntries(): AgentTraceEntry[] {
    return this.entries;
  }
}
