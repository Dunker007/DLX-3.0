import React, { useState, useEffect, useMemo } from 'react';
import { StoryEntry } from '../types';
import { storyWriterService } from '../services/storyWriterService';
import StoryWriterTimeline from './StoryWriterTimeline';
import StoryWriterEntryEditor from './StoryWriterEntryEditor';
import StoryWriterReferencesPanel from './StoryWriterReferencesPanel';
import TemplatePicker from './TemplatePicker';

const StoryWriterModule: React.FC = () => {
    const [entries, setEntries] = useState<StoryEntry[]>([]);
    const [activeEntry, setActiveEntry] = useState<StoryEntry | null>(null);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showTemplatePicker, setShowTemplatePicker] = useState<boolean>(false);

    useEffect(() => {
        loadEntries();
    }, []);

    const loadEntries = () => {
        const allEntries = storyWriterService.getEntries();
        setEntries(allEntries);
        // If there's an active entry, refresh its data. Otherwise, select the first one.
        if (activeEntry) {
            setActiveEntry(allEntries.find(e => e.id === activeEntry.id) || null);
        } else if (allEntries.length > 0) {
            setActiveEntry(allEntries.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]);
        }
    };

    const handleSelectEntry = (entry: StoryEntry) => {
        setActiveEntry(entry);
        setIsEditing(false);
    };

    const handleNewEntry = () => {
        setShowTemplatePicker(true);
    };

    const handleSelectTemplate = (template: Partial<StoryEntry>) => {
        // Only set as active entry if it has the minimum required structure
        // The editor will handle missing fields appropriately
        setActiveEntry(template as any);
        setIsEditing(true);
        setShowTemplatePicker(false);
    };

    const handleCancelTemplatePicker = () => {
        setShowTemplatePicker(false);
    };

    const handleSave = (entryToSave: StoryEntry) => {
        storyWriterService.saveEntry(entryToSave);
        loadEntries();
        setIsEditing(false);
        // After saving, find and set the saved entry as active
        const saved = storyWriterService.getEntryById(entryToSave.id);
        if(saved) setActiveEntry(saved);
    };

    const handleCancel = () => {
        setIsEditing(false);
        // If we were creating a new entry, activeEntry is null, so stay that way.
        // If we were editing, activeEntry is already set, so we just stop editing.
        if (!activeEntry && entries.length > 0) {
             setActiveEntry(entries.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]);
        }
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this entry?')) {
            storyWriterService.deleteEntry(id);
            const remainingEntries = entries.filter(e => e.id !== id);
            setEntries(remainingEntries);
            setActiveEntry(remainingEntries.length > 0 ? remainingEntries[0] : null);
            setIsEditing(false);
        }
    };

    const filteredEntries = useMemo(() => {
        return storyWriterService.searchEntries(searchQuery);
    }, [searchQuery, entries]);

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
            <header className="mb-4 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Story Writer</h1>
                    <p className="text-gray-400">The chronological, queryable narrative layer for DLX.</p>
                </div>
                <div className="flex items-center gap-4">
                     <input
                        type="text"
                        placeholder="Search entries..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64 p-2 bg-gray-800 border border-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <button onClick={handleNewEntry} className="px-4 py-2 bg-cyan-500 text-white rounded-md font-semibold hover:bg-cyan-600">
                        New Entry
                    </button>
                </div>
            </header>
            <div className="flex-1 flex gap-4 overflow-hidden">
                {/* Left Panel: Timeline */}
                <div className="w-1/4 bg-gray-800 rounded-lg flex flex-col">
                    <StoryWriterTimeline
                        entries={filteredEntries}
                        selectedEntry={activeEntry}
                        onSelectEntry={handleSelectEntry}
                    />
                </div>

                {/* Center Panel: Editor/Display */}
                <div className="w-1/2 bg-gray-800 rounded-lg flex flex-col">
                    <StoryWriterEntryEditor
                        entry={activeEntry}
                        isEditing={isEditing}
                        onSave={handleSave}
                        onCancel={handleCancel}
                        onEdit={() => setIsEditing(true)}
                        onDelete={handleDelete}
                    />
                </div>

                {/* Right Panel: References */}
                <div className="w-1/4 bg-gray-800 rounded-lg flex flex-col">
                    <StoryWriterReferencesPanel selectedEntry={activeEntry} />
                </div>
            </div>
            
            {/* Template Picker Modal */}
            {showTemplatePicker && (
                <TemplatePicker
                    onSelectTemplate={handleSelectTemplate}
                    onCancel={handleCancelTemplatePicker}
                />
            )}
        </div>
    );
};

export default StoryWriterModule;
