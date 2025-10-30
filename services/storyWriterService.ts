import { StoryEntry, EntryType, ReferenceType } from '../types';
import { telemetryService } from './telemetryService';
import { performanceMonitoringService } from './performanceMonitoringService';
import { securityService } from './securityService';

const ENTRIES_STORAGE_KEY = 'dlx-story-entries';

const initialEntries: StoryEntry[] = [
    {
        id: '01HDBB3J8Z4XJ4XJ4XJ4XJ4XJ4',
        title: "Inception • DLX • Project Boot",
        date: "2024-09-01 12:00:00",
        executiveSummary: "DLX project initiated: defined architecture vision, focusing on a local-first AI approach for cost control and data sovereignty.",
        whatChanged: "- Monorepo created\n- Initial architecture notes added to `docs/architecture.md`\n- Phase 1 feature set defined.",
        decisionsRationale: "Chose a local-first AI approach to empower users with privacy and reduce operational costs. A modular, vertical-slice-first delivery strategy was adopted to accelerate time-to-value.",
        risksMitigations: "Risk: High initial complexity.\nMitigation: Adhere to a strict phased delivery plan, starting with the Vibe Coding Workspace as the first vertical slice.",
        // FIX: Used ReferenceType enum member instead of a string literal to fix type error.
        references: [{ id: "abcd1234", type: ReferenceType.CommitHash, description: "Initial project commit" }],
        type: EntryType.Milestone,
        author: 'lux',
        version: 1,
        status: 'published',
        tags: ["backfill", "decision", "architecture"],
        createdAt: "2024-09-01T12:00:00Z",
        updatedAt: "2024-09-01T12:00:00Z",
    },
    {
        id: '01HDBB3J8Z4XJ4XJ4XJ4XJ4XJ5',
        title: "Incident • API Latency Spike",
        date: "2024-09-03 15:30:00",
        executiveSummary: "A misconfiguration in the caching layer led to a 500% increase in API latency for 45 minutes. The issue was resolved by rolling back the latest deployment.",
        whatChanged: "A deployment with an updated caching TTL policy was identified as the root cause.",
        decisionsRationale: "Immediate rollback was chosen to restore service stability. A long-term fix involves adding better validation for configuration changes.",
        risksMitigations: "Risk: Data inconsistency from failed requests.\nMitigation: Replayed failed jobs from the dead-letter queue after service restoration.",
        references: [
            // FIX: Used ReferenceType enum member instead of a string literal to fix type error.
            { id: "deploy-job-123", type: ReferenceType.DVJob, description: "Faulty deployment job" },
            // FIX: Used ReferenceType enum member instead of a string literal to fix type error.
            { id: "rollback-job-124", type: ReferenceType.DVJob, description: "Rollback deployment job" }
        ],
        type: EntryType.Incident,
        author: 'mini-lux',
        version: 1,
        status: 'published',
        tags: ["incident", "api", "caching", "rollback"],
        createdAt: "2024-09-03T16:20:00Z",
        updatedAt: "2024-09-03T16:20:00Z",
    },
    {
        id: '01HDBB3J8Z4XJ4XJ4XJ4XJ4XJ6',
        title: "Deploy • Story Writer v1 • Module Scaffolding",
        date: "2024-09-05 10:00:00",
        executiveSummary: "The initial version of the Story Writer module was scaffolded and deployed. This provides the foundational narrative layer for tracking all subsequent project events and decisions.",
        whatChanged: "- Added Story Writer to the main navigation.\n- Implemented data models and a localStorage persistence layer.\n- Created UI for creating, viewing, and listing entries.",
        decisionsRationale: "Prioritized the Story Writer module to ensure all future development has a clear audit and decision trail, aligning with the project's principle of operational clarity.",
        risksMitigations: "Risk: Over-engineering the persistence layer early.\nMitigation: Started with a simple localStorage solution, with plans to migrate to a more robust database in Phase 2.",
        // FIX: Used ReferenceType enum member instead of a string literal to fix type error.
        references: [{ id: "fghij5678", type: ReferenceType.CommitHash, description: "Commit for Story Writer scaffolding" }],
        type: EntryType.Milestone,
        author: 'scribe',
        version: 1,
        status: 'published',
        tags: ["deploy", "feature", "story-writer"],
        createdAt: "2024-09-05T10:00:00Z",
        updatedAt: "2024-09-05T10:00:00Z",
    }
];

class StoryWriterService {
    private entries: Map<string, StoryEntry> = new Map();
    private sortedEntriesCache: StoryEntry[] | null = null;

    constructor() {
        this.loadFromStorage();
    }

