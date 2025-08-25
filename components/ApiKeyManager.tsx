import React, { useState } from 'react';
import { TrashIcon } from './icons';

interface ApiKeyManagerProps {
    apiKeys: string[];
    onKeysChange: (keys: string[]) => void;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ apiKeys, onKeysChange }) => {
    const [newKeys, setNewKeys] = useState('');

    const handleAddKeys = () => {
        const keysToAdd = newKeys
            .split('\n')
            .map(key => key.trim())
            .filter(key => key && !apiKeys.includes(key));

        if (keysToAdd.length > 0) {
            onKeysChange([...apiKeys, ...keysToAdd]);
            setNewKeys('');
        }
    };

    const handleRemoveKey = (keyToRemove: string) => {
        onKeysChange(apiKeys.filter(key => key !== keyToRemove));
    };
    
    const maskApiKey = (key: string) => {
        if (key.length <= 8) return '****';
        return `${key.slice(0, 4)}...${key.slice(-4)}`;
    };

    return (
        <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
                Manage Gemini API Keys ({apiKeys.length} saved)
            </h3>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <textarea
                    value={newKeys}
                    onChange={(e) => setNewKeys(e.target.value)}
                    placeholder="Enter API Keys, one per line"
                    rows={3}
                    className="flex-grow px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    aria-label="New API Keys"
                />
                <button
                    onClick={handleAddKeys}
                    className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-colors self-start sm:self-auto"
                >
                    Add Keys
                </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {apiKeys.length > 0 ? (
                    apiKeys.map((key) => (
                        <div key={key} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-md shadow-sm">
                            <span className="font-mono text-sm text-gray-600 dark:text-gray-300">{maskApiKey(key)}</span>
                            <button
                                onClick={() => handleRemoveKey(key)}
                                className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                                aria-label={`Remove key ${maskApiKey(key)}`}
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">No API keys added yet.</p>
                )}
            </div>
        </div>
    );
};

export default ApiKeyManager;
