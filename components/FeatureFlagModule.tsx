import React, { useState, useEffect } from 'react';
import { featureFlagService } from '../services/featureFlagService';
import { FeatureFlags, FeatureFlagState } from '../types';

const FeatureFlagModule: React.FC = () => {
    const [flags, setFlags] = useState<FeatureFlags>({});

    useEffect(() => {
        setFlags(featureFlagService.getFlags());
    }, []);

    const handleFlagChange = (key: string, state: FeatureFlagState) => {
        featureFlagService.setFlag(key, state);
        setFlags({ ...flags, [key]: state });
    };
    
    const allStates: FeatureFlagState[] = ['active', 'preview', 'labs', 'comingSoon', 'inactive', 'disabled'];

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-6">Feature Flags Management</h1>
            <p className="text-gray-400 mb-8">
                Control the state of application features in real-time. Changes are saved locally.
            </p>
            <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-700/50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                Feature Key
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                Current State
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                        {Object.entries(flags).map(([key, state]) => (
                            <tr key={key}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                                    {key}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                    <select
                                        value={state}
                                        onChange={(e) => handleFlagChange(key, e.target.value as FeatureFlagState)}
                                        className="bg-gray-700 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 w-40"
                                    >
                                        {allStates.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FeatureFlagModule;
