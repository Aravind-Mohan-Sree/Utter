'use client';

import { FiSearch, FiX } from 'react-icons/fi';

import { Dropdown } from '~components/ui/Dropdown';

interface SearchAndFilterProps {
  placeholder: string;
  filters: string[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  searchValue: string;
  onSearchChange: (val: string) => void;
  className?: string;
  languageOptions?: string[];
  selectedLanguage?: string;
  onLanguageSelect?: (language: string) => void;
  languageClassName?: string;
  languageOptionsClassName?: string;
  ratingOptions?: string[];
  selectedRating?: string;
  onRatingSelect?: (rating: string) => void;
}

export const SearchAndFilter = ({
  placeholder,
  filters,
  activeFilter,
  onFilterChange,
  searchValue,
  onSearchChange,
  className,
  languageOptions,
  selectedLanguage,
  onLanguageSelect,
  languageClassName,
  languageOptionsClassName,
  ratingOptions,
  selectedRating,
  onRatingSelect,
}: SearchAndFilterProps) => {
  return (
    <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${className ?? 'mb-8'}`}>
      <div className="relative flex-1 max-w-md">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-400" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-400 transition-all text-sm text-rose-400 placeholder:text-gray-400"
        />
        {searchValue && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <FiX size={16} />
          </button>
        )}
      </div>
      <div className="flex gap-4">
        {languageOptions && selectedLanguage && onLanguageSelect && (
          <Dropdown
            options={languageOptions}
            selected={selectedLanguage}
            onSelect={onLanguageSelect}
            className={languageClassName}
            optionsClassName={languageOptionsClassName}
          />
        )}
        {ratingOptions && selectedRating !== undefined && onRatingSelect && (
          <Dropdown
            options={ratingOptions}
            selected={selectedRating}
            onSelect={onRatingSelect}
          />
        )}
        <Dropdown
          options={filters}
          selected={activeFilter}
          onSelect={onFilterChange}
        />
      </div>
    </div>
  );
};
