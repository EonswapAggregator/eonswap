import {
  BaseError,
  TransactionNotFoundError,
  TransactionReceiptNotFoundError,
  createPublicClient,
  http,
  type Address,
  type Hash,
} from 'viem'
import { getEonChain } from './chains'

export type EvmTxStatus = {
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'NOT_FOUND'
  blockNumber?: bigint
  from?: Address
  to?: Address | null
}

export async function fetchEvmTxStatus(params: {
  chainId: number
  txHash: string
}): Promise<EvmTxStatus> {
  const chain = getEonChain(params.chainId)
  if (!chain) throw new Error(`Unsupported chain: ${params.chainId}`)
  const rpcUrl = chain.rpcUrls.default.http[0]
  if (!rpcUrl) throw new Error('No RPC URL configured for this chain')

  const client = createPublicClient({
    chain,
    transport: http(rpcUrl),
  })
  const hash = params.txHash as Hash

  try {
    const tx = await client.getTransaction({ hash })
    const receipt = await client.getTransactionReceipt({ hash })
    return {
      status: receipt.status === 'success' ? 'SUCCESS' : 'FAILED',
      blockNumber: receipt.blockNumber,
      from: tx.from,
      to: tx.to,
    }
  } catch (err) {
    if (
      err instanceof TransactionNotFoundError ||
      (err instanceof BaseError && err.name === 'TransactionNotFoundError')
    ) {
      return { status: 'NOT_FOUND' }
    }
    if (
      err instanceof TransactionReceiptNotFoundError ||
      (err instanceof BaseError && err.name === 'TransactionReceiptNotFoundError')
    ) {
      try {
        const tx = await client.getTransaction({ hash })
        return { status: 'PENDING', from: tx.from, to: tx.to }
      } catch (innerErr) {
        if (
          innerErr instanceof TransactionNotFoundError ||
          (innerErr instanceof BaseError && innerErr.name === 'TransactionNotFoundError')
        ) {
          return { status: 'NOT_FOUND' }
        }
        throw innerErr
      }
    }
    throw err
  }
}
