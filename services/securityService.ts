import { telemetryService } from './telemetryService';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  details: any;
  ipAddress?: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface ApiKeyConfig {
  id: string;
  name: string;
  key: string;
  provider: 'gemini' | 'openai' | 'anthropic' | 'local';
  createdAt: string;
  lastUsed?: string;
  rotationSchedule?: number; // days
  usageLimit?: number;
  currentUsage: number;
}

const STORAGE_KEY_AUDIT = 'dlx-audit-logs';
const STORAGE_KEY_KEYS = 'dlx-api-keys';
const MAX_AUDIT_LOGS = 1000;

class SecurityService {
  private auditLogs: AuditLog[] = [];
  private apiKeys: ApiKeyConfig[] = [];

  constructor() {
    this.loadAuditLogs();
    this.loadApiKeys();
  }

  // Audit Logging
  public logAudit(action: string, resource: string, details: any, severity: 'info' | 'warning' | 'critical' = 'info') {
    const log: AuditLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId: this.getCurrentUserId(),
      action,
      resource,
      details,
      severity,
    };

    this.auditLogs.unshift(log);
    
    // Keep only recent logs
    if (this.auditLogs.length > MAX_AUDIT_LOGS) {
      this.auditLogs = this.auditLogs.slice(0, MAX_AUDIT_LOGS);
    }

    this.saveAuditLogs();
    
    // Log critical events to telemetry
    if (severity === 'critical') {
      telemetryService.logEvent({ 
        type: 'security_alert', 
        action, 
        resource, 
        severity 
      });
    }
  }

  public getAuditLogs(filters?: { 
    startDate?: string; 
    endDate?: string; 
    severity?: string;
    action?: string;
  }): AuditLog[] {
    let logs = [...this.auditLogs];

    if (filters) {
      if (filters.startDate) {
        logs = logs.filter(l => l.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        logs = logs.filter(l => l.timestamp <= filters.endDate!);
      }
      if (filters.severity) {
        logs = logs.filter(l => l.severity === filters.severity);
      }
      if (filters.action) {
        logs = logs.filter(l => l.action.includes(filters.action!));
      }
    }

    return logs;
  }

  // API Key Management
  public addApiKey(config: Omit<ApiKeyConfig, 'id' | 'createdAt' | 'currentUsage'>): ApiKeyConfig {
    const newKey: ApiKeyConfig = {
      ...config,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      currentUsage: 0,
    };

    this.apiKeys.push(newKey);
    this.saveApiKeys();
    this.logAudit('api_key_added', 'api-keys', { provider: config.provider, name: config.name }, 'info');

    return newKey;
  }

  public getApiKeys(): ApiKeyConfig[] {
    return this.apiKeys.map(k => ({ ...k, key: this.maskKey(k.key) }));
  }

  public getApiKey(id: string): ApiKeyConfig | undefined {
    return this.apiKeys.find(k => k.id === id);
  }

  public updateApiKeyUsage(id: string) {
    const key = this.apiKeys.find(k => k.id === id);
    if (key) {
      key.currentUsage++;
      key.lastUsed = new Date().toISOString();
      
      // Check usage limits
      if (key.usageLimit && key.currentUsage >= key.usageLimit) {
        this.logAudit('api_key_limit_reached', 'api-keys', { id, name: key.name }, 'warning');
      }

      this.saveApiKeys();
    }
  }

  public rotateApiKey(id: string, newKey: string) {
    const key = this.apiKeys.find(k => k.id === id);
    if (key) {
      const oldKeyMasked = this.maskKey(key.key);
      key.key = newKey;
      key.currentUsage = 0;
      this.saveApiKeys();
      this.logAudit('api_key_rotated', 'api-keys', { id, name: key.name, oldKey: oldKeyMasked }, 'info');
    }
  }

  public deleteApiKey(id: string) {
    const index = this.apiKeys.findIndex(k => k.id === id);
    if (index !== -1) {
      const key = this.apiKeys[index];
      this.apiKeys.splice(index, 1);
      this.saveApiKeys();
      this.logAudit('api_key_deleted', 'api-keys', { id, name: key.name }, 'warning');
    }
  }

  public checkKeyRotationNeeded(): ApiKeyConfig[] {
    const now = new Date();
    return this.apiKeys.filter(key => {
      if (!key.rotationSchedule || !key.createdAt) return false;
      const createdDate = new Date(key.createdAt);
      const daysSinceCreation = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreation >= key.rotationSchedule;
    });
  }

  // Rate Limiting
  private rateLimitMap = new Map<string, { count: number; resetAt: number }>();

  public checkRateLimit(endpoint: string, limit: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now();
    const key = endpoint;
    const record = this.rateLimitMap.get(key);

    if (!record || now > record.resetAt) {
      this.rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (record.count >= limit) {
      this.logAudit('rate_limit_exceeded', endpoint, { count: record.count, limit }, 'warning');
      return false;
    }

    record.count++;
    return true;
  }

  // Data Export for Compliance
  public exportAuditLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.auditLogs, null, 2);
    } else {
      const headers = ['ID', 'Timestamp', 'User ID', 'Action', 'Resource', 'Severity', 'Details'];
      const rows = this.auditLogs.map(log => [
        log.id,
        log.timestamp,
        log.userId,
        log.action,
        log.resource,
        log.severity,
        JSON.stringify(log.details)
      ]);
      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }
  }

  // Helper Methods
  private maskKey(key: string): string {
    if (key.length <= 8) return '****';
    return key.substring(0, 4) + '****' + key.substring(key.length - 4);
  }

  private getCurrentUserId(): string {
    // In a real app, this would get the actual user ID
    return 'local-user';
  }

  private loadAuditLogs() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_AUDIT);
      if (stored) {
        this.auditLogs = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load audit logs', e);
    }
  }

  private saveAuditLogs() {
    try {
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(this.auditLogs));
    } catch (e) {
      console.error('Failed to save audit logs', e);
    }
  }

  private loadApiKeys() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_KEYS);
      if (stored) {
        this.apiKeys = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load API keys', e);
    }
  }

  private saveApiKeys() {
    try {
      // Note: API keys are stored in browser localStorage for this self-hosted application.
      // In production deployments, consider:
      // 1. Using environment variables for sensitive keys
      // 2. Implementing encryption at rest
      // 3. Using secure key management systems (e.g., HashiCorp Vault)
      // 4. Browser localStorage is acceptable for self-hosted, single-user scenarios
      //    where the user controls the environment and browser security
      localStorage.setItem(STORAGE_KEY_KEYS, JSON.stringify(this.apiKeys));
    } catch (e) {
      console.error('Failed to save API keys', e);
    }
  }
}

export const securityService = new SecurityService();
