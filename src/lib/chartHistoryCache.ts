import type { MarketChartPoint } from './coingecko'

/** Public market series only — no wallet data. Kept client-side for fast paint. */
const STORAGE_KEY = 'eonswap:chart:pairHistory:v1'
const TTL_MS = 5 * 60_000
const MAX_STORED_PAIRS = 48

type PersistedHistory = Record<string, { at: number; data: MarketChartPoint[] }>

const memory = new Map<string, { at: number; data: MarketChartPoint[] }>()

function compositeKey(pairKey: string, days: 7 | 30 | 90): string {
  return `${pairKey}::${days}`
}

function normalizePoints(data: unknown): MarketChartPoint[] {
  if (!Array.isArray(data)) return []
  return data
    .map((p) => ({ t: Number((p as MarketChartPoint).t), price: Number((p as MarketChartPoint).price) }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.price) && p.price > 0)
}

function readStorage(): PersistedHistory {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return (JSON.parse(raw) as PersistedHistory) ?? {}
  } catch {
    return {}
  }
}

function writeStorage(parsed: PersistedHistory) {
  if (typeof window === 'undefined') return
  try {
    const entries = Object.entries(parsed).sort((a, b) => b[1].at - a[1].at)
    const trimmed =
      entries.length > MAX_STORED_PAIRS
        ? Object.fromEntries(entries.slice(0, MAX_STORED_PAIRS))
        : parsed
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // Quota or private mode — L1 memory still helps this session.
  }
}

/**
 * L1: in-memory (same tab, no JSON parse).
 * L2: localStorage (survives refresh; same origin only).
 */
export function readChartHistoryCache(
  pairKey: string,
  days: 7 | 30 | 90,
): MarketChartPoint[] {
  const key = compositeKey(pairKey, days)
  const now = Date.now()

  const mem = memory.get(key)
  if (mem && now - mem.at <= TTL_MS && mem.data.length > 1) {
    return mem.data
  }

  if (typeof window === 'undefined') return []

  try {
    const parsed = readStorage()
    const row = parsed[key]
    if (!row || !Array.isArray(row.data) || !Number.isFinite(row.at)) return []
    if (now - row.at > TTL_MS) return []
    const data = normalizePoints(row.data)
    if (data.length > 1) memory.set(key, { at: row.at, data })
    return data
  } catch {
    return []
  }
}

export function writeChartHistoryCache(
  pairKey: string,
  days: 7 | 30 | 90,
  data: MarketChartPoint[],
): void {
  if (data.length < 2) return
  const key = compositeKey(pairKey, days)
  const row = { at: Date.now(), data }
  memory.set(key, row)

  if (typeof window === 'undefined') return
  try {
    const parsed = readStorage()
    parsed[key] = row
    writeStorage(parsed)
  } catch {
    // no-op
  }
}
