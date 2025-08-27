
import React, { useState, useCallback, useEffect } from 'react';
import { StudentProfile, ProcessedStudentProfile } from './types';
import { analyzeStudentPlacementsBatch, generateCollegeReport, calculatePlacementStats } from './services/geminiService';
import FileUpload from './components/FileUpload';
import ResultsTable from './components/ResultsTable';
import ProgressBar from './components/ProgressBar';
import { DownloadIcon, DocumentReportIcon, SparklesIcon, SettingsIcon } from './components/icons';
import CollegeReport from './components/CollegeReport';
import ApiKeyManager from './components/ApiKeyManager';

declare const Papa: any;

const getFriendlyErrorMessage = (error: any): string => {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
        return 'Network request failed. This may be a Cross-Origin Resource Sharing (CORS) issue or a network problem. Please check the browser console for more details.';
    }
    if (error.message && error.message.includes('API key not valid')) {
        return 'The provided API Key is invalid. Please go to Settings to correct it.';
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
    
    const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini-api-key') || '');
    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

    useEffect(() => {
        if (apiKey) {
            localStorage.setItem('gemini-api-key', apiKey);
        } else {
            localStorage.removeItem('gemini-api-key');
        }
    }, [apiKey]);

    const handleFileChange = (selectedFile: File) => {
        setFile(selectedFile);
        setProcessedData([]);
        setOriginalData([]);
        setError(null);
        setCollegeReport(null);
        setReportError(null);
    };

    const processInBatches = async (data: StudentProfile[]) => {
        const batchSize = 15;
        setProgress({ current: 0, total: data.length });

        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            
            try {
                const placementInfos = await analyzeStudentPlacementsBatch(batch, apiKey);
                
                const processedBatch = batch.map((student, index) => {
                    return { ...student, ...(placementInfos[index] || { placedRole: 'Error', placedCompany: 'Processing Error', estimatedSalary: 'Error' }) };
                });

                setProcessedData(prev => [...prev, ...processedBatch]);
                
            } catch (e: any) {
                console.error("Error processing batch:", e);
                setError(getFriendlyErrorMessage(e));
                setIsLoading(false);
                return; // Stop processing further batches on error
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
        
        if (!apiKey) {
            setError("Please set your Google AI API key in the settings before analyzing.");
            setIsSettingsOpen(true);
            return;
        }

        setIsLoading(true);
        setError(null);
        setProcessedData([]);
        setCollegeReport(null);
        setReportError(null);

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
    }, [file, apiKey]);

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
        if (!apiKey) {
            setReportError("Please set your Google AI API key in the settings before generating a report.");
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

        try {
            const report = await generateCollegeReport(processedData, apiKey);
            setCollegeReport(report);
        } catch (e: any) {
            setReportError(getFriendlyErrorMessage(e));
        } finally {
            setIsGeneratingReport(false);
        }
    };

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

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans">
            {isSettingsOpen && (
                <ApiKeyManager
                    currentKey={apiKey}
                    onSave={setApiKey}
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
                        className="flex-shrink-0 p-2 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
                        aria-label="Open settings"
                    >
                        <SettingsIcon className="w-6 h-6" />
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
                                disabled={processedData.length === 0 && !collegeReport}
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
                        <FileUpload onFileChange={handleFileChange} onProcess={handleProcess} isLoading={isLoading} disabled={!file} />
                        
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
                            <div className="text-center p-8 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
                                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">No Report Generated</h3>
                                <p className="text-gray-600 dark:text-gray-400 mt-2">Go to the 'Placement Analyzer' tab, process a file, and click 'Generate Report' to see the AI analysis here.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
