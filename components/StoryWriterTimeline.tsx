import React, { useState } from 'react';
import { StoryEntry, EntryType } from '../types';
import { 
    DocumentTextIcon, ExclamationTriangleIcon, CheckCircleIcon, ClockIcon, 
    ArrowUturnLeftIcon, ArrowsRightLeftIcon, StoryWriterIcon 
} from './icons';

interface StoryWriterTimelineProps {
  entries: StoryEntry[];
  selectedEntry: StoryEntry | null;
  onSelectEntry: (entry: StoryEntry) => void;
}

const EntryTypeIcon: React.FC<{ type: EntryType, className: string }> = ({ type, className }) => {
    switch (type) {
        case EntryType.Decision: return <DocumentTextIcon className={className} />;
        case EntryType.Incident: return <ExclamationTriangleIcon className={className} />;
        case EntryType.Milestone: return <CheckCircleIcon className={className} />;
        case EntryType.Routine: return <ClockIcon className={className} />;
        case EntryType.Rollback: return <ArrowUturnLeftIcon className={className} />;
        case EntryType.Flip: return <ArrowsRightLeftIcon className={className} />;
        default: return <StoryWriterIcon className={className} />;
    }
};

const StoryWriterTimeline: React.FC<StoryWriterTimelineProps> = ({ entries, selectedEntry, onSelectEntry }) => {
    const [filter, setFilter] = useState<EntryType | 'all'>('all');

    const filteredEntries = entries.filter(entry => 
        (filter === 'all' || entry.type === filter) && entry.status !== 'archived'
    );
    
    const filters: {key: EntryType | 'all', label: string}[] = [
        { key: 'all', label: 'All' },
        { key: EntryType.Decision, label: 'Decisions' },
        { key: EntryType.Incident, label: 'Incidents' },
        { key: EntryType.Milestone, label: 'Milestones' },
        { key: EntryType.Routine, label: 'Routine' },
    ];

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-white">Timeline</h2>
                 <div className="flex flex-wrap gap-2 mt-2">
                    {filters.map(f => (
                        <button 
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-2 py-1 text-xs rounded-full ${filter === f.key ? 'bg-cyan-500 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>
            <ul className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredEntries.map(entry => (
                    <li key={entry.id}>
                        <button
                            onClick={() => onSelectEntry(entry)}
                            className={`w-full text-left p-3 rounded-md border-l-4 transition-colors ${
                                selectedEntry?.id === entry.id
                                    ? 'bg-cyan-500/20 border-cyan-400'
                                    : 'bg-gray-800/50 border-gray-700 hover:bg-gray-700/50'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <EntryTypeIcon type={entry.type} className="w-5 h-5 text-gray-400" />
                                <div className="flex-1 overflow-hidden">
                                    <h3 className="font-semibold text-white truncate text-sm">{entry.title}</h3>
                                    <p className="text-xs text-gray-500">{new Date(entry.date).toLocaleString()}</p>
                                    <p className="text-xs text-gray-400 mt-1 truncate">{entry.executiveSummary}</p>
                                </div>
                            </div>
                        </button>
                    </li>
                ))}
                {filteredEntries.length === 0 && <p className="text-center text-gray-500 text-sm mt-4">No entries match your filter.</p>}
            </ul>
        </div>
    );
};

export default StoryWriterTimeline;
