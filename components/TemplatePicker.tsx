import React, { useState } from 'react';
import { EntryType, StoryEntry } from '../types';
import { entryTemplateFactory, EntryTemplate } from '../services/templateValidator';

interface TemplatePickerProps {
    onSelectTemplate: (template: Partial<StoryEntry>) => void;
    onCancel: () => void;
}

const TemplatePicker: React.FC<TemplatePickerProps> = ({ onSelectTemplate, onCancel }) => {
    const [selectedType, setSelectedType] = useState<EntryType>(EntryType.Decision);

    const entryTypes: { type: EntryType; label: string; description: string; icon: string }[] = [
        {
            type: EntryType.Decision,
            label: 'Decision',
            description: 'Strategic or architectural choices',
            icon: '⚖️',
        },
        {
            type: EntryType.Incident,
            label: 'Incident',
            description: 'Service disruptions or issues',
            icon: '🚨',
        },
        {
            type: EntryType.Milestone,
            label: 'Milestone',
            description: 'Major achievements or releases',
            icon: '🎯',
        },
        {
            type: EntryType.Routine,
            label: 'Routine Update',
            description: 'Regular updates or maintenance',
            icon: '🔄',
        },
        {
            type: EntryType.Rollback,
            label: 'Rollback',
            description: 'Reverting previous changes',
            icon: '⏪',
        },
        {
            type: EntryType.Flip,
            label: 'Feature Flag Flip',
            description: 'Feature flag changes',
            icon: '🎚️',
        },
    ];

    const handleCreateFromTemplate = () => {
        const template = entryTemplateFactory.createFromTemplate(selectedType);
        onSelectTemplate(template);
    };

    const selectedTypeInfo = entryTypes.find(t => t.type === selectedType);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
                <h2 className="text-2xl font-bold text-white mb-4">Create from Template</h2>
                <p className="text-gray-400 mb-6">
                    Select an entry type to create a pre-filled template following the minimum required structure.
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    {entryTypes.map(({ type, label, description, icon }) => (
                        <button
                            key={type}
                            onClick={() => setSelectedType(type)}
                            className={`p-4 rounded-lg border-2 text-left transition-all ${
                                selectedType === type
                                    ? 'border-cyan-500 bg-cyan-500/10'
                                    : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
                            }`}
                        >
                            <div className="text-2xl mb-2">{icon}</div>
                            <div className="font-semibold text-white mb-1">{label}</div>
                            <div className="text-sm text-gray-400">{description}</div>
                        </button>
                    ))}
                </div>

                {selectedTypeInfo && (
                    <div className="bg-gray-900/50 rounded-lg p-4 mb-6">
                        <h3 className="font-semibold text-white mb-2">
                            {selectedTypeInfo.icon} {selectedTypeInfo.label} Template
                        </h3>
                        <p className="text-sm text-gray-400 mb-3">{selectedTypeInfo.description}</p>
                        <div className="text-sm text-gray-300">
                            <div className="mb-1">
                                <span className="font-medium">Suggested tags:</span>{' '}
                                {entryTemplateFactory.getTemplate(selectedType)?.suggestedTags?.join(', ') || 'N/A'}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreateFromTemplate}
                        className="px-4 py-2 bg-cyan-500 text-white rounded-md font-semibold hover:bg-cyan-600"
                    >
                        Create from Template
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TemplatePicker;
