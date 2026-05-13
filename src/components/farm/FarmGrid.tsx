import { motion } from 'framer-motion'
import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Sprout,
  Loader2,
  Coins,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'
import { formatUnits, parseUnits, type Address } from 'viem'
import { useAccount } from 'wagmi'

import type { EonFarmPool, EonFarmUserPosition } from '../../lib/farm/types'
import { TokenLogo } from '../TokenLogo'
import { tokensForChain, type Token } from '../../lib/tokens'
import { Pagination } from '../Pagination'
import { usePagination } from '../../hooks/usePagination'
import { EON_BASE_MAINNET } from '../../lib/eonBaseMainnet'

/** EonSwap branded token addresses on Base mainnet */
const EONSWAP_TOKENS = [
  EON_BASE_MAINNET.token.address.toLowerCase(),
  EON_BASE_MAINNET.extraRewardToken.address.toLowerCase(),
]

/** Check if the pool contains EonSwap branded token (ESTF or ESR) */
function isEonSwapPool(pool: EonFarmPool): boolean {
  const t0 = pool.token0Address.toLowerCase()
  const t1 = pool.token1Address.toLowerCase()
  return EONSWAP_TOKENS.some((addr) => addr === t0 || addr === t1)
}

/** Find a token in the chain's token list by address */
function findTokenForAddress(chainId: number, address: Address): Token | null {
  const tokens = tokensForChain(chainId)
  return tokens.find((t) => t.address.toLowerCase() === address.toLowerCase()) ?? null
}

function formatTokenAmount(value: bigint, decimals: number): string {
  const num = Number(formatUnits(value, decimals))
  if (num === 0) return '0'
  if (num < 0.0001) return '< 0.0001'
  if (num < 1) return num.toFixed(6)
  if (num < 1000) return num.toFixed(4)
  if (num < 1_000_000) return (num / 1000).toFixed(2) + 'K'
  return (num / 1_000_000).toFixed(2) + 'M'
}

function formatApr(apr: number): string {
  if (!Number.isFinite(apr) || apr <= 0) return '—'
  const percent = apr * 100
  if (percent < 0.01) return '< 0.01%'
  if (percent < 1000) return `${percent.toFixed(2)}%`
  return `${(percent / 1000).toFixed(1)}K%`
}

type FarmCardProps = {
  pool: EonFarmPool
  userPosition?: EonFarmUserPosition
  chainId: number
  index: number
  lpBalance: bigint
  allowance: bigint
  onDeposit: (pid: number, amount: bigint) => Promise<void>
  onWithdraw: (pid: number, amount: bigint) => Promise<void>
  onHarvest: (pid: number) => Promise<void>
  onApprove: (lpToken: Address, amount: bigint) => Promise<void>
  onRefreshAllowance: () => Promise<void>
  isActionPending: boolean
}

