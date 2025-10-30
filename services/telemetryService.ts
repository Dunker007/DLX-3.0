type TelemetryEvent =
  | { type: 'assistant_call'; action: string; model: string; tokensIn: number; tokensOut: number; latencyMs: number; cacheHit: boolean }
  | { type: 'entry_create'; entryId: string; tags: string[]; creationLatencyMs: number, isDraft: boolean }
  | { type: 'entry_approve'; entryId: string; }
  | { type: 'embedding_job'; entryId: string; status: 'completed' | 'failed'; durationMs: number }
  | { type: 'rag_search'; query: string; results: number; latencyMs: number }
  | { type: 'flag_change'; flagId: string; from: string; to: string; }
  | { type: 'security_alert'; action: string; resource: string; severity: string }
  | { type: 'metrics_cleanup'; removed: number; remaining: number }
  | { type: 'model_comparison'; models: string[]; prompt: string }
  | { type: 'collaboration_event'; action: string; projectId: string; userId: string }
  | { type: 'keyboard_shortcut'; shortcutId: string; action: string }
  | { type: 'workspace_saved'; workspaceId: string }
  | { type: 'workspace_snapshot_created'; workspaceId: string; snapshotCount: number }
  | { type: 'workspace_snapshot_restored'; workspaceId: string; timestamp: string }
  | { type: 'workspace_imported'; workspaceId: string }
  | { type: 'automation_rule_created'; ruleId: string; triggerType: string; actionCount: number }
  | { type: 'automation_rule_executed'; ruleId: string; success: boolean; duration: number; actionCount: number };

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
