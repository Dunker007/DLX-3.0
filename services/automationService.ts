import { telemetryService } from './telemetryService';
import { multiModelService } from './multiModelService';

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  createdAt: string;
  lastRun?: string;
  runCount: number;
}

export type AutomationTrigger = 
  | { type: 'schedule'; cron: string }
  | { type: 'file-save'; pattern: string }
  | { type: 'code-commit'; branch?: string }
  | { type: 'ai-response'; modelId: string }
  | { type: 'manual' };

export type AutomationAction =
  | { type: 'ai-review'; modelId: string; prompt: string }
  | { type: 'format-code'; language: string }
  | { type: 'run-tests'; testPattern?: string }
  | { type: 'generate-docs'; outputPath: string }
  | { type: 'notify'; message: string; channel: 'console' | 'toast' }
  | { type: 'webhook'; url: string; method: 'GET' | 'POST' };

export interface AutomationRunResult {
  ruleId: string;
  timestamp: string;
  success: boolean;
  duration: number;
  outputs: any[];
  error?: string;
}

const STORAGE_KEY = 'dlx-automation-rules';
const STORAGE_KEY_HISTORY = 'dlx-automation-history';
const MAX_HISTORY = 100;

class AutomationService {
  private rules: AutomationRule[] = [];
  private history: AutomationRunResult[] = [];
  private intervalTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.loadRules();
    this.loadHistory();
    this.initializeScheduledRules();
  }

  private loadRules() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.rules = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load automation rules', e);
    }
  }

  private saveRules() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.rules));
    } catch (e) {
      console.error('Failed to save automation rules', e);
    }
  }

  private loadHistory() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (stored) {
        this.history = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load automation history', e);
    }
  }

  private saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(this.history));
    } catch (e) {
      console.error('Failed to save automation history', e);
    }
  }

  private initializeScheduledRules() {
    this.rules.forEach(rule => {
      if (rule.enabled && rule.trigger.type === 'schedule') {
        this.scheduleRule(rule);
      }
    });
  }

  private scheduleRule(rule: AutomationRule) {
    if (rule.trigger.type !== 'schedule') return;

    // Simple interval-based scheduling (in production, use a proper cron library)
    // For demo purposes, treat cron as minutes interval
    const match = rule.trigger.cron.match(/\*\/(\d+)/);
    if (match) {
      const minutes = parseInt(match[1]);
      const interval = setInterval(() => {
        this.executeRule(rule.id);
      }, minutes * 60 * 1000);

      this.intervalTimers.set(rule.id, interval);
    }
  }

  private unscheduleRule(ruleId: string) {
    const timer = this.intervalTimers.get(ruleId);
    if (timer) {
      clearInterval(timer);
      this.intervalTimers.delete(ruleId);
    }
  }

  public createRule(
    name: string,
    description: string,
    trigger: AutomationTrigger,
    actions: AutomationAction[]
  ): AutomationRule {
    const rule: AutomationRule = {
      id: crypto.randomUUID(),
      name,
      description,
      enabled: true,
      trigger,
      actions,
      createdAt: new Date().toISOString(),
      runCount: 0,
    };

    this.rules.push(rule);
    this.saveRules();

    if (trigger.type === 'schedule') {
      this.scheduleRule(rule);
    }

    telemetryService.logEvent({
      type: 'automation_rule_created',
      ruleId: rule.id,
      triggerType: trigger.type,
      actionCount: actions.length,
    });

    return rule;
  }

  public getRules(): AutomationRule[] {
    return [...this.rules];
  }

  public getRule(id: string): AutomationRule | undefined {
    return this.rules.find(r => r.id === id);
  }

  public updateRule(id: string, updates: Partial<AutomationRule>) {
    const index = this.rules.findIndex(r => r.id === id);
    if (index !== -1) {
      const oldRule = this.rules[index];
      this.rules[index] = { ...oldRule, ...updates };

      // Handle scheduling changes
      if (updates.enabled === false) {
        this.unscheduleRule(id);
      } else if (updates.enabled === true && this.rules[index].trigger.type === 'schedule') {
        this.unscheduleRule(id);
        this.scheduleRule(this.rules[index]);
      }

      this.saveRules();
    }
  }

  public deleteRule(id: string) {
    const index = this.rules.findIndex(r => r.id === id);
    if (index !== -1) {
      this.unscheduleRule(id);
      this.rules.splice(index, 1);
      this.saveRules();
    }
  }

  public async executeRule(ruleId: string): Promise<AutomationRunResult> {
    const rule = this.rules.find(r => r.id === ruleId);
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    if (!rule.enabled) {
      throw new Error(`Rule ${ruleId} is disabled`);
    }

    const startTime = performance.now();
    const outputs: any[] = [];
    let success = true;
    let error: string | undefined;

    try {
      for (const action of rule.actions) {
        const output = await this.executeAction(action);
        outputs.push(output);
      }

      // Update rule metadata
      rule.lastRun = new Date().toISOString();
      rule.runCount++;
      this.saveRules();

    } catch (e: any) {
      success = false;
      error = e.message;
      console.error(`Automation rule ${ruleId} failed:`, e);
    }

    const duration = performance.now() - startTime;

    const result: AutomationRunResult = {
      ruleId,
      timestamp: new Date().toISOString(),
      success,
      duration,
      outputs,
      error,
    };

    this.history.unshift(result);
    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.slice(0, MAX_HISTORY);
    }
    this.saveHistory();

    telemetryService.logEvent({
      type: 'automation_rule_executed',
      ruleId,
      success,
      duration,
      actionCount: rule.actions.length,
    });

    return result;
  }

  private async executeAction(action: AutomationAction): Promise<any> {
    switch (action.type) {
      case 'ai-review':
        return await multiModelService.generateResponse(
          action.modelId,
          action.prompt
        );

      case 'format-code':
        // In production, integrate with actual formatters
        return { formatted: true, language: action.language };

      case 'run-tests':
        // In production, integrate with test runners
        return { testsRun: 0, passed: 0, failed: 0 };

      case 'generate-docs':
        // In production, integrate with doc generators
        return { docsGenerated: true, outputPath: action.outputPath };

      case 'notify':
        if (action.channel === 'console') {
          console.log(`[Automation] ${action.message}`);
        }
        // In production, show toast notifications
        return { notified: true, channel: action.channel };

      case 'webhook':
        // In production, make actual HTTP requests
        return { webhookCalled: true, url: action.url, method: action.method };

      default:
        throw new Error(`Unknown action type`);
    }
  }

  public getHistory(limit: number = 50): AutomationRunResult[] {
    return this.history.slice(0, limit);
  }

  public getHistoryForRule(ruleId: string, limit: number = 20): AutomationRunResult[] {
    return this.history.filter(h => h.ruleId === ruleId).slice(0, limit);
  }

  public clearHistory() {
    this.history = [];
    this.saveHistory();
  }

  public getStats(): {
    totalRules: number;
    enabledRules: number;
    totalExecutions: number;
    successRate: number;
  } {
    const totalExecutions = this.history.length;
    const successfulExecutions = this.history.filter(h => h.success).length;

    return {
      totalRules: this.rules.length,
      enabledRules: this.rules.filter(r => r.enabled).length,
      totalExecutions,
      successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
    };
  }

  public destroy() {
    this.intervalTimers.forEach(timer => clearInterval(timer));
    this.intervalTimers.clear();
  }
}

export const automationService = new AutomationService();