export function FarmCard({
  pool,
  userPosition,
  chainId,
  index,
  lpBalance,
  allowance,
  onDeposit,
  onWithdraw,
  onHarvest,
  onApprove,
  onRefreshAllowance,
  isActionPending,
}: FarmCardProps) {
  const { address: userAddress } = useAccount()
  const [expanded, setExpanded] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')

  // Find token info for logos
  const token0 = findTokenForAddress(chainId, pool.token0Address)
  const token1 = findTokenForAddress(chainId, pool.token1Address)
  const [actionType, setActionType] = useState<'deposit' | 'withdraw' | 'harvest' | 'approve' | null>(null)

  const stakedAmount = userPosition?.stakedAmount ?? 0n
  const pendingEon = userPosition?.pendingEon ?? 0n
  const hasPosition = stakedAmount > 0n || pendingEon > 0n

  // Parse amounts
  const depositAmountParsed = depositAmount
    ? parseUnits(depositAmount, pool.lpDecimals)
    : 0n
  const withdrawAmountParsed = withdrawAmount
    ? parseUnits(withdrawAmount, pool.lpDecimals)
    : 0n

  // Check if needs approval
  const needsApproval = depositAmountParsed > 0n && allowance < depositAmountParsed

  // Validation
  const canDeposit =
    depositAmountParsed > 0n &&
    depositAmountParsed <= lpBalance &&
    !needsApproval &&
    !isActionPending

  const canWithdraw =
    withdrawAmountParsed > 0n &&
    withdrawAmountParsed <= stakedAmount &&
    !isActionPending

  const canHarvest = pendingEon > 0n && !isActionPending

  const handleDeposit = useCallback(async () => {
    if (!canDeposit) return
    setActionType('deposit')
    try {
      await onDeposit(pool.pid, depositAmountParsed)
      setDepositAmount('')
    } finally {
      setActionType(null)
    }
  }, [canDeposit, onDeposit, pool.pid, depositAmountParsed])

  const handleWithdraw = useCallback(async () => {
    if (!canWithdraw) return
    setActionType('withdraw')
    try {
      await onWithdraw(pool.pid, withdrawAmountParsed)
      setWithdrawAmount('')
    } finally {
      setActionType(null)
    }
  }, [canWithdraw, onWithdraw, pool.pid, withdrawAmountParsed])

  const handleHarvest = useCallback(async () => {
    if (!canHarvest) return
    setActionType('harvest')
    try {
      await onHarvest(pool.pid)
    } finally {
      setActionType(null)
    }
  }, [canHarvest, onHarvest, pool.pid])

  const handleApprove = useCallback(async () => {
    setActionType('approve')
    try {
      await onApprove(pool.lpToken, depositAmountParsed)
      await onRefreshAllowance()
    } finally {
      setActionType(null)
    }
  }, [depositAmountParsed, onApprove, pool.lpToken, onRefreshAllowance])

  const handleMaxDeposit = useCallback(() => {
    setDepositAmount(formatUnits(lpBalance, pool.lpDecimals))
  }, [lpBalance, pool.lpDecimals])

  const handleMaxWithdraw = useCallback(() => {
    setWithdrawAmount(formatUnits(stakedAmount, pool.lpDecimals))
  }, [stakedAmount, pool.lpDecimals])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.45 }}
      className="group relative overflow-visible rounded-3xl border border-uni-border bg-uni-surface shadow-uni-card transition-all duration-300 hover:border-uni-pink/30 hover:shadow-[0_0_30px_-10px_rgba(255,0,122,0.25)]"
    >
      {/* Featured Badge - floating at top */}
      {isEonSwapPool(pool) && (
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-uni-pink via-uni-purple to-uni-pink px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-lg shadow-uni-pink/30">
            <Sparkles className="h-3 w-3" />
            Featured
          </span>
        </div>
      )}

      {/* Gradient glow on hover */}
      <div
        className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-b from-uni-pink/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      />

      {/* Header */}
      <div className={`relative p-5 md:p-6 ${isEonSwapPool(pool) ? 'pt-7' : ''}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Token pair icons */}
            <div className="relative">
              <div className="flex items-center -space-x-3">
                {token0 ? (
                  <TokenLogo chainId={chainId} token={token0} size="md" className="ring-2 ring-uni-surface" />
                ) : (
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-uni-surface-2 text-sm font-semibold text-neutral-300 ring-2 ring-uni-surface">
                    {pool.lpSymbol0.slice(0, 2)}
                  </span>
                )}
                {token1 ? (
                  <TokenLogo chainId={chainId} token={token1} size="md" className="ring-2 ring-uni-surface" />
                ) : (
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-uni-surface-2 text-sm font-semibold text-neutral-300 ring-2 ring-uni-surface">
                    {pool.lpSymbol1.slice(0, 2)}
                  </span>
                )}
              </div>
              {/* Farm icon badge */}
              <div className="absolute -bottom-1 -right-1 rounded-full bg-uni-pink/20 p-1 ring-2 ring-uni-surface">
                <Sprout className="h-3 w-3 text-uni-pink" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white">
                {pool.lpSymbol0}/{pool.lpSymbol1}
              </h3>
              <p className="text-xs text-neutral-500">Farm #{pool.pid} • Base</p>
            </div>
          </div>

          {/* APR Badge - inside card */}
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              APR
            </p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-uni-pink">
              {formatApr(pool.aprEstimate)}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-uni-border bg-uni-surface-2 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
              Total Staked
            </p>
            <p className="mt-1 text-sm font-medium tabular-nums text-neutral-200">
              {formatTokenAmount(pool.totalStaked, pool.lpDecimals)} LP
            </p>
          </div>
          <div className="rounded-xl border border-uni-border bg-uni-surface-2 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
              Pool Weight
            </p>
            <p className="mt-1 text-sm font-medium tabular-nums text-neutral-200">
              {(pool.poolShare * 100).toFixed(2)}%
            </p>
          </div>
        </div>

        {/* User position badge */}
        {hasPosition && (
          <div className="mt-4 rounded-xl border border-uni-pink/30 bg-uni-pink/[0.08] p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-uni-pink" />
                <span className="text-xs font-medium text-uni-pink">Your Position</span>
              </div>
              <span className="text-sm font-semibold text-white">
                {formatTokenAmount(stakedAmount, pool.lpDecimals)} LP
              </span>
            </div>
            {pendingEon > 0n && (
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-neutral-400">Pending ESTF:</span>
                <span className="font-medium text-uni-pink">
                  {formatTokenAmount(pendingEon, 18)} ESTF
                </span>
              </div>
            )}
          </div>
        )}

        {/* Expand/Collapse button */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-uni-border bg-uni-surface-2 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-uni-pink/20 hover:bg-uni-surface hover:text-white"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Hide
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              {hasPosition ? 'Manage' : 'Stake'}
            </>
          )}
        </button>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="border-t border-uni-border bg-uni-surface-2 px-5 py-5 md:px-6"
        >
          {!userAddress ? (
            <div className="text-center text-sm text-neutral-400">
              Connect your wallet to stake LP tokens
            </div>
          ) : (
            <div className="space-y-5">
              {/* Deposit section */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                    Deposit LP
                  </label>
                  <span className="text-xs text-neutral-500">
                    Balance: {formatTokenAmount(lpBalance, pool.lpDecimals)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0.0"
                      className="w-full rounded-xl border border-uni-border bg-uni-surface px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none transition focus:border-uni-pink/40 focus:ring-1 focus:ring-uni-pink/20"
                    />
                    <button
                      type="button"
                      onClick={handleMaxDeposit}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-uni-pink/10 px-2 py-1 text-[10px] font-semibold uppercase text-uni-pink transition hover:bg-uni-pink/20"
                    >
                      Max
                    </button>
                  </div>
                  {needsApproval ? (
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={isActionPending}
                      className="flex items-center justify-center gap-2 rounded-xl bg-uni-purple/20 px-6 py-3 text-sm font-semibold text-uni-purple transition hover:bg-uni-purple/30 disabled:opacity-50"
                    >
                      {actionType === 'approve' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Approve'
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleDeposit}
                      disabled={!canDeposit}
                      className="flex items-center justify-center gap-2 rounded-xl bg-uni-pink/20 px-6 py-3 text-sm font-semibold text-uni-pink transition hover:bg-uni-pink/30 disabled:opacity-50"
                    >
                      {actionType === 'deposit' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Deposit'
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Withdraw section */}
              {stakedAmount > 0n && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                      Withdraw LP
                    </label>
                    <span className="text-xs text-neutral-500">
                      Staked: {formatTokenAmount(stakedAmount, pool.lpDecimals)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0.0"
                        className="w-full rounded-xl border border-uni-border bg-uni-surface px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none transition focus:border-rose-400/40 focus:ring-1 focus:ring-rose-400/20"
                      />
                      <button
                        type="button"
                        onClick={handleMaxWithdraw}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-rose-400/10 px-2 py-1 text-[10px] font-semibold uppercase text-rose-400 transition hover:bg-rose-400/20"
                      >
                        Max
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleWithdraw}
                      disabled={!canWithdraw}
                      className="flex items-center justify-center gap-2 rounded-xl bg-rose-500/20 px-6 py-3 text-sm font-semibold text-rose-400 transition hover:bg-rose-500/30 disabled:opacity-50"
                    >
                      {actionType === 'withdraw' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Withdraw'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Harvest section */}
              {pendingEon > 0n && (
                <div className="flex items-center justify-between rounded-xl border border-uni-pink/20 bg-uni-pink/[0.05] p-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                      Pending Rewards
                    </p>
                    <p className="mt-1 text-lg font-semibold text-uni-pink">
                      {formatTokenAmount(pendingEon, 18)} ESTF
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleHarvest}
                    disabled={!canHarvest}
                    className="flex items-center justify-center gap-2 rounded-xl bg-uni-pink px-6 py-3 text-sm font-semibold text-white transition hover:bg-uni-pink-light disabled:opacity-50"
                  >
                    {actionType === 'harvest' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <TrendingUp className="h-4 w-4" />
                        Harvest
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Rewarder badge */}
              {pool.rewarder && (
                <div className="flex items-center gap-2 rounded-lg bg-uni-purple/10 px-3 py-2 text-xs text-uni-purple">
                  <Coins className="h-3.5 w-3.5" />
                  <span>Extra ESR rewards active</span>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}

type FarmGridProps = {
  pools: EonFarmPool[]
  userPositions: EonFarmUserPosition[]
  chainId: number
  loading: boolean
  error: string | null
  onDeposit: (pid: number, amount: bigint) => Promise<void>
  onWithdraw: (pid: number, amount: bigint) => Promise<void>
  onHarvest: (pid: number) => Promise<void>
  onApprove: (lpToken: Address, amount: bigint) => Promise<void>
  getAllowance: (lpToken: Address) => Promise<bigint>
  getLpBalance: (lpToken: Address) => Promise<bigint>
}

export function FarmGrid({
  pools,
  userPositions,
  chainId,
  loading,
  error,
  onDeposit,
  onWithdraw,
  onHarvest,
  onApprove,
  getAllowance,
  getLpBalance,
}: FarmGridProps) {
  const { address: userAddress } = useAccount()
  const [allowances, setAllowances] = useState<Record<string, bigint>>({})
  const [balances, setBalances] = useState<Record<string, bigint>>({})
  const [actionPending, setActionPending] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const FARMS_PER_PAGE = 6

  // Sort pools: EonSwap-branded pools (ESTF/ESR) first, then by pid
  const sortedPools = useMemo(() => {
    return [...pools].sort((a, b) => {
      const aIsEon = isEonSwapPool(a)
      const bIsEon = isEonSwapPool(b)
      if (aIsEon && !bIsEon) return -1
      if (!aIsEon && bIsEon) return 1
      return a.pid - b.pid
    })
  }, [pools])

  const { totalPages, getPageItems } = usePagination(sortedPools, FARMS_PER_PAGE)
  const currentPools = getPageItems(currentPage)

  // Reset to page 1 when pools change
  useEffect(() => {
    setCurrentPage(1)
  }, [pools.length])

  // Fetch allowances and balances for all LP tokens
  useEffect(() => {
    if (!userAddress || pools.length === 0) return

    const fetchData = async () => {
      const newAllowances: Record<string, bigint> = {}
      const newBalances: Record<string, bigint> = {}

      for (const pool of pools) {
        const [allowance, balance] = await Promise.all([
          getAllowance(pool.lpToken),
          getLpBalance(pool.lpToken),
        ])
        newAllowances[pool.lpToken.toLowerCase()] = allowance
        newBalances[pool.lpToken.toLowerCase()] = balance
      }

      setAllowances(newAllowances)
      setBalances(newBalances)
    }

    void fetchData()
  }, [userAddress, pools, getAllowance, getLpBalance])

  const handleDeposit = useCallback(
    async (pid: number, amount: bigint) => {
      setActionPending(true)
      try {
        await onDeposit(pid, amount)
      } finally {
        setActionPending(false)
      }
    },
    [onDeposit]
  )

  const handleWithdraw = useCallback(
    async (pid: number, amount: bigint) => {
      setActionPending(true)
      try {
        await onWithdraw(pid, amount)
      } finally {
        setActionPending(false)
      }
    },
    [onWithdraw]
  )

  const handleHarvest = useCallback(
    async (pid: number) => {
      setActionPending(true)
      try {
        await onHarvest(pid)
      } finally {
        setActionPending(false)
      }
    },
    [onHarvest]
  )

  const handleApprove = useCallback(
    async (lpToken: Address, amount: bigint) => {
      setActionPending(true)
      try {
        await onApprove(lpToken, amount)
      } finally {
        setActionPending(false)
      }
    },
    [onApprove]
  )

  const refreshAllowance = useCallback(
    async (lpToken: Address) => {
      if (!userAddress) return
      const allowance = await getAllowance(lpToken)
      setAllowances((prev) => ({
        ...prev,
        [lpToken.toLowerCase()]: allowance,
      }))
    },
    [userAddress, getAllowance]
  )

  if (loading && pools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-uni-pink" />
        <p className="mt-4 text-sm text-neutral-400">Loading farms...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertTriangle className="h-8 w-8 text-amber-400" />
        <p className="mt-4 text-sm text-neutral-400">{error}</p>
      </div>
    )
  }

  if (pools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Sprout className="h-12 w-12 text-neutral-600" />
        <p className="mt-4 text-sm text-neutral-400">No active farms found</p>
        <p className="mt-1 text-xs text-neutral-500">
          Farms will appear here when available
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {currentPools.map((pool, index) => {
          const userPosition = userPositions.find((p) => p.pid === pool.pid)
          const lpKey = pool.lpToken.toLowerCase()
          const allowance = allowances[lpKey] ?? 0n
          const balance = balances[lpKey] ?? 0n

          return (
            <FarmCard
              key={pool.pid}
              pool={pool}
              userPosition={userPosition}
              chainId={chainId}
              index={index}
              lpBalance={balance}
              allowance={allowance}
              onDeposit={handleDeposit}
              onWithdraw={handleWithdraw}
              onHarvest={handleHarvest}
              onApprove={handleApprove}
              onRefreshAllowance={() => refreshAllowance(pool.lpToken)}
              isActionPending={actionPending}
            />
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </>
  )
}
