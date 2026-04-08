/** Normalize VITE_MONITOR_RELAY_URL for fetch() (absolute URL or same-origin path). */
export function normalizeMonitorRelayBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/u, '')
  if (trimmed.startsWith('/')) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

const DEV_RELAY_PROXY_PREFIX = '/__eonswap-relay'

/**
 * Production / `vite preview`: full HTTPS URL to relay.
 * `vite` dev: if env is an absolute URL, use same-origin proxy (see vite.config.ts) to avoid CORS.
 */
export function getMonitorRelayBaseUrl(): string | null {
  const raw = import.meta.env.VITE_MONITOR_RELAY_URL?.trim()
  if (!raw) return null
  if (import.meta.env.DEV && /^https?:\/\//i.test(raw)) {
    return DEV_RELAY_PROXY_PREFIX
  }
  return normalizeMonitorRelayBaseUrl(raw)
}
