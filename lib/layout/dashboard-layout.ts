export const DASHBOARD_LAYOUTS = [
  "default",
  "horizontal",
  "vertical",
] as const;

export type DashboardLayout = (typeof DASHBOARD_LAYOUTS)[number];

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = "default";

const LAYOUT_STORAGE_KEY = "navispot-dashboard-layout";

export function loadDashboardLayout(): DashboardLayout {
  if (typeof window === "undefined") return DEFAULT_DASHBOARD_LAYOUT;
  try {
    const stored = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (stored && (DASHBOARD_LAYOUTS as readonly string[]).includes(stored)) {
      return stored as DashboardLayout;
    }
  } catch {
    // Ignore
  }
  return DEFAULT_DASHBOARD_LAYOUT;
}

export function saveDashboardLayout(layout: DashboardLayout): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, layout);
  } catch {
    // Ignore
  }
}

export interface DashboardLayoutOption {
  id: DashboardLayout;
  name: string;
  description: string;
}

export const DASHBOARD_LAYOUT_OPTIONS: DashboardLayoutOption[] = [
  {
    id: "default",
    name: "Default",
    description:
      "All three tables. Selected playlists and unmatched songs share the top row, main table fills the bottom.",
  },
  {
    id: "horizontal",
    name: "Horizontal",
    description:
      "Top-left table hidden. The unmatched songs table takes the full top width, with the main table below.",
  },
  {
    id: "vertical",
    name: "Vertical",
    description:
      "Top-left table hidden. Main playlist table and unmatched songs sit side by side, each taking half the width and the full available height.",
  },
];
