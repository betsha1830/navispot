import { useState, useMemo, useEffect, useCallback } from 'react';
import type { PlaylistTableItem, TableState } from '@/types/playlist-table';

interface UsePlaylistTableReturn {
  items: PlaylistTableItem[];
  state: Omit<TableState, 'selectedIds'> & { selectedIds: string[] };
  handlers: {
    setSort: (column: 'name' | 'tracks' | 'owner') => void;
    setSearch: (query: string) => void;
    setFilter: (filterType: 'status' | 'source', value: string) => void;
    toggleSelection: (id: string) => void;
    toggleSelectAll: () => void;
  };
}

interface UsePlaylistTableProps {
  initialItems: PlaylistTableItem[];
  debounceMs?: number;
}

function loadInitialSelection(): Set<string> {
  try {
    const stored = sessionStorage.getItem('playlistSelection');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch {
    console.warn('Failed to parse stored selection');
  }
  return new Set();
}

function saveSelection(ids: Set<string>): void {
  sessionStorage.setItem('playlistSelection', JSON.stringify([...ids]));
}

export function usePlaylistTable({
  initialItems,
  debounceMs = 300,
}: UsePlaylistTableProps): UsePlaylistTableReturn {
  const [sortColumn, setSortColumn] = useState<'name' | 'tracks' | 'owner'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filters, setFilters] = useState<TableState['filters']>({
    status: 'all',
    source: 'all',
    owner: '',
    visibility: 'all',
    dateAfter: '',
    dateBefore: '',
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(loadInitialSelection);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [searchQuery, debounceMs]);

  useEffect(() => {
    saveSelection(selectedIds);
  }, [selectedIds]);

  const filteredItems = useMemo(() => {
    return initialItems.filter((item) => {
      if (filters.status === 'selected') {
        if (!selectedIds.has(item.id)) return false;
      } else if (filters.status === 'not-selected') {
        if (selectedIds.has(item.id)) return false;
      } else if (filters.status === 'exported') {
        if (item.exportStatus !== 'exported') return false;
      } else if (filters.status === 'not-exported') {
        if (item.exportStatus !== 'none') return false;
      }

      if (filters.source === 'liked-songs') {
        if (!item.isLikedSongs) return false;
      } else if (filters.source === 'playlists') {
        if (item.isLikedSongs) return false;
      }

      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase();
        const nameMatch = item.name.toLowerCase().includes(query);
        const ownerMatch = item.owner.display_name.toLowerCase().includes(query);
        if (!nameMatch && !ownerMatch) return false;
      }

      return true;
    });
  }, [initialItems, filters, selectedIds, debouncedSearchQuery]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'tracks':
          comparison = a.tracks.total - b.tracks.total;
          break;
        case 'owner':
          comparison = a.owner.display_name.localeCompare(b.owner.display_name);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredItems, sortColumn, sortDirection]);

  const setSort = useCallback((column: 'name' | 'tracks' | 'owner') => {
    setSortColumn((prev) => {
      if (prev === column) {
        setSortDirection((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortDirection('asc');
      }
      return column;
    });
  }, []);

  const setFilter = useCallback((filterType: 'status' | 'source', value: string) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((item) => item.id)));
    }
  }, [selectedIds, filteredItems]);

  return {
    items: sortedItems,
    state: {
      sortColumn,
      sortDirection,
      searchQuery,
      filters,
      selectedIds: [...selectedIds],
    },
    handlers: {
      setSort,
      setSearch: setSearchQuery,
      setFilter,
      toggleSelection,
      toggleSelectAll,
    },
  };
}
