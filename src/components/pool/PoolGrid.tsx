import { motion } from "framer-motion";
import {
  Droplets,
  Loader2,
  Minus,
  Plus,
  AlertCircle,
  Check,
  Percent,
  Sparkles,
} from "lucide-react";
import { useState, useMemo, useCallback, useEffect } from "react";
import { formatUnits, parseUnits, type Address } from "viem";
import { useAccount, useBalance } from "wagmi";
import { base } from "viem/chains";
import { toast } from "sonner";

import { useEonLiquidity } from "../../hooks/useEonLiquidity";
import { TokenLogo } from "../TokenLogo";
import { tokensForChain, type Token } from "../../lib/tokens";
import { EON_AMM_ROUTER_FALLBACK } from "../../lib/amm/config";
import type { EonAmmPool, EonAmmUserPosition } from "../../lib/amm/poolTypes";
import { Pagination } from "../Pagination";
import { usePagination } from "../../hooks/usePagination";
import { sendTxEventToRelay } from "../../lib/txEvents";
import { useEonSwapStore } from "../../store/useEonSwapStore";

/** EonSwap branded token addresses on Base mainnet */
const EONSWAP_TOKENS = [
  "0x7bd09674b3c721e35973993d5b6a79cda7da9c7f", // ESTF
  "0xbc11e3093afdbeb88d32ef893027202fc2b84f9d", // ESR
];

/** Check if the pool contains EonSwap branded token (ESTF or ESR) */
function isEonSwapPool(pool: EonAmmPool): boolean {
  const t0 = pool.token0.toLowerCase();
  const t1 = pool.token1.toLowerCase();
  return EONSWAP_TOKENS.some((addr) => addr === t0 || addr === t1);
}

