import { getMonitorRelayBaseUrl, normalizeMonitorRelayBaseUrl } from './monitorRelayUrl'

export type LeaderboardEntry = {
  rank: number
  address: string
  successCount: number
  lastSuccessAt: number
}

/** Public ranking by wallet: successful swaps recorded on the relay (requires `VITE_MONITOR_RELAY_URL`). */
export async function fetchRelayLeaderboard(limit = 50): Promise<
  | { ok: true; generatedAt: number; entries: LeaderboardEntry[] }
  | { ok: false; error: string }
> {
  const base = getMonitorRelayBaseUrl()
  if (!base) return { ok: false, error: 'Relay not configured' }
  const capped = Math.min(100, Math.max(1, Math.floor(limit)))
  const q = new URLSearchParams({ limit: String(capped) })
  try {
    const res = await fetch(`${base}/public/leaderboard?${q}`, {
      headers: { accept: 'application/json' },
    })
    const json = (await res.json().catch(() => null)) as
      | {
          ok?: boolean
          error?: string
          entries?: LeaderboardEntry[]
          generatedAt?: number
        }
      | null
    if (!res.ok) {
      return { ok: false, error: json?.error || `HTTP ${res.status}` }
    }
    if (!json?.ok || !Array.isArray(json.entries)) {
      return { ok: false, error: 'Invalid response' }
    }
    return {
      ok: true,
      generatedAt: Number(json.generatedAt) || Date.now(),
      entries: json.entries,
    }
  } catch {
    return { ok: false, error: 'Network error' }
  }
}

/** Fire-and-forget log to monitoring relay (admin-wide view). */
export function sendActivityLogToRelay(item: {
  id: string
  kind: 'swap'
  status: string
  createdAt: number
  summary: string
  chainId: number
  txHash?: string
  from?: string
  blockNumber?: number
}): void {
  const relayUrl = getMonitorRelayBaseUrl()
  if (!relayUrl) return

  void fetch(`${relayUrl}/events/activity`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(item),
  }).catch(() => {
    // non-blocking
  })
}

export async function fetchRelayActivities(
  relayBaseUrl: string,
  adminSecret: string,
): Promise<{ ok: true; activities: unknown[] } | { ok: false; error: string }> {
  const base = normalizeMonitorRelayBaseUrl(relayBaseUrl)
  try {
    const res = await fetch(`${base}/admin/activities`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${adminSecret}`,
      },
    })
    const json = (await res.json().catch(() => null)) as
      | { activities?: unknown[]; error?: string }
      | null
    if (!res.ok) {
      return {
        ok: false,
        error: json?.error || `HTTP ${res.status}`,
      }
    }
    return { ok: true, activities: Array.isArray(json?.activities) ? json!.activities! : [] }
  } catch {
    return { ok: false, error: 'Network error' }
  }
}
