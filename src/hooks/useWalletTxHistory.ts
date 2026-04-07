import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { isSupportedChain } from '../lib/chains'
import { fetchAddressTxList } from '../lib/explorerTxHistory'

const API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY as string | undefined

export function useWalletTxHistory(chainId: number | undefined) {
  const { address } = useAccount()

  const enabled = Boolean(
    API_KEY?.trim() &&
      address &&
      chainId != null &&
      isSupportedChain(chainId),
  )

  return useQuery({
    queryKey: ['wallet-txlist', address, chainId],
    queryFn: async () => {
      if (!address || chainId == null || !API_KEY) return []
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
  return Boolean(API_KEY && String(API_KEY).trim().length > 0)
}
