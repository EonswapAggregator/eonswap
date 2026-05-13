import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { useCallback, useState } from "react";
import {
  Sprout,
  RefreshCw,
  Pause,
  Play,
  Coins,
  Shield,
  ArrowRight,
  Wallet,
} from "lucide-react";
import { formatUnits, type Address } from "viem";
import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
} from "wagmi";
import { base } from "viem/chains";
import { toast } from "sonner";

import { FarmGrid } from "../components/farm/FarmGrid";
import { useEonFarm } from "../hooks/useEonFarm";
import { tokenByAddress } from "../lib/tokens";
import { sendTxEventToRelay } from "../lib/txEvents";
import { useEonSwapStore } from "../store/useEonSwapStore";

const CHAIN_ID = base.id;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.06 * i,
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

function formatEonPerDay(eonPerSecond: bigint): string {
  const perDay = Number(formatUnits(eonPerSecond * 86400n, 18));
  if (perDay < 1) return perDay.toFixed(4);
  if (perDay < 1000) return perDay.toFixed(2);
  if (perDay < 1_000_000) return (perDay / 1000).toFixed(2) + "K";
  return (perDay / 1_000_000).toFixed(2) + "M";
}

export function FarmPage() {
  const prefersReducedMotion = useReducedMotion();
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient({ chainId: CHAIN_ID });
  const {
    pools,
    userPositions,
    masterChefState,
    loading,
    error,
    refresh,
    lastUpdated,
    deposit,
    withdraw,
    harvest,
    approve,
    getAllowance,
    getLpBalance,
  } = useEonFarm(CHAIN_ID);

  const [pendingTxHash, setPendingTxHash] = useState<
    `0x${string}` | undefined
  >();
  // Track transaction for potential UI feedback
  useWaitForTransactionReceipt({ hash: pendingTxHash });

  const addActivity = useEonSwapStore((s) => s.addActivity);
  const patchActivity = useEonSwapStore((s) => s.patchActivity);

  // Wrapper functions that handle tx state
  const handleDeposit = useCallback(
    async (pid: number, amount: bigint) => {
      const pool = pools.find((p) => p.pid === pid);
      const poolName = pool
        ? `${pool.lpSymbol0}/${pool.lpSymbol1}`
        : `Pool #${pid}`;
      const amountStr = `${formatUnits(amount, 18)} LP`;
      const summary = `Stake ${amountStr} in ${poolName}`;
      const activityId = crypto.randomUUID();

      addActivity({
        id: activityId,
        kind: "farm_deposit",
        status: "pending",
        summary,
        chainId: CHAIN_ID,
        from: userAddress,
      });

      const hash = await deposit(pid, amount);
      setPendingTxHash(hash);
      patchActivity(activityId, { txHash: hash });

      const toastId = toast.loading("Staking...", {
        description: `${amountStr} in ${poolName}`,
      });
      // Wait for confirmation and send notification
      if (publicClient) {
        publicClient
          .waitForTransactionReceipt({ hash })
          .then((receipt) => {
            if (receipt.status === "success") {
              void sendTxEventToRelay({
                kind: "farm_deposit",
                status: "success",
                txHash: hash,
                chainId: CHAIN_ID,
                wallet: userAddress,
                poolName,
                amount: amountStr,
                at: Date.now(),
              });
              patchActivity(activityId, {
                status: "success",
                blockNumber: Number(receipt.blockNumber),
              });
              toast.success("Staked Successfully!", {
                id: toastId,
                description: `${amountStr} staked in ${poolName}`,
              });
            } else {
              patchActivity(activityId, { status: "failed" });
              toast.error("Stake Failed", {
                id: toastId,
                description: "Transaction reverted on-chain",
              });
            }
            setPendingTxHash(undefined);
            void refresh();
          })
          .catch(() => {
            patchActivity(activityId, { status: "failed" });
            setPendingTxHash(undefined);
            toast.error("Stake Failed", {
              id: toastId,
              description: "Transaction failed",
            });
          });
      } else {
        setTimeout(() => {
          setPendingTxHash(undefined);
          void refresh();
        }, 3000);
      }
    },
    [
      deposit,
      refresh,
      publicClient,
      pools,
      userAddress,
      addActivity,
      patchActivity,
    ],
  );

  const handleWithdraw = useCallback(
    async (pid: number, amount: bigint) => {
      const pool = pools.find((p) => p.pid === pid);
      const poolName = pool
        ? `${pool.lpSymbol0}/${pool.lpSymbol1}`
        : `Pool #${pid}`;
      const amountStr = `${formatUnits(amount, 18)} LP`;
      const summary = `Unstake ${amountStr} from ${poolName}`;
      const activityId = crypto.randomUUID();

      addActivity({
        id: activityId,
        kind: "farm_withdraw",
        status: "pending",
        summary,
        chainId: CHAIN_ID,
        from: userAddress,
      });

      const hash = await withdraw(pid, amount);
      setPendingTxHash(hash);
      patchActivity(activityId, { txHash: hash });

      const toastId = toast.loading("Unstaking...", {
        description: `${amountStr} from ${poolName}`,
      });
      if (publicClient) {
        publicClient
          .waitForTransactionReceipt({ hash })
          .then((receipt) => {
            if (receipt.status === "success") {
              void sendTxEventToRelay({
                kind: "farm_withdraw",
                status: "success",
                txHash: hash,
                chainId: CHAIN_ID,
                wallet: userAddress,
                poolName,
                amount: amountStr,
                at: Date.now(),
              });
              patchActivity(activityId, {
                status: "success",
                blockNumber: Number(receipt.blockNumber),
              });
              toast.success("Unstaked Successfully!", {
                id: toastId,
                description: `${amountStr} withdrawn from ${poolName}`,
              });
            } else {
              patchActivity(activityId, { status: "failed" });
              toast.error("Unstake Failed", {
                id: toastId,
                description: "Transaction reverted on-chain",
              });
            }
            setPendingTxHash(undefined);
            void refresh();
          })
          .catch(() => {
            patchActivity(activityId, { status: "failed" });
            setPendingTxHash(undefined);
            toast.error("Unstake Failed", {
              id: toastId,
              description: "Transaction failed",
            });
          });
      } else {
        setTimeout(() => {
          setPendingTxHash(undefined);
          void refresh();
        }, 3000);
      }
    },
    [
      withdraw,
      refresh,
      publicClient,
      pools,
      userAddress,
      addActivity,
      patchActivity,
    ],
  );

  const handleHarvest = useCallback(
    async (pid: number) => {
      const pool = pools.find((p) => p.pid === pid);
      const userPos = userPositions.find((p) => p.pid === pid);
      const poolName = pool
        ? `${pool.lpSymbol0}/${pool.lpSymbol1}`
        : `Pool #${pid}`;
      const rewardsStr = userPos?.pendingEon
        ? `${formatUnits(userPos.pendingEon, pool?.rewardDecimals ?? 18)} ${pool?.rewardSymbol ?? "Rewards"}`
        : "Rewards";
      const summary = `Harvest ${rewardsStr} from ${poolName}`;
      const activityId = crypto.randomUUID();

      addActivity({
        id: activityId,
        kind: "farm_harvest",
        status: "pending",
        summary,
        chainId: CHAIN_ID,
        from: userAddress,
      });

      const hash = await harvest(pid);
      setPendingTxHash(hash);
      patchActivity(activityId, { txHash: hash });

      const toastId = toast.loading("Harvesting...", {
        description: `${rewardsStr} from ${poolName}`,
      });
      if (publicClient) {
        publicClient
          .waitForTransactionReceipt({ hash })
          .then((receipt) => {
            if (receipt.status === "success") {
              void sendTxEventToRelay({
                kind: "farm_harvest",
                status: "success",
                txHash: hash,
                chainId: CHAIN_ID,
                wallet: userAddress,
                poolName,
                rewards: rewardsStr,
                at: Date.now(),
              });
              patchActivity(activityId, {
                status: "success",
                blockNumber: Number(receipt.blockNumber),
              });
              toast.success("Rewards Harvested!", {
                id: toastId,
                description: `${rewardsStr} claimed from ${poolName}`,
              });
            } else {
              patchActivity(activityId, { status: "failed" });
              toast.error("Harvest Failed", {
                id: toastId,
                description: "Transaction reverted on-chain",
              });
            }
            setPendingTxHash(undefined);
            void refresh();
          })
          .catch(() => {
            patchActivity(activityId, { status: "failed" });
            setPendingTxHash(undefined);
            toast.error("Harvest Failed", {
              id: toastId,
              description: "Transaction failed",
            });
          });
      } else {
        setTimeout(() => {
          setPendingTxHash(undefined);
          void refresh();
        }, 3000);
      }
    },
    [
      harvest,
      refresh,
      publicClient,
      pools,
      userPositions,
      userAddress,
      addActivity,
      patchActivity,
    ],
  );

  const handleApprove = useCallback(
    async (lpToken: Address, amount: bigint) => {
      const hash = await approve(lpToken, amount);
      setPendingTxHash(hash);
      setTimeout(() => {
        setPendingTxHash(undefined);
      }, 3000);
    },
    [approve],
  );

  // Calculate total pending rewards for user
  const totalPendingEon = userPositions.reduce(
    (sum, pos) => sum + pos.pendingEon,
    0n,
  );
  const rewardToken = masterChefState
    ? tokenByAddress(CHAIN_ID, masterChefState.eonToken)
    : undefined;
  const rewardSymbol = rewardToken?.symbol ?? "rewards";

  return (
    <div className="relative min-w-0 max-w-full overflow-hidden">
      {/* Gradient backdrop - matching liquidity page */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,0,122,0.12),transparent)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-uni-bg" />
        <div
          className="absolute -left-32 top-[-10%] h-[min(420px,45vw)] w-[min(420px,45vw)] rounded-full bg-uni-pink/10 blur-[100px]"
          style={{
            animation: prefersReducedMotion
              ? "none"
              : "eon-gradient-drift 22s ease-in-out infinite",
          }}
        />
        <div
          className="absolute -right-24 top-[30%] h-[min(360px,40vw)] w-[min(360px,40vw)] rounded-full bg-uni-purple/[0.08] blur-[90px]"
          style={{
            animation: prefersReducedMotion
              ? "none"
              : "eon-gradient-drift 28s ease-in-out infinite reverse",
          }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-4 pb-8 pt-10 md:px-6 md:pb-12 md:pt-14">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            show: { transition: { staggerChildren: 0.08 } },
          }}
          className="text-center"
        >
          <motion.div
            custom={0}
            variants={fadeUp}
            className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-uni-border bg-uni-surface px-4 py-2 text-xs font-medium uppercase tracking-widest text-neutral-400">
              <Sprout className="h-3.5 w-3.5 text-uni-pink" />
              Yield Farming
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
              <Shield className="h-3.5 w-3.5 text-uni-pink/80" aria-hidden />
              Powered by Eon AMM
            </span>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            className="text-balance text-[clamp(1.75rem,8vw,2.75rem)] font-semibold leading-[1.15] tracking-tight text-white"
          >
            <span className="block">Stake LP tokens,</span>
            <span className="mt-1 block text-uni-pink">earn {rewardSymbol} rewards.</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-neutral-400 md:text-lg"
          >
            Stake your LP tokens into farm pools to earn {rewardSymbol} emissions. The
            longer you stake, the more rewards you accumulate.
          </motion.p>

          <motion.div
            custom={3}
            variants={fadeUp}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              to="/liquidity"
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-uni-pink px-6 py-3 text-sm font-semibold text-white shadow-glow transition duration-300 hover:bg-uni-pink-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uni-pink/70 focus-visible:ring-offset-2 focus-visible:ring-offset-uni-bg"
            >
              <span className="relative flex items-center gap-2">
                Get LP Tokens
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
            <button
              type="button"
              onClick={() => void refresh()}
              aria-busy={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-uni-border bg-transparent px-6 py-3 text-sm font-medium text-white transition hover:bg-uni-surface"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="relative mx-auto max-w-5xl px-4 pb-10 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="relative"
        >
          <div
            className="absolute -inset-px rounded-[1.25rem] bg-gradient-to-b from-white/[0.06] via-uni-pink/10 to-transparent opacity-45 blur-sm"
            aria-hidden
          />
          <div className="relative overflow-hidden rounded-3xl border border-uni-border bg-uni-surface shadow-uni-card">
            <div className="grid divide-y divide-uni-border sm:grid-cols-4 sm:divide-x sm:divide-y-0">
              {/* Active Farms */}
              <div className="group px-6 py-6 text-center transition duration-200 hover:bg-uni-surface-2">
                <div className="mb-3 flex items-center justify-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-uni-pink/[0.1] ring-1 ring-uni-pink/20">
                    <Sprout className="h-5 w-5 text-uni-pink" aria-hidden />
                  </div>
                </div>
                <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
                  Active Farms
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
                  {loading ? "..." : pools.length}
                </p>
              </div>

              {/* Rewards / Day */}
              <div className="group px-6 py-6 text-center transition duration-200 hover:bg-uni-surface-2">
                <div className="mb-3 flex items-center justify-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-uni-pink/[0.1] ring-1 ring-uni-pink/20">
                    <Coins className="h-5 w-5 text-uni-pink" aria-hidden />
                  </div>
                </div>
                <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
                  {rewardSymbol} / Day
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
                  {loading
                    ? "..."
                    : masterChefState
                      ? formatEonPerDay(masterChefState.eonPerSecond)
                      : "—"}
                </p>
              </div>

              {/* Status */}
              <div className="group px-6 py-6 text-center transition duration-200 hover:bg-uni-surface-2">
                <div className="mb-3 flex items-center justify-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-uni-pink/[0.1] ring-1 ring-uni-pink/20">
                    {masterChefState?.paused ? (
                      <Pause className="h-5 w-5 text-amber-400" aria-hidden />
                    ) : (
                      <Play className="h-5 w-5 text-uni-pink" aria-hidden />
                    )}
                  </div>
                </div>
                <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
                  Status
                </p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {loading ? (
                    "..."
                  ) : masterChefState?.paused ? (
                    <span className="text-amber-400">Paused</span>
                  ) : (
                    <span className="text-uni-pink">Active</span>
                  )}
                </p>
              </div>

              {/* Your Pending */}
              <div className="group px-6 py-6 text-center transition duration-200 hover:bg-uni-surface-2">
                <div className="mb-3 flex items-center justify-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-uni-pink/[0.1] ring-1 ring-uni-pink/20">
                    <Wallet className="h-5 w-5 text-uni-pink" aria-hidden />
                  </div>
                </div>
                <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
                  Your Pending
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
                  {loading
                    ? "..."
                    : userAddress
                      ? `${Number(formatUnits(totalPendingEon, rewardToken?.decimals ?? 18)).toFixed(4)} ${rewardSymbol}`
                      : "—"}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Farm Grid Section */}
      <section className="relative mx-auto max-w-7xl px-4 pb-16 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
        >
          <FarmGrid
            pools={pools}
            userPositions={userPositions}
            chainId={CHAIN_ID}
            loading={loading}
            error={error}
            onDeposit={handleDeposit}
            onWithdraw={handleWithdraw}
            onHarvest={handleHarvest}
            onApprove={handleApprove}
            getAllowance={getAllowance}
            getLpBalance={getLpBalance}
          />
        </motion.div>

        {/* Last updated */}
        {lastUpdated > 0 && (
          <p className="mt-6 text-center text-xs text-neutral-600">
            Last updated: {new Date(lastUpdated).toLocaleTimeString()}
          </p>
        )}
      </section>
    </div>
  );
}
