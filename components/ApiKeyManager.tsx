
import React, { useState } from 'react';
import { SettingsIcon } from './icons';

interface ApiKeyManagerProps {
    currentKey: string;
    onSave: (key: string) => void;
    onClose: () => void;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ currentKey, onSave, onClose }) => {
    const [key, setKey] = useState(currentKey);

    const handleSave = () => {
        onSave(key);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <SettingsIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                        <h2 id="modal-title" className="text-xl font-bold text-gray-900 dark:text-white">API Key Settings</h2>
                    </div>
                </div>
                <div className="p-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Your Google AI API key is required to analyze placements. It is stored only in your browser's local storage and never sent to our servers.
                    </p>
                    <div className="mb-4">
                        <label htmlFor="api-key-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Google AI API Key
                        </label>
                        <input
                            type="password"
                            id="api-key-input"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            placeholder="Enter your API key"
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        You can get your key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google AI Studio</a>.
                    </p>
                </div>
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 rounded-b-lg">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 dark:focus:ring-offset-gray-900"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
                    >
                        Save Key
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyManager;
