import React, { ReactNode } from "react"
import { DashboardLayout } from "@/lib/layout/dashboard-layout"

export interface ExportLayoutManagerProps {
  layout: DashboardLayout
  selectedPlaylistsSection: ReactNode
  unmatchedSongsSection: ReactNode
  mainTableSection: ReactNode
  fixedExportButton: ReactNode
}

export function ExportLayoutManager({
  layout,
  selectedPlaylistsSection,
  unmatchedSongsSection,
  mainTableSection,
  fixedExportButton,
}: ExportLayoutManagerProps) {
  return (
    <div className="relative">
      {fixedExportButton}

      <div className="flex flex-col h-[calc(100vh-90px)] pb-8">
        {layout === "default" && (
          <>
            {/* Top Section - 40% height - Two tables side by side */}
            <div className="h-[40%] flex gap-4 overflow-hidden">
              <div className="w-1/2 flex flex-col overflow-hidden">
                {selectedPlaylistsSection}
              </div>
              <div className="w-1/2 flex flex-col overflow-hidden">
                {unmatchedSongsSection}
              </div>
            </div>

            {/* Bottom Section - 60% height - Main Playlist Table */}
            <div className="h-[60%] overflow-hidden pt-4">
              {mainTableSection}
            </div>
          </>
        )}

        {layout === "horizontal" && (
          <>
            {/* Top Section - 40% height - Unmatched Songs full width (top-left hidden) */}
            <div className="h-[40%] flex gap-4 overflow-hidden">
              <div className="w-full flex flex-col overflow-hidden">
                {unmatchedSongsSection}
              </div>
            </div>

            {/* Bottom Section - 60% height - Main Playlist Table */}
            <div className="h-[60%] overflow-hidden pt-4">
              {mainTableSection}
            </div>
          </>
        )}

        {layout === "vertical" && (
          <div className="flex-1 min-h-0 flex gap-4">
            {/* Main Playlist Table on the left, full height */}
            <div className="w-1/2 flex flex-col overflow-hidden">
              {mainTableSection}
            </div>

            {/* Unmatched Songs on the right, full height */}
            <div className="w-1/2 flex flex-col overflow-hidden">
              {unmatchedSongsSection}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
