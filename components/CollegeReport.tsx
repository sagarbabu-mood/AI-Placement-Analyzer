
import React from 'react';
import { DownloadIcon, SparklesIcon } from './icons';

interface CollegeReportProps {
    report: string;
    onDownloadReport: () => void;
}

const CollegeReport: React.FC<CollegeReportProps> = ({ report, onDownloadReport }) => {
    // A parser to convert AI-generated markdown text to styled HTML
    const formatReport = (text: string) => {
        const lines = text.trim().split('\n');
        let html = '';
        let inList = false;
        let inTable = false;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();

            // Bold text handling within any line
            line = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>');

            // Close blocks if the current line doesn't match the block type
            if (!line.startsWith('* ') && !line.startsWith('- ') && inList) {
                html += '</ul>';
                inList = false;
            }
            if (!line.startsWith('|') && inTable) {
                html += '</tbody></table></div>';
                inTable = false;
            }
            
            // Block-level element parsing
            if (line.startsWith('## ')) {
                html += `<h2 class="text-2xl font-bold mt-8 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">${line.substring(3)}</h2>`;
            } else if (line.startsWith('### ')) {
                html += `<h3 class="text-xl font-semibold mt-6 mb-3">${line.substring(4)}</h3>`;
            } else if (line.startsWith('# ')) {
                 html += `<h1 class="text-3xl font-bold mt-8 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">${line.substring(2)}</h1>`;
            } else if (line.startsWith('|')) {
                const cells = line.split('|').slice(1, -1).map(c => c.trim());
                if (!inTable) { // This is a header row
                    const nextLine = lines[i + 1]?.trim() || '';
                    if (nextLine.startsWith('|') && nextLine.includes('---')) {
                        inTable = true;
                        html += '<div class="overflow-x-auto my-6 rounded-lg border border-gray-200 dark:border-gray-700"><table class="w-full text-left">';
                        html += '<thead class="bg-gray-50 dark:bg-gray-800"><tr>';
                        cells.forEach(header => {
                            html += `<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">${header}</th>`;
                        });
                        html += '</tr></thead><tbody>';
                        i++; // Skip the separator line from the loop
                    }
                } else { // This is a body row
                     html += '<tr class="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">';
                     cells.forEach(cell => {
                        html += `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">${cell}</td>`;
                    });
                    html += '</tr>';
                }
            } else if (line.startsWith('* ') || line.startsWith('- ')) {
                if (!inList) {
                    html += '<ul class="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300 my-4">';
                    inList = true;
                }
                html += `<li>${line.substring(2)}</li>`;
            } else if (line) {
                 html += `<p class="leading-relaxed my-4">${line}</p>`;
            }
        }

        // Close any open blocks at the end of the text
        if (inList) html += '</ul>';
        if (inTable) html += '</tbody></table></div>';

        return html;
    };

    return (
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
            <header className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 p-6 md:p-8 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <SparklesIcon className="w-10 h-10 text-purple-500 flex-shrink-0" />
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI-Generated Placement Report</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">A comprehensive analysis of the recent placement season.</p>
                    </div>
                </div>
                <button
                    onClick={onDownloadReport}
                    className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-colors"
                    aria-label="Download report as markdown file"
                >
                    <DownloadIcon className="w-5 h-5" />
                    <span>Download Report</span>
                </button>
            </header>
            <div 
                className="p-6 md:p-8 text-gray-700 dark:text-gray-300"
                dangerouslySetInnerHTML={{ __html: formatReport(report) }}
            />
        </div>
    );
};

export default CollegeReport;
