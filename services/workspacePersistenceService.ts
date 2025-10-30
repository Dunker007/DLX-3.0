import { Project } from '../types';
import { telemetryService } from './telemetryService';

export interface WorkspaceState {
  id: string;
  name: string;
  activeModule: string;
  openProjects: string[];
  openFiles: Map<string, string>; // projectId -> fileId
  editorStates: Map<string, any>; // fileId -> editor state
  lastModified: string;
  autoSave: boolean;
}

export interface WorkspaceSnapshot {
  timestamp: string;
  state: WorkspaceState;
  projects: Project[];
}

const STORAGE_KEY_WORKSPACE = 'dlx-workspace-state';
const STORAGE_KEY_SNAPSHOTS = 'dlx-workspace-snapshots';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const MAX_SNAPSHOTS = 10;

class WorkspacePersistenceService {
  private currentWorkspace: WorkspaceState | null = null;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private snapshots: WorkspaceSnapshot[] = [];

  constructor() {
    this.loadWorkspace();
    this.loadSnapshots();
    this.startAutoSave();
  }

  private loadWorkspace() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_WORKSPACE);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert plain objects back to Maps
        this.currentWorkspace = {
          ...parsed,
          openFiles: new Map(Object.entries(parsed.openFiles || {})),
          editorStates: new Map(Object.entries(parsed.editorStates || {})),
        };
      }
    } catch (e) {
      console.error('Failed to load workspace state', e);
    }
  }

  private saveWorkspace() {
    if (!this.currentWorkspace) return;

    try {
      // Convert Maps to plain objects for storage
      const toStore = {
        ...this.currentWorkspace,
        openFiles: Object.fromEntries(this.currentWorkspace.openFiles),
        editorStates: Object.fromEntries(this.currentWorkspace.editorStates),
        lastModified: new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY_WORKSPACE, JSON.stringify(toStore));
      
      telemetryService.logEvent({
        type: 'workspace_saved',
        workspaceId: this.currentWorkspace.id,
      });
    } catch (e) {
      console.error('Failed to save workspace state', e);
    }
  }

  private loadSnapshots() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SNAPSHOTS);
      if (stored) {
        this.snapshots = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load workspace snapshots', e);
    }
  }

  private saveSnapshots() {
    try {
      localStorage.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify(this.snapshots));
    } catch (e) {
      console.error('Failed to save workspace snapshots', e);
    }
  }

  private startAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      if (this.currentWorkspace && this.currentWorkspace.autoSave) {
        this.saveWorkspace();
      }
    }, AUTO_SAVE_INTERVAL);
  }

  public initializeWorkspace(name: string): WorkspaceState {
    const workspace: WorkspaceState = {
      id: crypto.randomUUID(),
      name,
      activeModule: 'Dashboard',
      openProjects: [],
      openFiles: new Map(),
      editorStates: new Map(),
      lastModified: new Date().toISOString(),
      autoSave: true,
    };

    this.currentWorkspace = workspace;
    this.saveWorkspace();

    return workspace;
  }

  public getWorkspace(): WorkspaceState | null {
    return this.currentWorkspace;
  }

  public updateWorkspace(updates: Partial<WorkspaceState>) {
    if (!this.currentWorkspace) {
      this.initializeWorkspace('Default Workspace');
    }

    this.currentWorkspace = {
      ...this.currentWorkspace!,
      ...updates,
    };

    this.saveWorkspace();
  }

  public setActiveModule(moduleName: string) {
    this.updateWorkspace({ activeModule: moduleName });
  }

  public addOpenProject(projectId: string) {
    if (!this.currentWorkspace) return;

    if (!this.currentWorkspace.openProjects.includes(projectId)) {
      this.currentWorkspace.openProjects.push(projectId);
      this.saveWorkspace();
    }
  }

  public removeOpenProject(projectId: string) {
    if (!this.currentWorkspace) return;

    const index = this.currentWorkspace.openProjects.indexOf(projectId);
    if (index !== -1) {
      this.currentWorkspace.openProjects.splice(index, 1);
      this.saveWorkspace();
    }
  }

  public setOpenFile(projectId: string, fileId: string) {
    if (!this.currentWorkspace) return;

    this.currentWorkspace.openFiles.set(projectId, fileId);
    this.saveWorkspace();
  }

  public setEditorState(fileId: string, state: any) {
    if (!this.currentWorkspace) return;

    this.currentWorkspace.editorStates.set(fileId, state);
    this.saveWorkspace();
  }

  public getEditorState(fileId: string): any {
    if (!this.currentWorkspace) return null;
    return this.currentWorkspace.editorStates.get(fileId);
  }

  public createSnapshot(projects: Project[]): WorkspaceSnapshot {
    if (!this.currentWorkspace) {
      throw new Error('No active workspace');
    }

    const snapshot: WorkspaceSnapshot = {
      timestamp: new Date().toISOString(),
      state: JSON.parse(JSON.stringify({
        ...this.currentWorkspace,
        openFiles: Object.fromEntries(this.currentWorkspace.openFiles),
        editorStates: Object.fromEntries(this.currentWorkspace.editorStates),
      })),
      projects: JSON.parse(JSON.stringify(projects)),
    };

    this.snapshots.unshift(snapshot);

    // Keep only MAX_SNAPSHOTS
    if (this.snapshots.length > MAX_SNAPSHOTS) {
      this.snapshots = this.snapshots.slice(0, MAX_SNAPSHOTS);
    }

    this.saveSnapshots();

    telemetryService.logEvent({
      type: 'workspace_snapshot_created',
      workspaceId: this.currentWorkspace.id,
      snapshotCount: this.snapshots.length,
    });

    return snapshot;
  }

  public getSnapshots(): WorkspaceSnapshot[] {
    return [...this.snapshots];
  }

  public restoreSnapshot(timestamp: string): WorkspaceSnapshot | null {
    const snapshot = this.snapshots.find(s => s.timestamp === timestamp);
    if (!snapshot) return null;

    // Restore the workspace state
    this.currentWorkspace = {
      ...snapshot.state,
      openFiles: new Map(Object.entries(snapshot.state.openFiles)),
      editorStates: new Map(Object.entries(snapshot.state.editorStates)),
    };

    this.saveWorkspace();

    telemetryService.logEvent({
      type: 'workspace_snapshot_restored',
      workspaceId: this.currentWorkspace.id,
      timestamp,
    });

    return snapshot;
  }

  public deleteSnapshot(timestamp: string) {
    const index = this.snapshots.findIndex(s => s.timestamp === timestamp);
    if (index !== -1) {
      this.snapshots.splice(index, 1);
      this.saveSnapshots();
    }
  }

  public clearAllSnapshots() {
    this.snapshots = [];
    this.saveSnapshots();
  }

  public enableAutoSave() {
    if (this.currentWorkspace) {
      this.currentWorkspace.autoSave = true;
      this.saveWorkspace();
    }
  }

  public disableAutoSave() {
    if (this.currentWorkspace) {
      this.currentWorkspace.autoSave = false;
      this.saveWorkspace();
    }
  }

  public exportWorkspace(): string {
    if (!this.currentWorkspace) {
      throw new Error('No active workspace');
    }

    const exportData = {
      workspace: {
        ...this.currentWorkspace,
        openFiles: Object.fromEntries(this.currentWorkspace.openFiles),
        editorStates: Object.fromEntries(this.currentWorkspace.editorStates),
      },
      snapshots: this.snapshots,
      exportedAt: new Date().toISOString(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  public importWorkspace(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      
      this.currentWorkspace = {
        ...parsed.workspace,
        openFiles: new Map(Object.entries(parsed.workspace.openFiles || {})),
        editorStates: new Map(Object.entries(parsed.workspace.editorStates || {})),
      };

      this.snapshots = parsed.snapshots || [];

      this.saveWorkspace();
      this.saveSnapshots();

      telemetryService.logEvent({
        type: 'workspace_imported',
        workspaceId: this.currentWorkspace.id,
      });

      return true;
    } catch (e) {
      console.error('Failed to import workspace', e);
      return false;
    }
  }

  public destroy() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
  }
}

export const workspacePersistenceService = new WorkspacePersistenceService();
