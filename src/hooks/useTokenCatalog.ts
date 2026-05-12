import { useQuery } from '@tanstack/react-query'
import { isSupportedChain } from '../lib/chains'
import { fetch1inchTokenList } from '../lib/remoteTokenList'

export function useTokenCatalog(chainId: number) {
  return useQuery({
    queryKey: ['token-catalog', chainId],
    queryFn: () => fetch1inchTokenList(chainId),
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 48,
    enabled: isSupportedChain(chainId),
  })
}
