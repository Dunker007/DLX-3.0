import { StoryEntry, EntryType, ReferenceType, Reference } from '../types';
import { storyWriterService } from './storyWriterService';
import { telemetryService } from './telemetryService';

export interface GitHubPREvent {
    action: string;
    pull_request: {
        number: number;
        title: string;
        html_url: string;
        merged_at: string | null;
        user: {
            login: string;
        };
        base: {
            ref: string;
        };
        head: {
            sha: string;
        };
        body: string | null;
    };
}

export interface GitHubIssueEvent {
    action: string;
    issue: {
        number: number;
        title: string;
        html_url: string;
        user: {
            login: string;
        };
        body: string | null;
        labels: Array<{ name: string }>;
    };
}

export interface GitHubReleaseEvent {
    action: string;
    release: {
        tag_name: string;
        name: string;
        html_url: string;
        body: string | null;
        author: {
            login: string;
        };
        published_at: string;
    };
}

export interface StoryWriterConfig {
    enableAutomation: boolean;
    autoPublish: boolean;
    defaultAuthor: 'lux' | 'mini-lux' | 'scribe';
    includeReferences: boolean;
}

class AutomationService {
    private config: StoryWriterConfig = {
        enableAutomation: true,
        autoPublish: false,
        defaultAuthor: 'mini-lux',
        includeReferences: true,
    };

    public setConfig(config: Partial<StoryWriterConfig>): void {
        this.config = { ...this.config, ...config };
    }

    public getConfig(): StoryWriterConfig {
        return { ...this.config };
    }

    /**
     * Generate a Story Writer entry from a PR merge event
     */
    public async createEntryFromPRMerge(event: GitHubPREvent): Promise<StoryEntry | null> {
        if (!this.config.enableAutomation) {
            return null;
        }

        if (!event.pull_request.merged_at) {
            return null; // Only process merged PRs
        }

        const startTime = Date.now();
        const pr = event.pull_request;
        const now = new Date();
        const dateFormatted = this.formatDateUTC(now);

        // Determine entry type based on PR title/labels
        const entryType = this.determineEntryTypeFromPR(pr);
        const author = this.config.defaultAuthor;

        // Build references
        const references: Reference[] = [];
        if (this.config.includeReferences) {
            references.push({
                id: `PR#${pr.number}`,
                type: ReferenceType.External,
                url: pr.html_url,
                description: `Pull Request #${pr.number}`,
                timestamp: pr.merged_at,
            });
            references.push({
                id: pr.head.sha.substring(0, 7),
                type: ReferenceType.CommitHash,
                description: `Merge commit for PR #${pr.number}`,
            });
        }

        const entry: StoryEntry = {
            id: crypto.randomUUID(),
            title: `Deploy • ${pr.title}`,
            date: dateFormatted,
            executiveSummary: this.generateExecutiveSummary(pr),
            whatChanged: this.extractWhatChanged(pr),
            decisionsRationale: this.extractDecisionsRationale(pr),
            risksMitigations: this.extractRisksMitigations(pr),
            references,
            type: entryType,
            author,
            version: 1,
            status: this.config.autoPublish ? 'published' : 'draft',
            tags: this.generateTags(pr, entryType),
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        };

        const savedEntry = storyWriterService.saveEntry(entry);
        const latency = Date.now() - startTime;

        telemetryService.logEvent({
            type: 'entry_create',
            entryId: savedEntry.id,
            tags: savedEntry.tags,
            creationLatencyMs: latency,
            isDraft: savedEntry.status === 'draft',
        });

        return savedEntry;
    }

    /**
     * Generate a Story Writer entry from an issue closure event
     */
    public async createEntryFromIssueClosure(event: GitHubIssueEvent): Promise<StoryEntry | null> {
        if (!this.config.enableAutomation || event.action !== 'closed') {
            return null;
        }

        const issue = event.issue;
        const now = new Date();
        const dateFormatted = this.formatDateUTC(now);

        // Check if it's an incident or milestone based on labels
        const entryType = this.determineEntryTypeFromIssue(issue);
        const author = this.config.defaultAuthor;

        const references: Reference[] = [];
        if (this.config.includeReferences) {
            references.push({
                id: `Issue#${issue.number}`,
                type: ReferenceType.External,
                url: issue.html_url,
                description: `Issue #${issue.number}`,
            });
        }

        const entry: StoryEntry = {
            id: crypto.randomUUID(),
            title: `${entryType === EntryType.Incident ? 'Incident' : 'Milestone'} • ${issue.title}`,
            date: dateFormatted,
            executiveSummary: issue.body || `Issue #${issue.number} resolved: ${issue.title}`,
            whatChanged: `Issue #${issue.number} was closed.`,
            decisionsRationale: 'See issue discussion for context.',
            risksMitigations: 'N/A',
            references,
            type: entryType,
            author,
            version: 1,
            status: this.config.autoPublish ? 'published' : 'draft',
            tags: this.generateTagsFromIssue(issue, entryType),
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        };

        return storyWriterService.saveEntry(entry);
    }

