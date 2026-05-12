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
    await fetch(`${relayUrl}/events/tx`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch {
    // non-blocking telemetry
  }
}
