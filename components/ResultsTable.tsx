
import React from 'react';
import { ProcessedStudentProfile } from '../types';

interface ResultsTableProps {
    data: ProcessedStudentProfile[];
}

const ConfidenceBadge: React.FC<{ confidence: string }> = ({ confidence }) => {
    let colorClasses = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    switch (confidence?.toLowerCase()) {
        case 'high':
            colorClasses = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            break;
        case 'low':
            colorClasses = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            break;
        case 'medium':
            colorClasses = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
            break;
    }
    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses}`}>
            {confidence || 'N/A'}
        </span>
    );
};


const ResultsTable: React.FC<ResultsTableProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <p>No data to display.</p>;
    }

    const headers = [
        'Name',
        'Placed Role (AI)',
        'Placed Company (AI)',
        'Salary Research (AI)',
        'Research Justification (AI)',
        'Confidence (AI)'
    ];

    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                        {headers.map((header) => (
                            <th
                                key={header}
                                scope="col"
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                            >
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {data.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{`${row.first_name} ${row.last_name}`}</div>
                                 {row.linkedin_url ? (
                                    <a
                                        href={row.linkedin_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        LinkedIn Profile
                                    </a>
                                ) : (
                                    <div className="text-sm text-gray-500 dark:text-gray-400">{row.headline}</div>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800 dark:text-gray-200">
                                {row.placedRole}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800 dark:text-gray-200">
                                {row.placedCompany}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700 dark:text-green-400">
                                {row.estimatedSalary}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                {row.salaryJustification}
                            </td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <ConfidenceBadge confidence={row.salaryConfidence} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ResultsTable;
