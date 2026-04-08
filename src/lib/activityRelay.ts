import { getMonitorRelayBaseUrl, normalizeMonitorRelayBaseUrl } from './monitorRelayUrl'

/** Fire-and-forget log to monitoring relay (aggregated admin view). */
export function sendActivityLogToRelay(item: {
  id: string
  kind: 'swap' | 'bridge'
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
