
import React, { useState, useCallback, useEffect } from 'react';
import { StudentProfile, ProcessedStudentProfile } from './types';
import { analyzeStudentPlacementsBatch, generateCollegeReport, calculatePlacementStats } from './services/geminiService';
import FileUpload from './components/FileUpload';
import ResultsTable from './components/ResultsTable';
import ProgressBar from './components/ProgressBar';
import { DownloadIcon, DocumentReportIcon, SparklesIcon, SettingsIcon, AnalyzeIcon } from './components/icons';
import CollegeReport from './components/CollegeReport';
import ApiKeyManager from './components/ApiKeyManager';

declare const Papa: any;

const getFriendlyErrorMessage = (error: any): string => {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
        return 'Network request failed. This may be a Cross-Origin Resource Sharing (CORS) issue or a network problem. Please check the browser console for more details.';
    }
    if (error.message && error.message.includes('API key not valid')) {
        return 'An API Key is invalid or has expired. Please check your keys in Settings.';
    }
    if (error.toString().includes('429')) {
        return 'All API keys have hit their rate limits. Please wait a while before trying again or add new keys.';
    }
    return error.message || 'An unknown error occurred.';
};

const App: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [originalData, setOriginalData] = useState<StudentProfile[]>([]);
    const [processedData, setProcessedData] = useState<ProcessedStudentProfile[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
    const [error, setError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<'analyzer' | 'collegeReport'>('analyzer');
    const [collegeReport, setCollegeReport] = useState<string | null>(null);
    const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [reportFile, setReportFile] = useState<File | null>(null);
    
    const [apiKeys, setApiKeys] = useState<string[]>(() => {
        const savedKeys = localStorage.getItem('gemini-api-keys');
        return savedKeys ? JSON.parse(savedKeys) : [];
    });
    const [activeApiKeyIndex, setActiveApiKeyIndex] = useState<number>(0);
    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

    useEffect(() => {
        if (apiKeys.length > 0) {
            localStorage.setItem('gemini-api-keys', JSON.stringify(apiKeys));
        } else {
            localStorage.removeItem('gemini-api-keys');
        }
        setActiveApiKeyIndex(0); // Reset index whenever keys are updated
    }, [apiKeys]);

    const handleFileChange = (selectedFile: File) => {
        setFile(selectedFile);
        setProcessedData([]);
        setOriginalData([]);
        setError(null);
        setCollegeReport(null);
        setReportError(null);
        setReportFile(null);
    };

    const handleReportFileChange = (selectedFile: File) => {
        setReportFile(selectedFile);
        setReportError(null);
        setCollegeReport(null);
    };

    const processInBatches = async (data: StudentProfile[]) => {
        const batchSize = 15;
        setProgress({ current: 0, total: data.length });
        let keyIndex = activeApiKeyIndex;

        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            
            try {
                const currentKey = apiKeys[keyIndex];
                if (!currentKey) throw new Error("All available API keys have failed.");

                const placementInfos = await analyzeStudentPlacementsBatch(batch, currentKey);
                
                const processedBatch = batch.map((student, index) => {
                    return { ...student, ...(placementInfos[index] || { placedRole: 'Error', placedCompany: 'Processing Error', estimatedSalary: 'Error' }) };
                });

                setProcessedData(prev => [...prev, ...processedBatch]);
                
            } catch (e: any) {
                console.error(`Key at index ${keyIndex} failed:`, e);
                const isKeyError = e.message.includes('API key not valid') || e.toString().includes('429');
                
                if (isKeyError && keyIndex + 1 < apiKeys.length) {
                    keyIndex++; // Move to the next key
                    i -= batchSize; // Crucial: decrement i to retry the current batch
                    console.log(`Retrying batch with new key index ${keyIndex}`);
                    continue; // Skip progress update and restart loop for the same batch
                } else {
                    setError(getFriendlyErrorMessage(e));
                    setIsLoading(false);
                    return; // Stop processing entirely
                }
            }
            
            setProgress(prev => ({ ...prev, current: Math.min(prev.current + batch.length, data.length) }));
        }
        setActiveApiKeyIndex(keyIndex); // Save the last successfully used key index for the next run
    };

    const handleProcess = useCallback(() => {
        if (!file) {
            setError("Please select a CSV file first.");
            return;
        }
        
        if (apiKeys.length === 0) {
            setError("Please set your Google AI API key(s) in the settings before analyzing.");
            setIsSettingsOpen(true);
            return;
        }

        setIsLoading(true);
        setError(null);
        setProcessedData([]);
        setCollegeReport(null);
        setReportError(null);
        setActiveApiKeyIndex(0); // Start with the first key

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

    const handleGenerateReport = async () => {
        if (apiKeys.length === 0) {
            setReportError("Please set your Google AI API key(s) in the settings before generating a report.");
            setIsSettingsOpen(true);
            setActiveTab('collegeReport');
            return;
        }
        
        if (processedData.length === 0) {
            setReportError("No processed data available to generate a report.");
            setActiveTab('collegeReport');
            return;
        }

        setIsGeneratingReport(true);
        setReportError(null);
        setCollegeReport(null);
        setActiveTab('collegeReport');

        let success = false;
        let keyIndex = activeApiKeyIndex;

        while (!success && keyIndex < apiKeys.length) {
            try {
                const report = await generateCollegeReport(processedData, apiKeys[keyIndex]);
                setCollegeReport(report);
                success = true;
                setActiveApiKeyIndex(keyIndex); // Remember the key that worked
            } catch (e: any) {
                console.error(`Report generation failed with key index ${keyIndex}:`, e);
                keyIndex++;
                if (keyIndex >= apiKeys.length) {
                    // Last key failed, show error
                    setReportError(getFriendlyErrorMessage(e));
                }
            }
        }
        setIsGeneratingReport(false);
    };

    const handleGenerateReportFromFile = useCallback(async () => {
        if (!reportFile) {
            setReportError("Please select an analyzed CSV file first.");
            return;
        }

        if (apiKeys.length === 0) {
            setReportError("Please set your Google AI API key(s) in the settings before generating a report.");
            setIsSettingsOpen(true);
            return;
        }

        setIsGeneratingReport(true);
        setReportError(null);
        setCollegeReport(null);

        Papa.parse(reportFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (results: { data: ProcessedStudentProfile[], meta: { fields: string[] } }) => {
                const requiredColumns = ['placedRole', 'placedCompany', 'estimatedSalary'];
                const headers = results.meta.fields || [];
                const hasRequiredColumns = requiredColumns.every(col => headers.includes(col));

                if (!hasRequiredColumns) {
                    setReportError(`The uploaded CSV is missing one or more required columns for report generation: ${requiredColumns.join(', ')}.`);
                    setIsGeneratingReport(false);
                    return;
                }

                const data = results.data;
                if (data.length === 0) {
                    setReportError("Analyzed CSV file appears to be empty or invalid.");
                    setIsGeneratingReport(false);
                    return;
                }

                setProcessedData(data); // Set data for download function

                let success = false;
                let keyIndex = 0; // Start with the first key for this operation

                while (!success && keyIndex < apiKeys.length) {
                    try {
                        const report = await generateCollegeReport(data, apiKeys[keyIndex]);
                        setCollegeReport(report);
                        success = true;
                    } catch (e: any) {
                        console.error(`Report generation from file failed with key index ${keyIndex}:`, e);
                        keyIndex++;
                        if (keyIndex >= apiKeys.length) {
                            setReportError(getFriendlyErrorMessage(e));
                        }
                    }
                }
                setIsGeneratingReport(false);
            },
            error: (err: Error) => {
                setReportError(`CSV Parsing Error: ${err.message}`);
                setIsGeneratingReport(false);
            }
        });
    }, [reportFile, apiKeys]);

    const handleDownloadReport = () => {
        if (processedData.length === 0) {
            setReportError("No processed data available to download a report.");
            return;
        }
    
        const stats = calculatePlacementStats(processedData);
    
        const keyStatsSection = [
            { Stat: 'Total Students Analyzed', Value: stats.totalStudents },
            { Stat: 'Total Students Placed', Value: stats.totalPlaced },
            { 'Stat': 'Placement Rate (%)', Value: stats.placementRate },
            { Stat: 'Number of Companies Recruiting', Value: stats.uniqueCompaniesCount },
        ];
    
        const recruitersSection = stats.allRecruiters.map(([company, hires]) => ({
            'Company': company,
            'Number of Hires': hires,
        }));
        
        const salarySection = Object.entries(stats.salaryBrackets).map(([bracket, count]) => ({
            'Salary Bracket (LPA)': bracket,
            'Number of Students': count,
        }));
    
        let csvString = "Key Placement Statistics\n";
        csvString += Papa.unparse(keyStatsSection);
        csvString += "\n\nRecruiter Details\n";
        csvString += Papa.unparse(recruitersSection);
        csvString += "\n\nSalary Distribution\n";
        csvString += Papa.unparse(salarySection);
    
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'college_placement_report_data.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSaveKeys = (keysString: string) => {
        const keys = keysString.split('\n').map(k => k.trim()).filter(Boolean);
        setApiKeys(keys);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans">
            {isSettingsOpen && (
                <ApiKeyManager
                    currentKeys={apiKeys}
                    onSave={handleSaveKeys}
                    onClose={() => setIsSettingsOpen(false)}
                />
            )}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">AI Placement Analyzer</h1>
                        <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">Analyze student placements and generate college reports with AI.</p>
                    </div>
                     <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="mt-4 sm:mt-0 flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold rounded-lg shadow-sm hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-colors"
                        aria-label="Open API key settings"
                    >
                        <SettingsIcon className="w-5 h-5" />
                        API Key Settings
                    </button>
                </header>

                <div className="my-8">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('analyzer')}
                                className={`${
                                    activeTab === 'analyzer'
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                                } flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg transition-colors`}
                            >
                                <SparklesIcon className="w-6 h-6" />
                                Placement Analyzer
                            </button>
                            <button
                                onClick={() => setActiveTab('collegeReport')}
                                className={`${
                                    activeTab === 'collegeReport'
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                                } flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg transition-colors`}
                            >
                                <DocumentReportIcon className="w-6 h-6" />
                                College Report
                            </button>
                        </nav>
                    </div>
                </div>
                
                {error && <div className="my-4 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-500/50 rounded-lg">{error}</div>}

                {activeTab === 'analyzer' && (
                    <div className="space-y-8">
                        <FileUpload 
                            onFileChange={handleFileChange} 
                            onProcess={handleProcess} 
                            isLoading={isLoading} 
                            disabled={!file}
                            buttonText="Analyze Placements"
                            buttonIcon={<AnalyzeIcon className="w-6 h-6" />}
                            loadingText="Analyzing..."
                        />
                        
                        {isLoading && <ProgressBar current={progress.current} total={progress.total} />}
                        
                        {processedData.length > 0 && !isLoading && (
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analysis Results</h2>
                                    <div className="flex gap-4">
                                        <button onClick={handleGenerateReport} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-offset-gray-900 transition-colors">
                                            <DocumentReportIcon className="w-5 h-5" />
                                            Generate Report
                                        </button>
                                        <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-900 transition-colors">
                                            <DownloadIcon className="w-5 h-5" />
                                            Download CSV
                                        </button>
                                    </div>
                                </div>
                                <ResultsTable data={processedData} />
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'collegeReport' && (
                     <div className="mt-8">
                        {isGeneratingReport ? (
                            <div className="flex flex-col items-center justify-center text-center p-8 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
                                <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Generating Report...</h3>
                                <p className="text-gray-600 dark:text-gray-400">The AI is analyzing the data. This may take a moment.</p>
                            </div>
                        ) : reportError ? (
                            <div className="my-4 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-500/50 rounded-lg">{reportError}</div>
                        ) : collegeReport ? (
                            <CollegeReport report={collegeReport} onDownloadReport={handleDownloadReport} />
                        ) : (
                            <div className="space-y-6 text-center p-8 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
                                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Generate Report from a Pre-Analyzed File</h3>
                                <p className="text-gray-600 dark:text-gray-400 mt-2">
                                    Upload a CSV file that has already been processed (must include 'placedRole', 'placedCompany', and 'estimatedSalary' columns).
                                </p>
                                <div className="max-w-2xl mx-auto pt-4">
                                    <FileUpload 
                                        onFileChange={handleReportFileChange} 
                                        onProcess={handleGenerateReportFromFile} 
                                        isLoading={isGeneratingReport} 
                                        disabled={!reportFile}
                                        buttonText="Generate Report from CSV"
                                        buttonIcon={<DocumentReportIcon className="w-6 h-6" />}
                                        loadingText="Generating..."
                                    />
                                </div>
                                <div className="relative py-6">
                                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                        <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                                    </div>
                                    <div className="relative flex justify-center">
                                        <span className="px-3 bg-gray-100 dark:bg-gray-800/50 text-sm font-semibold text-gray-500 dark:text-gray-400">OR</span>
                                    </div>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Go to the 'Placement Analyzer' tab, process a file, and then click 'Generate Report' to see the AI analysis here.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
