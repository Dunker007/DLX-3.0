import { StoryWriterEntry } from '../types';

const STORAGE_KEY = 'dlx-story-writer-entries';

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
    private entries: Map<string, StoryWriterEntry>;

    constructor() {
        this.entries = new Map();
        this.loadFromStorage();
    }

    private loadFromStorage() {
        try {
            const storedEntries = localStorage.getItem(STORAGE_KEY);
            if (storedEntries) {
                const parsed: StoryWriterEntry[] = JSON.parse(storedEntries);
                parsed.forEach(entry => this.entries.set(entry.id, entry));
            } else {
                // If no entries, load initial data
                initialEntries.forEach(entry => this.entries.set(entry.id, entry));
                this.saveToStorage();
            }
        } catch (e) {
            console.error("Failed to load entries from storage", e);
            // Load initial data on failure
            initialEntries.forEach(entry => this.entries.set(entry.id, entry));
        }
    }

    private saveToStorage() {
        try {
            const entriesArray = Array.from(this.entries.values());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(entriesArray));
        } catch (e) {
            console.error("Failed to save entries to storage", e);
        }
    }

    public getEntries(): StoryWriterEntry[] {
        return Array.from(this.entries.values());
    }

    public getEntry(id: string): StoryWriterEntry | undefined {
        return this.entries.get(id);
    }

    public createEntry(entryData: Omit<StoryWriterEntry, 'id' | 'createdUtc' | 'updatedUtc'>): StoryWriterEntry {
        const newEntry: StoryWriterEntry = {
            ...entryData,
            id: Date.now().toString(),
            createdUtc: new Date().toISOString(),
            updatedUtc: new Date().toISOString(),
            revision: 1
        };
        this.entries.set(newEntry.id, newEntry);
        this.saveToStorage();
        return newEntry;
    }

    public updateEntry(id: string, updateData: StoryWriterEntry): StoryWriterEntry {
        const existingEntry = this.entries.get(id);
        if (!existingEntry) {
            throw new Error(`Entry with id ${id} not found`);
        }
        
        const updatedEntry: StoryWriterEntry = {
            ...existingEntry,
            ...updateData,
            updatedUtc: new Date().toISOString(),
        };
        
        this.entries.set(id, updatedEntry);
        this.saveToStorage();
        return updatedEntry;
    }

    public deleteEntry(id: string): boolean {
        const result = this.entries.delete(id);
        if (result) {
            this.saveToStorage();
        }
        return result;
    }
}

export const storyWriterService = new StoryWriterService();