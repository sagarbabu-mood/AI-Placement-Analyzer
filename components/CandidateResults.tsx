import React from 'react';
import { CandidateHit } from '../types';

// Fix: Define the missing CandidateResultsProps interface
interface CandidateResultsProps {
    candidates: CandidateHit[];
}

const CandidateCard: React.FC<{ candidate: CandidateHit }> = ({ candidate }) => {
    const { first_name, last_name, title, location, linkedin_profile, picture } = candidate._source;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex items-start space-x-4 border border-gray-200 dark:border-gray-700">
            <img 
                src={picture || `https://ui-avatars.com/api/?name=${first_name}+${last_name}&background=random`}
                alt={`${first_name} ${last_name}`} 
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
            />
            <div className="flex-1">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{first_name} {last_name}</h3>
                    {linkedin_profile && (
                         <a
                            href={linkedin_profile}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            aria-label={`View ${first_name}'s LinkedIn profile`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                            </svg>
                        </a>
                    )}
                </div>
                <p className="text-md text-blue-600 dark:text-blue-400 font-semibold">{title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{location}</p>
            </div>
        </div>
    );
};

const CandidateResults: React.FC<CandidateResultsProps> = ({ candidates }) => {
    return (
        <div className="max-w-4xl mx-auto">
             <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Found {candidates.length} Candidate(s)
            </h2>
            {candidates.length === 0 ? (
                <div className="text-center py-10 bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-600 dark:text-gray-400">No candidates found for the selected list.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {candidates.map(candidate => (
                        <CandidateCard key={candidate._id} candidate={candidate} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default CandidateResults;
