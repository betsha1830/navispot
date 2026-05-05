const STORAGE_KEY = "navispot-export-counts"

interface ExportCountData {
  counts: Record<string, number>
  shownMonths: string[]
}

function getMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function getData(): ExportCountData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { counts: {}, shownMonths: [] }
}

function saveData(data: ExportCountData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function incrementExportCount(): number {
  const data = getData()
  const month = getMonthKey()
  data.counts[month] = (data.counts[month] || 0) + 1
  saveData(data)
  return data.counts[month]
}

export function shouldShowSupportBubble(): boolean {
  const data = getData()
  const month = getMonthKey()
  return (data.counts[month] || 0) >= 5 && !data.shownMonths.includes(month)
}

export function markSupportBubbleShown(): void {
  const data = getData()
  const month = getMonthKey()
  if (!data.shownMonths.includes(month)) {
    data.shownMonths.push(month)
    saveData(data)
  }
}
