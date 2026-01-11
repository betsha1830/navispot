'use client';

import { useState } from 'react';

export type FilterOption = 
  | 'all'
  | 'selected'
  | 'not-selected'
  | 'liked-songs'
  | 'exported'
  | 'not-exported';

interface TableFiltersProps {
  currentFilter: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
  selectedCount: number;
}

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: 'all', label: 'All Playlists' },
  { value: 'selected', label: 'Selected Only' },
  { value: 'not-selected', label: 'Not Selected' },
  { value: 'liked-songs', label: 'Liked Songs' },
  { value: 'exported', label: 'Exported' },
  { value: 'not-exported', label: 'Not Exported' },
];

export function TableFilters({ currentFilter, onFilterChange, selectedCount }: TableFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentLabel = FILTER_OPTIONS.find((opt) => opt.value === currentFilter)?.label || 'All Playlists';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span>{currentLabel}</span>
        {selectedCount > 0 && currentFilter === 'selected' && (
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
            {selectedCount}
          </span>
        )}
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2 w-48 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg z-50 overflow-hidden">
            <div className="py-1">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onFilterChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                    currentFilter === option.value
                      ? 'bg-blue-500 text-white'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span className="flex items-center justify-between">
                    {option.label}
                    {option.value === 'selected' && selectedCount > 0 && (
                      <span className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full ${
                        currentFilter === option.value
                          ? 'bg-blue-400 text-white'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}>
                        {selectedCount}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function FilterChips({
  currentFilter,
  onFilterChange,
  selectedCount,
}: TableFiltersProps) {
  const chips: { value: FilterOption; label: string; icon?: React.ReactNode }[] = [
    { value: 'all', label: 'All' },
    { value: 'selected', label: 'Selected', icon: selectedCount > 0 ? <span className="ml-1 text-xs bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center">{selectedCount}</span> : undefined },
    { value: 'liked-songs', label: 'Liked Songs', icon: <svg className="w-3.5 h-3.5 text-pink-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg> },
    { value: 'exported', label: 'Exported' },
    { value: 'not-exported', label: 'Not Exported' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip.value}
          onClick={() => onFilterChange(chip.value)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            currentFilter === chip.value
              ? 'bg-blue-500 text-white shadow-sm'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          }`}
        >
          {chip.icon}
          {chip.label}
        </button>
      ))}
    </div>
  );
}
