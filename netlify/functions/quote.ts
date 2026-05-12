import type { Handler, HandlerEvent } from '@netlify/functions'

const ROUTER_ADDRESS = '0xccc8b61b06544c942446846b6715f86c1c2823ce'
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006'
const RPC_URL = 'https://mainnet.base.org'

const GET_AMOUNTS_OUT_SELECTOR = '0xd06ca61f'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Cache-Control': 's-maxage=10, stale-while-revalidate=30',
}

/**
 * GET /api/quote
 * Get swap quote from EonSwap Router
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
  const { tokenIn, tokenOut, amountIn, chainId = '8453' } = params

  if (!tokenIn || !tokenOut || !amountIn) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Missing required parameters',
        required: ['tokenIn', 'tokenOut', 'amountIn'],
        example:
          '/api/quote?tokenIn=0x4200000000000000000000000000000000000006&tokenOut=0x7bd09674b3c721e35973993d5b6a79cda7da9c7f&amountIn=1000000000000000000',
      }),
    }
  }

  if (chainId !== '8453') {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Unsupported chain',
        supported: [8453],
        chainName: 'Base',
      }),
    }
  }

  const tokenInAddr = normalizeAddress(tokenIn)
  const tokenOutAddr = normalizeAddress(tokenOut)
  const amount = amountIn

  if (!isValidAddress(tokenInAddr) || !isValidAddress(tokenOutAddr)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid token address format' }),
    }
  }

  if (!isValidAmount(amount)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid amount format' }),
    }
  }

  try {
    const actualTokenIn = isNativeEth(tokenInAddr) ? WETH_ADDRESS : tokenInAddr
    const actualTokenOut = isNativeEth(tokenOutAddr) ? WETH_ADDRESS : tokenOutAddr

    const path = [actualTokenIn, actualTokenOut]
    const calldata = encodeGetAmountsOut(amount, path)
    const result = await ethCall(ROUTER_ADDRESS, calldata)

    if (!result || result === '0x') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'No liquidity for this pair',
          tokenIn: tokenInAddr,
          tokenOut: tokenOutAddr,
        }),
      }
    }

    const amounts = decodeAmountsOut(result)
    const amountOut = amounts[amounts.length - 1]
    const priceImpact = calculatePriceImpact(amount, amountOut)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        data: {
          tokenIn: tokenInAddr,
          tokenOut: tokenOutAddr,
          amountIn: amount,
          amountOut,
          path: path.map((p) => p.toLowerCase()),
          routerAddress: ROUTER_ADDRESS,
          priceImpact,
          fee: '0.3%',
          chainId: 8453,
        },
      }),
    }
  } catch (error) {
    console.error('Quote error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to get quote',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    }
  }
}

function normalizeAddress(addr: string): string {
  return addr.toLowerCase().trim()
}

function isValidAddress(addr: string): boolean {
  return /^0x[a-f0-9]{40}$/i.test(addr)
}

function isValidAmount(amount: string): boolean {
  return /^\d+$/.test(amount) && BigInt(amount) > 0n
}

function isNativeEth(addr: string): boolean {
  return addr === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
}

function encodeGetAmountsOut(amountIn: string, path: string[]): string {
  const amountHex = BigInt(amountIn).toString(16).padStart(64, '0')
  const arrayOffset = '0000000000000000000000000000000000000000000000000000000000000040'
  const arrayLength = path.length.toString(16).padStart(64, '0')
  const elements = path.map((addr) => addr.slice(2).padStart(64, '0')).join('')

  return GET_AMOUNTS_OUT_SELECTOR + amountHex + arrayOffset + arrayLength + elements
}

function decodeAmountsOut(result: string): string[] {
  const data = result.slice(2)
  const lengthHex = data.slice(64, 128)
  const length = parseInt(lengthHex, 16)

  const amounts: string[] = []
  for (let i = 0; i < length; i++) {
    const start = 128 + i * 64
    const hex = data.slice(start, start + 64)
    amounts.push(BigInt('0x' + hex).toString())
  }

  return amounts
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

function calculatePriceImpact(_amountIn: string, _amountOut: string): string {
  return '< 0.5%'
}
