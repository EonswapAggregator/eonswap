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
 * GET /api/status
 * Get transaction status
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
  const txHash = params.txHash
  const chainId = params.chainId || '8453'

  if (!txHash) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Missing required parameter: txHash',
        example: '/api/status?txHash=0x...',
      }),
    }
  }

  const hash = txHash.trim()

  if (!/^0x[a-f0-9]{64}$/i.test(hash)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid transaction hash format' }),
    }
  }

  if (chainId !== '8453') {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Unsupported chain',
        supported: [8453],
      }),
    }
  }

  try {
    const receipt = await getTransactionReceipt(hash)

    if (!receipt) {
      const tx = await getTransaction(hash)

      if (!tx) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            data: {
              txHash: hash,
              status: 'NOT_FOUND',
              chainId: 8453,
            },
          }),
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          data: {
            txHash: hash,
            status: 'PENDING',
            chainId: 8453,
            from: tx.from,
            to: tx.to,
            value: tx.value,
            gasPrice: tx.gasPrice,
          },
        }),
      }
    }

    const status = receipt.status === '0x1' ? 'SUCCESS' : 'FAILED'

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        data: {
          txHash: hash,
          status,
          chainId: 8453,
          blockNumber: parseInt(receipt.blockNumber, 16),
          blockHash: receipt.blockHash,
          from: receipt.from,
          to: receipt.to,
          gasUsed: parseInt(receipt.gasUsed, 16),
          effectiveGasPrice: receipt.effectiveGasPrice
            ? parseInt(receipt.effectiveGasPrice, 16)
            : null,
          logs: receipt.logs?.length || 0,
          explorerUrl: `https://basescan.org/tx/${hash}`,
        },
      }),
    }
  } catch (error) {
    console.error('Status error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to get transaction status',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    }
  }
}

async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  let lastError: unknown = null
  for (const rpcUrl of RPC_URLS) {
    try {
      const response = await fetch(rpcUrl, {
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
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('All RPC calls failed')
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
