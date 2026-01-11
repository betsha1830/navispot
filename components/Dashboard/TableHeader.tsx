'use client';

export type SortColumn = 'name' | 'tracks' | 'owner';
export type SortDirection = 'asc' | 'desc';

interface TableHeaderProps {
  sortColumn: SortColumn | null;
  sortDirection: SortDirection | null;
  onSortChange: (column: SortColumn) => void;
  allSelected: boolean;
  indeterminate: boolean;
  onToggleSelectAll: () => void;
  isExporting?: boolean;
}

const SortArrow = ({ direction }: { direction: SortDirection | null }) => {
  if (!direction) {
    return (
      <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }
  return (
    <svg
      className={`w-4 h-4 text-zinc-900 dark:text-zinc-100 ${direction === 'desc' ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
};

const HeaderCell = ({
  label,
  column,
  currentColumn,
  direction,
  onSort,
  sortable = true,
  width,
  isExporting,
}: {
  label: string;
  column: SortColumn;
  currentColumn: SortColumn | null;
  direction: SortDirection | null;
  onSort: (col: SortColumn) => void;
  sortable?: boolean;
  width: string;
  isExporting?: boolean;
}) => {
  return (
    <th
      className={`px-4 py-3 text-left ${width} ${sortable && !isExporting ? 'cursor-pointer select-none' : ''}`}
      onClick={() => !isExporting && sortable && onSort(column)}
    >
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        {sortable && !isExporting && <SortArrow direction={currentColumn === column ? direction : null} />}
      </div>
    </th>
  );
};

export function TableHeader({
  sortColumn,
  sortDirection,
  onSortChange,
  allSelected,
  indeterminate,
  onToggleSelectAll,
  isExporting = false,
}: TableHeaderProps) {
  return (
    <thead className="sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm z-10">
      <tr className="border-b border-zinc-200 dark:border-zinc-800">
        <th className="px-4 py-3 text-left w-[60px]">
          <div className="relative">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(input) => {
                if (input) {
                  input.indeterminate = indeterminate;
                }
              }}
              onChange={onToggleSelectAll}
              disabled={isExporting}
              className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500 dark:border-zinc-600 dark:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </th>
        <th className="px-4 py-3 text-left w-[80px]">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Cover
          </span>
        </th>
        <HeaderCell
          label="Name"
          column="name"
          currentColumn={sortColumn}
          direction={sortDirection}
          onSort={onSortChange}
          sortable={true}
          width="min-w-0"
          isExporting={isExporting}
        />
        <HeaderCell
          label="Tracks"
          column="tracks"
          currentColumn={sortColumn}
          direction={sortDirection}
          onSort={onSortChange}
          sortable={true}
          width="w-[120px]"
          isExporting={isExporting}
        />
        <HeaderCell
          label="Owner"
          column="owner"
          currentColumn={sortColumn}
          direction={sortDirection}
          onSort={onSortChange}
          sortable={true}
          width="w-[200px]"
          isExporting={isExporting}
        />
        <th className="px-4 py-3 text-left w-[120px]">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Status
          </span>
        </th>
      </tr>
    </thead>
  );
}
