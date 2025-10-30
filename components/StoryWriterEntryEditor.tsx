import React, { useState, useEffect } from 'react';
import { StoryEntry, EntryType, TAG_SUGGESTIONS } from '../types';

interface EntryEditorProps {
    entry: StoryEntry | null;
    isEditing: boolean;
    onSave: (entry: StoryEntry) => void;
    onCancel: () => void;
    onEdit: () => void;
    onDelete: (id: string) => void;
}

const EntryDisplay: React.FC<{ entry: StoryEntry; onEdit: () => void }> = ({ entry, onEdit }) => (
    <div className="prose prose-invert max-w-none prose-h1:text-2xl prose-h1:mb-2 prose-p:text-gray-300 prose-li:text-gray-300">
        <div className="flex justify-between items-start">
            <div>
                <h1>{entry.title}</h1>
                <p className="text-sm text-gray-500 !mt-0">
                    {new Date(entry.date).toLocaleString()} | Version {entry.version}
                </p>
            </div>
            <button onClick={onEdit} className="px-4 py-2 bg-cyan-600 text-sm text-white rounded-md hover:bg-cyan-500">Edit</button>
        </div>
        <div className="flex flex-wrap gap-2 my-4">
            {entry.tags.map(tag => <span key={tag} className="px-2 py-1 text-sm bg-gray-700 text-gray-300 rounded-full no-underline">{tag}</span>)}
        </div>
        <h2>Executive Summary</h2>
        <p>{entry.executiveSummary}</p>
        <h2>What Changed</h2>
        <pre className="whitespace-pre-wrap font-sans bg-gray-900/50 p-2 rounded">{entry.whatChanged}</pre>
        <h2>Decisions & Rationale</h2>
        <pre className="whitespace-pre-wrap font-sans bg-gray-900/50 p-2 rounded">{entry.decisionsRationale}</pre>
        <h2>Risks & Mitigations</h2>
        <pre className="whitespace-pre-wrap font-sans bg-gray-900/50 p-2 rounded">{entry.risksMitigations}</pre>
    </div>
);

const EntryForm: React.FC<Omit<EntryEditorProps, 'onEdit'>> = ({ entry, onSave, onCancel, onDelete }) => {
    const isNew = !entry;
    const [formData, setFormData] = useState<Partial<StoryEntry>>(
        isNew ? {
            title: '',
            date: new Date().toISOString().slice(0, 16).replace('T', ' '),
            executiveSummary: '',
            whatChanged: '',
            decisionsRationale: '',
            risksMitigations: '',
            references: [],
            tags: [],
            type: EntryType.Decision,
            author: 'scribe',
            status: 'draft',
        } : { ...entry }
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Basic validation
        if (!formData.title || !formData.executiveSummary) {
            alert("Title and Executive Summary are required.");
            return;
        }
        onSave(formData as StoryEntry);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-2xl font-bold text-white">{isNew ? 'Create New Entry' : 'Edit Entry'}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-300">Title</label>
                    <input type="text" name="title" value={formData.title} onChange={handleChange} required className="mt-1 w-full p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">Date (UTC)</label>
                    <input type="datetime-local" name="date" value={formData.date?.replace(' ', 'T')} onChange={e => handleChange({ ...e, target: {...e.target, value: e.target.value.replace('T', ' ')}})} required className="mt-1 w-full p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">Entry Type</label>
                    <select name="type" value={formData.type} onChange={handleChange} className="mt-1 w-full p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500">
                        {Object.values(EntryType).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-300">Author</label>
                    <select name="author" value={formData.author} onChange={handleChange} className="mt-1 w-full p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500">
                        <option value="scribe">Scribe</option>
                        <option value="mini-lux">Mini-Lux</option>
                        <option value="lux">Lux</option>
                    </select>
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-300">Tags (comma-separated)</label>
                <input type="text" name="tags" value={Array.isArray(formData.tags) ? formData.tags.join(', ') : ''} onChange={e => setFormData({...formData, tags: e.target.value.split(',').map(t => t.trim())})} list="tag-suggestions" className="mt-1 w-full p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
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
                <textarea name="whatChanged" value={formData.whatChanged} onChange={handleChange} rows={4} className="mt-1 w-full p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300">Decisions & Rationale</label>
                <textarea name="decisionsRationale" value={formData.decisionsRationale} onChange={handleChange} rows={4} className="mt-1 w-full p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300">Risks & Mitigations</label>
                <textarea name="risksMitigations" value={formData.risksMitigations} onChange={handleChange} rows={4} className="mt-1 w-full p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>

            <div className="flex justify-between items-center">
                 <div>
                    {!isNew && entry && (
                        <button type="button" onClick={() => onDelete(entry.id)} className="px-4 py-2 bg-red-800 text-white rounded-md font-semibold hover:bg-red-700 text-sm">Delete</button>
                    )}
                </div>
                <div className="flex justify-end gap-4">
                    <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-600 text-white rounded-md font-semibold hover:bg-gray-500">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-cyan-500 text-white rounded-md font-semibold hover:bg-cyan-600">Save Entry</button>
                </div>
            </div>
        </form>
    );
}

const StoryWriterEntryEditor: React.FC<EntryEditorProps> = ({ entry, isEditing, onSave, onCancel, onEdit, onDelete }) => {
    return (
        <div className="flex-1 overflow-y-auto p-6">
            {isEditing ? (
                <EntryForm entry={entry} onSave={onSave} onCancel={onCancel} onDelete={onDelete} />
            ) : entry ? (
                <EntryDisplay entry={entry} onEdit={onEdit} />
            ) : (
                 <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                    <p className="text-lg">Select an entry from the timeline or create a new one.</p>
                </div>
            )}
        </div>
    );
};

export default StoryWriterEntryEditor;
