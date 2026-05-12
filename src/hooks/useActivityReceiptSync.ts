import { useEffect, useMemo } from 'react'
import { getPublicClient } from 'wagmi/actions'
import { isSupportedChain, type EonChain } from '../lib/chains'
import { useEonSwapStore } from '../store/useEonSwapStore'
import { wagmiConfig } from '../wagmi'

const POLL_MS = 3500

/**
 * Polls the RPC for receipts of pending session swaps so Activity updates
 * even if you leave the swap flow (wallet-style live status).
 */
export function useActivityReceiptSync() {
  const history = useEonSwapStore((s) => s.history)
  const patchActivity = useEonSwapStore((s) => s.patchActivity)

  const pendingKey = useMemo(() => {
    return history
      .filter((h) => h.status === 'pending' && h.txHash)
      .map((h) => `${h.id}:${h.txHash}`)
      .sort()
      .join('|')
  }, [history])

  useEffect(() => {
    if (!pendingKey) return

    let cancelled = false

    const tick = async () => {
      const pending = useEonSwapStore
        .getState()
        .history.filter((h) => h.status === 'pending' && h.txHash)

      for (const item of pending) {
        if (cancelled) return
        if (!isSupportedChain(item.chainId) || !item.txHash) continue
        const client = getPublicClient(wagmiConfig, {
          chainId: item.chainId as EonChain['id'],
        })
        if (!client) continue
        try {
          const receipt = await client.getTransactionReceipt({
            hash: item.txHash,
          })
          if (cancelled) return
          patchActivity(item.id, {
            status: receipt.status === 'success' ? 'success' : 'failed',
            blockNumber: Number(receipt.blockNumber),
          })
        } catch {
          /* receipt not available yet */
        }
      }
    }

    void tick()
    const id = window.setInterval(() => void tick(), POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [pendingKey, patchActivity])
}
