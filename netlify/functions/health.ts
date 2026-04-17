import type { Handler, HandlerEvent } from '@netlify/functions'

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
    // Check RPC connectivity
    const rpcResponse = await fetch('https://mainnet.base.org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
      signal: AbortSignal.timeout(5000),
    })

    const rpcData = await rpcResponse.json()
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
          router: '0xccc8b61b06544c942446846b6715f86c1c2823ce',
          factory: '0xd7b56729dcaa67aa2fa4a72795e3ed94ac03071b',
          masterChef: '0x1ffbe00f3810e97a8306961d8dc4054abd4f4a2c',
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
