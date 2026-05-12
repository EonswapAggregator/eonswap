import type { MarketChartPoint } from './coingecko'

/** Public market series only — no wallet data. Kept client-side for fast paint. */
const STORAGE_KEY = 'eonswap:chart:pairHistory:v1'
const TTL_MS = 2 * 60_000              // 2 minutes (faster refresh)
const LIVE_TTL_MS = 10 * 60_000        // 10 minutes (more frequent live updates)
const MAX_STORED_PAIRS = 48

type PersistedHistory = Record<string, { at: number; data: MarketChartPoint[] }>

const memory = new Map<string, { at: number; data: MarketChartPoint[] }>()

function compositeKey(pairKey: string, days: 7 | 30 | 90): string {
  return `${pairKey}::${days}`
}

function compositeLiveKey(pairKey: string, days: 7 | 30 | 90): string {
  return `${compositeKey(pairKey, days)}::live`
}

function normalizePoints(data: unknown): MarketChartPoint[] {
  if (!Array.isArray(data)) return []
  return data
    .map((p) => ({ t: Number((p as MarketChartPoint).t), price: Number((p as MarketChartPoint).price) }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.price) && p.price > 0)
}

/**
 * Validate chart data quality to prevent saving corrupt data to cache.
 * Returns true if data looks reasonable, false if suspicious.
 */
function validateChartData(data: MarketChartPoint[]): boolean {
  if (data.length < 2) return false
  
  const prices = data.map((p) => p.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  
  // Check 1: Reject if range is too extreme (>1000x volatility)
  if (maxPrice / minPrice > 1000) {
    console.warn('Chart cache: Rejecting data with extreme volatility', { min: minPrice, max: maxPrice })
    return false
  }
  
  // Check 2: Detect zigzag/spike patterns (price alternates wildly)
  let spikes = 0
  for (let i = 2; i < Math.min(data.length, 20); i++) {
    const prev = data[i - 1]!.price
    const curr = data[i]!.price
    const prevPrev = data[i - 2]!.price
    
    // If current differs >50% from prev, and prev differs >50% from prevPrev in opposite direction
    const change1 = Math.abs(prev - prevPrev) / prevPrev
    const change2 = Math.abs(curr - prev) / prev
    const oppositeDir = (prev > prevPrev && curr < prev) || (prev < prevPrev && curr > prev)
    
    if (change1 > 0.5 && change2 > 0.5 && oppositeDir) {
      spikes++
    }
  }
  
  // If more than 30% of points are spikes, data is corrupt
  if (spikes > Math.min(data.length, 20) * 0.3) {
    console.warn('Chart cache: Rejecting zigzag pattern data', { spikes })
    return false
  }
  
  // Check 3: Ensure timestamps are monotonic and reasonable
  for (let i = 1; i < data.length; i++) {
    if (data[i]!.t <= data[i - 1]!.t) {
      console.warn('Chart cache: Non-monotonic timestamps')
      return false
    }
  }
  
  return true
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
    // Validate cached data before returning
    if (!validateChartData(mem.data)) {
      memory.delete(key) // Clear bad cache
      return []
    }
    return mem.data
  }

  if (typeof window === 'undefined') return []

  try {
    const parsed = readStorage()
    const row = parsed[key]
    if (!row || !Array.isArray(row.data) || !Number.isFinite(row.at)) return []
    if (now - row.at > TTL_MS) return []
    const data = normalizePoints(row.data)
    
    // Validate before using
    if (data.length > 1 && !validateChartData(data)) {
      console.warn('Chart cache: Removing invalid cached data for', pairKey)
      delete parsed[key]
      writeStorage(parsed)
      return []
    }
    
    if (data.length > 1) memory.set(key, { at: row.at, data })
    return data
  } catch {
    return []
  }
}

export function readLiveChartCache(
  pairKey: string,
  days: 7 | 30 | 90,
): MarketChartPoint[] {
  const key = compositeLiveKey(pairKey, days)
  const now = Date.now()

  const mem = memory.get(key)
  if (mem && now - mem.at <= LIVE_TTL_MS && mem.data.length > 1) {
    // Validate cached data before returning
    if (!validateChartData(mem.data)) {
      memory.delete(key) // Clear bad cache
      return []
    }
    return mem.data
  }

  if (typeof window === 'undefined') return []

  try {
    const parsed = readStorage()
    const row = parsed[key]
    if (!row || !Array.isArray(row.data) || !Number.isFinite(row.at)) return []
    if (now - row.at > LIVE_TTL_MS) return []
    const data = normalizePoints(row.data)
    
    // Validate before using
    if (data.length > 1 && !validateChartData(data)) {
      console.warn('Chart cache: Removing invalid live cached data for', pairKey)
      delete parsed[key]
      writeStorage(parsed)
      return []
    }
    
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
  
  // Validate data quality before caching
  if (!validateChartData(data)) {
    console.warn('Chart cache: Skipping write of invalid data for', pairKey)
    return
  }
  
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

export function writeLiveChartCache(
  pairKey: string,
  days: 7 | 30 | 90,
  data: MarketChartPoint[],
): void {
  if (data.length < 2) return
  
  // Validate data quality before caching
  if (!validateChartData(data)) {
    console.warn('Chart cache: Skipping write of invalid live data for', pairKey)
    return
  }
  
  const key = compositeLiveKey(pairKey, days)
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

/**
 * Clear all chart cache data (both memory and localStorage).
 * Use this to force refresh if corrupt data is detected.
 */
export function clearAllChartCache(): void {
  console.log('Clearing all chart cache...')
  
  // Clear memory cache
  memory.clear()
  
  // Clear localStorage
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
    console.log('Chart cache cleared successfully')
  } catch (e) {
    console.error('Failed to clear chart cache:', e)
  }
}

/**
 * Clear cache for specific pair and days.
 */
export function clearPairCache(pairKey: string, days: 7 | 30 | 90): void {
  const histKey = compositeKey(pairKey, days)
  const liveKey = compositeLiveKey(pairKey, days)
  
  // Clear from memory
  memory.delete(histKey)
  memory.delete(liveKey)
  
  // Clear from localStorage
  if (typeof window === 'undefined') return
  try {
    const parsed = readStorage()
    delete parsed[histKey]
    delete parsed[liveKey]
    writeStorage(parsed)
    console.log('Cleared cache for', pairKey, days, 'days')
  } catch {
    // no-op
  }
}
