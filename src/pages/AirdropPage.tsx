import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import {
  Gift,
  Shield,
  Clock,
  Users,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Calendar,
  Target,
  Wallet,
  Loader2,
  XCircle,
  PartyPopper,
  ExternalLink,
  Rocket,
  Eye,
  EyeOff,
  TrendingUp,
  Zap,
  Timer,
  RefreshCw,
} from "lucide-react";
import { useAccount } from "wagmi";
import { useAirdropClaim, type AirdropStatus } from "../hooks/useAirdropClaim";
import { useAirdropConfig } from "../hooks/useAirdropConfig";
import {
  type MerkleTreeData,
  type AirdropChainConfig,
} from "../lib/airdropContract";
import { NotifySubscription } from "../components/NotifySubscription";
import { explorerTxUrl } from "../lib/chains";

// Demo data for preview mode
const DEMO_ALLOCATION = 12450.75;
const DEMO_TOTAL_CLAIMED = 3247892;
const DEMO_TOTAL_ALLOCATION = 10000000;
const DEMO_ELIGIBLE_WALLETS = 8432;
const DEMO_CLAIMED_WALLETS = 2891;
const DEMO_CLAIM_DEADLINE = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days from now

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

// Stats generator for both modes
const getStats = (isPreview: boolean) => [
  {
    icon: Coins,
    label: "Total Allocation",
    value: "10M ESTF",
    sub: isPreview
      ? `${((DEMO_TOTAL_CLAIMED / DEMO_TOTAL_ALLOCATION) * 100).toFixed(1)}% claimed`
      : "Community rewards",
    color: "text-uni-pink",
    bg: "bg-uni-pink/10",
    liveValue: isPreview
      ? `${(DEMO_TOTAL_CLAIMED / 1000000).toFixed(2)}M`
      : null,
    liveLabel: isPreview ? "Claimed" : null,
  },
  {
    icon: Users,
    label: "Eligible Wallets",
    value: isPreview ? DEMO_ELIGIBLE_WALLETS.toLocaleString() : "TBA",
    sub: isPreview
      ? `${DEMO_CLAIMED_WALLETS.toLocaleString()} claimed`
      : "Snapshot pending",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    progress: isPreview
      ? (DEMO_CLAIMED_WALLETS / DEMO_ELIGIBLE_WALLETS) * 100
      : null,
  },
  {
    icon: Calendar,
    label: "Claim Period",
    value: isPreview ? "30 Days" : "TBA",
    sub: isPreview ? "Ends May 18, 2026" : "30 days window",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    countdown: isPreview ? true : false,
  },
];

const eligibilityCriteria = [
  {
    title: "Liquidity Providers",
    description: "LP token holders at snapshot",
    icon: Target,
    multiplier: "2x",
  },
  {
    title: "Active Traders",
    description: "Swap activity on EonSwap",
    icon: Sparkles,
    multiplier: "1.5x",
  },
  {
    title: "Community",
    description: "Details to be announced",
    icon: Users,
    multiplier: "1x",
  },
] as const;

const timeline: Array<{
  phase: string;
  title: string;
  status: "upcoming" | "active" | "completed";
  date: string;
}> = [
  { phase: "Phase 1", title: "Snapshot", status: "upcoming", date: "TBA" },
  {
    phase: "Phase 2",
    title: "Eligibility Check",
    status: "upcoming",
    date: "TBA",
  },
  { phase: "Phase 3", title: "Claim Period", status: "upcoming", date: "TBA" },
];

// Preview mode timeline
const previewTimeline: Array<{
  phase: string;
  title: string;
  status: "upcoming" | "active" | "completed";
  date: string;
}> = [
  {
    phase: "Phase 1",
    title: "Snapshot",
    status: "completed",
    date: "Apr 15, 2026",
  },
  {
    phase: "Phase 2",
    title: "Eligibility Check",
    status: "completed",
    date: "Apr 17, 2026",
  },
  {
    phase: "Phase 3",
    title: "Claim Period",
    status: "active",
    date: "Apr 18 - May 18",
  },
];

