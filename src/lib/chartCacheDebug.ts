/**
 * Debug utilities for chart cache management.
 * Available in browser console: window.EonChartDebug
 */

import { clearAllChartCache, clearPairCache } from './chartHistoryCache'

/** Type for cached chart entry */
type ChartCacheEntry = {
  data?: Array<{ price: number; timestamp: number }>
  at?: number
}

/** Type for chart cache storage */
type ChartCacheStorage = Record<string, ChartCacheEntry>

/** Extend Window to include debug tools */
declare global {
  interface Window {
    EonChartDebug?: typeof ChartCacheDebug
  }
}

export const ChartCacheDebug = {
  /**
   * Clear all cached chart data and reload page.
   */
  clearAll() {
    console.log('🧹 Clearing all chart cache...')
    clearAllChartCache()
    console.log('✅ Cache cleared. Reloading page...')
    window.location.reload()
  },

  /**
   * Clear cache for specific pair.
   * @param chainId - Chain ID (e.g., 8453 for Base)
   * @param baseAddress - Base token address
   * @param quoteAddress - Quote token address
   * @param days - Days range (7, 30, or 90)
   */
  clearPair(
    chainId: number,
    baseAddress: string,
    quoteAddress: string,
    days: 7 | 30 | 90 = 7,
  ) {
    const pairKey = `${chainId}:${baseAddress.toLowerCase()}-${quoteAddress.toLowerCase()}`
    console.log(`🧹 Clearing cache for ${pairKey} (${days}D)...`)
    clearPairCache(pairKey, days)
    console.log('✅ Pair cache cleared. Reload page to see changes.')
  },

  /**
   * View all cached pairs in localStorage.
   */
  viewCache() {
    try {
      const raw = window.localStorage.getItem('eonswap:chart:pairHistory:v1')
      if (!raw) {
        console.log('📊 No chart cache found')
        return
      }
      const parsed = JSON.parse(raw) as ChartCacheStorage
      const entries = Object.entries(parsed)
      console.log(`📊 Found ${entries.length} cached chart entries:`)
      entries.forEach(([key, value]) => {
        const points = value?.data?.length ?? 0
        const age = value?.at ? Math.round((Date.now() - value.at) / 1000 / 60) : '?'
        console.log(`  - ${key}: ${points} points, ${age} min ago`)
      })
      return parsed
    } catch (e) {
      console.error('❌ Failed to read cache:', e)
    }
  },

  /**
   * Validate all cached data and report issues.
   */
  validateCache() {
    try {
      const raw = window.localStorage.getItem('eonswap:chart:pairHistory:v1')
      if (!raw) {
        console.log('📊 No chart cache to validate')
        return
      }
      const parsed = JSON.parse(raw) as ChartCacheStorage
      const entries = Object.entries(parsed)
      let issues = 0

      console.log(`🔍 Validating ${entries.length} cached entries...`)

      entries.forEach(([key, value]) => {
        const data = value?.data
        if (!Array.isArray(data) || data.length < 2) {
          console.warn(`  ⚠️ ${key}: Invalid data structure`)
          issues++
          return
        }

        const prices = data.map((p) => p.price).filter(Number.isFinite)
        if (prices.length !== data.length) {
          console.warn(`  ⚠️ ${key}: Contains non-finite prices`)
          issues++
          return
        }

        const minPrice = Math.min(...prices)
        const maxPrice = Math.max(...prices)
        const volatility = maxPrice / minPrice

        if (volatility > 1000) {
          console.warn(`  ⚠️ ${key}: Extreme volatility (${volatility.toFixed(0)}x)`)
          issues++
        }

        // Check for zigzag pattern
        let spikes = 0
        for (let i = 2; i < Math.min(data.length, 20); i++) {
          const prev = data[i - 1].price
          const curr = data[i].price
          const prevPrev = data[i - 2].price
          const change1 = Math.abs(prev - prevPrev) / prevPrev
          const change2 = Math.abs(curr - prev) / prev
          const oppositeDir =
            (prev > prevPrev && curr < prev) || (prev < prevPrev && curr > prev)
          if (change1 > 0.5 && change2 > 0.5 && oppositeDir) spikes++
        }
        if (spikes > Math.min(data.length, 20) * 0.3) {
          console.warn(`  ⚠️ ${key}: Zigzag pattern detected (${spikes} spikes)`)
          issues++
        }

        console.log(`  ✅ ${key}: OK (${data.length} points, ${volatility.toFixed(2)}x range)`)
      })

      if (issues > 0) {
        console.warn(`\n⚠️ Found ${issues} issues. Run clearAll() to fix.`)
      } else {
        console.log('\n✅ All cache entries valid!')
      }
    } catch (e) {
      console.error('❌ Failed to validate cache:', e)
    }
  },

  /**
   * Show usage help.
   */
  help() {
    console.log(`
📊 EonSwap Chart Cache Debug Tools

Available commands:
  clearAll()                    - Clear all chart cache and reload
  clearPair(chain, base, quote) - Clear specific pair cache
  viewCache()                   - View all cached entries
  validateCache()                - Check for corrupt data
  help()                        - Show this help

Examples:
  EonChartDebug.clearAll()
  EonChartDebug.clearPair(8453, '0x123...', '0x456...', 7)
  EonChartDebug.viewCache()
  EonChartDebug.validateCache()
    `)
  },
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  window.EonChartDebug = ChartCacheDebug
  console.log('📊 Chart cache debug tools loaded. Type EonChartDebug.help() for usage.')
}
