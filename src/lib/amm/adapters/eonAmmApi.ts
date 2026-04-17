import { eonAmmApiBaseUrl, eonAmmClientHeaders, EON_AMM_TIMEOUT_MS, pickRouter } from '../config'
import type { EonAmmBuildParams, EonAmmBuildResult, EonAmmQuote, EonAmmQuoteParams } from '../types'

function unwrapData<T>(json: unknown): T {
  if (json && typeof json === 'object' && 'data' in json) {
    return (json as { data: T }).data
  }
  return json as T
}

export async function fetchEonAmmQuoteFromApi(params: EonAmmQuoteParams): Promise<EonAmmQuote> {
  const baseUrl = eonAmmApiBaseUrl()
  if (!baseUrl) throw new Error('Eon AMM API base URL is not configured.')

  const q = new URLSearchParams({
    chainId: String(params.chainId),
    tokenIn: params.tokenIn,
    tokenOut: params.tokenOut,
    amountIn: params.amountIn,
  })
  if (params.sender) q.set('sender', params.sender)

  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), EON_AMM_TIMEOUT_MS)
  try {
    const res = await fetch(`${baseUrl}/v1/quote?${q}`, {
      headers: eonAmmClientHeaders(),
      signal: ctrl.signal,
    })
    const json = (await res.json()) as unknown
    if (!res.ok) {
      const msg =
        json && typeof json === 'object' && 'message' in json
          ? String((json as { message: unknown }).message)
          : `Eon AMM quote failed (${res.status})`
      throw new Error(msg)
    }

    const row = unwrapData<{
      amountOut?: string
      routeId?: string
      routerAddress?: string
      amountInUsd?: string
      amountOutUsd?: string
      gasUsd?: string
      buildPayload?: Record<string, unknown>
    }>(json)

    const amountOut = row.amountOut?.trim()
    const routeId = row.routeId?.trim()
    if (!amountOut || !routeId) {
      throw new Error('Eon AMM quote response missing amountOut or routeId.')
    }

    return {
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      amountOut,
      routeId,
      routerAddress: pickRouter(params.chainId, row.routerAddress),
      amountInUsd: row.amountInUsd,
      amountOutUsd: row.amountOutUsd,
      gasUsd: row.gasUsd,
      buildPayload: row.buildPayload,
    }
  } finally {
    window.clearTimeout(timer)
  }
}

export async function buildEonAmmSwapFromApi(params: EonAmmBuildParams): Promise<EonAmmBuildResult> {
  const baseUrl = eonAmmApiBaseUrl()
  if (!baseUrl) throw new Error('Eon AMM API base URL is not configured.')

  // ✅ SECURITY FIX (M-1): Allowlist buildPayload keys to prevent injection
  const ALLOWED_BUILD_PAYLOAD_KEYS = ['mode', 'poolId', 'routeHint'] as const
  const safeBuildPayload: Record<string, unknown> = {}
  if (params.quote.buildPayload) {
    for (const key of ALLOWED_BUILD_PAYLOAD_KEYS) {
      if (key in params.quote.buildPayload) {
        safeBuildPayload[key] = params.quote.buildPayload[key]
      }
    }
  }

  const body = {
    chainId: params.chainId,
    routeId: params.quote.routeId,
    tokenIn: params.quote.tokenIn,
    tokenOut: params.quote.tokenOut,
    amountIn: params.quote.amountIn,
    sender: params.sender,
    recipient: params.recipient,
    slippageToleranceBps: params.slippageToleranceBps,
    deadlineMinutes: params.deadlineMinutes,
    ...safeBuildPayload,
  }

  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), EON_AMM_TIMEOUT_MS)
  try {
    const res = await fetch(`${baseUrl}/v1/route/build`, {
      method: 'POST',
      headers: eonAmmClientHeaders(),
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    const json = (await res.json()) as unknown
    if (!res.ok) {
      const msg =
        json && typeof json === 'object' && 'message' in json
          ? String((json as { message: unknown }).message)
          : `Eon AMM build failed (${res.status})`
      throw new Error(msg)
    }

    const row = unwrapData<{
      data?: string
      routerAddress?: string
      transactionValue?: string
      value?: string
      gas?: string
    }>(json)

    const data = row.data?.trim()
    if (!data?.startsWith('0x')) throw new Error('Eon AMM build response missing calldata.')

    return {
      routerAddress: pickRouter(params.chainId, row.routerAddress ?? params.quote.routerAddress),
      data: data as `0x${string}`,
      transactionValue: (row.transactionValue ?? row.value ?? '0').trim() || '0',
      gas: (row.gas ?? '0').trim() || '0',
    }
  } finally {
    window.clearTimeout(timer)
  }
}
