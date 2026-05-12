import type { VercelRequest, VercelResponse } from '@vercel/node'

const RPC_URL = 'https://mainnet.base.org'

/**
 * GET /api/status
 * Get transaction status
 * 
 * Query params:
 * - txHash: Transaction hash (0x...)
 * - chainId: Chain ID (optional, default 8453)
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

  const { txHash, chainId = '8453' } = req.query

  if (!txHash) {
    return res.status(400).json({
      error: 'Missing required parameter: txHash',
      example: '/api/status?txHash=0x...',
    })
  }

  const hash = String(txHash).trim()

  if (!/^0x[a-f0-9]{64}$/i.test(hash)) {
    return res.status(400).json({ error: 'Invalid transaction hash format' })
  }

  if (chainId !== '8453') {
    return res.status(400).json({
      error: 'Unsupported chain',
      supported: [8453],
    })
  }

  try {
    // Get transaction receipt
    const receipt = await getTransactionReceipt(hash)
    
    if (!receipt) {
      // Try getting pending transaction
      const tx = await getTransaction(hash)
      
      if (!tx) {
        return res.status(200).json({
          data: {
            txHash: hash,
            status: 'NOT_FOUND',
            chainId: 8453,
          },
        })
      }

      return res.status(200).json({
        data: {
          txHash: hash,
          status: 'PENDING',
          chainId: 8453,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          gasPrice: tx.gasPrice,
        },
      })
    }

    const status = receipt.status === '0x1' ? 'SUCCESS' : 'FAILED'

    return res.status(200).json({
      data: {
        txHash: hash,
        status,
        chainId: 8453,
        blockNumber: parseInt(receipt.blockNumber, 16),
        blockHash: receipt.blockHash,
        from: receipt.from,
        to: receipt.to,
        gasUsed: parseInt(receipt.gasUsed, 16),
        effectiveGasPrice: receipt.effectiveGasPrice ? parseInt(receipt.effectiveGasPrice, 16) : null,
        logs: receipt.logs?.length || 0,
        explorerUrl: `https://basescan.org/tx/${hash}`,
      },
    })
  } catch (error) {
    console.error('Status error:', error)
    return res.status(500).json({
      error: 'Failed to get transaction status',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RPC Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
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

interface TransactionReceipt {
  status: string
  blockNumber: string
  blockHash: string
  from: string
  to: string | null
  gasUsed: string
  effectiveGasPrice?: string
  logs: unknown[]
}

interface Transaction {
  from: string
  to: string | null
  value: string
  gasPrice: string
}

async function getTransactionReceipt(hash: string): Promise<TransactionReceipt | null> {
  return rpcCall('eth_getTransactionReceipt', [hash]) as Promise<TransactionReceipt | null>
}

async function getTransaction(hash: string): Promise<Transaction | null> {
  return rpcCall('eth_getTransactionByHash', [hash]) as Promise<Transaction | null>
}
