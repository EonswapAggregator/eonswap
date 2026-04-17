import { motion } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
  Droplets,
  Loader2,
  Minus,
  Plus,
  Wallet2,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Check,
} from 'lucide-react'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { formatUnits, parseUnits, type Address, maxUint256 } from 'viem'
import { useAccount, useBalance } from 'wagmi'
import { base } from 'viem/chains'

import { useEonPools } from '../../hooks/useEonPools'
import { useEonLiquidity } from '../../hooks/useEonLiquidity'
import { TokenLogo } from '../TokenLogo'
import { tokensForChain, type Token } from '../../lib/tokens'
import { EON_AMM_ROUTER_FALLBACK } from '../../lib/amm/config'
import type { EonAmmPool, EonAmmUserPosition } from '../../lib/amm/poolTypes'

function formatUsd(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '$0.00'
  if (value < 1) return `$${value.toFixed(4)}`
  if (value < 1000) return `$${value.toFixed(2)}`
  if (value < 1_000_000) return `$${(value / 1000).toFixed(2)}K`
  if (value < 1_000_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  return `$${(value / 1_000_000_000).toFixed(2)}B`
}

function formatTokenAmount(value: bigint, decimals: number): string {
  const num = Number(formatUnits(value, decimals))
  if (num < 0.0001) return '< 0.0001'
  if (num < 1) return num.toFixed(6)
  if (num < 1000) return num.toFixed(4)
  if (num < 1_000_000) return (num / 1000).toFixed(2) + 'K'
  return (num / 1_000_000).toFixed(2) + 'M'
}

function findToken(chainId: number, address: Address): Token | null {
  return tokensForChain(chainId).find(
    (t: Token) => t.address.toLowerCase() === address.toLowerCase()
  ) ?? null
}

type PoolCardProps = {
  pool: EonAmmPool
  userPosition?: EonAmmUserPosition
  chainId: number
  onAddLiquidity: (pool: EonAmmPool) => void
  onRemoveLiquidity: (pool: EonAmmPool, position: EonAmmUserPosition) => void
}

function PoolCard({
  pool,
  userPosition,
  chainId,
  onAddLiquidity,
  onRemoveLiquidity,
}: PoolCardProps) {
  const [expanded, setExpanded] = useState(false)
  const token0 = findToken(chainId, pool.token0)
  const token1 = findToken(chainId, pool.token1)

  const sharePercent = userPosition
    ? (userPosition.shareOfPool * 100).toFixed(4)
    : '0'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/[0.08] bg-[#0d1027]/80 overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition"
      >
        <div className="flex items-center -space-x-2">
          {token0 ? (
            <TokenLogo chainId={chainId} token={token0} size="sm" className="ring-2 ring-[#0d1027]" />
          ) : (
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] text-[10px] font-semibold text-slate-300 ring-2 ring-[#0d1027]">
              {pool.symbol0.slice(0, 2)}
            </span>
          )}
          {token1 ? (
            <TokenLogo chainId={chainId} token={token1} size="sm" className="ring-2 ring-[#0d1027]" />
          ) : (
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] text-[10px] font-semibold text-slate-300 ring-2 ring-[#0d1027]">
              {pool.symbol1.slice(0, 2)}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-100 truncate">
            {pool.symbol0}/{pool.symbol1}
          </p>
          <p className="text-xs text-slate-500">Eon AMM • Base</p>
        </div>

        <div className="text-right mr-2 hidden sm:block">
          <p className="text-xs text-slate-500">TVL</p>
          <p className="text-sm font-medium text-slate-200">{formatUsd(pool.tvlUsd)}</p>
        </div>

        {userPosition && (
          <div className="text-right mr-2 hidden sm:block">
            <p className="text-xs text-emerald-400">My Position</p>
            <p className="text-sm font-medium text-emerald-300">
              {formatUsd(userPosition.valueUsd)}
            </p>
          </div>
        )}

        {expanded ? (
          <ChevronUp className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        )}
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-white/[0.06]"
        >
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                {pool.symbol0} Reserve
              </p>
              <p className="mt-1 text-sm font-medium text-slate-200">
                {formatTokenAmount(pool.reserve0, pool.decimals0)}
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                {pool.symbol1} Reserve
              </p>
              <p className="mt-1 text-sm font-medium text-slate-200">
                {formatTokenAmount(pool.reserve1, pool.decimals1)}
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Total Supply</p>
              <p className="mt-1 text-sm font-medium text-slate-200">
                {formatTokenAmount(pool.totalSupply, 18)} LP
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">TVL</p>
              <p className="mt-1 text-sm font-medium text-slate-200">{formatUsd(pool.tvlUsd)}</p>
            </div>
          </div>

          {userPosition && (
            <div className="border-t border-white/[0.06] bg-emerald-500/[0.03] p-4">
              <p className="text-xs font-semibold text-emerald-400 mb-3">Your Position</p>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/[0.05] p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">LP Tokens</p>
                  <p className="mt-0.5 text-sm font-medium text-slate-200">
                    {formatTokenAmount(userPosition.lpBalance, 18)}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/[0.05] p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Pool Share</p>
                  <p className="mt-0.5 text-sm font-medium text-slate-200">{sharePercent}%</p>
                </div>
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/[0.05] p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    {pool.symbol0}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-slate-200">
                    {formatTokenAmount(userPosition.token0Amount, pool.decimals0)}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/[0.05] p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    {pool.symbol1}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-slate-200">
                    {formatTokenAmount(userPosition.token1Amount, pool.decimals1)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 p-4 pt-2">
            <button
              type="button"
              onClick={() => onAddLiquidity(pool)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-400 via-cyan-500 to-eon-blue py-2.5 text-sm font-semibold text-[#05060f] transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add Liquidity
            </button>
            {userPosition && (
              <button
                type="button"
                onClick={() => onRemoveLiquidity(pool, userPosition)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.04] py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/[0.08]"
              >
                <Minus className="h-4 w-4" />
                Remove
              </button>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

type AddLiquidityModalProps = {
  pool: EonAmmPool
  chainId: number
  onClose: () => void
  onSuccess: () => void
}

function AddLiquidityModal({ pool, chainId, onClose, onSuccess }: AddLiquidityModalProps) {
  const { address: userAddress } = useAccount()
  const routerAddress = EON_AMM_ROUTER_FALLBACK[chainId]

  const [amount0, setAmount0] = useState('')
  const [amount1, setAmount1] = useState('')
  const [slippage, setSlippage] = useState(0.5)
  const [approving0, setApproving0] = useState(false)
  const [approving1, setApproving1] = useState(false)
  const [needsApproval0, setNeedsApproval0] = useState(true)
  const [needsApproval1, setNeedsApproval1] = useState(true)

  const {
    addLiquidity,
    addLiquidityETH,
    approveToken,
    checkAllowance,
    status,
    error: txError,
    hash,
  } = useEonLiquidity(chainId)

  const token0 = findToken(chainId, pool.token0)
  const token1 = findToken(chainId, pool.token1)

  const isToken0Native = pool.symbol0 === 'WETH'
  const isToken1Native = pool.symbol1 === 'WETH'

  // Fetch balances
  const { data: balance0 } = useBalance({
    address: userAddress,
    token: isToken0Native ? undefined : (pool.token0 as Address),
    chainId,
  })
  const { data: balance1 } = useBalance({
    address: userAddress,
    token: isToken1Native ? undefined : (pool.token1 as Address),
    chainId,
  })

  const parsedAmount0 = useMemo(() => {
    try {
      return parseUnits(amount0 || '0', pool.decimals0)
    } catch {
      return 0n
    }
  }, [amount0, pool.decimals0])

  const parsedAmount1 = useMemo(() => {
    try {
      return parseUnits(amount1 || '0', pool.decimals1)
    } catch {
      return 0n
    }
  }, [amount1, pool.decimals1])

  // Calculate optimal ratio
  const calculateAmount1 = useCallback(
    (a0: string) => {
      if (!a0 || pool.reserve0 === 0n) return ''
      try {
        const parsed = parseUnits(a0, pool.decimals0)
        const optimal = (parsed * pool.reserve1) / pool.reserve0
        return formatUnits(optimal, pool.decimals1)
      } catch {
        return ''
      }
    },
    [pool.reserve0, pool.reserve1, pool.decimals0, pool.decimals1]
  )

  const calculateAmount0 = useCallback(
    (a1: string) => {
      if (!a1 || pool.reserve1 === 0n) return ''
      try {
        const parsed = parseUnits(a1, pool.decimals1)
        const optimal = (parsed * pool.reserve0) / pool.reserve1
        return formatUnits(optimal, pool.decimals0)
      } catch {
        return ''
      }
    },
    [pool.reserve0, pool.reserve1, pool.decimals0, pool.decimals1]
  )

  // Check allowances
  useEffect(() => {
    if (!userAddress || !routerAddress) return
    const check = async () => {
      if (!isToken0Native && parsedAmount0 > 0n) {
        const has = await checkAllowance(pool.token0, routerAddress, parsedAmount0)
        setNeedsApproval0(!has)
      } else {
        setNeedsApproval0(false)
      }
      if (!isToken1Native && parsedAmount1 > 0n) {
        const has = await checkAllowance(pool.token1, routerAddress, parsedAmount1)
        setNeedsApproval1(!has)
      } else {
        setNeedsApproval1(false)
      }
    }
    void check()
  }, [
    userAddress,
    routerAddress,
    pool.token0,
    pool.token1,
    parsedAmount0,
    parsedAmount1,
    checkAllowance,
    isToken0Native,
    isToken1Native,
  ])

  const handleApprove0 = async () => {
    if (!routerAddress) return
    setApproving0(true)
    await approveToken(pool.token0, routerAddress, maxUint256)
    setNeedsApproval0(false)
    setApproving0(false)
  }

  const handleApprove1 = async () => {
    if (!routerAddress) return
    setApproving1(true)
    await approveToken(pool.token1, routerAddress, maxUint256)
    setNeedsApproval1(false)
    setApproving1(false)
  }

  const handleAdd = async () => {
    if (!userAddress) return

    const slippageFactor = BigInt(Math.floor((1 - slippage / 100) * 10000))
    const amountAMin = (parsedAmount0 * slippageFactor) / 10000n
    const amountBMin = (parsedAmount1 * slippageFactor) / 10000n

    let result
    if (isToken0Native) {
      result = await addLiquidityETH({
        token: pool.token1,
        amountTokenDesired: parsedAmount1,
        amountTokenMin: amountBMin,
        amountETHMin: amountAMin,
        to: userAddress,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
        value: parsedAmount0,
      })
    } else if (isToken1Native) {
      result = await addLiquidityETH({
        token: pool.token0,
        amountTokenDesired: parsedAmount0,
        amountTokenMin: amountAMin,
        amountETHMin: amountBMin,
        to: userAddress,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
        value: parsedAmount1,
      })
    } else {
      result = await addLiquidity({
        tokenA: pool.token0,
        tokenB: pool.token1,
        amountADesired: parsedAmount0,
        amountBDesired: parsedAmount1,
        amountAMin,
        amountBMin,
        to: userAddress,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
      })
    }

    if (result) {
      onSuccess()
    }
  }

  const insufficientBalance0 = balance0 && parsedAmount0 > balance0.value
  const insufficientBalance1 = balance1 && parsedAmount1 > balance1.value
  const canAdd =
    parsedAmount0 > 0n &&
    parsedAmount1 > 0n &&
    !insufficientBalance0 &&
    !insufficientBalance1 &&
    !needsApproval0 &&
    !needsApproval1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[400px] max-h-[85vh] overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#0c1027] p-4 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white">Add Liquidity</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          <div className="flex items-center -space-x-2">
            {token0 ? (
              <TokenLogo chainId={chainId} token={token0} size="sm" className="ring-2 ring-[#0c1027]" />
            ) : (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.08] text-[9px] text-slate-300">
                {pool.symbol0.slice(0, 2)}
              </span>
            )}
            {token1 ? (
              <TokenLogo chainId={chainId} token={token1} size="sm" className="ring-2 ring-[#0c1027]" />
            ) : (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.08] text-[9px] text-slate-300">
                {pool.symbol1.slice(0, 2)}
              </span>
            )}
          </div>
          <p className="font-medium text-slate-200">
            {pool.symbol0}/{pool.symbol1}
          </p>
        </div>

        {/* Amount 0 Input */}
        <div className="mb-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">{pool.symbol0}</span>
            <span className="text-xs text-slate-500">
              Balance: {balance0 ? formatUnits(balance0.value, balance0.decimals) : '—'}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={amount0}
              onChange={(e) => {
                setAmount0(e.target.value)
                if (pool.reserve0 > 0n) {
                  setAmount1(calculateAmount1(e.target.value))
                }
              }}
              className="flex-1 bg-transparent text-lg font-medium text-white outline-none placeholder:text-slate-600"
            />
            {balance0 && (
              <button
                type="button"
                onClick={() => {
                  const max = formatUnits(balance0.value, balance0.decimals)
                  setAmount0(max)
                  setAmount1(calculateAmount1(max))
                }}
                className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300"
              >
                MAX
              </button>
            )}
          </div>
          {insufficientBalance0 && (
            <p className="mt-1 text-xs text-rose-400">Insufficient balance</p>
          )}
        </div>

        {/* Amount 1 Input */}
        <div className="mb-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">{pool.symbol1}</span>
            <span className="text-xs text-slate-500">
              Balance: {balance1 ? formatUnits(balance1.value, balance1.decimals) : '—'}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={amount1}
              onChange={(e) => {
                setAmount1(e.target.value)
                if (pool.reserve1 > 0n) {
                  setAmount0(calculateAmount0(e.target.value))
                }
              }}
              className="flex-1 bg-transparent text-lg font-medium text-white outline-none placeholder:text-slate-600"
            />
            {balance1 && (
              <button
                type="button"
                onClick={() => {
                  const max = formatUnits(balance1.value, balance1.decimals)
                  setAmount1(max)
                  setAmount0(calculateAmount0(max))
                }}
                className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300"
              >
                MAX
              </button>
            )}
          </div>
          {insufficientBalance1 && (
            <p className="mt-1 text-xs text-rose-400">Insufficient balance</p>
          )}
        </div>

        {/* Slippage */}
        <div className="mb-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">Slippage Tolerance</span>
            <span className="text-xs font-medium text-slate-300">{slippage}%</span>
          </div>
          <div className="flex gap-2">
            {[0.1, 0.5, 1.0, 3.0].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSlippage(s)}
                className={`flex-1 rounded-md border px-2 py-1 text-xs transition ${
                  slippage === s
                    ? 'border-cyan-400/40 bg-cyan-400/15 text-cyan-300'
                    : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:bg-white/[0.05]'
                }`}
              >
                {s}%
              </button>
            ))}
          </div>
        </div>

        {/* Approval Buttons */}
        {(needsApproval0 || needsApproval1) && parsedAmount0 > 0n && parsedAmount1 > 0n && (
          <div className="mb-4 flex gap-2">
            {needsApproval0 && !isToken0Native && (
              <button
                type="button"
                onClick={handleApprove0}
                disabled={approving0}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 py-2.5 text-sm font-medium text-cyan-300 transition hover:bg-cyan-400/20 disabled:opacity-60"
              >
                {approving0 ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Approve {pool.symbol0}
              </button>
            )}
            {needsApproval1 && !isToken1Native && (
              <button
                type="button"
                onClick={handleApprove1}
                disabled={approving1}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 py-2.5 text-sm font-medium text-cyan-300 transition hover:bg-cyan-400/20 disabled:opacity-60"
              >
                {approving1 ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Approve {pool.symbol1}
              </button>
            )}
          </div>
        )}

        {/* Error / Success */}
        {txError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {txError}
          </div>
        )}

        {status === 'success' && hash && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            <Check className="h-4 w-4 shrink-0" />
            Liquidity added successfully!{' '}
            <a
              href={`https://basescan.org/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View tx
            </a>
          </div>
        )}

        {/* Add Button */}
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd || status === 'pending' || status === 'approving'}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-eon-blue py-3 text-sm font-semibold text-[#05060f] transition hover:opacity-90 disabled:opacity-50"
        >
          {status === 'pending' || status === 'approving' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {status === 'approving' ? 'Approving...' : 'Adding Liquidity...'}
            </>
          ) : (
            <>
              <Droplets className="h-4 w-4" />
              Add Liquidity
            </>
          )}
        </button>
      </motion.div>
    </div>
  )
}

type RemoveLiquidityModalProps = {
  pool: EonAmmPool
  position: EonAmmUserPosition
  chainId: number
  onClose: () => void
  onSuccess: () => void
}

function RemoveLiquidityModal({
  pool,
  position,
  chainId,
  onClose,
  onSuccess,
}: RemoveLiquidityModalProps) {
  const { address: userAddress } = useAccount()
  const routerAddress = EON_AMM_ROUTER_FALLBACK[chainId]

  const [percent, setPercent] = useState(100)
  const [slippage, setSlippage] = useState(0.5)
  const [needsApproval, setNeedsApproval] = useState(true)
  const [approving, setApproving] = useState(false)

  const {
    removeLiquidity,
    removeLiquidityETH,
    approveLP,
    checkAllowance,
    status,
    error: txError,
    hash,
  } = useEonLiquidity(chainId)

  const token0 = findToken(chainId, pool.token0)
  const token1 = findToken(chainId, pool.token1)

  const isToken0Native = pool.symbol0 === 'WETH'
  const isToken1Native = pool.symbol1 === 'WETH'

  const liquidityToRemove = (position.lpBalance * BigInt(percent)) / 100n

  const expectedToken0 = (position.token0Amount * BigInt(percent)) / 100n
  const expectedToken1 = (position.token1Amount * BigInt(percent)) / 100n

  // Check LP approval
  useEffect(() => {
    if (!userAddress || !routerAddress) return
    const check = async () => {
      const has = await checkAllowance(pool.address, routerAddress, liquidityToRemove)
      setNeedsApproval(!has)
    }
    void check()
  }, [userAddress, routerAddress, pool.address, liquidityToRemove, checkAllowance])

  const handleApproveLP = async () => {
    setApproving(true)
    await approveLP(pool.address, maxUint256)
    setNeedsApproval(false)
    setApproving(false)
  }

  const handleRemove = async () => {
    if (!userAddress) return

    const slippageFactor = BigInt(Math.floor((1 - slippage / 100) * 10000))
    const amountAMin = (expectedToken0 * slippageFactor) / 10000n
    const amountBMin = (expectedToken1 * slippageFactor) / 10000n

    let result
    if (isToken0Native) {
      result = await removeLiquidityETH({
        token: pool.token1,
        liquidity: liquidityToRemove,
        amountTokenMin: amountBMin,
        amountETHMin: amountAMin,
        to: userAddress,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
      })
    } else if (isToken1Native) {
      result = await removeLiquidityETH({
        token: pool.token0,
        liquidity: liquidityToRemove,
        amountTokenMin: amountAMin,
        amountETHMin: amountBMin,
        to: userAddress,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
      })
    } else {
      result = await removeLiquidity({
        tokenA: pool.token0,
        tokenB: pool.token1,
        liquidity: liquidityToRemove,
        amountAMin,
        amountBMin,
        to: userAddress,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
      })
    }

    if (result) {
      onSuccess()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[400px] max-h-[85vh] overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#0c1027] p-4 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-white">Remove Liquidity</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          <div className="flex items-center -space-x-2">
            {token0 ? (
              <TokenLogo chainId={chainId} token={token0} size="sm" className="ring-2 ring-[#0c1027]" />
            ) : (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.08] text-[9px] text-slate-300">
                {pool.symbol0.slice(0, 2)}
              </span>
            )}
            {token1 ? (
              <TokenLogo chainId={chainId} token={token1} size="sm" className="ring-2 ring-[#0c1027]" />
            ) : (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.08] text-[9px] text-slate-300">
                {pool.symbol1.slice(0, 2)}
              </span>
            )}
          </div>
          <p className="font-medium text-slate-200">
            {pool.symbol0}/{pool.symbol1}
          </p>
        </div>

        {/* Percent Slider */}
        <div className="mb-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500">Amount to remove</span>
            <span className="text-2xl font-bold text-white">{percent}%</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={percent}
            onChange={(e) => setPercent(Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
          <div className="mt-2 flex gap-2">
            {[25, 50, 75, 100].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPercent(p)}
                className={`flex-1 rounded-md border px-2 py-1 text-xs transition ${
                  percent === p
                    ? 'border-cyan-400/40 bg-cyan-400/15 text-cyan-300'
                    : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:bg-white/[0.05]'
                }`}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        {/* Expected Output */}
        <div className="mb-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          <p className="text-xs text-slate-500 mb-2">You will receive</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {token0 && <TokenLogo chainId={chainId} token={token0} size="sm" />}
                <span className="text-sm text-slate-300">{pool.symbol0}</span>
              </div>
              <span className="text-sm font-medium text-white">
                {formatTokenAmount(expectedToken0, pool.decimals0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {token1 && <TokenLogo chainId={chainId} token={token1} size="sm" />}
                <span className="text-sm text-slate-300">{pool.symbol1}</span>
              </div>
              <span className="text-sm font-medium text-white">
                {formatTokenAmount(expectedToken1, pool.decimals1)}
              </span>
            </div>
          </div>
        </div>

        {/* Slippage */}
        <div className="mb-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">Slippage Tolerance</span>
            <span className="text-xs font-medium text-slate-300">{slippage}%</span>
          </div>
          <div className="flex gap-2">
            {[0.1, 0.5, 1.0, 3.0].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSlippage(s)}
                className={`flex-1 rounded-md border px-2 py-1 text-xs transition ${
                  slippage === s
                    ? 'border-cyan-400/40 bg-cyan-400/15 text-cyan-300'
                    : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:bg-white/[0.05]'
                }`}
              >
                {s}%
              </button>
            ))}
          </div>
        </div>

        {/* Approval Button */}
        {needsApproval && (
          <button
            type="button"
            onClick={handleApproveLP}
            disabled={approving}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 py-2.5 text-sm font-medium text-cyan-300 transition hover:bg-cyan-400/20 disabled:opacity-60"
          >
            {approving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Approve LP Token
          </button>
        )}

        {/* Error / Success */}
        {txError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {txError}
          </div>
        )}

        {status === 'success' && hash && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            <Check className="h-4 w-4 shrink-0" />
            Liquidity removed successfully!{' '}
            <a
              href={`https://basescan.org/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View tx
            </a>
          </div>
        )}

        {/* Remove Button */}
        <button
          type="button"
          onClick={handleRemove}
          disabled={needsApproval || status === 'pending' || status === 'approving'}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/20 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/30 disabled:opacity-50"
        >
          {status === 'pending' || status === 'approving' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Removing...
            </>
          ) : (
            <>
              <Minus className="h-4 w-4" />
              Remove Liquidity
            </>
          )}
        </button>
      </motion.div>
    </div>
  )
}

export function NativePoolSection() {
  const { isConnected } = useAccount()

  const { pools, userPositions, loading, error, refresh } = useEonPools(base.id)

  const [addLiquidityPool, setAddLiquidityPool] = useState<EonAmmPool | null>(null)
  const [removeLiquidityData, setRemoveLiquidityData] = useState<{
    pool: EonAmmPool
    position: EonAmmUserPosition
  } | null>(null)

  const totalTvl = useMemo(
    () => pools.reduce((sum: number, p: EonAmmPool) => sum + p.tvlUsd, 0),
    [pools]
  )
  const totalPositionValue = useMemo(
    () => userPositions.reduce((sum: number, p: EonAmmUserPosition) => sum + p.valueUsd, 0),
    [userPositions]
  )

  const handleAddSuccess = () => {
    setAddLiquidityPool(null)
    void refresh()
  }

  const handleRemoveSuccess = () => {
    setRemoveLiquidityData(null)
    void refresh()
  }

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-eon-blue">
            <Droplets className="h-4 w-4" />
            <span className="text-xs font-medium">Native Pools</span>
          </div>
          <p className="mt-2 text-xl font-bold text-white">
            {loading ? '...' : pools.length}
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-eon-blue">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium">Total TVL</span>
          </div>
          <p className="mt-2 text-xl font-bold text-white">
            {loading ? '...' : formatUsd(totalTvl)}
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <Wallet2 className="h-4 w-4" />
            <span className="text-xs font-medium">My Positions</span>
          </div>
          <p className="mt-2 text-xl font-bold text-white">
            {isConnected ? formatUsd(totalPositionValue) : '—'}
          </p>
        </div>
      </div>

      {/* Refresh */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Eon AMM Liquidity Pools</h3>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/[0.06] disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 p-3 text-xs text-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && pools.length === 0 && (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading pools...
        </div>
      )}

      {/* No Pools */}
      {!loading && pools.length === 0 && !error && (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-8 text-center">
          <Droplets className="mx-auto h-10 w-10 text-slate-500" />
          <p className="mt-3 text-sm text-slate-400">No liquidity pools found</p>
          <p className="mt-1 text-xs text-slate-500">
            Be the first to add liquidity to Eon AMM
          </p>
        </div>
      )}

      {/* Pool List */}
      <div className="space-y-2">
        {pools.map((pool: EonAmmPool) => {
          const position = userPositions.find(
            (p: EonAmmUserPosition) => p.poolAddress.toLowerCase() === pool.address.toLowerCase()
          )
          return (
            <PoolCard
              key={pool.address}
              pool={pool}
              userPosition={position}
              chainId={base.id}
              onAddLiquidity={setAddLiquidityPool}
              onRemoveLiquidity={(p, pos) => setRemoveLiquidityData({ pool: p, position: pos })}
            />
          )
        })}
      </div>

      {/* Modals */}
      {addLiquidityPool && (
        <AddLiquidityModal
          pool={addLiquidityPool}
          chainId={base.id}
          onClose={() => setAddLiquidityPool(null)}
          onSuccess={handleAddSuccess}
        />
      )}

      {removeLiquidityData && (
        <RemoveLiquidityModal
          pool={removeLiquidityData.pool}
          position={removeLiquidityData.position}
          chainId={base.id}
          onClose={() => setRemoveLiquidityData(null)}
          onSuccess={handleRemoveSuccess}
        />
      )}
    </div>
  )
}
