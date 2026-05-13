import type { Handler, HandlerEvent } from '@netlify/functions'

const RPC_URLS = [
  process.env.BASE_RPC_URL,
  process.env.VITE_BASE_RPC_URL,
  ...(process.env.BASE_FALLBACK_RPC_URLS || '').split(','),
  'https://mainnet.base.org',
]
  .map((url) => String(url || '').trim())
  .filter(Boolean)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

/**
 * GET /api/health
 * Health check endpoint for EonSwap API
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

  const startTime = Date.now()

  try {
    const rpcData = await rpcCall('eth_blockNumber', [])
    const blockNumber = parseInt(rpcData.result, 16)
    const latency = Date.now() - startTime

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        chain: {
          id: 8453,
          name: 'Base',
          blockNumber,
        },
        latency: `${latency}ms`,
        contracts: {
          router: '0xEbEe6F5518482c2de9EcF5483916d7591bf0d474',
          factory: '0x24FF44E8B0839660Dfc381466be1fF8d946cE5C8',
          masterChef: '0xbdD705BF5D4844db3d62ee8B6A8f7865CAd731A1',
        },
      }),
    }
  } catch (_error) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'RPC connection failed',
      }),
    }
  }
}

async function rpcCall(method: string, params: unknown[]) {
  let lastError: unknown = null
  for (const rpcUrl of RPC_URLS) {
    try {
      const rpcResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
        signal: AbortSignal.timeout(5000),
      })
      const rpcData = await rpcResponse.json()
      if (rpcData.error) throw new Error(rpcData.error.message || 'RPC call failed')
      return rpcData
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('All RPC calls failed')
}
