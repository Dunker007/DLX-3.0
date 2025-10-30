export enum ModuleType {
  Dashboard = 'Dashboard',
  Chat = 'Chat',
  Vision = 'Vision',
  Generation = 'Generation',
  Live = 'Live',
  LocalStudio = 'Local Studio',
  ProjectForge = 'Project Forge',
  StoryWriter = 'Story Writer',
}

export enum ChatMode {
  Standard = 'Standard',
  LowLatency = 'Low Latency',
  Thinking = 'Deep Analysis',
  Web = 'Web Search',
  Maps = 'Maps Search',
}

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
export type VideoAspectRatio = "16:9" | "9:16";

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'assistant'; // assistant for local models
  text: string;
  groundingChunks?: any[];
  audio?: ArrayBuffer;
}

export interface ProjectFile {
    name: string;
    content: string;
    language: string;
}

export interface Project {
    name: string;
    files: ProjectFile[];
    notes: string;
}

// --- Story Writer Types ---

export interface ReferenceBlock {
  dvJobIds?: string[];
  hudSnapshotIds?: string[];
  controlHubCommentIds?: string[];
  commitHashes?: string[];
  externalDocs?: ExternalDocRef[];
}

export interface ExternalDocRef {
  label: string;
  url: string;
}

export interface RoleAttribution {
  role: 'lux' | 'mini-lux' | 'scribe';
  author: string; // user id/handle
  contributionSummary: string;
}

export interface EnvironmentFingerprint {
  modelVersions?: Record<string,string>; // e.g. {'local_llm':'llama3-8b-q4','router':'1.2.0'}
  systemMetrics?: {
    cpuLoad?: number;
    memGB?: number;
    gpuUtil?: number;
  };
  dlxVersion?: string;
}

export interface StoryWriterEntry {
  id: string; // ULID or UUID
  createdUtc: string;
  updatedUtc: string;
  title: string;
  dateUtc: string; // explicit event date (may differ from createdUtc)
  executiveSummary: string;
  whatChanged: string; // bullet list or structured diff summary
  decisionsRationale: string;
  risksMitigations: string;
  references: ReferenceBlock;
  tags: string[]; // e.g. ['deploy', 'rollback', 'incident', 'optimization']
  roleAttributions: RoleAttribution[];
  status: 'active' | 'superseded';
  revision: number;
  supersedesEntryId?: string; // if this replaces prior entry entirely
  environmentFingerprint?: EnvironmentFingerprint; // optional Phase 1
  narrativeExtended?: string; // optional long-form
}

export const TAG_SUGGESTIONS = [
    'deploy', 'rollback', 'incident', 'decision', 'optimization', 
    'backfill', 'experiment', 'doc-update', 'security'
];