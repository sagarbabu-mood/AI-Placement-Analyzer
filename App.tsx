import React, { useState, useCallback, useEffect } from 'react';
import { StudentProfile, ProcessedStudentProfile } from './types';
import { analyzeStudentPlacementsBatch } from './services/geminiService';
import FileUpload from './components/FileUpload';
import ResultsTable from './components/ResultsTable';
import ProgressBar from './components/ProgressBar';
import ApiKeyManager from './components/ApiKeyManager';
import { DownloadIcon, RocketIcon } from './components/icons';

declare const Papa: any;

const API_KEY_STORAGE = 'gemini-api-keys';

const App: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [originalData, setOriginalData] = useState<StudentProfile[]>([]);
    const [processedData, setProcessedData] = useState<ProcessedStudentProfile[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
    const [error, setError] = useState<string | null>(null);

    const [apiKeys, setApiKeys] = useState<string[]>([]);
    const [showKeyManager, setShowKeyManager] = useState<boolean>(false);
    let keyIndex = 0;

    useEffect(() => {
        try {
            const storedKeys = localStorage.getItem(API_KEY_STORAGE);
            if (storedKeys) {
                setApiKeys(JSON.parse(storedKeys));
            }
        } catch (e) {
            console.error("Failed to parse API keys from localStorage", e);
        }
    }, []);

    const handleApiKeysChange = (keys: string[]) => {
        setApiKeys(keys);
        localStorage.setItem(API_KEY_STORAGE, JSON.stringify(keys));
    };

    const handleFileChange = (selectedFile: File) => {
        setFile(selectedFile);
        setProcessedData([]);
        setOriginalData([]);
        setError(null);
    };

    const processInBatches = async (data: StudentProfile[]) => {
        const batchSize = 15;
        setProgress({ current: 0, total: data.length });

        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            
            try {
                const apiKey = apiKeys[keyIndex % apiKeys.length];
                keyIndex++;
                
                const placementInfos = await analyzeStudentPlacementsBatch(batch, apiKey);

                if (placementInfos.length > 0 && placementInfos[0].placedCompany === 'Invalid API Key') {
                    setError(`An API key is invalid. Please check your keys in settings and try again.`);
                    setIsLoading(false);
                    return; 
                }
                
                const processedBatch = batch.map((student, index) => {
                    return { ...student, ...(placementInfos[index] || { placedRole: 'Error', placedCompany: 'Processing Error', estimatedSalary: 'Error' }) };
                });

                setProcessedData(prev => [...prev, ...processedBatch]);
                
            } catch (e) {
                console.error("Error processing batch:", e);
                const errorBatch = batch.map(student => ({
                    ...student, 
                    placedRole: 'Error', 
                    placedCompany: 'Batch Error', 
                    estimatedSalary: 'Error' 
                }));
                setProcessedData(prev => [...prev, ...errorBatch]);
            } finally {
                setProgress(prev => ({ ...prev, current: Math.min(prev.current + batch.length, data.length) }));
            }
        }
    };

    const handleProcess = useCallback(() => {
        if (!file) {
            setError("Please select a CSV file first.");
            return;
        }
        if (apiKeys.length === 0) {
            setError("Please add at least one Gemini API Key in the settings before analyzing.");
            setShowKeyManager(true);
            return;
        }

        setIsLoading(true);
        setError(null);
        setProcessedData([]);
        keyIndex = 0;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results: { data: StudentProfile[] }) => {
                setOriginalData(results.data);
                const dataToProcess = results.data.filter(row => row.first_name && row.last_name);
                if(dataToProcess.length === 0) {
                    setError("CSV file appears to be empty or invalid.");
                    setIsLoading(false);
                    return;
                }
                await processInBatches(dataToProcess);
                setIsLoading(false);
            },
            error: (err: Error) => {
                setError(`CSV Parsing Error: ${err.message}`);
                setIsLoading(false);
            }
        });
    }, [file, apiKeys]);

    const handleDownload = () => {
        if (processedData.length === 0) {
            setError("No processed data to download.");
            return;
        }

        const csv = Papa.unparse(processedData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `processed_${file?.name || 'placements'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-sans">
            <main className="container mx-auto px-4 py-8 md:py-12">
                <header className="text-center mb-10 relative">
                    <button 
                        onClick={() => setShowKeyManager(!showKeyManager)}
                        className="absolute top-0 right-0 px-4 py-2 mb-0 mt-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:text-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
                        aria-label="Toggle API Key Settings"
                     >
                        {showKeyManager ? 'Hide Settings' : 'API Key Settings'}
                    </button>
                    <div className="flex justify-center items-center gap-4 mb-4">
                        <RocketIcon className="w-12 h-12 text-blue-500" />
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
                            AI Placement Analyzer
                        </h1>
                    </div>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Upload a student CSV, and our AI will identify their first post-graduation role, company, and estimated salary.
                    </p>
                </header>

                <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700">
                    
                    {showKeyManager && <ApiKeyManager apiKeys={apiKeys} onKeysChange={handleApiKeysChange} />}

                    <div className={showKeyManager ? 'mt-8' : ''}>
                        <FileUpload onFileChange={handleFileChange} onProcess={handleProcess} isLoading={isLoading} disabled={!file} />
                    </div>

                    {error && (
                        <div className="mt-6 p-4 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    {isLoading && (
                        <div className="mt-8">
                            <ProgressBar current={progress.current} total={progress.total} />
                        </div>
                    )}

                    {processedData.length > 0 && (
                        <div className="mt-10">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Analysis Results</h2>
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-900 transition-colors"
                                >
                                    <DownloadIcon className="w-5 h-5" />
                                    Download CSV
                                </button>
                            </div>
                            <ResultsTable data={processedData} />
                        </div>
                    )}
                </div>

                <footer className="text-center mt-12 text-gray-500 dark:text-gray-400 text-sm">
                    <p>Powered by Gemini AI</p>
                </footer>
            </main>
        </div>
    );
};

export default App;