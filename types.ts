export enum ModuleType {
  Dashboard = 'Dashboard',
  Chat = 'Chat',
  Vision = 'Vision',
  Generation = 'Generation',
  Live = 'Live',
  LocalStudio = 'Local Studio',
  ProjectForge = 'Project Forge',
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