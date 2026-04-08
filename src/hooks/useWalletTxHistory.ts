import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { isSupportedChain } from '../lib/chains'
import { fetchAddressTxList, type ExplorerNormalTx } from '../lib/explorerTxHistory'
import { getMonitorRelayBaseUrl } from '../lib/monitorRelayUrl'

const API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY as string | undefined
const RELAY_BASE = getMonitorRelayBaseUrl()
const RELAY_ONLY = String(import.meta.env.VITE_WALLET_TX_RELAY_ONLY ?? '1') === '1'

function normalizeExplorerErrorMessage(raw: string, status: number): string {
  const msg = String(raw || '').trim()
  if (!msg) return `Unable to load on-chain history (${status}).`
  if (/free api access|upgrade your api plan/i.test(msg)) {
    return 'On-chain history is currently unavailable for this network.'
  }
  if (/unauthorized explorer token|forbidden origin|unauthorized|forbidden/i.test(msg)) {
    return 'On-chain history service is temporarily unavailable.'
  }
  return msg.length > 160 ? `${msg.slice(0, 157)}...` : msg
}

async function fetchViaRelay(params: {
  chainId: number
  address: `0x${string}`
  offset?: number
}): Promise<ExplorerNormalTx[]> {
  if (!RELAY_BASE) return []
  const q = new URLSearchParams({
    chainId: String(params.chainId),
    address: params.address,
    offset: String(params.offset ?? 35),
  })
  const res = await fetch(`${RELAY_BASE}/explorer/txlist?${q}`, {
    headers: { accept: 'application/json' },
  })
  const json = (await res.json().catch(() => null)) as
    | { ok?: boolean; result?: ExplorerNormalTx[]; error?: string }
    | null
  if (!res.ok || !json?.ok) {
    throw new Error(
      normalizeExplorerErrorMessage(
        json?.error || `Explorer proxy failed (${res.status})`,
        res.status,
      ),
    )
  }
  return Array.isArray(json.result) ? json.result : []
}

export function useWalletTxHistory(chainId: number | undefined) {
  const { address } = useAccount()
  const hasRelay = Boolean(RELAY_BASE)
  const hasClientKey = Boolean(API_KEY?.trim())

  const enabled = Boolean(
    (hasRelay || (!RELAY_ONLY && hasClientKey)) &&
      address &&
      chainId != null &&
      isSupportedChain(chainId),
  )

  return useQuery({
    queryKey: ['wallet-txlist', address, chainId],
    queryFn: async () => {
      if (!address || chainId == null) return []
      if (hasRelay) {
        return fetchViaRelay({
          chainId,
          address: address as `0x${string}`,
          offset: 35,
        })
      }
      if (RELAY_ONLY) return []
      if (!API_KEY) return []
      return fetchAddressTxList({
        chainId,
        address: address as `0x${string}`,
        apiKey: API_KEY,
        offset: 35,
      })
    },
    enabled,
    staleTime: 45_000,
    gcTime: 300_000,
  })
}

export function hasEtherscanApiKey(): boolean {
  return Boolean(RELAY_BASE || (!RELAY_ONLY && API_KEY && String(API_KEY).trim().length > 0))
}
