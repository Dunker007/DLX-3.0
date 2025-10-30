import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StoryWriterEntry, TAG_SUGGESTIONS } from '../types';
import { storyWriterService } from '../services/storyWriterService';
import Spinner from './Spinner';
import { DownloadIcon, UploadIcon } from './icons';

const SimilarityModal: React.FC<{ results: {entry: StoryWriterEntry, score: number}[]; onClose: () => void; onSelect: (entry: StoryWriterEntry) => void; }> = ({ results, onClose, onSelect }) => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-white mb-4">Similar Entries</h2>
        <div className="overflow-y-auto flex-1 space-y-3">
            {results.length > 0 ? results.map(({entry, score}) => (
                <div key={entry.id} onClick={() => onSelect(entry)} className="p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 cursor-pointer">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-white truncate">{entry.title}</h3>
                        <span className="text-sm text-cyan-400 font-mono">{(score * 100).toFixed(1)}%</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 truncate">{entry.executiveSummary}</p>
                </div>
            )) : <p className="text-gray-400">No similar entries found.</p>}
        </div>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-cyan-500 text-white rounded-md font-semibold hover:bg-cyan-600 self-end">Close</button>
      </div>
    </div>
);


const StoryWriterModule: React.FC = () => {
    const [entries, setEntries] = useState<StoryWriterEntry[]>([]);
    const [drafts, setDrafts] = useState<StoryWriterEntry[]>([]);
    const [selectedEntry, setSelectedEntry] = useState<StoryWriterEntry | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState<'published' | 'drafts'>('published');
    const [searchTerm, setSearchTerm] = useState('');
    const [similarEntries, setSimilarEntries] = useState<{entry: StoryWriterEntry, score: number}[] | null>(null);
    const importFileRef = useRef<HTMLInputElement>(null);

    useEffect(() => { loadAllData(); }, []);

    const loadAllData = () => {
        setEntries(storyWriterService.getEntries().sort((a,b) => new Date(b.dateUtc).getTime() - new Date(a.dateUtc).getTime()));
        setDrafts(storyWriterService.getDrafts().sort((a,b) => new Date(b.updatedUtc).getTime() - new Date(a.updatedUtc).getTime()));
    };

    const handleSelectEntry = (entry: StoryWriterEntry) => {
        setSelectedEntry(entry);
        setIsEditing(false);
        setActiveTab(entry.isDraft ? 'drafts' : 'published');
    };

    const handleNewEntry = () => {
        setSelectedEntry(null);
        setIsEditing(true);
    };

    const handleSaveEntry = async (entryData: StoryWriterEntry) => {
        if (entryData.isDraft) {
            await storyWriterService.saveDraft(entryData);
        } else if (entryData.id && entries.some(e => e.id === entryData.id)) { // it's an existing entry
            await storyWriterService.updateEntry(entryData.id, entryData);
        } else { // it's a new entry
            await storyWriterService.createEntry(entryData);
        }
        loadAllData();
        setIsEditing(false);
        const latestEntries = storyWriterService.getEntries();
        setSelectedEntry(latestEntries.find(e => e.id === entryData.id) || latestEntries[0]);
    };
    
    const handleApproveDraft = async (id: string) => {
        const approvedEntry = await storyWriterService.approveDraft(id);
        loadAllData();
        setActiveTab('published');
        setSelectedEntry(approvedEntry);
        setIsEditing(false);
    }
    
    const handleDeleteDraft = (id: string) => {
        if(window.confirm("Are you sure you want to delete this draft?")) {
            storyWriterService.deleteDraft(id);
            loadAllData();
            if(selectedEntry?.id === id) setSelectedEntry(null);
        }
    }

    const handleCancel = () => {
        setIsEditing(false);
        if(!selectedEntry) setSelectedEntry(null);
    };

    const handleFindSimilar = () => {
        if (selectedEntry) {
            const results = storyWriterService.findSimilarEntries(selectedEntry);
            setSimilarEntries(results);
        }
    };

    const handleExport = () => {
        const data = storyWriterService.exportData();
        const blob = new Blob([data], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dlx-story-writer-export-${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = storyWriterService.importData(e.target?.result as string);
            alert(result.message);
            if(result.success) loadAllData();
        };
        reader.readAsText(file);
    };

    const currentList = activeTab === 'published' ? entries : drafts;
    const filteredEntries = useMemo(() => {
        if (!searchTerm) return currentList;
        return currentList.filter(entry => 
            entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (entry.executiveSummary && entry.executiveSummary.toLowerCase().includes(searchTerm.toLowerCase())) ||
            entry.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [currentList, searchTerm]);

    return (
        <div className="flex h-[calc(100vh-4rem)] gap-4">
            {similarEntries && <SimilarityModal results={similarEntries} onClose={() => setSimilarEntries(null)} onSelect={(entry) => { handleSelectEntry(entry); setSimilarEntries(null); }}/>}
            <input type="file" accept=".json" ref={importFileRef} onChange={handleImport} className="hidden" />

            {/* Left Panel */}
            <div className="w-1/3 bg-gray-800 rounded-lg p-4 flex flex-col">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold text-white">Story Writer</h2>
                    <button onClick={handleNewEntry} className="px-3 py-1 bg-cyan-500 text-white text-sm rounded-md font-semibold hover:bg-cyan-600">New Entry</button>
                </div>
                <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => importFileRef.current?.click()} className="flex-1 px-2 py-1 bg-gray-700 text-white text-xs rounded-md hover:bg-gray-600 flex items-center justify-center gap-1"><UploadIcon className="w-4 h-4" /> Import</button>
                    <button onClick={handleExport} className="flex-1 px-2 py-1 bg-gray-700 text-white text-xs rounded-md hover:bg-gray-600 flex items-center justify-center gap-1"><DownloadIcon className="w-4 h-4" /> Export</button>
                </div>
                <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 bg-gray-700 text-white rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
                <div className="flex border-b border-gray-700 mb-2">
                    <button onClick={() => setActiveTab('published')} className={`flex-1 py-2 text-sm ${activeTab === 'published' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}>Published ({entries.length})</button>
                    <button onClick={() => setActiveTab('drafts')} className={`flex-1 py-2 text-sm ${activeTab === 'drafts' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}>Drafts ({drafts.length})</button>
                </div>

                <ul className="flex-1 overflow-y-auto space-y-2">
                    {filteredEntries.map(entry => (
                        <li key={entry.id} onClick={() => handleSelectEntry(entry)}
                            className={`p-3 rounded-md cursor-pointer transition-colors ${selectedEntry?.id === entry.id ? 'bg-cyan-500/20' : 'hover:bg-gray-700/50'}`}>
                            <h3 className="font-semibold text-white truncate">{entry.title || "Untitled"}</h3>
                            <p className="text-xs text-gray-400">{new Date(entry.isDraft ? entry.updatedUtc : entry.dateUtc).toLocaleString()}</p>
                        </li>
                    ))}
                </ul>
                <button onClick={() => storyWriterService.createDraftFromEvent('deploy_completed')} className="mt-2 w-full text-center px-2 py-1 bg-gray-700 text-white text-xs rounded-md hover:bg-gray-600">Simulate Deploy Event</button>
            </div>

            {/* Right Panel */}
            <div className="w-2/3 bg-gray-800 rounded-lg p-6 overflow-y-auto">
                {isEditing ? (
                    <EntryForm key={selectedEntry?.id || 'new'} currentEntry={selectedEntry} onSave={handleSaveEntry} onCancel={handleCancel} onApprove={handleApproveDraft} onDeleteDraft={handleDeleteDraft}/>
                ) : selectedEntry ? (
                    <EntryDetail entry={selectedEntry} onEdit={() => setIsEditing(true)} onFindSimilar={handleFindSimilar} />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                        <p className="text-lg">Select an entry to view or create a new one.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const EntryDetail: React.FC<{ entry: StoryWriterEntry; onEdit: () => void; onFindSimilar: () => void; }> = ({ entry, onEdit, onFindSimilar }) => {
    return (
        <div className="prose prose-invert max-w-none prose-h1:text-2xl prose-h1:mb-2 prose-p:text-gray-300 prose-li:text-gray-300">
            <div className="flex justify-between items-start">
                <div>
                    <h1>{entry.title} {entry.isDraft && <span className="text-sm text-yellow-400">(Draft)</span>}</h1>
                    <p className="text-sm text-gray-500 !mt-0">
                        {new Date(entry.dateUtc).toLocaleString()} | Revision {entry.revision}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={onFindSimilar} className="px-4 py-2 bg-gray-700 text-sm text-white rounded-md hover:bg-gray-600">Find Similar</button>
                    <button onClick={onEdit} className="px-4 py-2 bg-cyan-600 text-sm text-white rounded-md hover:bg-cyan-500">Edit</button>
                </div>
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

const EntryForm: React.FC<{ currentEntry: StoryWriterEntry | null; onSave: (entry: StoryWriterEntry) => void; onCancel: () => void; onApprove: (id: string) => void; onDeleteDraft: (id: string) => void; }> = ({ currentEntry, onSave, onCancel, onApprove, onDeleteDraft }) => {
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
            revision: 1,
            isDraft: !currentEntry
        }
    );
    const [tagsInput, setTagsInput] = useState(currentEntry?.tags.join(', ') || '');
    const isDraft = formData.isDraft;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalData = { ...formData, tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean) } as StoryWriterEntry;
        onSave(finalData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-2xl font-bold text-white">{currentEntry ? (isDraft ? 'Edit Draft' : 'Edit Entry') : 'Create New Entry'}</h2>
            
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

            <div className="flex justify-between items-center">
                <div>
                    {isDraft && currentEntry?.id && (
                        <button type="button" onClick={() => onDeleteDraft(currentEntry.id)} className="px-4 py-2 bg-red-800 text-white rounded-md font-semibold hover:bg-red-700 text-sm">Delete Draft</button>
                    )}
                </div>
                <div className="flex justify-end gap-4">
                    <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-600 text-white rounded-md font-semibold hover:bg-gray-500">Cancel</button>
                    {isDraft ? (
                        <>
                            <button type="submit" onClick={() => setFormData(f => ({...f, isDraft: true}))} className="px-4 py-2 bg-gray-500 text-white rounded-md font-semibold hover:bg-gray-400">Save Draft</button>
                            <button type="button" onClick={() => onApprove(currentEntry!.id)} className="px-4 py-2 bg-green-600 text-white rounded-md font-semibold hover:bg-green-500">Approve & Publish</button>
                        </>
                    ) : (
                        <button type="submit" onClick={() => setFormData(f => ({...f, isDraft: false}))} className="px-4 py-2 bg-cyan-500 text-white rounded-md font-semibold hover:bg-cyan-600">Save Entry</button>
                    )}
                </div>
            </div>
        </form>
    );
};

export default StoryWriterModule;
