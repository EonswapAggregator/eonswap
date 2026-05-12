import { buildEonAmmSwapFromApi, fetchEonAmmQuoteFromApi } from './adapters/eonAmmApi'
import { buildEonAmmSwapFromRouter, fetchEonAmmQuoteFromRouter } from './adapters/eonAmmRouter'
import { eonAmmApiBaseUrl } from './config'
import type { EonAmmBuildParams, EonAmmBuildResult, EonAmmQuote, EonAmmQuoteParams } from './types'

/** Quote strategy: API first when configured, then router fallback. */
export async function fetchEonAmmQuote(params: EonAmmQuoteParams): Promise<EonAmmQuote> {
  if (!eonAmmApiBaseUrl()) return fetchEonAmmQuoteFromRouter(params)
  try {
    return await fetchEonAmmQuoteFromApi(params)
  } catch {
    return fetchEonAmmQuoteFromRouter(params)
  }
}

/** Build strategy: API first when configured, then router fallback. */
export async function buildEonAmmSwap(params: EonAmmBuildParams): Promise<EonAmmBuildResult> {
  if (!eonAmmApiBaseUrl()) return buildEonAmmSwapFromRouter(params)
  try {
    return await buildEonAmmSwapFromApi(params)
  } catch {
    return buildEonAmmSwapFromRouter(params)
  }
}
