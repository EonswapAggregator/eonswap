import { useQuery } from '@tanstack/react-query'
import {
  coingeckoIdForSymbol,
  fetchMarketChartUsd,
} from '../lib/coingecko'

export function useMarketChart(symbol: string, days: 7 | 30 = 7) {
  const id = coingeckoIdForSymbol(symbol)

  return useQuery({
    queryKey: ['market-chart', id, days],
    queryFn: () => fetchMarketChartUsd(id!, days),
    enabled: !!id,
    staleTime: 60_000,
    gcTime: 300_000,
  })
}