    /**
     * Generate a Story Writer entry from a release event
     */
    public async createEntryFromRelease(event: GitHubReleaseEvent): Promise<StoryEntry | null> {
        if (!this.config.enableAutomation || event.action !== 'published') {
            return null;
        }

        const release = event.release;
        const now = new Date();
        const dateFormatted = this.formatDateUTC(now);

        const references: Reference[] = [];
        if (this.config.includeReferences) {
            references.push({
                id: release.tag_name,
                type: ReferenceType.External,
                url: release.html_url,
                description: `Release ${release.tag_name}`,
                timestamp: release.published_at,
            });
        }

        const entry: StoryEntry = {
            id: crypto.randomUUID(),
            title: `Release • ${release.name || release.tag_name}`,
            date: dateFormatted,
            executiveSummary: release.body || `Release ${release.tag_name} published.`,
            whatChanged: `Released version ${release.tag_name}.`,
            decisionsRationale: 'Milestone release per project roadmap.',
            risksMitigations: 'Standard release process followed.',
            references,
            type: EntryType.Milestone,
            author: this.config.defaultAuthor,
            version: 1,
            status: this.config.autoPublish ? 'published' : 'draft',
            tags: ['release', 'deploy', 'milestone'],
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        };

        return storyWriterService.saveEntry(entry);
    }

    // --- Helper Methods ---

    private formatDateUTC(date: Date): string {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    private determineEntryTypeFromPR(pr: { title: string; body: string | null }): EntryType {
        const title = pr.title.toLowerCase();
        const body = (pr.body || '').toLowerCase();

        if (title.includes('rollback') || body.includes('rollback')) {
            return EntryType.Rollback;
        }
        if (title.includes('incident') || title.includes('hotfix') || title.includes('fix')) {
            return EntryType.Incident;
        }
        if (title.includes('flip') || title.includes('feature flag')) {
            return EntryType.Flip;
        }
        if (title.includes('milestone') || title.includes('release') || title.includes('major')) {
            return EntryType.Milestone;
        }
        if (title.includes('decision') || title.includes('rfc')) {
            return EntryType.Decision;
        }
        return EntryType.Routine;
    }

    private determineEntryTypeFromIssue(issue: { title: string; labels: Array<{ name: string }> }): EntryType {
        const title = issue.title.toLowerCase();
        const labelNames = issue.labels.map(l => l.name.toLowerCase());

        if (labelNames.includes('incident') || title.includes('incident')) {
            return EntryType.Incident;
        }
        if (labelNames.includes('milestone') || title.includes('milestone')) {
            return EntryType.Milestone;
        }
        if (labelNames.includes('decision') || title.includes('decision')) {
            return EntryType.Decision;
        }
        return EntryType.Routine;
    }

    private generateExecutiveSummary(pr: { title: string; body: string | null }): string {
        const body = pr.body || '';
        // Try to extract first paragraph or first 200 chars
        const firstParagraph = body.split('\n\n')[0].trim();
        if (firstParagraph && firstParagraph.length > 20) {
            return firstParagraph.substring(0, 300);
        }
        return `PR #${pr.title} was merged, implementing the described changes.`;
    }

    private extractWhatChanged(pr: { body: string | null }): string {
        const body = pr.body || '';
        // Look for "What Changed" or "Changes" section
        const changesSectionMatch = body.match(/##?\s*(What Changed|Changes)\s*\n([\s\S]*?)(?=\n##|$)/i);
        if (changesSectionMatch) {
            return changesSectionMatch[2].trim();
        }
        return 'See PR description for details.';
    }

    private extractDecisionsRationale(pr: { body: string | null }): string {
        const body = pr.body || '';
        // Look for "Rationale" or "Why" section
        const rationaleMatch = body.match(/##?\s*(Rationale|Why|Decisions?)\s*\n([\s\S]*?)(?=\n##|$)/i);
        if (rationaleMatch) {
            return rationaleMatch[2].trim();
        }
        return 'See PR discussion for rationale.';
    }

    private extractRisksMitigations(pr: { body: string | null }): string {
        const body = pr.body || '';
        // Look for "Risks" section
        const risksMatch = body.match(/##?\s*(Risks?|Mitigations?)\s*\n([\s\S]*?)(?=\n##|$)/i);
        if (risksMatch) {
            return risksMatch[2].trim();
        }
        return 'Standard deployment risks apply.';
    }

    private generateTags(pr: { title: string }, entryType: EntryType): string[] {
        const tags: string[] = ['deploy', 'automated'];
        
        const title = pr.title.toLowerCase();
        if (title.includes('feature')) tags.push('feature');
        if (title.includes('fix')) tags.push('bugfix');
        if (title.includes('security')) tags.push('security');
        if (title.includes('performance')) tags.push('optimization');
        if (title.includes('docs')) tags.push('doc-update');

        tags.push(entryType);
        return tags;
    }

    private generateTagsFromIssue(issue: { labels: Array<{ name: string }> }, entryType: EntryType): string[] {
        const tags: string[] = ['automated'];
        tags.push(...issue.labels.map(l => l.name.toLowerCase()));
        tags.push(entryType);
        return [...new Set(tags)]; // Remove duplicates
    }
}

export const automationService = new AutomationService();
