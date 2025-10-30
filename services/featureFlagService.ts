import { FeatureFlags, FeatureFlagState } from '../types';
import { telemetryService } from './telemetryService';

const STORAGE_KEY = 'dlx-feature-flags';

const defaultFlags: FeatureFlags = {
  storyWriter: 'active',
  vibeWorkspace: 'active',
  aiAssistants: 'active',
  ragLite: 'preview',
  automationEngine: 'comingSoon',
  tradingBot: 'inactive',
  marketIntel: 'comingSoon',
  revenueDashboard: 'inactive',
  hostingManager: 'inactive',
  collaborationTools: 'inactive',
  assetGeneration: 'active',
  liveConversation: 'active',
  localStudio: 'active',
  visionLab: 'active',
  chatAssistant: 'active',
};

class FeatureFlagService {
  private flags: FeatureFlags;

  constructor() {
    this.flags = this.loadFlags();
  }

  private loadFlags(): FeatureFlags {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaultFlags, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error("Failed to load feature flags", e);
    }
    this.saveFlags(defaultFlags);
    return defaultFlags;
  }

  private saveFlags(flagsToSave: FeatureFlags) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flagsToSave));
    } catch (e) {
      console.error("Failed to save feature flags", e);
    }
  }

  public getFlags(): FeatureFlags {
    return this.flags;
  }

  public getFlag(key: string): FeatureFlagState {
    return this.flags[key] || 'inactive';
  }

  public setFlag(key: string, state: FeatureFlagState) {
    const oldState = this.flags[key];
    if (oldState !== state) {
      this.flags[key] = state;
      this.saveFlags(this.flags);
      telemetryService.logEvent({ type: 'flag_change', flagId: key, from: oldState || 'undefined', to: state });
    }
  }
}

export const featureFlagService = new FeatureFlagService();
