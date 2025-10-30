type TelemetryEvent =
  | { type: 'assistant_call'; action: string; model: string; tokensIn: number; tokensOut: number; latencyMs: number; cacheHit: boolean }
  | { type: 'entry_create'; entryId: string; tags: string[]; creationLatencyMs: number, isDraft: boolean }
  | { type: 'entry_approve'; entryId: string; }
  | { type: 'embedding_job'; entryId: string; status: 'completed' | 'failed'; durationMs: number }
  | { type: 'rag_search'; query: string; results: number; latencyMs: number }
  | { type: 'flag_change'; flagId: string; from: string; to: string; };

class TelemetryService {
  public logEvent(eventData: TelemetryEvent) {
    const logEntry = {
      ts: new Date().toISOString(),
      ...eventData,
    };
    // In a real app, this would send to a logging backend. For now, we console.log.
    console.log('TELEMETRY_EVENT:', JSON.stringify(logEntry));
  }
}

export const telemetryService = new TelemetryService();
