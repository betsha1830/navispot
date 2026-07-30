const FORCE_EXPORT_STORAGE_KEY = "navispot-force-export-playlists";
const PUBLIC_PLAYLISTS_STORAGE_KEY = "navispot-export-playlists-public";

export function loadForceExportPlaylists(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = window.localStorage.getItem(FORCE_EXPORT_STORAGE_KEY);
    return stored === "true";
  } catch {
    return false;
  }
}

export function saveForceExportPlaylists(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FORCE_EXPORT_STORAGE_KEY, String(enabled));
  } catch {
    // Ignore
  }
}

export function loadExportPlaylistsAsPublic(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = window.localStorage.getItem(PUBLIC_PLAYLISTS_STORAGE_KEY);
    return stored === "true";
  } catch {
    return false;
  }
}

export function saveExportPlaylistsAsPublic(isPublic: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PUBLIC_PLAYLISTS_STORAGE_KEY, String(isPublic));
  } catch {
    // Ignore
  }
}