function formatUsd(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "$0.00";
  if (value < 1) return `$${value.toFixed(4)}`;
  if (value < 1000) return `$${value.toFixed(2)}`;
  if (value < 1_000_000) return `$${(value / 1000).toFixed(2)}K`;
  if (value < 1_000_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  return `$${(value / 1_000_000_000).toFixed(2)}B`;
}

function formatTokenAmount(value: bigint, decimals: number): string {
  const num = Number(formatUnits(value, decimals));
  if (num < 0.0001) return "< 0.0001";
  if (num < 1) return num.toFixed(6);
  if (num < 1000) return num.toFixed(4);
  if (num < 1_000_000) return (num / 1000).toFixed(2) + "K";
  return (num / 1_000_000).toFixed(2) + "M";
}

function findToken(chainId: number, address: Address): Token | null {
  return (
    tokensForChain(chainId).find(
      (t: Token) => t.address.toLowerCase() === address.toLowerCase(),
    ) ?? null
  );
}

type PoolCardProps = {
  pool: EonAmmPool;
  userPosition?: EonAmmUserPosition;
  chainId: number;
  index: number;
  onAddLiquidity: (pool: EonAmmPool) => void;
  onRemoveLiquidity: (pool: EonAmmPool, position: EonAmmUserPosition) => void;
};

function PoolCard({
  pool,
  userPosition,
  chainId,
  index,
  onAddLiquidity,
  onRemoveLiquidity,
}: PoolCardProps) {
  const token0 = findToken(chainId, pool.token0);
  const token1 = findToken(chainId, pool.token1);

  const sharePercent = userPosition
    ? (userPosition.shareOfPool * 100).toFixed(4)
    : "0";

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
      <div
        className={`relative p-5 md:p-6 ${isEonSwapPool(pool) ? "pt-7" : ""}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Token pair icons */}
            <div className="relative">
              <div className="flex items-center -space-x-3">
                {token0 ? (
                  <TokenLogo
                    chainId={chainId}
                    token={token0}
                    size="md"
                    className="ring-2 ring-uni-surface"
                  />
                ) : (
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-uni-surface-2 text-sm font-semibold text-neutral-300 ring-2 ring-uni-surface">
                    {pool.symbol0.slice(0, 2)}
                  </span>
                )}
                {token1 ? (
                  <TokenLogo
                    chainId={chainId}
                    token={token1}
                    size="md"
                    className="ring-2 ring-uni-surface"
                  />
                ) : (
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-uni-surface-2 text-sm font-semibold text-neutral-300 ring-2 ring-uni-surface">
                    {pool.symbol1.slice(0, 2)}
                  </span>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white">
                {pool.symbol0}/{pool.symbol1}
              </h3>
              <p className="text-xs text-neutral-500">Eon AMM • Base</p>
            </div>
          </div>

          {/* TVL Badge - inside card */}
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              TVL
            </p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-white">
              {formatUsd(pool.tvlUsd)}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-uni-border bg-uni-surface-2 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
              {pool.symbol0} Reserve
            </p>
            <p className="mt-1 text-sm font-medium tabular-nums text-neutral-200">
              {formatTokenAmount(pool.reserve0, pool.decimals0)}
            </p>
          </div>
          <div className="rounded-xl border border-uni-border bg-uni-surface-2 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
              {pool.symbol1} Reserve
            </p>
            <p className="mt-1 text-sm font-medium tabular-nums text-neutral-200">
              {formatTokenAmount(pool.reserve1, pool.decimals1)}
            </p>
          </div>
        </div>

        {/* User position badge */}
        {userPosition && (
          <div className="mt-4 rounded-xl border border-uni-pink/30 bg-uni-pink/[0.08] p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-uni-pink" />
                <span className="text-xs font-medium text-uni-pink">
                  Your Position
                </span>
              </div>
              <span className="text-sm font-semibold text-white">
                {formatUsd(userPosition.valueUsd)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
              <span>Pool share: {sharePercent}%</span>
              <span>{formatTokenAmount(userPosition.lpBalance, 18)} LP</span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => onAddLiquidity(pool)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-uni-pink px-4 py-3 text-sm font-semibold text-white transition hover:bg-uni-pink-light"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
          {userPosition && (
            <button
              type="button"
              onClick={() => onRemoveLiquidity(pool, userPosition)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-uni-border bg-uni-surface-2 px-4 py-3 text-sm font-medium text-neutral-200 transition hover:bg-uni-surface-3"
            >
              <Minus className="h-4 w-4" />
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Pool details - always visible */}
      <div className="border-t border-uni-border bg-uni-surface-2/50 px-5 py-4 md:px-6">
        <div className="grid gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-neutral-500">Pool Address</span>
            <a
              href={`https://basescan.org/address/${pool.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-uni-pink hover:underline"
            >
              {pool.address.slice(0, 6)}...{pool.address.slice(-4)}
            </a>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Total Supply</span>
            <span className="font-mono text-neutral-300">
              {formatTokenAmount(pool.totalSupply, 18)} LP
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Last Updated</span>
            <span className="text-neutral-300">
              Block #{pool.blockTimestampLast}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

type AddLiquidityModalProps = {
  pool: EonAmmPool;
  chainId: number;
  onClose: () => void;
  onSuccess: () => void;
};

function AddLiquidityModal({
  pool,
  chainId,
  onClose,
  onSuccess,
}: AddLiquidityModalProps) {
  const { address: userAddress } = useAccount();
  const routerAddress = EON_AMM_ROUTER_FALLBACK[chainId];
  const addActivity = useEonSwapStore((s) => s.addActivity);
  const patchActivity = useEonSwapStore((s) => s.patchActivity);

  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [approving0, setApproving0] = useState(false);
  const [approving1, setApproving1] = useState(false);
  const [needsApproval0, setNeedsApproval0] = useState(true);
  const [needsApproval1, setNeedsApproval1] = useState(true);

  const {
    addLiquidity,
    addLiquidityETH,
    approveToken,
    checkAllowance,
    status,
    error: txError,
    hash,
  } = useEonLiquidity(chainId);

  // Show toast on liquidity error
  useEffect(() => {
    if (txError) {
      toast.error("Liquidity Failed", {
        description: txError.slice(0, 100),
      });
    }
  }, [txError]);

  const token0 = findToken(chainId, pool.token0);
  const token1 = findToken(chainId, pool.token1);

  const isToken0Native = pool.symbol0 === "WETH";
  const isToken1Native = pool.symbol1 === "WETH";

  const { data: balance0 } = useBalance({
    address: userAddress,
    token: isToken0Native ? undefined : (pool.token0 as Address),
    chainId,
  });
  const { data: balance1 } = useBalance({
    address: userAddress,
    token: isToken1Native ? undefined : (pool.token1 as Address),
    chainId,
  });

  const parsedAmount0 = useMemo(() => {
    try {
      return parseUnits(amount0 || "0", pool.decimals0);
    } catch {
      return 0n;
    }
  }, [amount0, pool.decimals0]);

  const parsedAmount1 = useMemo(() => {
    try {
      return parseUnits(amount1 || "0", pool.decimals1);
    } catch {
      return 0n;
    }
  }, [amount1, pool.decimals1]);

  const calculateAmount1 = useCallback(
    (a0: string) => {
      if (!a0 || pool.reserve0 === 0n) return "";
      try {
        const parsed = parseUnits(a0, pool.decimals0);
        const optimal = (parsed * pool.reserve1) / pool.reserve0;
        return formatUnits(optimal, pool.decimals1);
      } catch {
        return "";
      }
    },
    [pool.reserve0, pool.reserve1, pool.decimals0, pool.decimals1],
  );

  const calculateAmount0 = useCallback(
    (a1: string) => {
      if (!a1 || pool.reserve1 === 0n) return "";
      try {
        const parsed = parseUnits(a1, pool.decimals1);
        const optimal = (parsed * pool.reserve0) / pool.reserve1;
        return formatUnits(optimal, pool.decimals0);
      } catch {
        return "";
      }
    },
    [pool.reserve0, pool.reserve1, pool.decimals0, pool.decimals1],
  );

  useEffect(() => {
    if (!userAddress || !routerAddress) return;
    const check = async () => {
      if (!isToken0Native && parsedAmount0 > 0n) {
        const has = await checkAllowance(
          pool.token0,
          routerAddress,
          parsedAmount0,
        );
        setNeedsApproval0(!has);
      } else {
        setNeedsApproval0(false);
      }
      if (!isToken1Native && parsedAmount1 > 0n) {
        const has = await checkAllowance(
          pool.token1,
          routerAddress,
          parsedAmount1,
        );
        setNeedsApproval1(!has);
      } else {
        setNeedsApproval1(false);
      }
    };
    void check();
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
  ]);

  const handleApprove0 = async () => {
    if (!routerAddress) return;
    setApproving0(true);
    await approveToken(pool.token0, routerAddress, parsedAmount0);
    setNeedsApproval0(false);
    setApproving0(false);
  };

  const handleApprove1 = async () => {
    if (!routerAddress) return;
    setApproving1(true);
    await approveToken(pool.token1, routerAddress, parsedAmount1);
    setNeedsApproval1(false);
    setApproving1(false);
  };

  const handleAdd = async () => {
    if (!userAddress) return;

    const slippageFactor = BigInt(Math.floor((1 - slippage / 100) * 10000));
    const amountAMin = (parsedAmount0 * slippageFactor) / 10000n;
    const amountBMin = (parsedAmount1 * slippageFactor) / 10000n;

    const poolName = `${pool.symbol0}/${pool.symbol1}`;
    const summary = `Add ${amount0} ${pool.symbol0} + ${amount1} ${pool.symbol1}`;
    const activityId = crypto.randomUUID();

    addActivity({
      id: activityId,
      kind: "lp_add",
      status: "pending",
      summary,
      chainId,
      from: userAddress,
    });

    const toastId = toast.loading("Adding liquidity...", {
      description: summary,
    });

    let result;
    if (isToken0Native) {
      result = await addLiquidityETH({
        token: pool.token1,
        amountTokenDesired: parsedAmount1,
        amountTokenMin: amountBMin,
        amountETHMin: amountAMin,
        to: userAddress,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
        value: parsedAmount0,
      });
    } else if (isToken1Native) {
      result = await addLiquidityETH({
        token: pool.token0,
        amountTokenDesired: parsedAmount0,
        amountTokenMin: amountAMin,
        amountETHMin: amountBMin,
        to: userAddress,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
        value: parsedAmount1,
      });
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
      });
    }

    if (result) {
      patchActivity(activityId, { txHash: result, status: "success" });
      // Send Telegram notification
      void sendTxEventToRelay({
        kind: "lp_add",
        status: "success",
        txHash: result,
        chainId,
        wallet: userAddress,
        poolName,
        summary,
        at: Date.now(),
      });
      toast.success("Liquidity Added!", {
        id: toastId,
        description: summary,
      });
      onSuccess();
    } else {
      patchActivity(activityId, { status: "failed" });
      toast.dismiss(toastId);
    }
  };

  const insufficientBalance0 = balance0 && parsedAmount0 > balance0.value;
  const insufficientBalance1 = balance1 && parsedAmount1 > balance1.value;
  const canAdd =
    parsedAmount0 > 0n &&
    parsedAmount1 > 0n &&
    !insufficientBalance0 &&
    !insufficientBalance1 &&
    !needsApproval0 &&
    !needsApproval1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-[400px] max-h-[85vh] overflow-hidden rounded-2xl border border-uni-border bg-uni-surface shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-uni-border px-4 py-3">
          <h3 className="text-base font-semibold text-white">Add Liquidity</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-uni-surface-2 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-60px)] p-4">
          {/* Pool info */}
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-uni-border bg-uni-surface-2 p-3">
            <div className="flex items-center -space-x-2">
              {token0 && (
                <TokenLogo
                  chainId={chainId}
                  token={token0}
                  size="sm"
                  className="ring-2 ring-uni-surface-2"
                />
              )}
              {token1 && (
                <TokenLogo
                  chainId={chainId}
                  token={token1}
                  size="sm"
                  className="ring-2 ring-uni-surface-2"
                />
              )}
            </div>
            <p className="font-medium text-white">
              {pool.symbol0}/{pool.symbol1}
            </p>
          </div>

          {/* Amount inputs */}
          <div className="space-y-3">
            <div className="rounded-xl border border-uni-border bg-uni-surface-2 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-neutral-500">
                  {pool.symbol0}
                </span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.0"
                value={amount0}
                onChange={(e) => {
                  setAmount0(e.target.value);
                  if (pool.reserve0 > 0n) {
                    setAmount1(calculateAmount1(e.target.value));
                  }
                }}
                className="w-full bg-transparent text-xl font-medium text-white outline-none placeholder:text-neutral-600"
              />
              <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
                <span>
                  Balance:{" "}
                  {balance0
                    ? Number(
                        formatUnits(balance0.value, balance0.decimals),
                      ).toFixed(4)
                    : "—"}
                </span>
                {balance0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const max = formatUnits(
                        balance0.value,
                        balance0.decimals,
                      );
                      setAmount0(max);
                      setAmount1(calculateAmount1(max));
                    }}
                    className="text-uni-pink hover:underline"
                  >
                    MAX
                  </button>
                )}
              </div>
              {insufficientBalance0 && (
                <p className="mt-1 text-xs text-rose-400">
                  Insufficient balance
                </p>
              )}
            </div>

            <div className="rounded-xl border border-uni-border bg-uni-surface-2 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-neutral-500">
                  {pool.symbol1}
                </span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.0"
                value={amount1}
                onChange={(e) => {
                  setAmount1(e.target.value);
                  if (pool.reserve1 > 0n) {
                    setAmount0(calculateAmount0(e.target.value));
                  }
                }}
                className="w-full bg-transparent text-xl font-medium text-white outline-none placeholder:text-neutral-600"
              />
              <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
                <span>
                  Balance:{" "}
                  {balance1
                    ? Number(
                        formatUnits(balance1.value, balance1.decimals),
                      ).toFixed(4)
                    : "—"}
                </span>
                {balance1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const max = formatUnits(
                        balance1.value,
                        balance1.decimals,
                      );
                      setAmount1(max);
                      setAmount0(calculateAmount0(max));
                    }}
                    className="text-uni-pink hover:underline"
                  >
                    MAX
                  </button>
                )}
              </div>
              {insufficientBalance1 && (
                <p className="mt-1 text-xs text-rose-400">
                  Insufficient balance
                </p>
              )}
            </div>
          </div>

          {/* Slippage */}
          <div className="mt-3 rounded-xl border border-uni-border bg-uni-surface-2 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-500">
                Slippage Tolerance
              </span>
              <span className="text-xs font-semibold text-white">
                {slippage}%
              </span>
            </div>
            <div className="flex gap-2">
              {[0.1, 0.5, 1.0, 3.0].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlippage(s)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                    slippage === s
                      ? "border-uni-pink/40 bg-uni-pink/15 text-uni-pink"
                      : "border-uni-border bg-uni-surface text-neutral-400 hover:bg-uni-surface-3"
                  }`}
                >
                  {s}%
                </button>
              ))}
            </div>
          </div>

          {/* Approvals */}
          {(needsApproval0 || needsApproval1) &&
            parsedAmount0 > 0n &&
            parsedAmount1 > 0n && (
              <div className="mt-3 flex gap-2">
                {needsApproval0 && !isToken0Native && (
                  <button
                    type="button"
                    onClick={handleApprove0}
                    disabled={approving0}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-uni-pink/30 bg-uni-pink/10 py-2 text-xs font-medium text-uni-pink transition hover:bg-uni-pink/20 disabled:opacity-60"
                  >
                    {approving0 ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Approve {pool.symbol0}
                  </button>
                )}
                {needsApproval1 && !isToken1Native && (
                  <button
                    type="button"
                    onClick={handleApprove1}
                    disabled={approving1}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-uni-pink/30 bg-uni-pink/10 py-2 text-xs font-medium text-uni-pink transition hover:bg-uni-pink/20 disabled:opacity-60"
                  >
                    {approving1 ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Approve {pool.symbol1}
                  </button>
                )}
              </div>
            )}

          {/* Error / Success */}
          {txError && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {txError}
            </div>
          )}

          {status === "success" && hash && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300">
              <Check className="h-3.5 w-3.5 shrink-0" />
              Liquidity added!{" "}
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

          {/* Submit button */}
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd || status === "pending" || status === "approving"}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-uni-pink py-3 text-sm font-semibold text-white transition hover:bg-uni-pink-light disabled:opacity-50"
          >
            {status === "pending" || status === "approving" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {status === "approving" ? "Approving..." : "Adding..."}
              </>
            ) : (
              <>
                <Droplets className="h-4 w-4" />
                Add Liquidity
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

type RemoveLiquidityModalProps = {
  pool: EonAmmPool;
  position: EonAmmUserPosition;
  chainId: number;
  onClose: () => void;
  onSuccess: () => void;
};

function RemoveLiquidityModal({
  pool,
  position,
  chainId,
  onClose,
  onSuccess,
}: RemoveLiquidityModalProps) {
  const { address: userAddress } = useAccount();
  const routerAddress = EON_AMM_ROUTER_FALLBACK[chainId];
  const addActivity = useEonSwapStore((s) => s.addActivity);
  const patchActivity = useEonSwapStore((s) => s.patchActivity);

  const [percent, setPercent] = useState(100);
  const [slippage, setSlippage] = useState(0.5);
  const [needsApproval, setNeedsApproval] = useState(true);
  const [approving, setApproving] = useState(false);

  const {
    removeLiquidity,
    removeLiquidityETH,
    approveLP,
    checkAllowance,
    status,
    error: txError,
    hash,
  } = useEonLiquidity(chainId);

  // Show toast on liquidity error
  useEffect(() => {
    if (txError) {
      toast.error("Remove Liquidity Failed", {
        description: txError.slice(0, 100),
      });
    }
  }, [txError]);

  const token0 = findToken(chainId, pool.token0);
  const token1 = findToken(chainId, pool.token1);

  const isToken0Native = pool.symbol0 === "WETH";
  const isToken1Native = pool.symbol1 === "WETH";

  const liquidityToRemove = (position.lpBalance * BigInt(percent)) / 100n;

  const expectedToken0 = (position.token0Amount * BigInt(percent)) / 100n;
  const expectedToken1 = (position.token1Amount * BigInt(percent)) / 100n;

  useEffect(() => {
    if (!userAddress || !routerAddress) return;
    const check = async () => {
      const has = await checkAllowance(
        pool.address,
        routerAddress,
        liquidityToRemove,
      );
      setNeedsApproval(!has);
    };
    void check();
  }, [
    userAddress,
    routerAddress,
    pool.address,
    liquidityToRemove,
    checkAllowance,
  ]);

  const handleApproveLP = async () => {
    setApproving(true);
    await approveLP(pool.address, liquidityToRemove);
    setNeedsApproval(false);
    setApproving(false);
  };

  const handleRemove = async () => {
    if (!userAddress) return;

    const slippageFactor = BigInt(Math.floor((1 - slippage / 100) * 10000));
    const amountAMin = (expectedToken0 * slippageFactor) / 10000n;
    const amountBMin = (expectedToken1 * slippageFactor) / 10000n;

    const poolName = `${pool.symbol0}/${pool.symbol1}`;
    const summary = `Remove ${percent}% of ${poolName} LP`;
    const activityId = crypto.randomUUID();

    addActivity({
      id: activityId,
      kind: "lp_remove",
      status: "pending",
      summary,
      chainId,
      from: userAddress,
    });

    const toastId = toast.loading("Removing liquidity...", {
      description: summary,
    });

    let result;
    if (isToken0Native) {
      result = await removeLiquidityETH({
        token: pool.token1,
        liquidity: liquidityToRemove,
        amountTokenMin: amountBMin,
        amountETHMin: amountAMin,
        to: userAddress,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
      });
    } else if (isToken1Native) {
      result = await removeLiquidityETH({
        token: pool.token0,
        liquidity: liquidityToRemove,
        amountTokenMin: amountAMin,
        amountETHMin: amountBMin,
        to: userAddress,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
      });
    } else {
      result = await removeLiquidity({
        tokenA: pool.token0,
        tokenB: pool.token1,
        liquidity: liquidityToRemove,
        amountAMin,
        amountBMin,
        to: userAddress,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
      });
    }

    if (result) {
      patchActivity(activityId, { txHash: result, status: "success" });
      // Send Telegram notification
      void sendTxEventToRelay({
        kind: "lp_remove",
        status: "success",
        txHash: result,
        chainId,
        wallet: userAddress,
        poolName,
        summary,
        at: Date.now(),
      });
      toast.success("Liquidity Removed!", {
        id: toastId,
        description: summary,
      });
      onSuccess();
    } else {
      patchActivity(activityId, { status: "failed" });
      toast.dismiss(toastId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-[400px] max-h-[85vh] overflow-hidden rounded-2xl border border-uni-border bg-uni-surface shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-uni-border px-4 py-3">
          <h3 className="text-base font-semibold text-white">
            Remove Liquidity
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-uni-surface-2 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-60px)] p-4">
          {/* Pool info */}
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-uni-border bg-uni-surface-2 p-3">
            <div className="flex items-center -space-x-2">
              {token0 && (
                <TokenLogo
                  chainId={chainId}
                  token={token0}
                  size="sm"
                  className="ring-2 ring-uni-surface-2"
                />
              )}
              {token1 && (
                <TokenLogo
                  chainId={chainId}
                  token={token1}
                  size="sm"
                  className="ring-2 ring-uni-surface-2"
                />
              )}
            </div>
            <p className="font-medium text-white">
              {pool.symbol0}/{pool.symbol1}
            </p>
          </div>

          {/* Percent slider */}
          <div className="rounded-xl border border-uni-border bg-uni-surface-2 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-neutral-500">
                Amount to remove
              </span>
              <span className="text-2xl font-bold text-white">{percent}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={percent}
              onChange={(e) => setPercent(Number(e.target.value))}
              className="w-full accent-uni-pink"
            />
            <div className="mt-2 flex gap-2">
              {[25, 50, 75, 100].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPercent(p)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                    percent === p
                      ? "border-uni-pink/40 bg-uni-pink/15 text-uni-pink"
                      : "border-uni-border bg-uni-surface text-neutral-400 hover:bg-uni-surface-3"
                  }`}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          {/* Expected output */}
          <div className="mt-3 rounded-xl border border-uni-border bg-uni-surface-2 p-3">
            <p className="text-xs font-medium text-neutral-500 mb-2">
              You will receive
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {token0 && (
                    <TokenLogo chainId={chainId} token={token0} size="sm" />
                  )}
                  <span className="text-sm text-neutral-300">
                    {pool.symbol0}
                  </span>
                </div>
                <span className="text-sm font-semibold tabular-nums text-white">
                  {formatTokenAmount(expectedToken0, pool.decimals0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {token1 && (
                    <TokenLogo chainId={chainId} token={token1} size="sm" />
                  )}
                  <span className="text-sm text-neutral-300">
                    {pool.symbol1}
                  </span>
                </div>
                <span className="text-sm font-semibold tabular-nums text-white">
                  {formatTokenAmount(expectedToken1, pool.decimals1)}
                </span>
              </div>
            </div>
          </div>

          {/* Slippage */}
          <div className="mt-3 rounded-xl border border-uni-border bg-uni-surface-2 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-500">
                Slippage Tolerance
              </span>
              <span className="text-xs font-semibold text-white">
                {slippage}%
              </span>
            </div>
            <div className="flex gap-2">
              {[0.1, 0.5, 1.0, 3.0].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlippage(s)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                    slippage === s
                      ? "border-uni-pink/40 bg-uni-pink/15 text-uni-pink"
                      : "border-uni-border bg-uni-surface text-neutral-400 hover:bg-uni-surface-3"
                  }`}
                >
                  {s}%
                </button>
              ))}
            </div>
          </div>

          {/* Approval */}
          {needsApproval && (
            <button
              type="button"
              onClick={handleApproveLP}
              disabled={approving}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-uni-pink/30 bg-uni-pink/10 py-2.5 text-xs font-medium text-uni-pink transition hover:bg-uni-pink/20 disabled:opacity-60"
            >
              {approving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Approve LP Token
            </button>
          )}

          {/* Error / Success */}
          {txError && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {txError}
            </div>
          )}

          {status === "success" && hash && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300">
              <Check className="h-3.5 w-3.5 shrink-0" />
              Liquidity removed!{" "}
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

          {/* Submit button */}
          <button
            type="button"
            onClick={handleRemove}
            disabled={
              needsApproval || status === "pending" || status === "approving"
            }
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/50 bg-rose-500/20 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/30 disabled:opacity-50"
          >
            {status === "pending" || status === "approving" ? (
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
        </div>
      </motion.div>
    </div>
  );
}

type PoolGridProps = {
  pools: EonAmmPool[];
  userPositions: EonAmmUserPosition[];
  loading: boolean;
  onRefresh: () => void;
};

const POOLS_PER_PAGE = 6;

export function PoolGrid({
  pools,
  userPositions,
  loading,
  onRefresh,
}: PoolGridProps) {
  const [addLiquidityPool, setAddLiquidityPool] = useState<EonAmmPool | null>(
    null,
  );
  const [removeLiquidityData, setRemoveLiquidityData] = useState<{
    pool: EonAmmPool;
    position: EonAmmUserPosition;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Sort pools: EonSwap-branded pools first, then by TVL
  const sortedPools = useMemo(() => {
    return [...pools].sort((a, b) => {
      const aIsEon = isEonSwapPool(a);
      const bIsEon = isEonSwapPool(b);
      if (aIsEon && !bIsEon) return -1;
      if (!aIsEon && bIsEon) return 1;
      return b.tvlUsd - a.tvlUsd; // Then by TVL descending
    });
  }, [pools]);

  const { totalPages, getPageItems } = usePagination(
    sortedPools,
    POOLS_PER_PAGE,
  );
  const currentPools = getPageItems(currentPage);

  // Reset to page 1 when pools change
  useEffect(() => {
    setCurrentPage(1);
  }, [pools.length]);

  const handleAddSuccess = () => {
    setAddLiquidityPool(null);
    void onRefresh();
  };

  const handleRemoveSuccess = () => {
    setRemoveLiquidityData(null);
    void onRefresh();
  };

  if (loading && pools.length === 0) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-3xl border border-uni-border bg-uni-surface py-16">
        <Loader2 className="h-6 w-6 animate-spin text-uni-pink" />
        <span className="text-neutral-400">Loading pools...</span>
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <div className="rounded-3xl border border-uni-border bg-uni-surface py-16 text-center">
        <Droplets className="mx-auto h-12 w-12 text-neutral-600" />
        <p className="mt-4 text-lg font-medium text-neutral-400">
          No pools found
        </p>
        <p className="mt-1 text-sm text-neutral-500">
          Be the first to add liquidity to Eon AMM
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {currentPools.map((pool, index) => {
          const position = userPositions.find(
            (p) => p.poolAddress.toLowerCase() === pool.address.toLowerCase(),
          );
          return (
            <PoolCard
              key={pool.address}
              pool={pool}
              userPosition={position}
              chainId={base.id}
              index={index}
              onAddLiquidity={setAddLiquidityPool}
              onRemoveLiquidity={(p, pos) =>
                setRemoveLiquidityData({ pool: p, position: pos })
              }
            />
          );
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
    </>
  );
}
