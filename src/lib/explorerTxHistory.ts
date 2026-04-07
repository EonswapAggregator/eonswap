import { formatEther } from 'viem'

/** Normal tx from Etherscan-family `account&action=txlist` */
export type ExplorerNormalTx = {
  blockNumber: string
  timeStamp: string
  hash: string
  from: string
  to: string
  value: string
  isError: string
  txreceipt_status: string
  gasUsed: string
}

type EtherscanV2Response =
  | { status: string; message: string; result: ExplorerNormalTx[] }
  | { status: string; message: string; result: string }

function etherscanRequestUrl(): string {
  if (import.meta.env.DEV) {
    return '/api/etherscan/v2/api'
  }
  return 'https://api.etherscan.io/v2/api'
}

/**
 * Recent normal transactions for an address via Etherscan API V2 (multichain).
 * Caller must pass a valid API key (from app env or backend); never expose it in UI.
 */
export async function fetchAddressTxList(params: {
  chainId: number
  address: `0x${string}`
  apiKey: string
  offset?: number
}): Promise<ExplorerNormalTx[]> {
  const { chainId, address, apiKey, offset = 30 } = params
  if (!apiKey.trim()) {
    throw new Error('Missing Etherscan API key.')
  }

  const base = etherscanRequestUrl()
  const u = base.startsWith('http')
    ? new URL(base)
    : new URL(base, window.location.origin)
  u.searchParams.set('chainid', String(chainId))
  u.searchParams.set('module', 'account')
  u.searchParams.set('action', 'txlist')
  u.searchParams.set('address', address)
  u.searchParams.set('startblock', '0')
  u.searchParams.set('endblock', '99999999')
  u.searchParams.set('page', '1')
  u.searchParams.set('offset', String(offset))
  u.searchParams.set('sort', 'desc')
  u.searchParams.set('apikey', apiKey)

  const res = await fetch(u.toString())
  if (!res.ok) {
    throw new Error(`Explorer HTTP ${res.status}`)
  }

  const data = (await res.json()) as EtherscanV2Response

  if (Array.isArray(data.result)) {
    return data.result
  }

  const msg =
    typeof data.result === 'string' ? data.result : data.message ?? ''
  const empty =
    /no transactions found/i.test(msg) ||
    /no records found/i.test(msg) ||
    data.message === 'No transactions found'
  if (empty) {
    return []
  }

  if (data.status !== '1') {
    throw new Error(msg || 'Explorer API error')
  }

  return []
}

export function txSuccess(tx: ExplorerNormalTx): boolean {
  if (tx.isError === '1') return false
  if (tx.txreceipt_status === '0') return false
  return true
}

export function formatTxValueEth(weiStr: string): string {
  try {
    const v = BigInt(weiStr || '0')
    if (v === 0n) return '0 ETH'
    const s = formatEther(v)
    const [w, f = ''] = s.split('.')
    const frac = (f + '000000').slice(0, 6).replace(/0+$/, '')
    return frac ? `${w}.${frac} ETH` : `${w} ETH`
  } catch {
    return '—'
  }
}
