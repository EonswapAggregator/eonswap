import { buildEonAmmSwap, fetchEonAmmQuote } from './amm/eonAmmOrchestrator'
import { EON_AMM_ROUTER_FALLBACK, eonAmmApiBaseUrl, isEonAmmApiConfigured } from './amm/config'
import type { EonAmmBuildResult, EonAmmQuote } from './amm/types'

export { buildEonAmmSwap, fetchEonAmmQuote, EON_AMM_ROUTER_FALLBACK, eonAmmApiBaseUrl, isEonAmmApiConfigured }
export type { EonAmmBuildResult, EonAmmQuote }

export function eonAmmRouteLabel(_chainId: number): string[] {
  return ['Eon AMM']
}
