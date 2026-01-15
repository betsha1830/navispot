import React, { ReactNode } from 'react';

export interface ExportLayoutManagerProps {
  isExporting: boolean;
  progressPanelSection?: ReactNode;
  progressBar?: ReactNode;
  selectedPlaylistsSection: ReactNode;
  unmatchedSongsSection: ReactNode;
  mainTableSection: ReactNode;
  fixedExportButton: ReactNode;
}

export function ExportLayoutManager({
  isExporting,
  progressPanelSection,
  progressBar,
  selectedPlaylistsSection,
  unmatchedSongsSection,
  mainTableSection,
  fixedExportButton,
}: ExportLayoutManagerProps) {
  return (
    <div className="relative">
      {fixedExportButton}

      <div className="flex flex-col h-[calc(100vh-100px)]">
        {isExporting && (
          <div className="p-4 pb-0">
            {progressPanelSection}
          </div>
        )}
        {progressBar}

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
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex-1 min-h-[200px]">
                {unmatchedSongsSection}
              </div>
            </div>
          ) : (
            <div className="flex h-full">
              <div className="w-1/2 flex flex-col pr-2 overflow-hidden">
                <div className="flex-1 overflow-hidden">
                  {selectedPlaylistsSection}
                </div>
              </div>
              <div className="w-1/2 pl-2 overflow-hidden">
                {unmatchedSongsSection}
              </div>
            </div>
          )}
        </div>

        {!isExporting && (
          <div className="h-[50%] overflow-hidden pt-4">
            {mainTableSection}
          </div>
        )}
      </div>
    </div>
  );
}
