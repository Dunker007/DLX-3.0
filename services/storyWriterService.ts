import { StoryWriterEntry } from '../types';
import { embeddingService } from './embeddingService';
import { telemetryService } from './telemetryService';

const ENTRIES_STORAGE_KEY = 'dlx-story-writer-entries';
const DRAFTS_STORAGE_KEY = 'dlx-story-writer-drafts';

const initialEntries: StoryWriterEntry[] = [
  {
    "id": "1",
    "createdUtc": "2024-09-01T12:00:00Z",
    "updatedUtc": "2024-09-01T12:00:00Z",
    "title": "Inception • DLX • Project Boot",
    "dateUtc": "2024-09-01T12:00:00Z",
    "executiveSummary": "DLX project initiated: defined architecture vision, focusing on a local-first AI approach for cost control and data sovereignty.",
    "whatChanged": "- Monorepo created\n- Initial architecture notes added to `docs/architecture.md`\n- Phase 1 feature set defined.",
    "decisionsRationale": "Chose a local-first AI approach to empower users with privacy and reduce operational costs. A modular, vertical-slice-first delivery strategy was adopted to accelerate time-to-value.",
    "risksMitigations": "Risk: High initial complexity.\nMitigation: Adhere to a strict phased delivery plan, starting with the Vibe Coding Workspace as the first vertical slice.",
    "references": { "commitHashes": ["abcd1234"] },
    "tags": ["backfill","decision", "architecture"],
    "roleAttributions": [
      {"role":"lux","author":"lux","contributionSummary":"Strategic direction and core principles"},
      {"role":"mini-lux","author":"mini-lux","contributionSummary":"Logged baseline project requirements"}
    ],
    "revision": 1,
    "status": "active"
  },
  {
    "id": "2",
    "createdUtc": "2024-09-05T10:00:00Z",
    "updatedUtc": "2024-09-05T10:00:00Z",
    "title": "Deploy • Story Writer v1 • Module Scaffolding",
    "dateUtc": "2024-09-05T10:00:00Z",
    "executiveSummary": "The initial version of the Story Writer module was scaffolded and deployed. This provides the foundational narrative layer for tracking all subsequent project events and decisions.",
    "whatChanged": "- Added Story Writer to the main navigation.\n- Implemented data models and an in-memory/localStorage persistence layer.\n- Created UI for creating, viewing, and listing entries.",
    "decisionsRationale": "Prioritized the Story Writer module to ensure all future development has a clear audit and decision trail, aligning with the project's principle of operational clarity.",
    "risksMitigations": "Risk: Over-engineering the persistence layer early.\nMitigation: Started with a simple localStorage solution, with plans to migrate to a more robust database in Phase 2.",
    "references": { "commitHashes": ["fghij5678"] },
    "tags": ["deploy", "feature", "story-writer"],
    "roleAttributions": [
      {"role":"lux","author":"lux","contributionSummary":"Approved feature priority"},
      {"role":"scribe","author":"dev-team","contributionSummary":"Implemented Phase 1 of the module"}
    ],
    "revision": 1,
    "status": "active"
  }
];

class StoryWriterService {
    private entries: Map<string, StoryWriterEntry> = new Map();
    private drafts: Map<string, StoryWriterEntry> = new Map();

    constructor() {
        this.loadFromStorage();
    }

    private loadFromStorage() {
        this.entries = this.loadCollection(ENTRIES_STORAGE_KEY, initialEntries);
        this.drafts = this.loadCollection(DRAFTS_STORAGE_KEY, []);
    }
    
