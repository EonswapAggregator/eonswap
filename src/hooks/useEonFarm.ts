import { useCallback, useEffect, useState } from 'react'
import { erc20Abi, formatUnits, type Address } from 'viem'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'

import { getMasterChefAddress, EON_REWARD_TOKEN, EON_EXTRA_REWARD_TOKEN } from '../lib/farm/config'
import { eonMasterChefAbi } from '../lib/farm/abis'
import { eonAmmPairAbi } from '../lib/amm/abis'
import type { EonFarmPool, EonFarmUserPosition, MasterChefState } from '../lib/farm/types'
import { tokensForChain, type Token } from '../lib/tokens'
import { fetchSimplePricesUsd, coingeckoIdForToken } from '../lib/coingecko'
import { fetchEstfUsdFromEstfWethPair } from '../lib/estfUsdFromPair'
import { useEonFarmRealtimeRefresh } from './useEonRealtimeEvents'

const POLL_INTERVAL_MS = 30_000
const SECONDS_PER_YEAR = 31_536_000

type UseEonFarmResult = {
  pools: EonFarmPool[]
  userPositions: EonFarmUserPosition[]
  masterChefState: MasterChefState | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  lastUpdated: number
  // Actions
  deposit: (pid: number, amount: bigint) => Promise<`0x${string}`>
  withdraw: (pid: number, amount: bigint) => Promise<`0x${string}`>
  harvest: (pid: number) => Promise<`0x${string}`>
  emergencyWithdraw: (pid: number) => Promise<`0x${string}`>
  approve: (lpToken: Address, amount: bigint) => Promise<`0x${string}`>
  getAllowance: (lpToken: Address) => Promise<bigint>
  getLpBalance: (lpToken: Address) => Promise<bigint>
}

function findTokenInfo(chainId: number, address: Address): Token | null {
  const tokens = tokensForChain(chainId)
  return tokens.find((t) => t.address.toLowerCase() === address.toLowerCase()) ?? null
}

