'use client';

export interface Statistics {
  matched: number;
  unmatched: number;
  exported: number;
  failed: number;
}

interface StatisticsPanelProps {
  statistics: Statistics;
}

const statConfig = {
  matched: {
    label: 'Matched',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  unmatched: {
    label: 'Unmatched',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  exported: {
    label: 'Exported',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  failed: {
    label: 'Failed',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
};

export function StatisticsPanel({ statistics }: StatisticsPanelProps) {
  const stats = [
    { key: 'matched' as const, value: statistics.matched },
    { key: 'unmatched' as const, value: statistics.unmatched },
    { key: 'exported' as const, value: statistics.exported },
    { key: 'failed' as const, value: statistics.failed },
  ];

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <div className="grid grid-cols-4 gap-3">
        {stats.map((stat) => {
          const config = statConfig[stat.key];
          return (
            <div
              key={stat.key}
              className={`flex flex-col items-center justify-center p-3 rounded-lg ${config.color}`}
            >
              <div className="mb-2">{config.icon}</div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs font-medium uppercase tracking-wide opacity-80">
                {config.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
