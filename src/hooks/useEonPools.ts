import { useCallback, useEffect, useMemo, useState } from 'react'
import { erc20Abi, formatUnits, type Address } from 'viem'
import { useAccount, usePublicClient } from 'wagmi'

import { EON_AMM_FACTORY } from '../lib/amm/config'
import { eonAmmFactoryAbi, eonAmmPairAbi } from '../lib/amm/abis'
import type { EonAmmPool, EonAmmUserPosition } from '../lib/amm/poolTypes'
import { tokensForChain, type Token } from '../lib/tokens'
import { fetchSimplePricesUsd, coingeckoIdForToken } from '../lib/coingecko'
import { useEonAmmRealtimeRefresh } from './useEonRealtimeEvents'

const POLL_INTERVAL_MS = 30_000
const MAX_PAIRS_TO_FETCH = 50

type UseEonPoolsResult = {
  pools: EonAmmPool[]
  userPositions: EonAmmUserPosition[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  lastUpdated: number
}

function findTokenInfo(chainId: number, address: Address): Token | null {
  const tokens = tokensForChain(chainId)
  return tokens.find((t) => t.address.toLowerCase() === address.toLowerCase()) ?? null
}

export function useEonPools(chainId: number): UseEonPoolsResult {
  const { address: userAddress } = useAccount()
  const publicClient = usePublicClient({ chainId })

  const [pools, setPools] = useState<EonAmmPool[]>([])
  const [userPositions, setUserPositions] = useState<EonAmmUserPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState(0)

  const fetchPools = useCallback(async () => {
    const factoryAddress = EON_AMM_FACTORY[chainId]
    if (!factoryAddress || !publicClient) {
      setError('Factory not configured for this chain')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // 1. Get total pairs count
      const pairsLength = await publicClient.readContract({
        address: factoryAddress,
        abi: eonAmmFactoryAbi,
        functionName: 'allPairsLength',
      })

      const count = Math.min(Number(pairsLength), MAX_PAIRS_TO_FETCH)
      if (count === 0) {
        setPools([])
        setUserPositions([])
        setLoading(false)
        setLastUpdated(Date.now())
        return
      }

      // 2. Fetch all pair addresses
      const pairCalls = Array.from({ length: count }, (_, i) => ({
        address: factoryAddress,
        abi: eonAmmFactoryAbi,
        functionName: 'allPairs' as const,
        args: [BigInt(i)] as const,
      }))

      const pairResults = await publicClient.multicall({ contracts: pairCalls })
      const pairAddresses = pairResults
        .filter((r) => r.status === 'success')
        .map((r) => r.result as Address)

      if (pairAddresses.length === 0) {
        setPools([])
        setUserPositions([])
        setLoading(false)
        setLastUpdated(Date.now())
        return
      }

      // 3. Fetch pair info (token0, token1, reserves, totalSupply)
      const infoCalls = pairAddresses.flatMap((pair) => [
        { address: pair, abi: eonAmmPairAbi, functionName: 'token0' as const },
        { address: pair, abi: eonAmmPairAbi, functionName: 'token1' as const },
        { address: pair, abi: eonAmmPairAbi, functionName: 'getReserves' as const },
        { address: pair, abi: eonAmmPairAbi, functionName: 'totalSupply' as const },
      ])

      const infoResults = await publicClient.multicall({ contracts: infoCalls })

      // 4. Fetch token info for each token
      const tokenAddresses = new Set<Address>()
      for (let i = 0; i < pairAddresses.length; i++) {
        const baseIdx = i * 4
        const token0Result = infoResults[baseIdx]
        const token1Result = infoResults[baseIdx + 1]
        if (token0Result?.status === 'success') tokenAddresses.add(token0Result.result as Address)
        if (token1Result?.status === 'success') tokenAddresses.add(token1Result.result as Address)
      }

      const tokenInfoCalls = [...tokenAddresses].flatMap((token) => [
        { address: token, abi: erc20Abi, functionName: 'symbol' as const },
        { address: token, abi: erc20Abi, functionName: 'decimals' as const },
      ])

      const tokenInfoResults = await publicClient.multicall({ contracts: tokenInfoCalls })
      const tokenInfoMap = new Map<Address, { symbol: string; decimals: number }>()
      const tokenArray = [...tokenAddresses]
      for (let i = 0; i < tokenArray.length; i++) {
        const symbolResult = tokenInfoResults[i * 2]
        const decimalsResult = tokenInfoResults[i * 2 + 1]
        if (symbolResult?.status === 'success' && decimalsResult?.status === 'success') {
          tokenInfoMap.set(tokenArray[i]!, {
            symbol: symbolResult.result as string,
            decimals: Number(decimalsResult.result),
          })
        }
      }

      // 5. Fetch USD prices for tokens
      const tokensWithIds = [...tokenAddresses]
        .map((addr) => {
          const token = findTokenInfo(chainId, addr)
          if (!token) return null
          const id = coingeckoIdForToken(token)
          return id ? { addr, id } : null
        })
        .filter((x): x is { addr: Address; id: string } => x !== null)

      const priceIds = tokensWithIds.map((t) => t.id)
      const prices = await fetchSimplePricesUsd(priceIds).catch(() => ({} as Record<string, number>))
      const priceByAddress = new Map<string, number>()
      for (const { addr, id } of tokensWithIds) {
        const price = prices[id]
        if (typeof price === 'number' && price > 0) {
          priceByAddress.set(addr.toLowerCase(), price)
        }
      }

      // 6. Build pool objects
      const poolsData: EonAmmPool[] = []
      for (let i = 0; i < pairAddresses.length; i++) {
        const pairAddress = pairAddresses[i]!
        const baseIdx = i * 4

        const token0Result = infoResults[baseIdx]
        const token1Result = infoResults[baseIdx + 1]
        const reservesResult = infoResults[baseIdx + 2]
        const totalSupplyResult = infoResults[baseIdx + 3]

        if (
          token0Result?.status !== 'success' ||
          token1Result?.status !== 'success' ||
          reservesResult?.status !== 'success' ||
          totalSupplyResult?.status !== 'success'
        ) {
          continue
        }

        const token0 = token0Result.result as Address
        const token1 = token1Result.result as Address
        const [reserve0, reserve1, blockTimestampLast] = reservesResult.result as [bigint, bigint, number]
        const totalSupply = totalSupplyResult.result as bigint

        const info0 = tokenInfoMap.get(token0) ?? { symbol: 'TKN', decimals: 18 }
        const info1 = tokenInfoMap.get(token1) ?? { symbol: 'TKN', decimals: 18 }

        // Calculate TVL
        const price0 = priceByAddress.get(token0.toLowerCase()) ?? 0
        const price1 = priceByAddress.get(token1.toLowerCase()) ?? 0
        const tvl0 = Number(formatUnits(reserve0, info0.decimals)) * price0
        const tvl1 = Number(formatUnits(reserve1, info1.decimals)) * price1
        const tvlUsd = tvl0 + tvl1

        poolsData.push({
          address: pairAddress,
          token0,
          token1,
          symbol0: info0.symbol,
          symbol1: info1.symbol,
          decimals0: info0.decimals,
          decimals1: info1.decimals,
          reserve0,
          reserve1,
          totalSupply,
          blockTimestampLast,
          tvlUsd,
        })
      }

      // 7. Fetch user LP balances if connected
      let positions: EonAmmUserPosition[] = []
      if (userAddress && poolsData.length > 0) {
        const balanceCalls = poolsData.map((pool) => ({
          address: pool.address,
          abi: eonAmmPairAbi,
          functionName: 'balanceOf' as const,
          args: [userAddress] as const,
        }))

        const balanceResults = await publicClient.multicall({ contracts: balanceCalls })
        positions = poolsData
          .map((pool, idx) => {
            const balResult = balanceResults[idx]
            if (balResult?.status !== 'success') return null
            const lpBalance = balResult.result as bigint
            if (lpBalance === 0n) return null

            const shareOfPool = pool.totalSupply > 0n
              ? Number(lpBalance) / Number(pool.totalSupply)
              : 0
            
            const token0Amount = pool.totalSupply > 0n
              ? (pool.reserve0 * lpBalance) / pool.totalSupply
              : 0n
            const token1Amount = pool.totalSupply > 0n
              ? (pool.reserve1 * lpBalance) / pool.totalSupply
              : 0n

            const price0 = priceByAddress.get(pool.token0.toLowerCase()) ?? 0
            const price1 = priceByAddress.get(pool.token1.toLowerCase()) ?? 0
            const value0 = Number(formatUnits(token0Amount, pool.decimals0)) * price0
            const value1 = Number(formatUnits(token1Amount, pool.decimals1)) * price1
            const valueUsd = value0 + value1

            return {
              poolAddress: pool.address,
              lpBalance,
              shareOfPool,
              token0Amount,
              token1Amount,
              valueUsd,
            }
          })
          .filter((p): p is EonAmmUserPosition => p !== null)
      }

      setPools(poolsData)
      setUserPositions(positions)
      setLastUpdated(Date.now())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch pools'
      setError(msg)
      console.error('[useEonPools]', err)
    } finally {
      setLoading(false)
    }
  }, [chainId, publicClient, userAddress])

  // Initial fetch
  useEffect(() => {
    void fetchPools()
  }, [fetchPools])

  // Poll for updates
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchPools()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchPools])

  const pairAddresses = useMemo(
    () => pools.map((pool) => pool.address),
    [pools],
  )

  useEonAmmRealtimeRefresh({
    chainId,
    pairAddresses,
    onRefresh: fetchPools,
  })

  return {
    pools,
    userPositions,
    loading,
    error,
    refresh: fetchPools,
    lastUpdated,
  }
}