export function useEonFarm(chainId: number): UseEonFarmResult {
  const { address: userAddress } = useAccount()
  const publicClient = usePublicClient({ chainId })
  const { data: walletClient } = useWalletClient({ chainId })

  const [pools, setPools] = useState<EonFarmPool[]>([])
  const [userPositions, setUserPositions] = useState<EonFarmUserPosition[]>([])
  const [masterChefState, setMasterChefState] = useState<MasterChefState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState(0)

  const masterChefAddress = getMasterChefAddress(chainId)
  const rewardToken = EON_REWARD_TOKEN[chainId]
  const extraRewardToken = EON_EXTRA_REWARD_TOKEN[chainId]

  const fetchFarms = useCallback(async () => {
    if (!masterChefAddress || !publicClient) {
      setError('MasterChef not configured for this chain')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // 1. Fetch global MasterChef state
      const [poolLengthResult, eonPerSecondResult, totalAllocPointResult, startTimeResult, pausedResult, eonTokenResult] =
        await publicClient.multicall({
          contracts: [
            { address: masterChefAddress, abi: eonMasterChefAbi, functionName: 'poolLength' },
            { address: masterChefAddress, abi: eonMasterChefAbi, functionName: 'eonPerSecond' },
            { address: masterChefAddress, abi: eonMasterChefAbi, functionName: 'totalAllocPoint' },
            { address: masterChefAddress, abi: eonMasterChefAbi, functionName: 'startTime' },
            { address: masterChefAddress, abi: eonMasterChefAbi, functionName: 'paused' },
            { address: masterChefAddress, abi: eonMasterChefAbi, functionName: 'eon' },
          ],
        })

      const poolLength = poolLengthResult.status === 'success' ? Number(poolLengthResult.result) : 0
      const eonPerSecond = eonPerSecondResult.status === 'success' ? (eonPerSecondResult.result as bigint) : 0n
      const totalAllocPoint = totalAllocPointResult.status === 'success' ? (totalAllocPointResult.result as bigint) : 0n
      const startTime = startTimeResult.status === 'success' ? (startTimeResult.result as bigint) : 0n
      const paused = pausedResult.status === 'success' ? (pausedResult.result as boolean) : false
      const eonToken = eonTokenResult.status === 'success' ? (eonTokenResult.result as Address) : ('0x' as Address)

      setMasterChefState({
        eonToken,
        eonPerSecond,
        totalAllocPoint,
        startTime,
        paused,
      })

      if (poolLength === 0) {
        setPools([])
        setUserPositions([])
        setLoading(false)
        setLastUpdated(Date.now())
        return
      }

      // 2. Fetch pool info for all pools
      const poolInfoCalls = Array.from({ length: poolLength }, (_, i) => ({
        address: masterChefAddress,
        abi: eonMasterChefAbi,
        functionName: 'poolInfo' as const,
        args: [BigInt(i)] as const,
      }))

      const rewarderCalls = Array.from({ length: poolLength }, (_, i) => ({
        address: masterChefAddress,
        abi: eonMasterChefAbi,
        functionName: 'rewarder' as const,
        args: [BigInt(i)] as const,
      }))

      const [poolInfoResults, rewarderResults] = await Promise.all([
        publicClient.multicall({ contracts: poolInfoCalls }),
        publicClient.multicall({ contracts: rewarderCalls }),
      ])

      // 3. Gather LP token addresses and fetch LP info
      const lpAddresses: Address[] = []
      for (let i = 0; i < poolLength; i++) {
        const result = poolInfoResults[i]
        if (result?.status === 'success') {
          const [lpToken] = result.result as [Address, bigint, bigint, bigint]
          lpAddresses.push(lpToken)
        }
      }

      // Fetch LP token info (token0, token1, totalSupply, balance in masterChef)
      const lpInfoCalls = lpAddresses.flatMap((lp) => [
        { address: lp, abi: eonAmmPairAbi, functionName: 'token0' as const },
        { address: lp, abi: eonAmmPairAbi, functionName: 'token1' as const },
        { address: lp, abi: eonAmmPairAbi, functionName: 'totalSupply' as const },
        { address: lp, abi: erc20Abi, functionName: 'balanceOf' as const, args: [masterChefAddress] as const },
        { address: lp, abi: erc20Abi, functionName: 'decimals' as const },
      ])

      const lpInfoResults = await publicClient.multicall({ contracts: lpInfoCalls })

      // Gather all token addresses for symbol lookup
      const tokenAddresses = new Set<Address>()
      for (let i = 0; i < lpAddresses.length; i++) {
        const token0Result = lpInfoResults[i * 5]
        const token1Result = lpInfoResults[i * 5 + 1]
        if (token0Result?.status === 'success') tokenAddresses.add(token0Result.result as Address)
        if (token1Result?.status === 'success') tokenAddresses.add(token1Result.result as Address)
      }
      if (rewardToken) tokenAddresses.add(rewardToken)
      if (extraRewardToken) tokenAddresses.add(extraRewardToken)

      // Fetch token symbols
      const symbolCalls = [...tokenAddresses].map((token) => ({
        address: token,
        abi: erc20Abi,
        functionName: 'symbol' as const,
      }))
      const symbolResults = await publicClient.multicall({ contracts: symbolCalls })
      const symbolMap = new Map<string, string>()
      const tokenArray = [...tokenAddresses]
      for (let i = 0; i < tokenArray.length; i++) {
        const result = symbolResults[i]
        if (result?.status === 'success') {
          symbolMap.set(tokenArray[i]!.toLowerCase(), result.result as string)
        }
      }

      // Fetch USD prices
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

      // 4. Build pool objects
      const poolsData: EonFarmPool[] = []
      for (let i = 0; i < poolLength; i++) {
        const poolResult = poolInfoResults[i]
        const rewarderResult = rewarderResults[i]
        if (poolResult?.status !== 'success') continue

        const [lpToken, allocPoint, lastRewardTime, accEonPerShare] = poolResult.result as [
          Address,
          bigint,
          bigint,
          bigint,
        ]
        const rewarder =
          rewarderResult?.status === 'success'
            ? (rewarderResult.result as Address)
            : ('0x0000000000000000000000000000000000000000' as Address)

        const lpIndex = lpAddresses.indexOf(lpToken)
        if (lpIndex === -1) continue

        const baseIdx = lpIndex * 5
        const token0Result = lpInfoResults[baseIdx]
        const token1Result = lpInfoResults[baseIdx + 1]
        const totalSupplyResult = lpInfoResults[baseIdx + 2]
        const stakedBalanceResult = lpInfoResults[baseIdx + 3]
        const decimalsResult = lpInfoResults[baseIdx + 4]

        const token0 = token0Result?.status === 'success' ? (token0Result.result as Address) : null
        const token1 = token1Result?.status === 'success' ? (token1Result.result as Address) : null
        const totalStaked = stakedBalanceResult?.status === 'success' ? (stakedBalanceResult.result as bigint) : 0n
        const lpDecimals = decimalsResult?.status === 'success' ? Number(decimalsResult.result) : 18

        const symbol0 = token0 ? (symbolMap.get(token0.toLowerCase()) ?? 'TKN') : 'TKN'
        const symbol1 = token1 ? (symbolMap.get(token1.toLowerCase()) ?? 'TKN') : 'TKN'

        // Calculate pool share and APR estimate
        const poolShare = totalAllocPoint > 0n ? Number(allocPoint) / Number(totalAllocPoint) : 0

        // Estimate APR based on emissions
        // APR = (eonPerSecond * poolShare * SECONDS_PER_YEAR * eonPrice) / (totalStaked * lpPrice)
        let eonPrice = rewardToken ? (priceByAddress.get(rewardToken.toLowerCase()) ?? 0) : 0
        // Try ESTF/WETH pair pricing if CoinGecko price is unavailable
        if (eonPrice <= 0) {
          const estfUsd = await fetchEstfUsdFromEstfWethPair().catch(() => null)
          if (estfUsd && Number.isFinite(estfUsd) && estfUsd > 0) {
            eonPrice = estfUsd
          }
        }
        // Total supply available for reference if needed for LP pricing
        const _totalSupply = totalSupplyResult?.status === 'success' ? (totalSupplyResult.result as bigint) : 0n
        void _totalSupply // suppress unused warning

        // Simplified APR calculation (assuming equal LP value distribution)
        let aprEstimate = 0
        if (totalStaked > 0n && eonPrice > 0) {
          const yearlyEmissions = Number(formatUnits(eonPerSecond * BigInt(SECONDS_PER_YEAR), 18)) * poolShare
          const yearlyValue = yearlyEmissions * eonPrice
          const stakedValue = Number(formatUnits(totalStaked, lpDecimals)) * 2 // Simplified TVL estimate
          if (stakedValue > 0) {
            aprEstimate = yearlyValue / stakedValue
          }
        }

        poolsData.push({
          pid: i,
          lpToken,
          allocPoint,
          lastRewardTime,
          accEonPerShare,
          rewarder: rewarder === '0x0000000000000000000000000000000000000000' ? null : rewarder,
          lpSymbol0: symbol0,
          lpSymbol1: symbol1,
          lpDecimals,
          totalStaked,
          token0Address: token0 ?? ('0x0000000000000000000000000000000000000000' as Address),
          token1Address: token1 ?? ('0x0000000000000000000000000000000000000000' as Address),
          eonPerSecond,
          poolShare,
          aprEstimate,
        })
      }

      // 5. Fetch user positions if connected
      const positions: EonFarmUserPosition[] = []
      if (userAddress && poolsData.length > 0) {
        const userInfoCalls = poolsData.map((pool) => ({
          address: masterChefAddress,
          abi: eonMasterChefAbi,
          functionName: 'userInfo' as const,
          args: [BigInt(pool.pid), userAddress] as const,
        }))

        const pendingCalls = poolsData.map((pool) => ({
          address: masterChefAddress,
          abi: eonMasterChefAbi,
          functionName: 'pendingEon' as const,
          args: [BigInt(pool.pid), userAddress] as const,
        }))

        const [userInfoResults, pendingResults] = await Promise.all([
          publicClient.multicall({ contracts: userInfoCalls }),
          publicClient.multicall({ contracts: pendingCalls }),
        ])

        for (let i = 0; i < poolsData.length; i++) {
          const pool = poolsData[i]!
          const userInfoResult = userInfoResults[i]
          const pendingResult = pendingResults[i]

          if (userInfoResult?.status !== 'success') continue

          const [stakedAmount] = userInfoResult.result as [bigint, bigint]
          const pendingEon = pendingResult?.status === 'success' ? (pendingResult.result as bigint) : 0n

          // Only include if user has staked or pending rewards
          if (stakedAmount > 0n || pendingEon > 0n) {
            const eonPrice = rewardToken ? (priceByAddress.get(rewardToken.toLowerCase()) ?? 0) : 0
            const pendingValueUsd = Number(formatUnits(pendingEon, 18)) * eonPrice

            // Simplified staked value calculation
            const stakedValueUsd = 0 // Would need LP price calculation

            positions.push({
              pid: pool.pid,
              stakedAmount,
              pendingEon,
              pendingExtraRewards: [], // Would need to query rewarder contract
              stakedValueUsd,
              pendingValueUsd,
            })
          }
        }
      }

      setPools(poolsData)
      setUserPositions(positions)
      setLastUpdated(Date.now())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch farms'
      setError(msg)
      console.error('[useEonFarm]', err)
    } finally {
      setLoading(false)
    }
  }, [chainId, publicClient, userAddress, masterChefAddress, rewardToken, extraRewardToken])

  // Initial fetch
  useEffect(() => {
    void fetchFarms()
  }, [fetchFarms])

  // Poll for updates
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchFarms()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchFarms])

  useEonFarmRealtimeRefresh({
    chainId,
    onRefresh: fetchFarms,
  })

  // Action: Deposit LP tokens
  const deposit = useCallback(
    async (pid: number, amount: bigint): Promise<`0x${string}`> => {
      if (!walletClient || !masterChefAddress) {
        throw new Error('Wallet not connected or MasterChef not configured')
      }
      const hash = await walletClient.writeContract({
        address: masterChefAddress,
        abi: eonMasterChefAbi,
        functionName: 'deposit',
        args: [BigInt(pid), amount],
      })
      return hash
    },
    [walletClient, masterChefAddress]
  )

  // Action: Withdraw LP tokens
  const withdraw = useCallback(
    async (pid: number, amount: bigint): Promise<`0x${string}`> => {
      if (!walletClient || !masterChefAddress) {
        throw new Error('Wallet not connected or MasterChef not configured')
      }
      const hash = await walletClient.writeContract({
        address: masterChefAddress,
        abi: eonMasterChefAbi,
        functionName: 'withdraw',
        args: [BigInt(pid), amount],
      })
      return hash
    },
    [walletClient, masterChefAddress]
  )

  // Action: Harvest rewards
  const harvest = useCallback(
    async (pid: number): Promise<`0x${string}`> => {
      if (!walletClient || !masterChefAddress) {
        throw new Error('Wallet not connected or MasterChef not configured')
      }
      const hash = await walletClient.writeContract({
        address: masterChefAddress,
        abi: eonMasterChefAbi,
        functionName: 'harvest',
        args: [BigInt(pid)],
      })
      return hash
    },
    [walletClient, masterChefAddress]
  )

  // Action: Emergency withdraw (forfeit rewards)
  const emergencyWithdraw = useCallback(
    async (pid: number): Promise<`0x${string}`> => {
      if (!walletClient || !masterChefAddress) {
        throw new Error('Wallet not connected or MasterChef not configured')
      }
      const hash = await walletClient.writeContract({
        address: masterChefAddress,
        abi: eonMasterChefAbi,
        functionName: 'emergencyWithdraw',
        args: [BigInt(pid)],
      })
      return hash
    },
    [walletClient, masterChefAddress]
  )

  // Action: Approve LP token spending
  const approve = useCallback(
    async (lpToken: Address, amount: bigint): Promise<`0x${string}`> => {
      if (!walletClient || !masterChefAddress) {
        throw new Error('Wallet not connected or MasterChef not configured')
      }
      const hash = await walletClient.writeContract({
        address: lpToken,
        abi: erc20Abi,
        functionName: 'approve',
        args: [masterChefAddress, amount],
      })
      return hash
    },
    [walletClient, masterChefAddress]
  )

  // Get allowance for LP token
  const getAllowance = useCallback(
    async (lpToken: Address): Promise<bigint> => {
      if (!publicClient || !userAddress || !masterChefAddress) {
        return 0n
      }
      const allowance = await publicClient.readContract({
        address: lpToken,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [userAddress, masterChefAddress],
      })
      return allowance
    },
    [publicClient, userAddress, masterChefAddress]
  )

  // Get user's LP balance
  const getLpBalance = useCallback(
    async (lpToken: Address): Promise<bigint> => {
      if (!publicClient || !userAddress) {
        return 0n
      }
      const balance = await publicClient.readContract({
        address: lpToken,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [userAddress],
      })
      return balance
    },
    [publicClient, userAddress]
  )

  return {
    pools,
    userPositions,
    masterChefState,
    loading,
    error,
    refresh: fetchFarms,
    lastUpdated,
    deposit,
    withdraw,
    harvest,
    emergencyWithdraw,
    approve,
    getAllowance,
    getLpBalance,
  }
}
