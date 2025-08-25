
import React, { useState, useCallback } from 'react';
import { UploadIcon, AnalyzeIcon, CheckCircleIcon } from './icons';

interface FileUploadProps {
    onFileChange: (file: File) => void;
    onProcess: () => void;
    isLoading: boolean;
    disabled: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, onProcess, isLoading, disabled }) => {
    const [fileName, setFileName] = useState<string>('');
    const [isDragOver, setIsDragOver] = useState<boolean>(false);

    const handleFileSelect = useCallback((file: File | null) => {
        if (file && file.type === 'text/csv') {
            setFileName(file.name);
            onFileChange(file);
        } else if (file) {
            alert('Please upload a valid .csv file.');
        }
    }, [onFileChange]);

    const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragOver(false);
        const file = event.dataTransfer.files && event.dataTransfer.files[0];
        handleFileSelect(file);
    }, [handleFileSelect]);

    const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
    };

    const onDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragOver(true);
    };

    const onDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragOver(false);
    };

    const onFileChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files && event.target.files[0];
        handleFileSelect(file);
    };

    return (
        <div className="flex flex-col md:flex-row items-center gap-4">
            <div 
                className={`flex-grow w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-300 ${isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'}`}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
                onClick={() => document.getElementById('file-input')?.click()}
            >
                <input
                    type="file"
                    id="file-input"
                    className="hidden"
                    accept=".csv"
                    onChange={onFileChangeHandler}
                />
                <div className="flex flex-col items-center justify-center">
                    {fileName ? (
                        <>
                            <CheckCircleIcon className="w-12 h-12 text-green-500 mb-2" />
                            <p className="font-semibold text-gray-700 dark:text-gray-200">{fileName}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Click or drag to replace</p>
                        </>
                    ) : (
                        <>
                            <UploadIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-2" />
                            <p className="font-semibold text-gray-700 dark:text-gray-200">
                                <span className="text-blue-500">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">CSV file required</p>
                        </>
                    )}
                </div>
            </div>
            <button
                onClick={onProcess}
                disabled={disabled || isLoading}
                className="w-full md:w-auto flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing...
                    </>
                ) : (
                    <>
                        <AnalyzeIcon className="w-6 h-6" />
                        Analyze Placements
                    </>
                )}
            </button>
        </div>
    );
};

export default FileUpload;
