import { telemetryService } from './telemetryService';

export interface KeyboardShortcut {
  id: string;
  key: string;
  modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  action: string;
  description: string;
  category: 'navigation' | 'editing' | 'ai' | 'general';
  enabled: boolean;
}

const STORAGE_KEY = 'dlx-keyboard-shortcuts';

const defaultShortcuts: KeyboardShortcut[] = [
  // Navigation
  { id: 'nav-dashboard', key: 'd', modifiers: ['ctrl'], action: 'navigate-dashboard', description: 'Go to Dashboard', category: 'navigation', enabled: true },
  { id: 'nav-chat', key: 'c', modifiers: ['ctrl'], action: 'navigate-chat', description: 'Open Chat Assistant', category: 'navigation', enabled: true },
  { id: 'nav-analytics', key: 'a', modifiers: ['ctrl'], action: 'navigate-analytics', description: 'Open Analytics', category: 'navigation', enabled: true },
  { id: 'nav-forge', key: 'f', modifiers: ['ctrl'], action: 'navigate-forge', description: 'Open Project Forge', category: 'navigation', enabled: true },
  
  // Editing
  { id: 'edit-save', key: 's', modifiers: ['ctrl'], action: 'save-current', description: 'Save Current File', category: 'editing', enabled: true },
  { id: 'edit-format', key: 'f', modifiers: ['ctrl', 'shift'], action: 'format-code', description: 'Format Code', category: 'editing', enabled: true },
  { id: 'edit-find', key: 'f', modifiers: ['ctrl'], action: 'find', description: 'Find in File', category: 'editing', enabled: true },
  { id: 'edit-replace', key: 'h', modifiers: ['ctrl'], action: 'replace', description: 'Find and Replace', category: 'editing', enabled: true },
  
  // AI Features
  { id: 'ai-explain', key: 'e', modifiers: ['ctrl', 'shift'], action: 'ai-explain', description: 'Explain Selection with AI', category: 'ai', enabled: true },
  { id: 'ai-refactor', key: 'r', modifiers: ['ctrl', 'shift'], action: 'ai-refactor', description: 'AI Refactor', category: 'ai', enabled: true },
  { id: 'ai-complete', key: 'space', modifiers: ['ctrl'], action: 'ai-complete', description: 'AI Code Completion', category: 'ai', enabled: true },
  { id: 'ai-chat-focus', key: '/', modifiers: ['ctrl'], action: 'focus-chat', description: 'Focus Chat Input', category: 'ai', enabled: true },
  
  // General
  { id: 'general-command', key: 'p', modifiers: ['ctrl', 'shift'], action: 'command-palette', description: 'Open Command Palette', category: 'general', enabled: true },
  { id: 'general-settings', key: ',', modifiers: ['ctrl'], action: 'open-settings', description: 'Open Settings', category: 'general', enabled: true },
  { id: 'general-help', key: '?', modifiers: ['ctrl'], action: 'show-help', description: 'Show Keyboard Shortcuts', category: 'general', enabled: true },
];

class KeyboardShortcutsService {
  private shortcuts: KeyboardShortcut[] = [];
  private listeners: Map<string, (event: KeyboardEvent) => void> = new Map();
  private actionHandlers: Map<string, () => void> = new Map();

  constructor() {
    this.loadShortcuts();
    this.initializeGlobalListener();
  }

  private loadShortcuts() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.shortcuts = JSON.parse(stored);
      } else {
        this.shortcuts = defaultShortcuts;
        this.saveShortcuts();
      }
    } catch (e) {
      console.error('Failed to load keyboard shortcuts', e);
      this.shortcuts = defaultShortcuts;
    }
  }

  private saveShortcuts() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.shortcuts));
    } catch (e) {
      console.error('Failed to save keyboard shortcuts', e);
    }
  }

  private initializeGlobalListener() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (event) => {
      const matchedShortcut = this.shortcuts.find(shortcut => {
        if (!shortcut.enabled) return false;

        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.modifiers.includes('ctrl') ? (event.ctrlKey || event.metaKey) : !(event.ctrlKey || event.metaKey);
        const altMatches = shortcut.modifiers.includes('alt') ? event.altKey : !event.altKey;
        const shiftMatches = shortcut.modifiers.includes('shift') ? event.shiftKey : !event.shiftKey;

        return keyMatches && ctrlMatches && altMatches && shiftMatches;
      });

      if (matchedShortcut) {
        event.preventDefault();
        this.executeAction(matchedShortcut.action);
        
        telemetryService.logEvent({
          type: 'keyboard_shortcut',
          shortcutId: matchedShortcut.id,
          action: matchedShortcut.action,
        });
      }
    });
  }

  public registerActionHandler(action: string, handler: () => void) {
    this.actionHandlers.set(action, handler);
  }

  public unregisterActionHandler(action: string) {
    this.actionHandlers.delete(action);
  }

  private executeAction(action: string) {
    const handler = this.actionHandlers.get(action);
    if (handler) {
      handler();
    }
  }

  public getShortcuts(category?: KeyboardShortcut['category']): KeyboardShortcut[] {
    if (category) {
      return this.shortcuts.filter(s => s.category === category);
    }
    return [...this.shortcuts];
  }

  public updateShortcut(id: string, updates: Partial<KeyboardShortcut>) {
    const index = this.shortcuts.findIndex(s => s.id === id);
    if (index !== -1) {
      this.shortcuts[index] = { ...this.shortcuts[index], ...updates };
      this.saveShortcuts();
    }
  }

  public enableShortcut(id: string) {
    this.updateShortcut(id, { enabled: true });
  }

  public disableShortcut(id: string) {
    this.updateShortcut(id, { enabled: false });
  }

  public resetToDefaults() {
    this.shortcuts = defaultShortcuts;
    this.saveShortcuts();
  }

  public getShortcutByAction(action: string): KeyboardShortcut | undefined {
    return this.shortcuts.find(s => s.action === action);
  }

  public formatShortcut(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];
    
    if (shortcut.modifiers.includes('ctrl') || shortcut.modifiers.includes('meta')) {
      parts.push('Ctrl');
    }
    if (shortcut.modifiers.includes('shift')) {
      parts.push('Shift');
    }
    if (shortcut.modifiers.includes('alt')) {
      parts.push('Alt');
    }
    
    parts.push(shortcut.key.toUpperCase());
    
    return parts.join('+');
  }
}

export const keyboardShortcutsService = new KeyboardShortcutsService();
