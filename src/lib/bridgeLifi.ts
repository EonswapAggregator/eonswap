import type { Address } from 'viem'

const LIFI_BASE = 'https://li.quest/v1'
const LIFI_TIMEOUT_MS = 15_000
const LIFI_RETRY_DELAYS_MS = [350, 900]

export type LifiToken = {
  address: string
  chainId: number
  symbol: string
  decimals: number
  name: string
  priceUSD?: string
  logoURI?: string
}

export type LifiFeeCost = {
  name: string
  description?: string
  amount: string
  amountUSD?: string
  percentage?: string
  included?: boolean
}

export type LifiGasCost = {
  amount: string
  amountUSD?: string
}

export type LifiQuote = {
  id: string
  tool: string
  toolDetails?: { name?: string }
  estimate: {
    approvalAddress?: Address
    fromAmount: string
    toAmount: string
    toAmountMin: string
    fromAmountUSD?: string
    toAmountUSD?: string
    executionDuration?: number
    feeCosts?: LifiFeeCost[]
    gasCosts?: LifiGasCost[]
  }
  transactionRequest: {
    to: Address
    from?: Address
    data?: `0x${string}`
    value?: `0x${string}`
    gasPrice?: `0x${string}`
    gasLimit?: `0x${string}`
    chainId?: number
  }
}

export type LifiStatus = {
  status: 'PENDING' | 'DONE' | 'FAILED' | 'NOT_FOUND' | string
  substatus?: string
  sending?: { txHash?: string }
  receiving?: { txHash?: string }
  bridgeExplorerLink?: string
  message?: string
}

function getIntegratorParams() {
  const integrator = import.meta.env.VITE_LIFI_INTEGRATOR?.trim()
  const fee = import.meta.env.VITE_LIFI_FEE_PERCENT?.trim()
  if (!integrator) return {}
  if (!fee) return { integrator }
  return { integrator, fee }
}

async function lifiFetch(url: string, init?: RequestInit): Promise<Response> {
  let lastError: unknown = null
  for (let i = 0; i <= LIFI_RETRY_DELAYS_MS.length; i += 1) {
    const ctrl = new AbortController()
    const timer = window.setTimeout(() => ctrl.abort(), LIFI_TIMEOUT_MS)
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal })
      if (res.status >= 500 || res.status === 429) {
        if (i < LIFI_RETRY_DELAYS_MS.length) {
          await new Promise((r) => window.setTimeout(r, LIFI_RETRY_DELAYS_MS[i]))
          continue
        }
      }
      return res
    } catch (e) {
      lastError = e
      if (i < LIFI_RETRY_DELAYS_MS.length) {
        await new Promise((r) => window.setTimeout(r, LIFI_RETRY_DELAYS_MS[i]))
        continue
      }
      const msg = String(e instanceof Error ? e.message : e ?? '')
      if (e instanceof DOMException && e.name === 'AbortError') {
        throw new Error('LI.FI degraded: request timeout')
      }
      throw new Error(`LI.FI degraded: ${msg || 'request failed'}`)
    } finally {
      window.clearTimeout(timer)
    }
  }
  throw new Error(
    `LI.FI degraded: ${String(lastError instanceof Error ? lastError.message : lastError ?? 'request failed')}`,
  )
}

export async function fetchLifiBridgeQuote(params: {
  fromChainId: number
  toChainId: number
  fromToken: string
  toToken: string
  fromAmount: string
  fromAddress: string
  slippage?: number
}): Promise<LifiQuote> {
  const q = new URLSearchParams({
    fromChain: String(params.fromChainId),
    toChain: String(params.toChainId),
    fromToken: params.fromToken,
    toToken: params.toToken,
    fromAmount: params.fromAmount,
    fromAddress: params.fromAddress,
    allowSwitchChain: 'false',
  })
  if (params.slippage != null) q.set('slippage', String(params.slippage))
  const extra = getIntegratorParams()
  if (extra.integrator) q.set('integrator', extra.integrator)
  if (extra.fee) q.set('fee', extra.fee)
  const apiKey = import.meta.env.VITE_LIFI_API_KEY?.trim()

  const res = await lifiFetch(`${LIFI_BASE}/quote?${q}`, {
    headers: {
      Accept: 'application/json',
      ...(apiKey ? { 'x-lifi-api-key': apiKey } : {}),
    },
  })
  const json = (await res.json()) as LifiQuote & { message?: string }
  if (!res.ok || !json?.transactionRequest?.to || !json?.estimate) {
    throw new Error(json?.message || `Bridge quote failed (${res.status})`)
  }
  return json
}

export async function fetchLifiBridgeStatus(params: {
  txHash: string
  fromChainId: number
  toChainId: number
  bridge?: string
}): Promise<LifiStatus> {
  const q = new URLSearchParams({
    txHash: params.txHash,
    fromChain: String(params.fromChainId),
    toChain: String(params.toChainId),
  })
  if (params.bridge) q.set('bridge', params.bridge)
  const apiKey = import.meta.env.VITE_LIFI_API_KEY?.trim()

  const res = await lifiFetch(`${LIFI_BASE}/status?${q}`, {
    headers: {
      Accept: 'application/json',
      ...(apiKey ? { 'x-lifi-api-key': apiKey } : {}),
    },
  })
  const json = (await res.json()) as LifiStatus & { message?: string }
  if (!res.ok || !json?.status) {
    throw new Error(json?.message || `Bridge status failed (${res.status})`)
  }
  return json
}
