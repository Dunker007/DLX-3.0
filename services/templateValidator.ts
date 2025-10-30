import { StoryEntry, EntryType, ReferenceType, Reference } from '../types';

export interface EntryTemplate {
    type: EntryType;
    titlePrefix: string;
    suggestedTags: string[];
    requiredFields: (keyof StoryEntry)[];
    exampleSummary: string;
    exampleWhatChanged: string;
    exampleDecisions: string;
    exampleRisks: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Validates Story Writer entries against minimum template requirements
 */
class TemplateValidator {
    private readonly MINIMUM_FIELDS: (keyof StoryEntry)[] = [
        'title',
        'date',
        'executiveSummary',
        'whatChanged',
        'decisionsRationale',
        'risksMitigations',
        'references',
    ];

    private readonly MIN_SUMMARY_LENGTH = 20;
    private readonly MIN_WHAT_CHANGED_LENGTH = 10;
    private readonly DATE_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

    /**
     * Validate entry against minimum template structure
     */
    public validate(entry: StoryEntry): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check required fields are present
        for (const field of this.MINIMUM_FIELDS) {
            if (!entry[field]) {
                errors.push(`Missing required field: ${field}`);
            }
        }

        // Validate title format (should start with type or contain descriptor)
        if (entry.title && entry.title.length < 5) {
            errors.push('Title too short (minimum 5 characters)');
        }

        // Validate date format (UTC YYYY-MM-DD HH:MM:SS)
        if (entry.date && !this.DATE_REGEX.test(entry.date)) {
            errors.push('Date must be in UTC format: YYYY-MM-DD HH:MM:SS');
        }

        // Validate executive summary length
        if (entry.executiveSummary && entry.executiveSummary.length < this.MIN_SUMMARY_LENGTH) {
            warnings.push(`Executive summary is short (minimum ${this.MIN_SUMMARY_LENGTH} characters recommended)`);
        }

        // Validate "what changed" content
        if (entry.whatChanged && entry.whatChanged.length < this.MIN_WHAT_CHANGED_LENGTH) {
            warnings.push(`"What changed" is brief (minimum ${this.MIN_WHAT_CHANGED_LENGTH} characters recommended)`);
        }

        // Validate references
        if (!entry.references || entry.references.length === 0) {
            warnings.push('No references provided. Consider adding commit hashes, PR links, or other references.');
        } else {
            entry.references.forEach((ref, idx) => {
                if (!ref.id || !ref.type || !ref.description) {
                    errors.push(`Reference ${idx} is incomplete (needs id, type, and description)`);
                }
            });
        }

        // Validate author
        if (!entry.author || !['lux', 'mini-lux', 'scribe'].includes(entry.author)) {
            errors.push('Author must be one of: lux, mini-lux, scribe');
        }

        // Validate type
        if (!entry.type || !Object.values(EntryType).includes(entry.type)) {
            errors.push('Invalid entry type');
        }