// Status display config
const statusConfig: Record<
  AirdropStatus,
  { icon: typeof Gift; color: string; text: string }
> = {
  "not-deployed": {
    icon: Sparkles,
    color: "text-amber-400",
    text: "Coming Soon",
  },
  loading: {
    icon: Loader2,
    color: "text-neutral-400",
    text: "Checking eligibility...",
  },
  "not-eligible": {
    icon: XCircle,
    color: "text-red-400",
    text: "Not eligible for this airdrop",
  },
  eligible: {
    icon: Gift,
    color: "text-emerald-400",
    text: "You are eligible!",
  },
  claimed: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    text: "Already claimed",
  },
  ended: { icon: Clock, color: "text-amber-400", text: "Claim period ended" },
  paused: {
    icon: AlertTriangle,
    color: "text-amber-400",
    text: "Claims temporarily paused",
  },
};

// Countdown hook for live preview
function useCountdown(targetTimestamp: number) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const diff = targetTimestamp - Math.floor(Date.now() / 1000);
    return Math.max(0, diff);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = targetTimestamp - Math.floor(Date.now() / 1000);
      setTimeLeft(Math.max(0, diff));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetTimestamp]);

  const days = Math.floor(timeLeft / 86400);
  const hours = Math.floor((timeLeft % 86400) / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  return { days, hours, minutes, seconds, total: timeLeft };
}

// Preview Claim Card - shows what it looks like when live
function PreviewClaimCard() {
  const countdown = useCountdown(DEMO_CLAIM_DEADLINE);
  const [claimStep, setClaimStep] = useState<
    "eligible" | "claiming" | "success"
  >("eligible");

  // Simulate claim animation
  const handleDemoClaim = () => {
    setClaimStep("claiming");
    setTimeout(() => setClaimStep("success"), 2000);
    setTimeout(() => setClaimStep("eligible"), 5000);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-uni-surface via-uni-surface to-emerald-500/5 p-8 md:p-10">
      {/* Live indicator */}
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="text-xs font-medium text-emerald-400">
          LIVE PREVIEW
        </span>
      </div>

      {/* Animated glow */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-emerald-500/20 blur-[80px]" />

      <div className="relative flex flex-col items-center text-center">
        <AnimatePresence mode="wait">
          {claimStep === "eligible" && (
            <motion.div
              key="eligible"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center"
            >
              <div className="mb-4 rounded-full bg-emerald-500/10 p-4">
                <Gift className="h-10 w-10 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-emerald-400">
                You are eligible!
              </h3>

              {/* Allocation Display */}
              <div className="mt-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-uni-pink/5 px-8 py-4 backdrop-blur-sm">
                <p className="text-sm text-neutral-400">Your allocation</p>
                <motion.p
                  className="text-3xl font-bold text-white"
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {DEMO_ALLOCATION.toLocaleString()} ESTF
                </motion.p>
                <div className="mt-2 flex items-center justify-center gap-2 text-xs text-neutral-500">
                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                  <span>≈ $248.50 at current price</span>
                </div>
              </div>

              {/* Breakdown */}
              <div className="mt-4 flex items-center gap-4 text-xs text-neutral-400">
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3 text-uni-pink" />
                  LP: 8,200 ESTF
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-amber-400" />
                  Trading: 4,250 ESTF
                </span>
              </div>

              {/* Demo Claim Button */}
              <button
                type="button"
                onClick={handleDemoClaim}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:shadow-emerald-500/40"
              >
                <Gift className="h-4 w-4" />
                Claim Now
              </button>
            </motion.div>
          )}

          {claimStep === "claiming" && (
            <motion.div
              key="claiming"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center py-4"
            >
              <div className="mb-4 rounded-full bg-uni-pink/10 p-4">
                <Loader2 className="h-10 w-10 animate-spin text-uni-pink" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Claiming tokens...
              </h3>
              <p className="mt-2 text-sm text-neutral-400">
                Confirm in your wallet
              </p>
            </motion.div>
          )}

          {claimStep === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center"
            >
              <motion.div
                className="mb-4 rounded-full bg-emerald-500/20 p-4"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.5 }}
              >
                <PartyPopper className="h-10 w-10 text-emerald-400" />
              </motion.div>
              <h3 className="text-xl font-bold text-emerald-400">
                Successfully Claimed!
              </h3>
              <p className="mt-2 text-lg font-semibold text-white">
                {DEMO_ALLOCATION.toLocaleString()} ESTF
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-uni-pink">
                <span>View transaction</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Countdown */}
        <div className="mt-6 flex items-center gap-1.5 text-xs text-neutral-500">
          <Timer className="h-3.5 w-3.5" />
          <span>
            Ends in {countdown.days}d {countdown.hours}h {countdown.minutes}m{" "}
            {countdown.seconds}s
          </span>
        </div>
      </div>
    </div>
  );
}

