
import React from 'react';
import { ProcessedStudentProfile } from '../types';

interface ResultsTableProps {
    data: ProcessedStudentProfile[];
}

const ResultsTable: React.FC<ResultsTableProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <p>No data to display.</p>;
    }

    const headers = [
        'Name',
        'Graduation Year',
        'LinkedIn',
        'Placed Role (AI)',
        'Placed Company (AI)',
        'Salary Estimate (AI)'
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
                                <div className="text-sm text-gray-500 dark:text-gray-400">{row.headline}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {row.education_date_1 || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {row.linkedin_url ? (
                                    <a
                                        href={row.linkedin_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        View Profile
                                    </a>
                                ) : (
                                    <span className="text-gray-400 dark:text-gray-500">Not Provided</span>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700 dark:text-green-400">
                                {row.placedRole}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700 dark:text-green-400">
                                {row.placedCompany}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700 dark:text-green-400">
                                {row.estimatedSalary}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ResultsTable;
