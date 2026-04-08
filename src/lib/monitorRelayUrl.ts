/** Normalize VITE_MONITOR_RELAY_URL for fetch() (must be an absolute URL). */
export function normalizeMonitorRelayBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/u, '')
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function getMonitorRelayBaseUrl(): string | null {
  const raw = import.meta.env.VITE_MONITOR_RELAY_URL?.trim()
  if (!raw) return null
  return normalizeMonitorRelayBaseUrl(raw)
}
