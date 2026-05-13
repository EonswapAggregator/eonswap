import type { Handler, HandlerEvent } from '@netlify/functions'

const FACTORY_ADDRESS = '0x24FF44E8B0839660Dfc381466be1fF8d946cE5C8'
const RPC_URLS = [
  process.env.BASE_RPC_URL,
  process.env.VITE_BASE_RPC_URL,
  ...(process.env.BASE_FALLBACK_RPC_URLS || '').split(','),
  'https://mainnet.base.org',
]
  .map((url) => String(url || '').trim())
  .filter(Boolean)
const MAX_PAIRS = Number(process.env.PAIRS_MAX_SCAN || 500)

const KNOWN_PAIRS = [
  {
    address: '0x539e2da338ca3ae9b5fedc6d102978a741b641cf',
    token0: '0x295685df8e07a6d529a849AE7688c524494fD010',
    token1: '0x4200000000000000000000000000000000000006',
    symbol: 'ESTF/WETH',
  },
]

const GET_RESERVES_SELECTOR = '0x0902f1ac'
const TOKEN0_SELECTOR = '0x0dfe1681'
const TOKEN1_SELECTOR = '0xd21220a7'
const TOTAL_SUPPLY_SELECTOR = '0x18160ddd'
const ALL_PAIRS_LENGTH_SELECTOR = '0x574f2ba3'
const ALL_PAIRS_SELECTOR = '0x1e3dd18b'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
}

/**
 * GET /api/pairs
 * Get liquidity pool information
 */
export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  const params = event.queryStringParameters || {}
  const pair = params.pair

  try {
    if (pair) {
      const pairAddress = pair.toLowerCase().trim()

      if (!/^0x[a-f0-9]{40}$/i.test(pairAddress)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid pair address format' }),
        }
      }

      const pairData = await getPairData(pairAddress)

      if (!pairData) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Pair not found or has no liquidity' }),
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ data: pairData }),
      }
    }

    const pairAddresses = await getAllPairAddresses().catch(() =>
      KNOWN_PAIRS.map((p) => p.address)
    )

    const pairsData = await Promise.all(
      pairAddresses.map(async (address) => {
        const data = await getPairData(address)
        const known = KNOWN_PAIRS.find((p) => p.address.toLowerCase() === address.toLowerCase())
        return data ? { ...data, symbol: known?.symbol } : null
      })
    )

    const validPairs = pairsData.filter(Boolean)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        data: validPairs,
        factory: FACTORY_ADDRESS,
        chainId: 8453,
      }),
    }
  } catch (error) {
    console.error('Pairs error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to get pair data',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    }
  }
}

interface PairData {
  address: string
  token0: string
  token1: string
  reserve0: string
  reserve1: string
  totalSupply: string
  chainId: number
}

async function getPairData(pairAddress: string): Promise<PairData | null> {
  try {
    const [reservesResult, token0Result, token1Result, totalSupplyResult] = await Promise.all([
      ethCall(pairAddress, GET_RESERVES_SELECTOR),
      ethCall(pairAddress, TOKEN0_SELECTOR),
      ethCall(pairAddress, TOKEN1_SELECTOR),
      ethCall(pairAddress, TOTAL_SUPPLY_SELECTOR),
    ])

    if (!reservesResult || reservesResult === '0x') {
      return null
    }

    const reserve0 = BigInt('0x' + reservesResult.slice(2, 66)).toString()
    const reserve1 = BigInt('0x' + reservesResult.slice(66, 130)).toString()

    const token0 = '0x' + token0Result.slice(-40)
    const token1 = '0x' + token1Result.slice(-40)

    const totalSupply = BigInt('0x' + totalSupplyResult.slice(2)).toString()

    return {
      address: pairAddress.toLowerCase(),
      token0: token0.toLowerCase(),
      token1: token1.toLowerCase(),
      reserve0,
      reserve1,
      totalSupply,
      chainId: 8453,
    }
  } catch {
    return null
  }
}

async function ethCall(to: string, data: string): Promise<string> {
  let lastError: unknown = null
  for (const rpcUrl of RPC_URLS) {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{ to, data }, 'latest'],
          id: 1,
        }),
        signal: AbortSignal.timeout(10000),
      })

      const json = await response.json()

      if (json.error) {
        throw new Error(json.error.message || 'RPC call failed')
      }

      return json.result
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('All RPC calls failed')
}

function encodeAllPairs(index: number): string {
  return ALL_PAIRS_SELECTOR + BigInt(index).toString(16).padStart(64, '0')
}

async function getAllPairAddresses(): Promise<string[]> {
  const lengthResult = await ethCall(FACTORY_ADDRESS, ALL_PAIRS_LENGTH_SELECTOR)
  const length = Number(BigInt(lengthResult))
  const count = Math.min(Number.isFinite(length) ? length : 0, MAX_PAIRS)
  if (count <= 0) return []

  const pairs = await Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const result = await ethCall(FACTORY_ADDRESS, encodeAllPairs(i))
      return `0x${result.slice(-40)}`.toLowerCase()
    })
  )

  return [...new Set(pairs)]
}
