import type { Handler, HandlerEvent } from '@netlify/functions'

const FACTORY_ADDRESS = '0xd7b56729dcaa67aa2fa4a72795e3ed94ac03071b'
const RPC_URL = 'https://mainnet.base.org'

const KNOWN_PAIRS = [
  {
    address: '0x79680a4500df8e0599e9916c52b3b1983bd6ee04',
    token0: '0x7bd09674b3c721e35973993d5b6a79cda7da9c7f',
    token1: '0x4200000000000000000000000000000000000006',
    symbol: 'ESTF/WETH',
  },
  {
    address: '0x1a46207d6c02b95c159ab2f4b8b521b061b49173',
    token0: '0xbc11e3093afdbeb88d32ef893027202fc2b84f9d',
    token1: '0x4200000000000000000000000000000000000006',
    symbol: 'ESR/WETH',
  },
]

const GET_RESERVES_SELECTOR = '0x0902f1ac'
const TOKEN0_SELECTOR = '0x0dfe1681'
const TOKEN1_SELECTOR = '0xd21220a7'
const TOTAL_SUPPLY_SELECTOR = '0x18160ddd'

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

    const pairsData = await Promise.all(
      KNOWN_PAIRS.map(async (p) => {
        const data = await getPairData(p.address)
        return data ? { ...data, symbol: p.symbol } : null
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
  const response = await fetch(RPC_URL, {
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
}
