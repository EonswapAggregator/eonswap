export type TxEventPayload = {
  kind: 'swap' | 'bridge'
  status: 'success'
  txHash: string
  chainId: number
  wallet?: string
  summary?: string
  at: number
}

export async function sendTxEventToRelay(payload: TxEventPayload): Promise<void> {
  const relay = import.meta.env.VITE_MONITOR_RELAY_URL?.trim()
  if (!relay) return
  const relayUrl = relay.replace(/\/$/u, '')

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