    private loadFromStorage() {
        try {
            const stored = localStorage.getItem(ENTRIES_STORAGE_KEY);
            if (stored) {
                const parsed: StoryEntry[] = JSON.parse(stored);
                parsed.forEach(entry => this.entries.set(entry.id, entry));
            } else {
                initialEntries.forEach(entry => this.entries.set(entry.id, entry));
                this.saveToStorage();
            }
        } catch (e) {
            console.error(`Failed to load from storage`, e);
            initialEntries.forEach(entry => this.entries.set(entry.id, entry));
        }
    }

    private saveToStorage() {
        try {
            const array = Array.from(this.entries.values());
            localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(array));
            this.invalidateCache();
        } catch (e) {
            console.error(`Failed to save to storage`, e);
        }
    }

    private invalidateCache() {
        this.sortedEntriesCache = null;
    }

    // --- Public API ---

    public saveEntry(entryData: StoryEntry): StoryEntry {
        const operationId = crypto.randomUUID();
        const now = new Date().toISOString();
        const isNewEntry = !entryData.id || !this.entries.has(entryData.id);
        
        // Start performance tracking
        performanceMonitoringService.startMetric(
            operationId,
            isNewEntry ? 'entry_creation' : 'entry_update',
            { entryType: entryData.type, tags: entryData.tags }
        );

        if (isNewEntry) {
            // Create new entry
            const newEntry: StoryEntry = {
                ...entryData,
                id: crypto.randomUUID(),
                createdAt: now,
                updatedAt: now,
                version: 1,
            };

            // Security validation
            const validation = securityService.validateEntry(newEntry);
            if (!validation.isValid) {
                console.warn('Entry validation issues:', validation.issues);
            }

            // Security audit
            securityService.logAudit({
                action: 'create',
                entryId: newEntry.id,
                userRole: newEntry.author,
                metadata: { type: newEntry.type, tags: newEntry.tags },
            });

            this.entries.set(newEntry.id, newEntry);
            
            const durationMs = performanceMonitoringService.endMetric(operationId) || 0;
            telemetryService.logEvent({ 
                type: 'entry_create', 
                entryId: newEntry.id, 
                tags: newEntry.tags, 
                creationLatencyMs: durationMs, 
                isDraft: newEntry.status === 'draft' 
            });
            
            this.saveToStorage();
            return newEntry;
        } else {
            // Update existing entry
            const existing = this.entries.get(entryData.id)!;
            const updatedEntry: StoryEntry = {
                ...existing,
                ...entryData,
                updatedAt: now,
                version: existing.version + 1,
            };

            // Track changes for audit
            const changes = securityService.trackChanges(existing, updatedEntry);
            
            // Security audit
            securityService.logAudit({
                action: 'update',
                entryId: updatedEntry.id,
                userRole: updatedEntry.author,
                changes,
                metadata: { previousVersion: existing.version, newVersion: updatedEntry.version },
            });

            this.entries.set(updatedEntry.id, updatedEntry);
            performanceMonitoringService.endMetric(operationId);
            this.saveToStorage();
            return updatedEntry;
        }
    }

    public getEntries(): StoryEntry[] {
        if (this.sortedEntriesCache) {
            return this.sortedEntriesCache;
        }
        const sorted = Array.from(this.entries.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        this.sortedEntriesCache = sorted;
        return sorted;
    }

    public getEntryById(id: string): StoryEntry | undefined {
        return this.entries.get(id);
    }

    public deleteEntry(id: string): void {
        const entry = this.entries.get(id);
        if (entry) {
            // Security audit for deletion
            securityService.logAudit({
                action: 'delete',
                entryId: id,
                userRole: entry.author,
                metadata: { title: entry.title, type: entry.type },
            });
        }
        this.entries.delete(id);
        this.saveToStorage();
    }

    public searchEntries(query: string): StoryEntry[] {
        const operationId = crypto.randomUUID();
        performanceMonitoringService.startMetric(operationId, 'search', { query });
        
        const allEntries = this.getEntries();
        if (!query.trim()) {
            performanceMonitoringService.endMetric(operationId);
            return allEntries;
        }
        const lowerCaseQuery = query.toLowerCase();
        const results = allEntries.filter(entry =>
            entry.title.toLowerCase().includes(lowerCaseQuery) ||
            entry.executiveSummary.toLowerCase().includes(lowerCaseQuery) ||
            entry.tags.some(tag => tag.toLowerCase().includes(lowerCaseQuery))
        );
        
        performanceMonitoringService.endMetric(operationId);
        return results;
    }
}

export const storyWriterService = new StoryWriterService();