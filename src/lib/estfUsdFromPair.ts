import { createPublicClient, formatUnits, http, type Address } from 'viem'

import { base } from 'viem/chains'

import { fetchSimplePricesUsd } from './coingecko'
import { getEonChain } from './chains'
import { EON_BASE_MAINNET } from './eonBaseMainnet'

const ESTF_USD_CACHE_TTL_MS = 45_000

let cachedUsd: number | null = null
let cachedUsdAt = 0
let inFlight: Promise<number | null> | null = null
let pairOrderPromise: Promise<'estf-token0' | 'estf-token1' | null> | null = null

const PAIR_ABI = [
  {
    name: 'getReserves',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'reserve0', type: 'uint112' },
      { name: 'reserve1', type: 'uint112' },
      { name: 'blockTimestampLast', type: 'uint32' },
    ],
  },
  {
    name: 'token0',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'token1',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const

function resolveBaseRpcUrl(): string | null {
  const alchemyKey = String(import.meta.env.VITE_ALCHEMY_API_KEY ?? '').trim()
  if (alchemyKey) {
    return `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`
  }

  const fromEnv = String(import.meta.env.VITE_BASE_RPC_URL ?? '').trim()
  if (fromEnv) return fromEnv

  const chain = getEonChain(base.id) ?? base
  return chain.rpcUrls.default.http[0] ?? null
}

const rpcUrl = resolveBaseRpcUrl()
const chain = getEonChain(base.id) ?? base
const client = rpcUrl
  ? createPublicClient({
      chain,
      // Keep retries minimal to avoid request storms on public RPC limits.
      transport: http(rpcUrl, { retryCount: 1, timeout: 8_000 }),
    })
  : null

const pair = EON_BASE_MAINNET.amm.pairEstfWeth as Address
const estfLc = EON_BASE_MAINNET.token.address.toLowerCase()
const wethLc = EON_BASE_MAINNET.amm.weth.toLowerCase()

async function getPairOrder(): Promise<'estf-token0' | 'estf-token1' | null> {
  if (!client) return null
  if (!pairOrderPromise) {
    pairOrderPromise = (async () => {
      const [t0, t1] = await Promise.all([
        client.readContract({ address: pair, abi: PAIR_ABI, functionName: 'token0' }),
        client.readContract({ address: pair, abi: PAIR_ABI, functionName: 'token1' }),
      ])
      const a0 = String(t0).toLowerCase()
      const a1 = String(t1).toLowerCase()
      if (a0 === estfLc && a1 === wethLc) return 'estf-token0'
      if (a0 === wethLc && a1 === estfLc) return 'estf-token1'
      return null
    })().catch(() => null)
  }
  return pairOrderPromise
}

async function fetchEstfUsdUncached(): Promise<number | null> {
  if (!client) return null

  const order = await getPairOrder()
  if (!order) return null

  const reserves = await client.readContract({
    address: pair,
    abi: PAIR_ABI,
    functionName: 'getReserves',
  })

  const [r0, r1] = reserves
  const reserveEstf = order === 'estf-token0' ? r0 : r1
  const reserveWeth = order === 'estf-token0' ? r1 : r0

  if (reserveEstf <= 0n) return null

  // WETH per 1 ESTF (18 decimals each)
  const wethPerEstf =
    Number(formatUnits(reserveWeth, 18)) / Number(formatUnits(reserveEstf, 18))
  if (!Number.isFinite(wethPerEstf) || wethPerEstf <= 0) return null

  const ethUsdMap = await fetchSimplePricesUsd(['ethereum'])
  const ethUsd = ethUsdMap.ethereum
  if (!Number.isFinite(ethUsd) || ethUsd <= 0) return null

  const usd = wethPerEstf * ethUsd
  return Number.isFinite(usd) && usd > 0 ? usd : null
}

/**
 * ESTF price in USD from the Base ESTF/WETH pool (constant-product reserves)
 * multiplied by ETH/USD (CoinGecko `ethereum`, same USD price as WETH).
 */
export async function fetchEstfUsdFromEstfWethPair(): Promise<number | null> {
  const now = Date.now()
  if (cachedUsd != null && now - cachedUsdAt < ESTF_USD_CACHE_TTL_MS) {
    return cachedUsd
  }

  if (inFlight) return inFlight

  inFlight = fetchEstfUsdUncached()
    .then((usd) => {
      cachedUsd = usd
      cachedUsdAt = Date.now()
      return usd
    })
    .finally(() => {
      inFlight = null
    })

  return inFlight
}
