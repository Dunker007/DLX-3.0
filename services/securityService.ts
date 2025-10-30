import { StoryEntry } from '../types';
import { telemetryService } from './telemetryService';

interface AuditLog {
    timestamp: string;
    action: 'create' | 'update' | 'delete' | 'publish' | 'archive';
    entryId: string;
    userId?: string;
    userRole?: 'lux' | 'mini-lux' | 'scribe';
    changes?: {
        field: string;
        oldValue: any;
        newValue: any;
    }[];
    metadata?: Record<string, any>;
}

interface SecurityPolicy {
    requireApproval: boolean;
    allowedAuthors: ('lux' | 'mini-lux' | 'scribe')[];
    enableVersionControl: boolean;
    enableAuditLog: boolean;
}

class SecurityService {
    private auditLogs: AuditLog[] = [];
    private policy: SecurityPolicy = {
        requireApproval: false,
        allowedAuthors: ['lux', 'mini-lux', 'scribe'],
        enableVersionControl: true,
        enableAuditLog: true,
    };

    /**
     * Log an audit event for Story Writer narrative changes
     */
    public logAudit(log: Omit<AuditLog, 'timestamp'>): void {
        if (!this.policy.enableAuditLog) {
            return;
        }

        const auditLog: AuditLog = {
            timestamp: new Date().toISOString(),
            ...log,
        };

        this.auditLogs.push(auditLog);

        // In production, this would be sent to a secure logging backend
        console.log('SECURITY_AUDIT:', JSON.stringify(auditLog));

        // Also send to telemetry
        if (log.action === 'publish') {
            telemetryService.logEvent({
                type: 'entry_approve',
                entryId: log.entryId,
            });
        }
    }

    /**
     * Validate if a user/role is authorized to perform an action
     */
    public authorize(action: string, author: 'lux' | 'mini-lux' | 'scribe'): boolean {
        // Check if author is in allowed list
        if (!this.policy.allowedAuthors.includes(author)) {
            console.warn(`Unauthorized author attempt: ${author} for action ${action}`);
            return false;
        }

        // Additional role-based checks
        switch (action) {
            case 'publish':
                // Only lux can publish strategic decisions
                return author === 'lux' || author === 'mini-lux';
            case 'delete':
                // Only lux can delete entries
                return author === 'lux';
            default:
                return true;
        }
    }

    /**
     * Validate entry for security concerns (e.g., no secrets, proper references)
     */
    public validateEntry(entry: StoryEntry): { isValid: boolean; issues: string[] } {
        const issues: string[] = [];

        // Check for potential secrets in content
        const sensitivePatterns = [
            /api[_-]?key/i,
            /password/i,
            /secret/i,
            /token/i,
            /private[_-]?key/i,
        ];

        const allText = `${entry.title} ${entry.executiveSummary} ${entry.whatChanged} ${entry.decisionsRationale} ${entry.risksMitigations}`;

        for (const pattern of sensitivePatterns) {
            if (pattern.test(allText)) {
                issues.push(`Potential sensitive information detected: ${pattern.source}`);
            }
        }

        // Validate references have proper structure
        for (const ref of entry.references) {
            if (!ref.id || !ref.type || !ref.description) {
                issues.push(`Invalid reference structure: ${JSON.stringify(ref)}`);
            }
        }

        return {
            isValid: issues.length === 0,
            issues,
        };
    }

    /**
     * Track changes between entry versions
     */
    public trackChanges(oldEntry: StoryEntry, newEntry: StoryEntry): AuditLog['changes'] {
        const changes: AuditLog['changes'] = [];

        const fieldsToTrack: (keyof StoryEntry)[] = [
            'title',
            'executiveSummary',
            'whatChanged',
            'decisionsRationale',
            'risksMitigations',
            'status',
            'tags',
        ];

        for (const field of fieldsToTrack) {
            const oldValue = oldEntry[field];
            const newValue = newEntry[field];

            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                changes.push({
                    field: field as string,
                    oldValue,
                    newValue,
                });
            }
        }

        return changes;
    }

    /**
     * Get audit logs for a specific entry
     */
    public getAuditLogsForEntry(entryId: string): AuditLog[] {
        return this.auditLogs.filter(log => log.entryId === entryId);
    }

    /**
     * Get all audit logs (admin only)
     */
    public getAllAuditLogs(): AuditLog[] {
        return [...this.auditLogs];
    }

    /**
     * Update security policy
     */
    public updatePolicy(policy: Partial<SecurityPolicy>): void {
        this.policy = { ...this.policy, ...policy };
        this.logAudit({
            action: 'update',
            entryId: 'system',
            metadata: { policyUpdate: policy },
        });
    }

    /**
     * Get current security policy
     */
    public getPolicy(): SecurityPolicy {
        return { ...this.policy };
    }

    /**
     * Clear audit logs (admin only, for testing/maintenance)
     */
    public clearAuditLogs(): void {
        console.warn('Clearing all audit logs');
        this.auditLogs = [];
    }
}

export const securityService = new SecurityService();
