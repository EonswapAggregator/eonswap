import type { Address } from 'viem'
import { KYBER_CHAIN_SLUG } from './chains'
import type { Token } from './tokens'

const AGGREGATOR_BASE = 'https://aggregator-api.kyberswap.com'
const KYBER_TIMEOUT_MS = 15_000

export type KyberPoolStep = {
  pool: string
  tokenIn: string
  tokenOut: string
  swapAmount: string
  amountOut: string
  exchange: string
  poolType: string
  poolExtra: unknown
  extra: unknown
}

/** Shape returned by GET /routes — pass unchanged into POST /route/build */
export type KyberRouteSummary = {
  tokenIn: string
  amountIn: string
  amountInUsd: string
  tokenOut: string
  amountOut: string
  amountOutUsd: string
  gas: string
  gasPrice: string
  gasUsd: string
  l1FeeUsd?: string
  extraFee?: {
    feeAmount: string
    chargeFeeBy: string
    isInBps: boolean
    feeReceiver: string
  }
  route: KyberPoolStep[][]
  routeID: string
  checksum: string
  timestamp: string
}

type KyberApiEnvelope<T> = {
  code: number
  message?: string
  data: T
  requestId?: string
}

function chainSlug(chainId: number): string {
  const s = KYBER_CHAIN_SLUG[chainId]
  if (!s) throw new Error(`Unsupported chain: ${chainId}`)
  return s
}

function clientHeaders(): HeadersInit {
  const id = import.meta.env.VITE_KYBER_CLIENT_ID?.trim() || 'EonSwap'
  return {
    'X-Client-Id': id,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
}

async function kyberFetch(url: string, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), KYBER_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } catch (e) {
    const msg = String(e instanceof Error ? e.message : e ?? '')
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('Kyber request timeout')
    }
    throw new Error(msg || 'Kyber request failed')
  } finally {
    window.clearTimeout(timer)
  }
}

function appendFeeParams(q: URLSearchParams) {
  const receiver = import.meta.env.VITE_KYBER_FEE_RECEIVER?.trim()
  const bps = import.meta.env.VITE_KYBER_FEE_BPS?.trim()
  if (receiver && bps) {
    q.set('chargeFeeBy', 'currency_out')
    q.set('feeReceiver', receiver)
    q.set('feeAmount', bps)
    q.set('isInBps', 'true')
  }
}

export async function fetchKyberRoute(params: {
  chainId: number
  tokenIn: string
  tokenOut: string
  amountIn: string
  origin?: string
}): Promise<{ routeSummary: KyberRouteSummary; routerAddress: Address }> {
  const q = new URLSearchParams({
    tokenIn: params.tokenIn,
    tokenOut: params.tokenOut,
    amountIn: params.amountIn,
  })
  if (params.origin) q.set('origin', params.origin)
  appendFeeParams(q)

  const url = `${AGGREGATOR_BASE}/${chainSlug(params.chainId)}/api/v1/routes?${q}`
  const res = await kyberFetch(url, { headers: clientHeaders() })
  const json = (await res.json()) as KyberApiEnvelope<{
    routeSummary: KyberRouteSummary
    routerAddress: string
  }>

  if (!res.ok || json.code !== 0 || !json.data?.routeSummary) {
    throw new Error(
      json.message ||
        (json as { details?: { message?: string } }).details?.message ||
        `Route quote failed (${res.status})`,
    )
  }

  return {
    routeSummary: json.data.routeSummary,
    routerAddress: json.data.routerAddress as Address,
  }
}

type KyberTokenRow = {
  address: string
  symbol: string
  name: string
  decimals: number
}

/** Batch token metadata — Kyber requires comma-separated contract `ids` (no full catalog endpoint). */
export async function fetchKyberTokensByIds(
  chainId: number,
  ids: string[],
): Promise<Token[]> {
  const uniq = [
    ...new Set(
      ids.map((a) => a.trim()).filter(Boolean),
    ),
  ].map((a) => a.toLowerCase())
  if (uniq.length === 0) return []

  const slug = chainSlug(chainId)
  const chunkSize = 48
  const chunks: string[][] = []
  for (let i = 0; i < uniq.length; i += chunkSize) {
    chunks.push(uniq.slice(i, i + chunkSize))
  }

  const rows: KyberTokenRow[] = []
  for (const batch of chunks) {
    const q = new URLSearchParams({ ids: batch.join(',') })
    const url = `${AGGREGATOR_BASE}/${slug}/api/v1/tokens?${q}`
  const res = await kyberFetch(url, { headers: clientHeaders() })
    const json = (await res.json()) as KyberApiEnvelope<{ tokens: KyberTokenRow[] }>
    if (!res.ok || json.code !== 0 || !json.data?.tokens) continue
    rows.push(...json.data.tokens)
  }

  return rows
    .filter((r) => Boolean(r.symbol?.trim()))
    .map((r) => ({
      address: r.address,
      symbol: r.symbol.trim(),
      name: (r.name && r.name.trim()) || r.symbol.trim(),
      decimals: Number(r.decimals),
    }))
}

export type KyberBuildResult = {
  data: `0x${string}`
  routerAddress: Address
  transactionValue: string
  gas: string
}

export async function buildKyberSwap(params: {
  chainId: number
  routeSummary: KyberRouteSummary
  sender: string
  recipient: string
  origin?: string
  /** Bps × 0.01% — e.g. 100 = 1% */
  slippageTolerance: number
}): Promise<KyberBuildResult> {
  const body = {
    routeSummary: params.routeSummary,
    sender: params.sender,
    recipient: params.recipient,
    origin: params.origin ?? params.sender,
    slippageTolerance: params.slippageTolerance,
  }

  const url = `${AGGREGATOR_BASE}/${chainSlug(params.chainId)}/api/v1/route/build`
  const res = await kyberFetch(url, {
    method: 'POST',
    headers: clientHeaders(),
    body: JSON.stringify(body),
  })

  const json = (await res.json()) as KyberApiEnvelope<KyberBuildResult>

  if (!res.ok || json.code !== 0 || !json.data?.data) {
    throw new Error(
      json.message ||
        (json as { details?: { message?: string } }).details?.message ||
        `Swap encoding failed (${res.status})`,
    )
  }

  return {
    data: json.data.data as `0x${string}`,
    routerAddress: json.data.routerAddress as Address,
    transactionValue: json.data.transactionValue,
    gas: json.data.gas,
  }
}

export function kyberRouteExchanges(summary: KyberRouteSummary): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const hop of summary.route) {
    for (const p of hop) {
      const ex = p.exchange
      if (!ex || seen.has(ex)) continue
      seen.add(ex)
      out.push(formatExchangeLabel(ex))
    }
  }
  return out
}

function formatExchangeLabel(raw: string): string {
  const s = raw.toLowerCase()
  const map: Record<string, string> = {
    uniswapv3: 'Uniswap v3',
    uniswapv2: 'Uniswap v2',
    sushiswap: 'SushiSwap',
    pancakeswap: 'PancakeSwap',
    curve: 'Curve',
    balancer: 'Balancer',
    kyberdmm: 'Elastic AMM',
    kyberswap: 'AMM pool',
    oneinch: '1inch',
    dodo: 'DODO',
  }
  if (map[s]) return map[s]
  return raw.replace(/([a-z])([0-9])/gi, '$1 $2').replace(/^./, (c) => c.toUpperCase())
}