function ClaimCard({
  merkleTree,
  chainConfig,
  isConfigLoading,
  isConnected,
}: {
  merkleTree: MerkleTreeData | null;
  chainConfig: AirdropChainConfig | null;
  isConfigLoading: boolean;
  isConnected: boolean;
}) {
  const { chain } = useAccount();
  const chainId = chain?.id ?? 8453;
  const {
    status,
    userClaim,
    claim,
    isClaiming,
    isClaimSuccess,
    claimTxHash,
    claimDeadline,
  } = useAirdropClaim({
    merkleTreeData: merkleTree,
    chainConfig,
    isConfigLoading,
  });

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  // Format deadline
  const deadlineDate = claimDeadline
    ? new Date(claimDeadline * 1000).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "TBA";

  // Coming Soon state - prominent display
  if (status === "not-deployed") {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-uni-pink/20 bg-gradient-to-br from-uni-surface via-uni-surface to-uni-pink/5 p-8 md:p-10">
        {/* Animated glow */}
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-uni-pink/20 blur-[80px]" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-amber-500/10 blur-[60px]" />

        <div className="relative flex flex-col items-center text-center">
          {/* Animated icon */}
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="mb-6 rounded-2xl bg-gradient-to-br from-uni-pink/20 to-amber-500/20 p-5"
          >
            <Rocket className="h-12 w-12 text-uni-pink" />
          </motion.div>

          {/* Coming Soon badge */}
          <motion.div
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mb-4 inline-flex items-center gap-2 rounded-full bg-uni-pink/10 px-4 py-1.5 text-sm font-medium text-uni-pink"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-uni-pink opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-uni-pink" />
            </span>
            Coming Soon
          </motion.div>

          <h3 className="text-2xl font-bold text-white md:text-3xl">
            ESTF Airdrop
          </h3>
          <p className="mt-3 max-w-sm text-neutral-400">
            The airdrop is being prepared. Start using EonSwap now to maximize
            your allocation.
          </p>

          {/* Action buttons */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/swap"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-uni-pink px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-uni-pink-light"
            >
              <Sparkles className="h-4 w-4" />
              Start Trading
            </Link>
            <NotifySubscription compact />
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-uni-border bg-uni-surface/80 p-6 backdrop-blur-sm">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-uni-pink/10 p-4">
            <Wallet className="h-8 w-8 text-uni-pink" />
          </div>
          <h3 className="text-lg font-semibold text-white">Connect Wallet</h3>
          <p className="mt-2 text-sm text-neutral-400">
            Connect your wallet to check eligibility
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-uni-border bg-uni-surface/80 p-6 backdrop-blur-sm">
      <div className="flex flex-col items-center text-center">
        {/* Status Icon */}
        <div className={`mb-4 rounded-full bg-white/5 p-4 ${config.color}`}>
          <StatusIcon
            className={`h-8 w-8 ${status === "loading" ? "animate-spin" : ""}`}
          />
        </div>

        {/* Status Text */}
        <h3 className={`text-lg font-semibold ${config.color}`}>
          {config.text}
        </h3>

        {/* Claim Amount (if eligible) */}
        {(status === "eligible" || status === "claimed") && userClaim && (
          <div className="mt-4 rounded-xl bg-uni-pink/10 px-6 py-3">
            <p className="text-sm text-neutral-400">Your allocation</p>
            <p className="text-2xl font-bold text-white">
              {userClaim.amountReadable}
            </p>
          </div>
        )}

        {/* Claim Button */}
        {status === "eligible" && (
          <button
            type="button"
            onClick={claim}
            disabled={isClaiming}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-uni-pink px-8 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-uni-pink-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isClaiming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Claiming...
              </>
            ) : (
              <>
                <Gift className="h-4 w-4" />
                Claim Now
              </>
            )}
          </button>
        )}

        {/* Success State */}
        {status === "claimed" &&
          isClaimSuccess &&
          claimTxHash &&
          (() => {
            const txUrl = explorerTxUrl(chainId, claimTxHash);
            return txUrl ? (
              <div className="mt-4">
                <div className="mb-2 inline-flex items-center gap-2 text-emerald-400">
                  <PartyPopper className="h-5 w-5" />
                  <span className="font-medium">Claimed successfully!</span>
                </div>
                <a
                  href={txUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-sm text-uni-pink hover:underline"
                >
                  View transaction
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : null;
          })()}

        {/* Deadline info */}
        {claimDeadline && status !== "ended" && (
          <p className="mt-4 text-xs text-neutral-500">
            Claim deadline: {deadlineDate}
          </p>
        )}

        {/* Not eligible info */}
        {status === "not-eligible" && (
          <p className="mt-4 max-w-xs text-sm text-neutral-400">
            This wallet was not included in the snapshot. Try connecting a
            different wallet.
          </p>
        )}
      </div>
    </div>
  );
}

export function AirdropPage() {
  const prefersReducedMotion = useReducedMotion();
  const { isConnected, address: _address } = useAccount();

  // Preview mode state
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Fetch airdrop config and merkle tree automatically
  const {
    isLoading: isConfigLoading,
    chainConfig,
    merkleTree,
    refetch: refetchConfig,
  } = useAirdropConfig();

  // Dynamic stats based on mode and live data
  const stats = useMemo(() => {
    if (isPreviewMode) {
      return getStats(true);
    }
    // Use real data from chainConfig when available
    if (chainConfig?.status === "live") {
      return [
        {
          icon: Coins,
          label: "Total Allocation",
          value: `${(Number(chainConfig.totalAllocation) / 1000000).toFixed(0)}M ESTF`,
          sub: chainConfig.claimedAmount
            ? `${((Number(chainConfig.claimedAmount) / Number(chainConfig.totalAllocation)) * 100).toFixed(1)}% claimed`
            : "Community rewards",
          color: "text-uni-pink",
          bg: "bg-uni-pink/10",
        },
        {
          icon: Users,
          label: "Eligible Wallets",
          value:
            chainConfig.eligibleWallets?.toLocaleString() ??
            merkleTree?.totalRecipients.toLocaleString() ??
            "TBA",
          sub: chainConfig.claimedWallets
            ? `${chainConfig.claimedWallets.toLocaleString()} claimed`
            : "Snapshot complete",
          color: "text-emerald-400",
          bg: "bg-emerald-500/10",
          progress:
            chainConfig.claimedWallets && chainConfig.eligibleWallets
              ? (chainConfig.claimedWallets / chainConfig.eligibleWallets) * 100
              : null,
        },
        {
          icon: Calendar,
          label: "Claim Period",
          value: chainConfig.claimDeadline
            ? `${Math.ceil((chainConfig.claimDeadline - Date.now() / 1000) / 86400)} Days Left`
            : "30 Days",
          sub: chainConfig.claimDeadline
            ? `Ends ${new Date(chainConfig.claimDeadline * 1000).toLocaleDateString()}`
            : "30 days window",
          color: "text-amber-400",
          bg: "bg-amber-500/10",
          countdown: Boolean(chainConfig.claimDeadline),
        },
      ];
    }
    return getStats(false);
  }, [isPreviewMode, chainConfig, merkleTree]);

  // Determine if airdrop is live
  const isLive = chainConfig?.status === "live";

  return (
    <div className="relative min-w-0 max-w-full overflow-hidden">
      {/* Gradient backdrop */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className={`absolute inset-0 ${
            isPreviewMode || isLive
              ? "bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.15),transparent)]"
              : "bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,0,122,0.15),transparent)]"
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-uni-bg" />
        <div
          className={`absolute -left-32 top-[-10%] h-[min(420px,45vw)] w-[min(420px,45vw)] rounded-full blur-[100px] ${
            isPreviewMode || isLive ? "bg-emerald-500/10" : "bg-uni-pink/10"
          }`}
          style={{
            animation: prefersReducedMotion
              ? "none"
              : "eon-gradient-drift 22s ease-in-out infinite",
          }}
        />
        <div
          className="absolute -right-24 top-[30%] h-[min(360px,40vw)] w-[min(360px,40vw)] rounded-full bg-amber-500/[0.08] blur-[90px]"
          style={{
            animation: prefersReducedMotion
              ? "none"
              : "eon-gradient-drift 28s ease-in-out infinite reverse",
          }}
        />
      </div>

      {/* Main Content */}
      <section className="relative mx-auto max-w-5xl px-4 py-12 md:px-6 md:py-20">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            show: { transition: { staggerChildren: 0.1 } },
          }}
        >
          {/* Header Badge + Preview Toggle */}
          <motion.div
            custom={0}
            variants={fadeUp}
            className="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium ${
                isLive
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-uni-pink/20 bg-uni-pink/5 text-uni-pink"
              }`}
            >
              {isLive ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  LIVE - Claim Now
                </>
              ) : (
                <>
                  <Shield className="h-3.5 w-3.5" />
                  Official EonSwap Airdrop
                </>
              )}
            </span>

            {/* Preview Mode Toggle - only show when not live */}
            {!isLive && (
              <button
                type="button"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition ${
                  isPreviewMode
                    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border border-uni-border bg-uni-surface text-neutral-400 hover:border-uni-pink/30 hover:text-neutral-300"
                }`}
              >
                {isPreviewMode ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    Exit Preview
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    Preview Live Mode
                  </>
                )}
              </button>
            )}

            {/* Refresh button */}
            <button
              type="button"
              onClick={() => refetchConfig()}
              disabled={isConfigLoading}
              className="inline-flex items-center gap-1.5 rounded-full border border-uni-border bg-uni-surface px-3 py-1.5 text-xs text-neutral-400 transition hover:border-uni-pink/30 hover:text-neutral-300 disabled:opacity-50"
              title="Refresh config"
            >
              <RefreshCw
                className={`h-3 w-3 ${isConfigLoading ? "animate-spin" : ""}`}
              />
            </button>
          </motion.div>

          {/* Main Claim Card */}
          <motion.div custom={1} variants={fadeUp} className="mx-auto max-w-xl">
            <AnimatePresence mode="wait">
              {isPreviewMode ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <PreviewClaimCard />
                </motion.div>
              ) : (
                <motion.div
                  key="coming-soon"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <ClaimCard
                    merkleTree={merkleTree}
                    chainConfig={chainConfig}
                    isConfigLoading={isConfigLoading}
                    isConnected={isConnected}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-3"
          >
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className={`group rounded-2xl border bg-uni-surface/60 p-5 backdrop-blur-sm transition ${
                    isPreviewMode || isLive
                      ? "border-emerald-500/20 hover:border-emerald-500/40"
                      : "border-uni-border hover:border-uni-pink/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-xl ${stat.bg} p-2.5`}>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-neutral-500">
                        {stat.label}
                      </p>
                      <p className="mt-0.5 text-xl font-bold text-white">
                        {stat.value}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {stat.sub}
                      </p>
                      {/* Progress bar for eligible wallets */}
                      {"progress" in stat && stat.progress !== null && (
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                          <motion.div
                            className="h-full rounded-full bg-emerald-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${stat.progress}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>

          {/* Eligibility Section */}
          <motion.div custom={3} variants={fadeUp} className="mt-16">
            <h2 className="mb-6 text-center text-lg font-semibold text-white">
              Eligibility & Multipliers
            </h2>
            <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-3">
              {eligibilityCriteria.map((criteria) => {
                const Icon = criteria.icon;
                return (
                  <div
                    key={criteria.title}
                    className="group relative rounded-2xl border border-uni-border bg-uni-surface/60 p-5 transition hover:border-uni-pink/30"
                  >
                    {/* Multiplier badge */}
                    <div className="absolute right-4 top-4">
                      <span className="rounded-full bg-uni-pink/10 px-2 py-0.5 text-xs font-bold text-uni-pink">
                        {criteria.multiplier}
                      </span>
                    </div>
                    <div className="mb-3 inline-flex rounded-xl bg-uni-pink/10 p-2.5">
                      <Icon className="h-5 w-5 text-uni-pink" />
                    </div>
                    <h3 className="font-semibold text-white">
                      {criteria.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-neutral-400">
                      {criteria.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Timeline */}
          <motion.div custom={4} variants={fadeUp} className="mt-16">
            <h2 className="mb-6 text-center text-lg font-semibold text-white">
              Timeline
            </h2>
            <div
              className={`mx-auto max-w-2xl rounded-2xl border bg-uni-surface/60 p-6 ${
                isPreviewMode || isLive
                  ? "border-emerald-500/20"
                  : "border-uni-border"
              }`}
            >
              <div className="flex flex-col gap-0 sm:flex-row sm:items-center sm:justify-between">
                {(isPreviewMode || isLive ? previewTimeline : timeline).map(
                  (item, i, arr) => (
                    <div
                      key={item.phase}
                      className="flex items-center gap-3 py-3 sm:flex-1 sm:flex-col sm:py-0 sm:text-center"
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          item.status === "completed"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : item.status === "active"
                              ? "bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/30 animate-pulse"
                              : "bg-neutral-800 text-neutral-500"
                        }`}
                      >
                        {item.status === "completed" ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : item.status === "active" ? (
                          <Zap className="h-5 w-5" />
                        ) : (
                          <span className="text-sm font-semibold">{i + 1}</span>
                        )}
                      </div>
                      <div className="sm:mt-3">
                        <p
                          className={`font-semibold ${item.status === "active" ? "text-emerald-400" : "text-white"}`}
                        >
                          {item.title}
                        </p>
                        <p
                          className={`text-xs ${item.status === "active" ? "text-emerald-400/70" : "text-neutral-500"}`}
                        >
                          {item.date}
                        </p>
                      </div>
                      {/* Connector line */}
                      {i < arr.length - 1 && (
                        <div
                          className={`hidden h-px flex-1 sm:block ${
                            item.status === "completed"
                              ? "bg-emerald-500/30"
                              : "bg-uni-border"
                          }`}
                        />
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>
          </motion.div>

          {/* Security Notice - Compact */}
          <motion.div custom={5} variants={fadeUp} className="mt-12">
            <div className="mx-auto max-w-2xl rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div className="min-w-0">
                  <p className="text-sm text-amber-200/80">
                    <span className="font-medium text-amber-300">
                      Security:
                    </span>{" "}
                    Never share your seed phrase. Official announcements only
                    via{" "}
                    <a
                      href="https://twitter.com/EonSwap"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-amber-300 underline underline-offset-2 hover:text-amber-200"
                    >
                      @EonSwap
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
