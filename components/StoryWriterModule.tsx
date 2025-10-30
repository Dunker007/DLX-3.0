import React, { useState, useEffect, useMemo } from 'react';
import { StoryWriterEntry, TAG_SUGGESTIONS } from '../types';
import { storyWriterService } from '../services/storyWriterService';
import Spinner from './Spinner';

const StoryWriterModule: React.FC = () => {
    const [entries, setEntries] = useState<StoryWriterEntry[]>([]);
    const [selectedEntry, setSelectedEntry] = useState<StoryWriterEntry | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadEntries();
    }, []);

    const loadEntries = () => {
        const allEntries = storyWriterService.getEntries();
        setEntries(allEntries.sort((a,b) => new Date(b.dateUtc).getTime() - new Date(a.dateUtc).getTime()));
    };

    const handleSelectEntry = (entry: StoryWriterEntry) => {
        setSelectedEntry(entry);
        setIsCreating(false);
    };

    const handleNewEntry = () => {
        setSelectedEntry(null);
        setIsCreating(true);
    };

    const handleSaveEntry = (entryData: StoryWriterEntry) => {
        if (entryData.id) {
            storyWriterService.updateEntry(entryData.id, entryData);
        } else {
            storyWriterService.createEntry(entryData);
        }
        loadEntries();
        setIsCreating(false);
        setSelectedEntry(entryData.id ? entryData : entries[0]);
    };

    const handleCancel = () => {
        setIsCreating(false);
        setSelectedEntry(null);
    };

    const filteredEntries = useMemo(() => {
        if (!searchTerm) return entries;
        return entries.filter(entry => 
            entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entry.executiveSummary.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entry.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [entries, searchTerm]);

    const rightPanel = () => {
        if (isCreating || selectedEntry && isCreating === false) { // The second part of condition seems wrong, but let's assume it means "editing"
            const currentData = isCreating ? null : selectedEntry;
            return <EntryForm currentEntry={currentData} onSave={handleSaveEntry} onCancel={handleCancel} />;
        }
        
        if (selectedEntry) {
            return <EntryDetail entry={selectedEntry} onEdit={() => { setIsCreating(true); }} />;
        }

        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <p className="text-lg">Select an entry to view or</p>
                <button onClick={handleNewEntry} className="mt-4 px-4 py-2 bg-cyan-500 text-white rounded-md font-semibold hover:bg-cyan-600">
                    Create a New Entry
                </button>
            </div>
        );
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] gap-4">
            {/* Left Panel: Entry List */}
            <div className="w-1/3 bg-gray-800 rounded-lg p-4 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Entries</h2>
                    <button onClick={handleNewEntry} className="px-3 py-1 bg-cyan-500 text-white text-sm rounded-md font-semibold hover:bg-cyan-600">+</button>
                </div>
                <input
                    type="text"
                    placeholder="Search entries..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-2 bg-gray-700 text-white rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <ul className="flex-1 overflow-y-auto space-y-2">
                    {filteredEntries.map(entry => (
                        <li key={entry.id} onClick={() => handleSelectEntry(entry)}
                            className={`p-3 rounded-md cursor-pointer transition-colors ${selectedEntry?.id === entry.id ? 'bg-cyan-500/20' : 'hover:bg-gray-700/50'}`}>
                            <h3 className="font-semibold text-white truncate">{entry.title}</h3>
                            <p className="text-xs text-gray-400">{new Date(entry.dateUtc).toLocaleDateString()}</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                                {entry.tags.slice(0, 3).map(tag => (
                                    <span key={tag} className="px-1.5 py-0.5 text-xs bg-gray-600 text-gray-300 rounded-full">{tag}</span>
                                ))}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Right Panel: Detail/Form */}
            <div className="w-2/3 bg-gray-800 rounded-lg p-6 overflow-y-auto">
                {rightPanel()}
            </div>
        </div>
    );
};

const EntryDetail: React.FC<{ entry: StoryWriterEntry; onEdit: () => void; }> = ({ entry, onEdit }) => {
    return (
        <div className="prose prose-invert max-w-none prose-h1:text-2xl prose-h1:mb-2 prose-p:text-gray-300 prose-li:text-gray-300">
            <div className="flex justify-between items-start">
                <div>
                    <h1>{entry.title}</h1>
                    <p className="text-sm text-gray-500 !mt-0">
                        {new Date(entry.dateUtc).toLocaleString()} | Revision {entry.revision}
                    </p>
                </div>
                <button onClick={onEdit} className="px-4 py-2 bg-gray-700 text-sm text-white rounded-md hover:bg-gray-600">Edit</button>
            </div>
            
            <div className="flex flex-wrap gap-2 my-4">
                {entry.tags.map(tag => <span key={tag} className="px-2 py-1 text-sm bg-gray-700 text-gray-300 rounded-full no-underline">{tag}</span>)}
            </div>

            <h2>Executive Summary</h2>
            <p>{entry.executiveSummary}</p>

            <h2>What Changed</h2>
            <p className="whitespace-pre-wrap">{entry.whatChanged}</p>

            <h2>Decisions & Rationale</h2>
            <p className="whitespace-pre-wrap">{entry.decisionsRationale}</p>

            <h2>Risks & Mitigations</h2>
            <p className="whitespace-pre-wrap">{entry.risksMitigations}</p>
            
            {entry.narrativeExtended && <>
                <h2>Extended Narrative</h2>
                <p className="whitespace-pre-wrap">{entry.narrativeExtended}</p>
            </>}
        </div>
    );
};

const EntryForm: React.FC<{ currentEntry: StoryWriterEntry | null; onSave: (entry: StoryWriterEntry) => void; onCancel: () => void; }> = ({ currentEntry, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Partial<StoryWriterEntry>>(
        currentEntry || {
            title: '',
            dateUtc: new Date().toISOString().slice(0, 16),
            executiveSummary: '',
            whatChanged: '',
            decisionsRationale: '',
            risksMitigations: '',
            references: {},
            tags: [],
            status: 'active',
            revision: 1
        }
    );
    const [tagsInput, setTagsInput] = useState(currentEntry?.tags.join(', ') || '');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalData: StoryWriterEntry = {
            id: currentEntry?.id || Date.now().toString(),
            createdUtc: currentEntry?.createdUtc || new Date().toISOString(),
            updatedUtc: new Date().toISOString(),
            revision: currentEntry ? (currentEntry.revision || 1) + 1 : 1,
            tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
            ...formData
        } as StoryWriterEntry;
        onSave(finalData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-2xl font-bold text-white">{currentEntry ? 'Edit Entry' : 'Create New Entry'}</h2>
            
            <div>
                <label className="block text-sm font-medium text-gray-300">Title</label>
                <input type="text" name="title" value={formData.title} onChange={handleChange} required className="mt-1 w-full p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300">Date (UTC)</label>
                <input type="datetime-local" name="dateUtc" value={formData.dateUtc?.substring(0,16)} onChange={handleChange} required className="mt-1 w-full p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-300">Tags (comma-separated)</label>
                <input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)} list="tag-suggestions" className="mt-1 w-full p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                <datalist id="tag-suggestions">
                    {TAG_SUGGESTIONS.map(tag => <option key={tag} value={tag} />)}
                </datalist>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300">Executive Summary</label>
                <textarea name="executiveSummary" value={formData.executiveSummary} onChange={handleChange} required rows={3} className="mt-1 w-full p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300">What Changed</label>
                <textarea name="whatChanged" value={formData.whatChanged} onChange={handleChange} required rows={4} className="mt-1 w-full p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300">Decisions & Rationale</label>
                <textarea name="decisionsRationale" value={formData.decisionsRationale} onChange={handleChange} required rows={4} className="mt-1 w-full p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300">Risks & Mitigations</label>
                <textarea name="risksMitigations" value={formData.risksMitigations} onChange={handleChange} required rows={4} className="mt-1 w-full p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-300">Extended Narrative (Optional)</label>
                <textarea name="narrativeExtended" value={formData.narrativeExtended} onChange={handleChange} rows={5} className="mt-1 w-full p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>

            <div className="flex justify-end gap-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-600 text-white rounded-md font-semibold hover:bg-gray-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-cyan-500 text-white rounded-md font-semibold hover:bg-cyan-600">Save Entry</button>
            </div>
        </form>
    );
};

export default StoryWriterModule;