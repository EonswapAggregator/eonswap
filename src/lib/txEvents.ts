import { getMonitorRelayBaseUrl } from './monitorRelayUrl'

export type TxEventPayload = {
  kind: 'swap' | 'bridge'
  status: 'success'
  txHash: string
  chainId: number
  wallet?: string
  summary?: string
  at: number
  feeQuoteUsd?: number
  feeRealizedUsd?: number
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
