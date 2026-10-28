import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlaylistTable } from './PlaylistTable';

const noop = () => {};

function renderTable() {
  return render(
    <PlaylistTable
      items={[]}
      totalCount={0}
      likedSongsCount={0}
      selectedIds={new Set<string>()}
      onToggleSelection={noop}
      onToggleSelectAll={noop}
      sortColumn={null}
      sortDirection={null}
      onSort={noop}
      searchQuery=""
      onSearchChange={noop}
      onImportClick={noop}
      isImporting={false}
      ownerFilter="Some Owner"
      onOwnerFilterChange={noop}
      visibilityFilter="public"
      onVisibilityFilterChange={noop}
      dateAfterFilter="2024-01-01"
      onDateAfterFilterChange={noop}
      dateBeforeFilter=""
      onDateBeforeFilterChange={noop}
      uniqueOwners={["Some Owner"]}
      hasActiveFilters={true}
      onClearAllFilters={noop}
    />
  );
}

/**
 * Regression guard: active filter pills must stay reachable at any container
 * width. In the vertical layout the table lives in a 50%-wide overflow-hidden
 * column, so the pills cannot live inside the non-wrapping toolbar — they get
 * squeezed past the clip edge. They now render in their own wrapping row, the
 * toolbar itself may wrap as a safety net, and the search input yields space
 * first (min-w-0).
 */
describe('PlaylistTable active filter pills', () => {
  it('renders pills in their own wrapping row outside the toolbar', () => {
    renderTable();

    const pillsRow = screen.getByText('Active:').parentElement;
    expect(pillsRow).not.toBeNull();
    expect(pillsRow!.className).toContain('flex-wrap');
    expect(pillsRow!.className).not.toContain('flex-nowrap');
    // Pills must be visible below the md breakpoint too — hiding them made
    // active filters invisible and unremovable on narrow screens.
    expect(pillsRow!.classList.contains('hidden')).toBe(false);

    const searchInput = screen.getByPlaceholderText(/Search playlists/);
    const toolbarRow = searchInput.parentElement?.parentElement;
    expect(toolbarRow).not.toBeNull();
    // The pills are a sibling row, not a flex child of the toolbar.
    expect(toolbarRow!.contains(screen.getByText('Active:'))).toBe(false);
    // Safety net: toolbar may wrap instead of overflowing when squeezed.
    expect(toolbarRow!.className).toContain('flex-wrap');
    // The search input yields space before anything can spill.
    expect(searchInput.parentElement!.className).toContain('min-w-0');
  });
});
