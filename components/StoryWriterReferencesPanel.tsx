import React, { memo } from 'react';
import { StoryEntry, Reference, ReferenceType } from '../types';

interface StoryWriterReferencesPanelProps {
  selectedEntry: StoryEntry | null;
}

const ReferenceItem: React.FC<{ reference: Reference }> = ({ reference }) => (
    <div className="bg-gray-700/50 p-3 rounded-md">
        <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-cyan-400 uppercase">{reference.type.replace('-', ' ')}</span>
            <button
                onClick={() => navigator.clipboard.writeText(reference.id)}
                className="text-xs text-gray-400 hover:text-white"
                title="Copy ID"
            >
                Copy ID
            </button>
        </div>
        <p className="text-sm font-mono text-white mt-1 truncate">{reference.id}</p>
        <p className="text-xs text-gray-300 mt-1">{reference.description}</p>
        {reference.url && (
            <a href={reference.url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-500 hover:underline">
                View Details
            </a>
        )}
    </div>
);

const StoryWriterReferencesPanel: React.FC<StoryWriterReferencesPanelProps> = memo(({ selectedEntry }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">References</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {selectedEntry && selectedEntry.references.length > 0 ? (
          selectedEntry.references.map((ref, index) => <ReferenceItem key={index} reference={ref} />)
        ) : (
          <div className="text-center text-gray-500 pt-8">
            <p>No references for this entry.</p>
          </div>
        )}
      </div>
       <div className="p-4 border-t border-gray-700">
            <button className="w-full py-2 px-4 bg-gray-600 text-white rounded-md font-semibold hover:bg-gray-500 text-sm">
                Add Reference
            </button>
        </div>
    </div>
  );
});

export default StoryWriterReferencesPanel;