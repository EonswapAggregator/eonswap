import type { MarketChartPoint } from './coingecko'

const KYBER_HISTORY_TIMEOUT_MS = 1800

// Legacy/public endpoints are best-effort only; often degraded.
const CANDIDATE_ENDPOINTS = [
  'https://tracker.kyberswap.com/api/history',
  'https://tracker.kyber.network/api/history',
]

type KyberHistoryParams = {
  baseSymbol: string
  quoteSymbol: string
  days: 7 | 30 | 90
}

type UnknownJson = Record<string, unknown>

function normalizePoint(raw: unknown): MarketChartPoint | null {
  if (Array.isArray(raw) && raw.length >= 2) {
    const t = Number(raw[0])
    const price = Number(raw[1])
    if (Number.isFinite(t) && Number.isFinite(price) && price > 0) return { t, price }
    return null
  }
  if (raw && typeof raw === 'object') {
    const r = raw as UnknownJson
    const t = Number(r.t ?? r.time ?? r.timestamp ?? 0)
    const price = Number(r.price ?? r.value ?? r.close ?? 0)
    if (Number.isFinite(t) && Number.isFinite(price) && price > 0) return { t, price }
  }
  return null
}

function extractSeries(json: unknown): MarketChartPoint[] {
  if (!json || typeof json !== 'object') return []
  const obj = json as UnknownJson
  const containers = [obj.data, obj.prices, obj.points, obj.result].filter(Boolean)
  for (const c of containers) {
    if (!Array.isArray(c)) continue
    const points = c.map(normalizePoint).filter((p): p is MarketChartPoint => Boolean(p))
    if (points.length > 1) return points
  }
  return []
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), KYBER_HISTORY_TIMEOUT_MS)
  try {
    return await fetch(url, { signal: ctrl.signal })
  } finally {
    window.clearTimeout(timer)
  }
}

export async function fetchKyberPairHistory(
  params: KyberHistoryParams,
): Promise<MarketChartPoint[]> {
  const q = new URLSearchParams({
    base: params.baseSymbol.toUpperCase(),
    quote: params.quoteSymbol.toUpperCase(),
    days: String(params.days),
  }).toString()

  for (const endpoint of CANDIDATE_ENDPOINTS) {
    try {
      const res = await fetchWithTimeout(`${endpoint}?${q}`)
      if (!res.ok) continue
      const json = await res.json()
      const points = extractSeries(json)
      if (points.length > 1) return points
    } catch {
      // Try next candidate endpoint.
    }
  }
  return []
}
