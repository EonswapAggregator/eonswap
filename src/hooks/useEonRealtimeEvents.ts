import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { Address } from 'viem'
import { useWatchContractEvent } from 'wagmi'

import { eonAmmFactoryAbi, eonAmmPairAbi } from '../lib/amm/abis'
import { EON_AMM_FACTORY } from '../lib/amm/config'
import { eonMasterChefAbi } from '../lib/farm/abis'
import { getMasterChefAddress } from '../lib/farm/config'

const DEFAULT_DEBOUNCE_MS = 750
const EVENT_POLLING_INTERVAL_MS = 4_000

type RefreshHandler = () => void | Promise<void>

type RealtimeOptions = {
  chainId: number
  onRefresh: RefreshHandler
  debounceMs?: number
}

type AmmRealtimeOptions = RealtimeOptions & {
  pairAddresses?: readonly Address[]
}

function useDebouncedRefresh(
  onRefresh: RefreshHandler,
  debounceMs = DEFAULT_DEBOUNCE_MS,
) {
  const refreshRef = useRef(onRefresh)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    refreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    return () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  return useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      void refreshRef.current()
    }, debounceMs)
  }, [debounceMs])
}

function uniqueAddresses(addresses?: readonly Address[]): Address[] {
  if (!addresses?.length) return []
  const seen = new Set<string>()
  const unique: Address[] = []
  for (const address of addresses) {
    const key = address.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(address)
  }
  return unique
}

export function useEonAmmRealtimeRefresh({
  chainId,
  pairAddresses,
  onRefresh,
  debounceMs,
}: AmmRealtimeOptions) {
  const factoryAddress = EON_AMM_FACTORY[chainId]
  const pairs = useMemo(() => uniqueAddresses(pairAddresses), [pairAddresses])
  const scheduleRefresh = useDebouncedRefresh(onRefresh, debounceMs)

  useWatchContractEvent({
    chainId,
    address: factoryAddress,
    abi: eonAmmFactoryAbi,
    eventName: 'PairCreated',
    enabled: Boolean(factoryAddress),
    pollingInterval: EVENT_POLLING_INTERVAL_MS,
    onLogs: scheduleRefresh,
  })

  useWatchContractEvent({
    chainId,
    address: pairs,
    abi: eonAmmPairAbi,
    eventName: 'Sync',
    enabled: pairs.length > 0,
    pollingInterval: EVENT_POLLING_INTERVAL_MS,
    onLogs: scheduleRefresh,
  })
}

export function useEonAmmSwapRealtime({
  chainId,
  pairAddresses,
  onRefresh,
  debounceMs,
}: AmmRealtimeOptions) {
  const factoryAddress = EON_AMM_FACTORY[chainId]
  const pairs = useMemo(() => uniqueAddresses(pairAddresses), [pairAddresses])
  const scheduleRefresh = useDebouncedRefresh(onRefresh, debounceMs)

  useWatchContractEvent({
    chainId,
    address: factoryAddress,
    abi: eonAmmFactoryAbi,
    eventName: 'PairCreated',
    enabled: Boolean(factoryAddress),
    pollingInterval: EVENT_POLLING_INTERVAL_MS,
    onLogs: scheduleRefresh,
  })

  useWatchContractEvent({
    chainId,
    address: pairs,
    abi: eonAmmPairAbi,
    eventName: 'Swap',
    enabled: pairs.length > 0,
    pollingInterval: EVENT_POLLING_INTERVAL_MS,
    onLogs: scheduleRefresh,
  })
}

export function useEonFarmRealtimeRefresh({
  chainId,
  onRefresh,
  debounceMs,
}: RealtimeOptions) {
  const masterChefAddress = getMasterChefAddress(chainId)
  const scheduleRefresh = useDebouncedRefresh(onRefresh, debounceMs)
  const enabled = Boolean(masterChefAddress)

  useWatchContractEvent({
    chainId,
    address: masterChefAddress ?? undefined,
    abi: eonMasterChefAbi,
    eventName: 'Deposit',
    enabled,
    pollingInterval: EVENT_POLLING_INTERVAL_MS,
    onLogs: scheduleRefresh,
  })

  useWatchContractEvent({
    chainId,
    address: masterChefAddress ?? undefined,
    abi: eonMasterChefAbi,
    eventName: 'Withdraw',
    enabled,
    pollingInterval: EVENT_POLLING_INTERVAL_MS,
    onLogs: scheduleRefresh,
  })

  useWatchContractEvent({
    chainId,
    address: masterChefAddress ?? undefined,
    abi: eonMasterChefAbi,
    eventName: 'Harvest',
    enabled,
    pollingInterval: EVENT_POLLING_INTERVAL_MS,
    onLogs: scheduleRefresh,
  })
}