        // Chronological ordering check (if comparing with other entries)
        if (entry.date) {
            const entryDate = new Date(entry.date.replace(' ', 'T') + 'Z');
            if (isNaN(entryDate.getTime())) {
                errors.push('Invalid date format');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Validate cross-references format
     */
    public validateReferences(references: Reference[]): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        references.forEach((ref, idx) => {
            // Check commit hash format
            if (ref.type === ReferenceType.CommitHash) {
                const gitShaRegex = /^[0-9a-f]{7,40}$/i;
                if (!gitShaRegex.test(ref.id)) {
                    errors.push(`Reference ${idx}: Invalid commit hash format`);
                }
            }

            // Check DV Job format
            if (ref.type === ReferenceType.DVJob) {
                if (!ref.id.startsWith('dv-job-') && !ref.id.startsWith('deploy-job-')) {
                    warnings.push(`Reference ${idx}: DV Job ID doesn't match expected format`);
                }
            }

            // Check external URLs
            if (ref.type === ReferenceType.External && ref.url) {
                try {
                    new URL(ref.url);
                } catch {
                    errors.push(`Reference ${idx}: Invalid URL format`);
                }
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Check if entry meets "2-3 minutes to write" success criteria
     * based on content depth and completeness
     */
    public checkQuickWriteCriteria(entry: StoryEntry): boolean {
        const validation = this.validate(entry);
        
        // Entry should be complete but concise
        const hasAllRequired = validation.errors.length === 0;
        const isConcise = 
            entry.executiveSummary.length < 500 &&
            entry.whatChanged.length < 1000 &&
            entry.decisionsRationale.length < 1000 &&
            entry.risksMitigations.length < 500;

        return hasAllRequired && isConcise;
    }
}

/**
 * Factory for creating pre-filled entry templates
 */
class EntryTemplateFactory {
    private templates: Map<EntryType, EntryTemplate> = new Map([
        [EntryType.Decision, {
            type: EntryType.Decision,
            titlePrefix: 'Decision',
            suggestedTags: ['decision', 'architecture'],
            requiredFields: ['title', 'date', 'executiveSummary', 'whatChanged', 'decisionsRationale', 'risksMitigations', 'references'],
            exampleSummary: 'Decision to adopt [technology/approach] for [use case].',
            exampleWhatChanged: '- Changed [X] from [Y] to [Z]\n- Added [new capability]',
            exampleDecisions: 'Chose [option] because [rationale]. Considered alternatives: [list]. Selected based on [criteria].',
            exampleRisks: 'Risk: [potential issue]\nMitigation: [how we address it]',
        }],
        [EntryType.Incident, {
            type: EntryType.Incident,
            titlePrefix: 'Incident',
            suggestedTags: ['incident', 'rollback'],
            requiredFields: ['title', 'date', 'executiveSummary', 'whatChanged', 'decisionsRationale', 'risksMitigations', 'references'],
            exampleSummary: 'Service degradation/outage affecting [component] for [duration]. Root cause: [brief explanation].',
            exampleWhatChanged: 'Incident detected at [time]. Impact: [description]. Resolution: [action taken].',
            exampleDecisions: 'Decided to [rollback/hotfix/etc] to restore service. Long-term fix: [plan].',
            exampleRisks: 'Risk: Data inconsistency/service unavailability\nMitigation: [specific actions taken]',
        }],
        [EntryType.Milestone, {
            type: EntryType.Milestone,
            titlePrefix: 'Milestone',
            suggestedTags: ['milestone', 'deploy', 'feature'],
            requiredFields: ['title', 'date', 'executiveSummary', 'whatChanged', 'decisionsRationale', 'risksMitigations', 'references'],
            exampleSummary: 'Achieved [milestone name]: [brief description of accomplishment].',
            exampleWhatChanged: '- Completed [feature/phase]\n- Deployed [components]\n- Achieved [metrics/goals]',
            exampleDecisions: 'Delivered per roadmap priorities. Key decisions: [list].',
            exampleRisks: 'Standard deployment risks. Monitoring [metrics] for [timeframe].',
        }],
        [EntryType.Routine, {
            type: EntryType.Routine,
            titlePrefix: 'Update',
            suggestedTags: ['routine', 'update'],
            requiredFields: ['title', 'date', 'executiveSummary', 'whatChanged', 'decisionsRationale', 'risksMitigations', 'references'],
            exampleSummary: 'Regular update: [what was updated].',
            exampleWhatChanged: '- Updated [component]\n- Refreshed [data/config]\n- Applied [patches]',
            exampleDecisions: 'Routine maintenance following standard procedures.',
            exampleRisks: 'Low risk. Standard rollback available if needed.',
        }],
        [EntryType.Rollback, {
            type: EntryType.Rollback,
            titlePrefix: 'Rollback',
            suggestedTags: ['rollback', 'incident'],
            requiredFields: ['title', 'date', 'executiveSummary', 'whatChanged', 'decisionsRationale', 'risksMitigations', 'references'],
            exampleSummary: 'Rolled back [deployment/change] due to [issue]. Service restored at [time].',
            exampleWhatChanged: 'Reverted [component] from version [new] to [old]. Verified [functionality].',
            exampleDecisions: 'Immediate rollback chosen to minimize impact. Root cause investigation ongoing.',
            exampleRisks: 'Risk: Loss of new features\nMitigation: Planned re-deployment after fix',
        }],
        [EntryType.Flip, {
            type: EntryType.Flip,
            titlePrefix: 'Feature Flag Flip',
            suggestedTags: ['flip', 'feature-flag', 'experiment'],
            requiredFields: ['title', 'date', 'executiveSummary', 'whatChanged', 'decisionsRationale', 'risksMitigations', 'references'],
            exampleSummary: 'Enabled/disabled [feature flag] affecting [scope].',
            exampleWhatChanged: 'Flipped [flag-name] from [off/on] to [on/off] for [users/environment].',
            exampleDecisions: 'Feature flag change based on [metrics/feedback/plan].',
            exampleRisks: 'Risk: Behavior change for users\nMitigation: Gradual rollout with monitoring',
        }],
    ]);

    /**
     * Create a new entry with pre-filled template
     */
    public createFromTemplate(
        type: EntryType,
        overrides?: Partial<StoryEntry>
    ): Partial<StoryEntry> {
        const template = this.templates.get(type);
        if (!template) {
            throw new Error(`No template found for type: ${type}`);
        }

        const now = new Date();
        const dateFormatted = this.formatDateUTC(now);

        return {
            title: `${template.titlePrefix} • `,
            date: dateFormatted,
            executiveSummary: template.exampleSummary,
            whatChanged: template.exampleWhatChanged,
            decisionsRationale: template.exampleDecisions,
            risksMitigations: template.exampleRisks,
            references: [],
            type,
            author: 'lux',
            version: 1,
            status: 'draft',
            tags: [...template.suggestedTags],
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            ...overrides,
        };
    }

    /**
     * Get template for a specific entry type
     */
    public getTemplate(type: EntryType): EntryTemplate | undefined {
        return this.templates.get(type);
    }

    /**
     * Auto-populate entry with repository context
     */
    public autoPopulateContext(entry: Partial<StoryEntry>, context: {
        commitSha?: string;
        prNumber?: number;
        issueNumber?: number;
        userName?: string;
    }): Partial<StoryEntry> {
        const enriched = { ...entry };

        // Add references based on context
        if (!enriched.references) {
            enriched.references = [];
        }

        if (context.commitSha) {
            enriched.references.push({
                id: context.commitSha,
                type: ReferenceType.CommitHash,
                description: 'Related commit',
            });
        }

        if (context.prNumber) {
            enriched.references.push({
                id: `PR#${context.prNumber}`,
                type: ReferenceType.External,
                description: `Pull Request #${context.prNumber}`,
            });
        }

        if (context.issueNumber) {
            enriched.references.push({
                id: `Issue#${context.issueNumber}`,
                type: ReferenceType.External,
                description: `Issue #${context.issueNumber}`,
            });
        }

        return enriched;
    }

    private formatDateUTC(date: Date): string {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
}

export const templateValidator = new TemplateValidator();
export const entryTemplateFactory = new EntryTemplateFactory();
