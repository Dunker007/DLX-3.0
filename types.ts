export enum ModuleType {
  Dashboard = 'Dashboard',
  Chat = 'Chat',
  Vision = 'Vision',
  Generation = 'Generation',
  Live = 'Live',
  LocalStudio = 'Local Studio',
  ProjectForge = 'Project Forge',
  StoryWriter = 'Story Writer',
  Analytics = 'Analytics',
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

// --- Feature Flag Types ---
export type FeatureFlagState = 'active' | 'preview' | 'labs' | 'comingSoon' | 'inactive' | 'disabled';

export type FeatureFlags = {
  [key: string]: FeatureFlagState;
};

// --- Story Writer Types (Phase 1A Spec) ---

export enum EntryType {
  Decision = 'decision',
  Incident = 'incident',
  Milestone = 'milestone',
  Routine = 'routine',
  Rollback = 'rollback',
  Flip = 'flip'
}

export enum ReferenceType {
  DVJob = 'dv-job',
  HUDSnapshot = 'hud-snapshot',
  ControlHubComment = 'control-hub-comment',
  CommitHash = 'commit-hash',
  External = 'external'
}

export interface Reference {
  id: string;
  type: ReferenceType;
  url?: string;
  description: string;
  timestamp?: string;
}

export interface StoryEntry {
  id: string;
  title: string;
  date: string; // UTC YYYY-MM-DD HH:MM:SS
  executiveSummary: string;
  whatChanged: string;
  decisionsRationale: string;
  risksMitigations: string;
  references: Reference[];
  type: EntryType;
  author: 'lux' | 'mini-lux' | 'scribe';
  version: number;
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export const TAG_SUGGESTIONS = [
    'deploy', 'rollback', 'incident', 'decision', 'optimization', 
    'backfill', 'experiment', 'doc-update', 'security', 'architecture', 'feature'
];