    private loadCollection(key: string, initialData: StoryWriterEntry[]): Map<string, StoryWriterEntry> {
        const collection = new Map<string, StoryWriterEntry>();
        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                const parsed: StoryWriterEntry[] = JSON.parse(stored);
                parsed.forEach(entry => collection.set(entry.id, entry));
            } else if (initialData.length > 0) {
                initialData.forEach(entry => collection.set(entry.id, entry));
                this.saveToStorage(key, collection);
            }
        } catch (e) {
            console.error(`Failed to load from ${key}`, e);
            initialData.forEach(entry => collection.set(entry.id, entry));
        }
        return collection;
    }

    private saveToStorage(key: string, collection: Map<string, StoryWriterEntry>) {
        try {
            const array = Array.from(collection.values());
            localStorage.setItem(key, JSON.stringify(array));
        } catch (e) {
            console.error(`Failed to save to ${key}`, e);
        }
    }

    private async generateIntegrityHash(entry: StoryWriterEntry): Promise<string> {
        const content = `${entry.title}${entry.dateUtc}${entry.executiveSummary}${entry.whatChanged}${entry.decisionsRationale}${entry.risksMitigations}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    private async processEmbeddings(entry: StoryWriterEntry): Promise<StoryWriterEntry> {
        const t0 = performance.now();
        entry.embeddings = {
            executiveSummary: embeddingService.embedText(entry.executiveSummary),
            decisionsRationale: embeddingService.embedText(entry.decisionsRationale),
            risksMitigations: embeddingService.embedText(entry.risksMitigations),
        };
        const durationMs = performance.now() - t0;
        telemetryService.logEvent({ type: 'embedding_job', entryId: entry.id, status: 'completed', durationMs });
        return entry;
    }

    // --- Public API ---

    public getEntries(): StoryWriterEntry[] { return Array.from(this.entries.values()); }
    public getDrafts(): StoryWriterEntry[] { return Array.from(this.drafts.values()); }

    public async createEntry(entryData: Omit<StoryWriterEntry, 'id' | 'createdUtc' | 'updatedUtc'>): Promise<StoryWriterEntry> {
        const t0 = performance.now();
        let newEntry: StoryWriterEntry = {
            ...entryData,
            id: crypto.randomUUID(),
            createdUtc: new Date().toISOString(),
            updatedUtc: new Date().toISOString(),
            revision: 1,
            isDraft: false,
        };
        newEntry.hash = await this.generateIntegrityHash(newEntry);
        newEntry = await this.processEmbeddings(newEntry);
        this.entries.set(newEntry.id, newEntry);
        this.saveToStorage(ENTRIES_STORAGE_KEY, this.entries);
        
        const latencyMs = performance.now() - t0;
        telemetryService.logEvent({ type: 'entry_create', entryId: newEntry.id, tags: newEntry.tags, creationLatencyMs: latencyMs, isDraft: false });

        return newEntry;
    }
    
    public async updateEntry(id: string, updateData: StoryWriterEntry): Promise<StoryWriterEntry> {
        const existingEntry = this.entries.get(id);
        if (!existingEntry) throw new Error(`Entry with id ${id} not found`);
        
        let updatedEntry: StoryWriterEntry = {
            ...existingEntry,
            ...updateData,
            updatedUtc: new Date().toISOString(),
        };
        updatedEntry.hash = await this.generateIntegrityHash(updatedEntry);
        updatedEntry = await this.processEmbeddings(updatedEntry);
        
        this.entries.set(id, updatedEntry);
        this.saveToStorage(ENTRIES_STORAGE_KEY, this.entries);
        return updatedEntry;
    }
    
    public async saveDraft(entryData: Partial<StoryWriterEntry>): Promise<StoryWriterEntry> {
        const id = entryData.id || crypto.randomUUID();
        const existingDraft = this.drafts.get(id) || { createdUtc: new Date().toISOString() };

        const newDraft: StoryWriterEntry = {
            ...existingDraft,
            ...entryData,
            id,
            updatedUtc: new Date().toISOString(),
            isDraft: true
        } as StoryWriterEntry;

        this.drafts.set(id, newDraft);
        this.saveToStorage(DRAFTS_STORAGE_KEY, this.drafts);
        return newDraft;
    }

    public async approveDraft(id: string): Promise<StoryWriterEntry> {
        const draft = this.drafts.get(id);
        if (!draft) throw new Error(`Draft with id ${id} not found`);

        this.drafts.delete(id);
        this.saveToStorage(DRAFTS_STORAGE_KEY, this.drafts);
        
        telemetryService.logEvent({type: 'entry_approve', entryId: id});
        return this.createEntry(draft);
    }
    
    public deleteDraft(id: string) {
        this.drafts.delete(id);
        this.saveToStorage(DRAFTS_STORAGE_KEY, this.drafts);
    }
    
    public findSimilarEntries(targetEntry: StoryWriterEntry, topK = 5): {entry: StoryWriterEntry, score: number}[] {
        const t0 = performance.now();
        const targetVector = targetEntry.embeddings?.executiveSummary;
        if (!targetVector) return [];

        const allEntries = this.getEntries().filter(e => e.id !== targetEntry.id && e.embeddings?.executiveSummary);
        
        const scores = allEntries.map(entry => ({
            entry,
            score: embeddingService.cosineSimilarity(targetVector, entry.embeddings!.executiveSummary!)
        }));

        scores.sort((a, b) => b.score - a.score);
        
        const latencyMs = performance.now() - t0;
        telemetryService.logEvent({ type: 'rag_search', query: `similar to ${targetEntry.id}`, results: Math.min(topK, scores.length), latencyMs });

        return scores.slice(0, topK);
    }
    
    public createDraftFromEvent(type: 'deploy_completed') {
        if (type === 'deploy_completed') {
            const draft: Partial<StoryWriterEntry> = {
                title: 'Deploy • New Component • Version X.Y.Z',
                tags: ['deploy', 'decision'],
                executiveSummary: 'A new component was successfully deployed to production.',
                whatChanged: '- Deployed component XYZ\n- Updated configuration',
                decisionsRationale: 'This deployment is part of the Q4 roadmap for improving user engagement.',
                risksMitigations: 'Risk: Potential downtime.\nMitigation: Monitored rollout with quick rollback capabilities.',
                dateUtc: new Date().toISOString(),
                references: {commitHashes: ['a1b2c3d4e5f6']}
            };
            this.saveDraft(draft);
        }
    }

    public exportData(): string {
        const data = {
            entries: this.getEntries(),
            drafts: this.getDrafts()
        };
        return JSON.stringify(data, null, 2);
    }
    
    public importData(jsonString: string): { success: boolean, message: string } {
        try {
            const data = JSON.parse(jsonString);
            if (!data.entries || !Array.isArray(data.entries)) {
                return { success: false, message: "Invalid format: 'entries' array not found." };
            }
            
            const newEntries = new Map<string, StoryWriterEntry>();
            data.entries.forEach((e: any) => newEntries.set(e.id, e));
            this.entries = newEntries;
            this.saveToStorage(ENTRIES_STORAGE_KEY, this.entries);
            
            if (data.drafts && Array.isArray(data.drafts)) {
                const newDrafts = new Map<string, StoryWriterEntry>();
                data.drafts.forEach((d: any) => newDrafts.set(d.id, d));
                this.drafts = newDrafts;
                this.saveToStorage(DRAFTS_STORAGE_KEY, this.drafts);
            }
            
            return { success: true, message: `Imported ${this.entries.size} entries and ${this.drafts.size} drafts.` };

        } catch (e: any) {
            return { success: false, message: `Import failed: ${e.message}` };
        }
    }
}

export const storyWriterService = new StoryWriterService();
