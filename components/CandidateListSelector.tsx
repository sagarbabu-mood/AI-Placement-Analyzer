import React from 'react';
import { CandidateList } from '../types';
import { UsersIcon } from './icons';
import SearchableDropdown from './SearchableDropdown';

interface CandidateListSelectorProps {
    lists: CandidateList[];
    selectedListId: string | null;
    isLoading: boolean;
    error: string | null;
    onSelectList: (id: string) => void;
    onFetchCandidates: () => void;
    isFetchingCandidates: boolean;
}

const CandidateListSelector: React.FC<CandidateListSelectorProps> = ({
    lists,
    selectedListId,
    isLoading,
    error,
    onSelectList,
    onFetchCandidates,
    isFetchingCandidates
}) => {
    
    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
                <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Candidate Lists...</p>
            </div>
        );
    }
    
    if (error) {
         return (
             <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700">
                <div className="p-4 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 rounded-lg text-center">
                    <h3 className="font-semibold mb-2">Failed to Load Candidate Lists</h3>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700">
            <div className="text-center mb-8">
                 <UsersIcon className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Find Candidates</h2>
                <p className="text-gray-600 dark:text-gray-400">Search for a list and then fetch its candidates.</p>
            </div>
            
            <div className="mt-4 max-w-md mx-auto space-y-4">
                <SearchableDropdown
                    options={lists}
                    selectedId={selectedListId}
                    onChange={onSelectList}
                />
                <button
                    onClick={onFetchCandidates}
                    disabled={!selectedListId || isFetchingCandidates}
                    className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
                >
                    {isFetchingCandidates ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Fetching Candidates...
                        </>
                    ) : (
                        'Fetch Candidates'
                    )}
                </button>
            </div>
        </div>
    );
};

export default CandidateListSelector;
