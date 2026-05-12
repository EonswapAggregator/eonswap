import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * GET /api/health
 * Health check endpoint for EonSwap API
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
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

    return res.status(200).json({
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
    })
  } catch (_error) {
    return res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'RPC connection failed',
    })
  }
}
