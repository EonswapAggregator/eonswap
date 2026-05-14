import { getMonitorRelayBaseUrl } from './monitorRelayUrl'

export type TxEventKind = 'swap' | 'farm_deposit' | 'farm_withdraw' | 'farm_harvest' | 'lp_add' | 'lp_remove'

export type TxEventPayload = {
  kind: TxEventKind
  status: 'success'
  txHash: string
  chainId: number
  wallet?: string
  summary?: string
  at: number
  feeQuoteUsd?: number
  feeRealizedUsd?: number
  // Farm-specific
  poolName?: string
  amount?: string
  rewards?: string
}

export async function sendTxEventToRelay(payload: TxEventPayload): Promise<void> {
  const relayUrl = getMonitorRelayBaseUrl()
  if (!relayUrl) return

  try {
    const response = await fetch(`${relayUrl}/events/tx`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.warn('[relay] tx event rejected', {
        status: response.status,
        relayUrl,
        txHash: payload.txHash,
      })
    }
  } catch {
    console.warn('[relay] failed to send tx event', {
      relayUrl,
      txHash: payload.txHash,
    })
  }
}
