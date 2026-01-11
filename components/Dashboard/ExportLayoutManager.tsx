import React, { ReactNode } from 'react';

export interface ExportLayoutManagerProps {
  isExporting: boolean;
  selectedPlaylistsSection: ReactNode;
  statisticsSection: ReactNode;
  unmatchedSongsSection: ReactNode;
  mainTableSection: ReactNode;
  fixedExportButton: ReactNode;
  resultsReportSection?: ReactNode;
}

export function ExportLayoutManager({
  isExporting,
  selectedPlaylistsSection,
  statisticsSection,
  unmatchedSongsSection,
  mainTableSection,
  fixedExportButton,
  resultsReportSection,
}: ExportLayoutManagerProps) {
  return (
    <div className="relative">
      {fixedExportButton}

      {resultsReportSection && !isExporting && (
        <div className="p-6">{resultsReportSection}</div>
      )}

      <div className="flex flex-col h-[calc(100vh-100px)]">
        <div
          className={`transition-all duration-300 ease-in-out ${
            isExporting ? 'flex-1' : 'h-[50%]'
          }`}
        >
          {isExporting ? (
            <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto">
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                {selectedPlaylistsSection}
              </div>
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                {statisticsSection}
              </div>
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex-1 min-h-[200px]">
                {unmatchedSongsSection}
              </div>
            </div>
          ) : (
            <div className="flex h-full">
              <div className="w-1/2 flex flex-col border-r border-zinc-200 dark:border-zinc-800">
                <div className="flex-1 overflow-hidden">
                  {selectedPlaylistsSection}
                </div>
                <div className="border-t border-zinc-200 dark:border-zinc-800">
                  {statisticsSection}
                </div>
              </div>
              <div className="w-1/2 overflow-hidden">
                {unmatchedSongsSection}
              </div>
            </div>
          )}
        </div>

        {!isExporting && (
          <div className="h-[50%] border-t border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {mainTableSection}
          </div>
        )}
      </div>
    </div>
  );
}
