import React, { useState, useEffect, useRef } from 'react';
import { CandidateList } from '../types';

interface SearchableDropdownProps {
    options: CandidateList[];
    selectedId: string | null;
    onChange: (id: string) => void;
    placeholder?: string;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({ options, selectedId, onChange, placeholder = "Search and select a list..." }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(option => option._id === selectedId);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);
    
    useEffect(() => {
        if (selectedOption) {
            setSearchTerm(selectedOption.name);
        } else {
            setSearchTerm('');
        }
    }, [selectedOption]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        if (!isOpen) {
            setIsOpen(true);
        }
        if (selectedId) {
            // Clear selection if user types to search for something new
            onChange('');
        }
    };
    
    const handleSelectOption = (option: CandidateList) => {
        onChange(option._id);
        setSearchTerm(option.name);
        setIsOpen(false);
    };
    
    const filteredOptions = searchTerm === selectedOption?.name 
        ? options
        : options.filter(option => 
            option.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

    return (
        <div className="relative" ref={wrapperRef}>
            <input
                type="text"
                value={searchTerm}
                onChange={handleInputChange}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                className="block w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                aria-autocomplete="list"
                aria-expanded={isOpen}
            />
            {isOpen && (
                <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(option => (
                            <li
                                key={option._id}
                                onClick={() => handleSelectOption(option)}
                                className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                role="option"
                                aria-selected={option._id === selectedId}
                            >
                                {option.name}
                            </li>
                        ))
                    ) : (
                        <li className="px-4 py-2 text-gray-500">No results found</li>
                    )}
                </ul>
            )}
        </div>
    );
};

export default SearchableDropdown;
