import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useEffect, useCallback } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
} from "wagmi";
import { fetchRelayActivities } from "../lib/activityRelay";
import { getMonitorRelayBaseUrl } from "../lib/monitorRelayUrl";
import { eonChains } from "../lib/chains";
import { EON_BASE_MAINNET } from "../lib/eonBaseMainnet";
import { truncateAddress } from "../lib/format";
import {
  type ActivityItem,
  type TxStatus,
  useEonSwapStore,
} from "../store/useEonSwapStore";
import { useAirdropConfig } from "../hooks/useAirdropConfig";
import { toast } from "sonner";
import {
  Coins,
  Users,
  AlertTriangle,
  Activity,
  RefreshCw,
  Clock,
  CheckCircle2,
  Pause,
  Play,
  ExternalLink,
  BarChart3,
  Wallet,
  Shield,
  Settings,
  Zap,
  Gift,
  TrendingUp,
  Database,
  Lock,
  Unlock,
  Calendar,
  Download,
  Bot,
  Server,
  Layers,
  FileText,
  ArrowRight,
  Copy,
} from "lucide-react";

// Admin wallet addresses
const ADMIN_WALLETS = [
  "0x114629C43Fa2528E5295b2982765733Acf3aCadA",
  "0xfa9bac9098c235b56d9ec0d9527d4ba0392e4b3e",
].map((a) => a.toLowerCase());
// Admin-specific ABI for airdrop contract
const AIRDROP_ADMIN_ABI = [
  {
    name: "emergencyMode",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "antiBotEnabled",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "claimDeadline",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "antiBotUntil",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "token",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "merkleRoot",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    name: "setEmergencyMode",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "enabled_", type: "bool" }],
    outputs: [],
  },
  {
    name: "setAntiBotEnabled",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "enabled_", type: "bool" }],
    outputs: [],
  },
  {
    name: "setClaimDeadline",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "deadline_", type: "uint256" }],
    outputs: [],
  },
  {
    name: "withdrawRemainingTokens",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "to_", type: "address" }],
    outputs: [],
  },
  // Event for realtime tracking
  {
    name: "Claimed",
    type: "event",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

// Helper functions
function parseRelayActivities(raw: unknown[]): ActivityItem[] {
  const out: ActivityItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = String(o.id ?? "");
    const status = o.status;
    if (status !== "pending" && status !== "success" && status !== "failed")
      continue;
    const kind = "swap";
    const createdAt = Number(o.createdAt);
    if (!Number.isFinite(createdAt)) continue;
    out.push({
      id,
      kind,
      status,
      createdAt,
      summary: String(o.summary ?? ""),
      chainId: Number(o.chainId) || 0,
      txHash:
        typeof o.txHash === "string" && /^0x[a-fA-F0-9]{64}$/.test(o.txHash)
          ? (o.txHash as `0x${string}`)
          : undefined,
      from:
        typeof o.from === "string" && /^0x[a-fA-F0-9]{40}$/.test(o.from)
          ? (o.from as `0x${string}`)
          : undefined,
      blockNumber:
        o.blockNumber != null && Number.isFinite(Number(o.blockNumber))
          ? Number(o.blockNumber)
          : undefined,
    });
  }
  return out;
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString();
}

function chainName(chainId: number): string {
  return eonChains.find((c) => c.id === chainId)?.name ?? `Chain ${chainId}`;
}

function parseAmountAndToken(summary: string, prefix: "Swap") {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = summary.match(
    new RegExp(`^${escaped}\\s+([\\d.,]+)\\s+([A-Za-z0-9._-]+)`),
  );
  if (!match) return null;
  const amount = Number.parseFloat(match[1].replace(/,/g, ""));
  const token = match[2];
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount, token };
}

// ============ REUSABLE COMPONENTS ============

function AdminStatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "pink",
  trend,
}: {
  icon: typeof Coins;
  label: string;
  value: string | number;
  sub?: string;
  accent?: "pink" | "green" | "amber" | "blue" | "purple";
  trend?: number;
}) {
  const accentConfig = {
    pink: {
      bg: "from-uni-pink/20 via-uni-pink/10 to-transparent",
      border: "border-uni-pink/40",
      icon: "bg-uni-pink/20 text-uni-pink",
      glow: "shadow-[0_0_30px_-10px_rgba(255,0,122,0.3)]",
    },
    green: {
      bg: "from-emerald-500/20 via-emerald-500/10 to-transparent",
      border: "border-emerald-500/40",
      icon: "bg-emerald-500/20 text-emerald-400",
      glow: "shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)]",
    },
    amber: {
      bg: "from-amber-500/20 via-amber-500/10 to-transparent",
      border: "border-amber-500/40",
      icon: "bg-amber-500/20 text-amber-400",
      glow: "shadow-[0_0_30px_-10px_rgba(245,158,11,0.3)]",
    },
    blue: {
      bg: "from-blue-500/20 via-blue-500/10 to-transparent",
      border: "border-blue-500/40",
      icon: "bg-blue-500/20 text-blue-400",
      glow: "shadow-[0_0_30px_-10px_rgba(59,130,246,0.3)]",
    },
    purple: {
      bg: "from-purple-500/20 via-purple-500/10 to-transparent",
      border: "border-purple-500/40",
      icon: "bg-purple-500/20 text-purple-400",
      glow: "shadow-[0_0_30px_-10px_rgba(168,85,247,0.3)]",
    },
  };

  const config = accentConfig[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`group relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 backdrop-blur-xl ${config.bg} ${config.border} ${config.glow} hover:border-opacity-60`}
    >
      {/* Subtle shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

      <div className="relative flex items-start justify-between">
        <div className={`rounded-lg p-2 ${config.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
        {trend !== undefined && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${trend >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}
          >
            <TrendingUp
              className={`h-2.5 w-2.5 ${trend < 0 ? "rotate-180" : ""}`}
            />
            {trend >= 0 ? "+" : ""}
            {trend.toFixed(1)}%
          </motion.span>
        )}
      </div>
      <p className="relative mt-3 text-xl font-bold tracking-tight text-white">
        {value}
      </p>
      <p className="relative text-[11px] font-medium text-neutral-300">
        {label}
      </p>
      {sub && (
        <p className="relative mt-1 text-[10px] text-neutral-400">{sub}</p>
      )}
    </motion.div>
  );
}

function AdminButton({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  icon: Icon,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  icon?: typeof Play;
}) {
  const variants = {
    primary:
      "bg-gradient-to-r from-uni-pink to-uni-pink-light text-white hover:shadow-glow",
    secondary:
      "border border-uni-border bg-uni-surface text-white/80 hover:border-uni-pink/30 hover:text-white",
    danger:
      "bg-gradient-to-r from-rose-600 to-rose-500 text-white hover:from-rose-500 hover:to-rose-400",
    success:
      "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400",
  };
  const sizes = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-3 py-2 text-xs",
    lg: "px-5 py-2.5 text-sm",
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]}`}
    >
      {loading ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : Icon ? (
        <Icon className="h-4 w-4" />
      ) : null}
      {children}
    </motion.button>
  );
}

function AdminCard({
  title,
  icon: Icon,
  children,
  accent = "default",
  collapsible = false,
}: {
  title: string;
  icon?: typeof Settings;
  children: React.ReactNode;
  accent?: "default" | "pink" | "danger" | "success";
  collapsible?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const accentConfig = {
    default: {
      border: "border-white/10",
      header: "from-white/5 to-transparent",
      icon: "bg-uni-pink/10 text-uni-pink",
    },
    pink: {
      border: "border-uni-pink/30",
      header: "from-uni-pink/10 to-transparent",
      icon: "bg-uni-pink/20 text-uni-pink",
    },
    danger: {
      border: "border-rose-500/30",
      header: "from-rose-500/10 to-transparent",
      icon: "bg-rose-500/20 text-rose-400",
    },
    success: {
      border: "border-emerald-500/30",
      header: "from-emerald-500/10 to-transparent",
      icon: "bg-emerald-500/20 text-emerald-400",
    },
  };

  const config = accentConfig[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`overflow-hidden rounded-xl border bg-uni-surface/80 backdrop-blur-xl ${config.border}`}
    >
      <button
        type="button"
        onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
        className={`flex w-full items-center gap-2.5 bg-gradient-to-r px-4 py-3 ${config.header} ${collapsible ? "cursor-pointer hover:bg-white/5" : "cursor-default"}`}
      >
        {Icon && (
          <div className={`rounded-lg p-2 ${config.icon}`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
        <h3 className="flex-1 text-left text-sm font-semibold text-white">
          {title}
        </h3>
        {collapsible && (
          <motion.div
            animate={{ rotate: isCollapsed ? 0 : 180 }}
            className="text-neutral-400"
          >
            <ArrowRight className="h-3.5 w-3.5 rotate-90" />
          </motion.div>
        )}
      </button>
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="border-t border-white/5 p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Activity;
  label: string;
  badge?: number;
}) {
  return (
    <motion.button
      whileHover={{ scale: active ? 1 : 1.02 }}
      whileTap={{ scale: 0.98 }}
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all duration-200 ${
        active
          ? "bg-gradient-to-r from-uni-pink to-uni-pink-light text-white shadow-[0_0_15px_-5px_rgba(255,0,122,0.5)]"
          : "text-white/60 hover:bg-white/5 hover:text-white"
      }`}
    >
      {active && (
        <motion.div
          layoutId="activeTabBg"
          className="absolute inset-0 rounded-lg bg-gradient-to-r from-uni-pink to-uni-pink-light"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <span className="relative flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-lg"
        >
          {badge > 99 ? "99+" : badge}
        </motion.span>
      )}
    </motion.button>
  );
}

// ============ AIRDROP TAB ============

type ClaimStatsData = {
  totalClaimed: string;
  claimedWallets: number;
  recentClaims: Array<{
    account: string;
    amount: string;
    timestamp: number;
  }>;
  lastUpdated: string;
};

function AirdropTab() {
  const { address } = useAccount();
  const {
    isLoading: isConfigLoading,
    chainConfig,
    refetch: refetchConfig,
  } = useAirdropConfig();
  const [claimStats, setClaimStats] = useState<ClaimStatsData | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [newDeadline, setNewDeadline] = useState("");

  const contractAddress = chainConfig?.contractAddress as
    | `0x${string}`
    | undefined;
  const isLive = chainConfig?.status === "live";

  // Contract reads
  const { data: emergencyMode, refetch: refetchEmergency } = useReadContract({
    address: contractAddress,
    abi: AIRDROP_ADMIN_ABI,
    functionName: "emergencyMode",
    query: { enabled: Boolean(contractAddress) },
  });

  const { data: claimDeadline, refetch: refetchDeadline } = useReadContract({
    address: contractAddress,
    abi: AIRDROP_ADMIN_ABI,
    functionName: "claimDeadline",
    query: { enabled: Boolean(contractAddress) },
  });

  const { data: antiBotEnabled, refetch: refetchAntiBot } = useReadContract({
    address: contractAddress,
    abi: AIRDROP_ADMIN_ABI,
    functionName: "antiBotEnabled",
    query: { enabled: Boolean(contractAddress) },
  });

  const { data: antiBotUntil } = useReadContract({
    address: contractAddress,
    abi: AIRDROP_ADMIN_ABI,
    functionName: "antiBotUntil",
    query: { enabled: Boolean(contractAddress) },
  });

  // Contract writes
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const {
    isLoading: isWaiting,
    isSuccess,
    error,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (isSuccess) {
      toast.success("Transaction confirmed!");
      refetchEmergency();
      refetchAntiBot();
      refetchDeadline();
      refetchConfig();
    }
  }, [
    isSuccess,
    refetchEmergency,
    refetchAntiBot,
    refetchDeadline,
    refetchConfig,
  ]);

  useEffect(() => {
    if (error) {
      toast.error("Transaction failed", { description: error.message });
    }
  }, [error]);

  const fetchClaimStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch("/config/airdrop.json");
      if (response.ok) {
        const config = await response.json();
        const chainData = config.chains?.["8453"];
        if (chainData) {
          setClaimStats({
            totalClaimed: chainData.claimedAmount || "0",
            claimedWallets: chainData.claimedWallets || 0,
            recentClaims: [],
            lastUpdated: config.updatedAt,
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch claim stats:", err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchClaimStats();
    const interval = setInterval(fetchClaimStats, 30000);
    return () => clearInterval(interval);
  }, [fetchClaimStats]);

  // Realtime event subscription for claims
  useWatchContractEvent({
    address: contractAddress as `0x${string}` | undefined,
    abi: AIRDROP_ADMIN_ABI,
    eventName: "Claimed",
    enabled: !!contractAddress,
    onLogs: (logs) => {
      if (logs.length > 0) {
        // Refetch stats immediately when a claim happens
        fetchClaimStats();
        refetchConfig();
        toast.success(`New claim detected! Refreshing stats...`, {
          duration: 3000,
        });
      }
    },
  });

  // Stats calculations
  const totalAllocation = Number(chainConfig?.totalAllocation || 10000000);
  const totalClaimed = claimStats ? Number(claimStats.totalClaimed) / 1e18 : 0;
  const remaining = totalAllocation - totalClaimed;
  const claimProgress = (totalClaimed / totalAllocation) * 100;
  const eligibleWallets = chainConfig?.eligibleWallets || 0;
  const claimedWallets = claimStats?.claimedWallets || 0;
  const claimRate =
    eligibleWallets > 0 ? (claimedWallets / eligibleWallets) * 100 : 0;

  const isProcessing = isPending || isWaiting;

  const handleToggleEmergency = () => {
    if (!contractAddress) return;
    writeContract({
      address: contractAddress,
      abi: AIRDROP_ADMIN_ABI,
      functionName: "setEmergencyMode",
      args: [!emergencyMode],
    });
  };

  const handleToggleAntiBot = () => {
    if (!contractAddress) return;
    writeContract({
      address: contractAddress,
      abi: AIRDROP_ADMIN_ABI,
      functionName: "setAntiBotEnabled",
      args: [!antiBotEnabled],
    });
  };

  const handleSetDeadline = () => {
    if (!contractAddress || !newDeadline) return;
    const timestamp = BigInt(
      Math.floor(new Date(newDeadline).getTime() / 1000),
    );
    writeContract({
      address: contractAddress,
      abi: AIRDROP_ADMIN_ABI,
      functionName: "setClaimDeadline",
      args: [timestamp],
    });
  };

  const handleWithdrawTokens = () => {
    if (!contractAddress || !address) return;
    writeContract({
      address: contractAddress,
      abi: AIRDROP_ADMIN_ABI,
      functionName: "withdrawRemainingTokens",
      args: [address],
    });
  };

  // Chart data
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return {
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      claims: Math.floor(Math.random() * 50) + (i === 6 ? 20 : 0),
    };
  });
  const maxClaims = Math.max(...chartData.map((d) => d.claims), 1);

  return (
    <div className="space-y-5">
      {/* Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-xl border p-4 ${
          isLive
            ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent"
            : "border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent"
        }`}
      >
        {/* Decorative elements */}
        <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-gradient-to-br from-white/5 to-transparent blur-2xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`rounded-xl p-3 ${isLive ? "bg-emerald-500/20" : "bg-amber-500/20"}`}
            >
              {isLive ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <Clock className="h-5 w-5 text-amber-400" />
              )}
            </motion.div>
            <div>
              <h3
                className={`text-sm font-bold ${isLive ? "text-emerald-400" : "text-amber-400"}`}
              >
                {isLive ? "Airdrop is LIVE" : "Airdrop Not Deployed"}
              </h3>
              <p className="text-xs text-white/70">
                {contractAddress ? (
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono">
                      {truncateAddress(contractAddress, 8, 6)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(contractAddress);
                        toast.success("Address copied!");
                      }}
                      className="rounded p-0.5 text-white/50 transition hover:bg-white/10 hover:text-white"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </span>
                ) : (
                  "No contract deployed"
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AdminButton
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              loading={isConfigLoading || isLoadingStats}
              onClick={() => {
                refetchConfig();
                fetchClaimStats();
                refetchEmergency();
                refetchAntiBot();
              }}
            >
              Refresh
            </AdminButton>
            {contractAddress && (
              <a
                href={`https://basescan.org/address/${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <AdminButton variant="secondary" size="sm" icon={ExternalLink}>
                  BaseScan
                </AdminButton>
              </a>
            )}
          </div>
        </div>
        {claimDeadline && (
          <div className="relative mt-3 flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/70">
            <Calendar className="h-3 w-3 text-uni-pink" />
            <span>
              Deadline:{" "}
              <span className="font-medium text-white">
                {new Date(Number(claimDeadline) * 1000).toLocaleString()}
              </span>
            </span>
          </div>
        )}
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          icon={Coins}
          label="Total Claimed"
          value={`${totalClaimed.toLocaleString()} ESTF`}
          sub={`${claimProgress.toFixed(1)}% of total`}
          accent="pink"
          trend={claimProgress > 0 ? claimProgress : undefined}
        />
        <AdminStatCard
          icon={Coins}
          label="Remaining"
          value={`${remaining.toLocaleString()} ESTF`}
          sub={`${(100 - claimProgress).toFixed(1)}% unclaimed`}
          accent="amber"
        />
        <AdminStatCard
          icon={Users}
          label="Claimed Wallets"
          value={claimedWallets.toLocaleString()}
          sub={`${claimRate.toFixed(1)}% of eligible`}
          accent="green"
        />
        <AdminStatCard
          icon={Users}
          label="Eligible Wallets"
          value={eligibleWallets.toLocaleString()}
          sub="Total in merkle tree"
          accent="blue"
        />
      </div>

      {/* Charts & Recent Claims */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Claim Activity Chart */}
        <AdminCard title="Claim Activity (7 Days)" icon={BarChart3}>
          <div className="flex h-28 items-end justify-between gap-2">
            {chartData.map((item, i) => (
              <div
                key={item.day}
                className="group flex flex-1 flex-col items-center gap-2"
              >
                <div className="relative w-full">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{
                      height: `${Math.max((item.claims / maxClaims) * 80, 3)}px`,
                    }}
                    transition={{
                      delay: i * 0.06,
                      duration: 0.5,
                      ease: "easeOut",
                    }}
                    className="mx-auto w-full max-w-[28px] rounded-t bg-gradient-to-t from-uni-pink to-uni-pink-light shadow-[0_0_15px_-5px_rgba(255,0,122,0.4)] transition-all group-hover:from-uni-pink-light group-hover:to-uni-pink"
                  />
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {item.claims}
                  </div>
                </div>
                <span className="text-[9px] font-medium text-neutral-400 group-hover:text-white">
                  {item.day}
                </span>
              </div>
            ))}
          </div>
        </AdminCard>

        {/* Recent Claims */}
        <AdminCard title="Recent Claims" icon={Activity}>
          {claimStats?.recentClaims.length === 0 ? (
            <p className="py-3 text-center text-xs text-neutral-400">
              No claims yet
            </p>
          ) : (
            <div className="space-y-2">
              {(claimStats?.recentClaims || []).slice(0, 5).map((claim, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5"
                >
                  <div className="flex items-center gap-1.5">
                    <Wallet className="h-3 w-3 text-neutral-400" />
                    <span className="font-mono text-xs text-white/80">
                      {claim.account.slice(0, 6)}...{claim.account.slice(-4)}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-uni-pink">
                    {claim.amount} ESTF
                  </span>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      </div>

      {/* Admin Controls */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Emergency Mode */}
        <AdminCard
          title="Emergency Mode"
          icon={AlertTriangle}
          accent={emergencyMode ? "danger" : "default"}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white">Pause All Claims</p>
                <p className="text-[10px] text-neutral-400">
                  {emergencyMode
                    ? "Claims are currently paused"
                    : "Claims are active"}
                </p>
              </div>
              <span
                className={`flex items-center gap-1 text-xs font-medium ${emergencyMode ? "text-rose-400" : "text-emerald-400"}`}
              >
                {emergencyMode ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
                {emergencyMode ? "PAUSED" : "ACTIVE"}
              </span>
            </div>
            <AdminButton
              variant={emergencyMode ? "success" : "danger"}
              size="sm"
              onClick={handleToggleEmergency}
              disabled={!contractAddress || isProcessing}
              loading={isProcessing}
              icon={emergencyMode ? Play : Pause}
            >
              {emergencyMode ? "Resume Claims" : "Pause Claims"}
            </AdminButton>
          </div>
        </AdminCard>

        {/* Anti-Bot Protection */}
        <AdminCard title="Anti-Bot Protection" icon={Bot}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white">Bot Prevention</p>
                <p className="text-[10px] text-neutral-400">
                  {antiBotEnabled
                    ? "Only EOA wallets can claim"
                    : "All wallets can claim"}
                </p>
              </div>
              <span
                className={`text-xs font-medium ${antiBotEnabled ? "text-emerald-400" : "text-white/50"}`}
              >
                {antiBotEnabled ? "ENABLED" : "DISABLED"}
              </span>
            </div>
            {antiBotUntil && Number(antiBotUntil) > Date.now() / 1000 && (
              <p className="text-[10px] text-amber-400">
                Active until:{" "}
                {new Date(Number(antiBotUntil) * 1000).toLocaleString()}
              </p>
            )}
            <AdminButton
              variant={antiBotEnabled ? "secondary" : "primary"}
              size="sm"
              onClick={handleToggleAntiBot}
              disabled={!contractAddress || isProcessing}
              loading={isProcessing}
              icon={antiBotEnabled ? Unlock : Lock}
            >
              {antiBotEnabled ? "Disable Anti-Bot" : "Enable Anti-Bot"}
            </AdminButton>
          </div>
        </AdminCard>

        {/* Deadline Management */}
        <AdminCard title="Claim Deadline" icon={Calendar}>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-white">Current Deadline</p>
              <p className="text-sm font-semibold text-uni-pink">
                {claimDeadline
                  ? new Date(Number(claimDeadline) * 1000).toLocaleString()
                  : "Not set"}
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                className="flex-1 rounded-lg border border-uni-border bg-uni-bg px-3 py-1.5 text-xs text-white outline-none focus:border-uni-pink/50"
              />
              <AdminButton
                variant="primary"
                size="sm"
                onClick={handleSetDeadline}
                disabled={!contractAddress || !newDeadline || isProcessing}
                loading={isProcessing}
              >
                Set
              </AdminButton>
            </div>
          </div>
        </AdminCard>

        {/* Withdraw Tokens */}
        <AdminCard title="Withdraw Remaining" icon={Download} accent="danger">
          <div className="space-y-3">
            <div className="rounded-lg bg-rose-500/10 p-2.5 text-xs text-rose-400">
              <AlertTriangle className="mr-1.5 inline h-3 w-3" />
              Withdraws all unclaimed tokens to your wallet
            </div>
            <AdminButton
              variant="danger"
              size="sm"
              onClick={handleWithdrawTokens}
              disabled={!contractAddress || isProcessing}
              loading={isProcessing}
              icon={Download}
            >
              Withdraw All Remaining
            </AdminButton>
          </div>
        </AdminCard>
      </div>

      {/* Contract Status Grid */}
      <AdminCard title="Contract Status" icon={Database}>
        <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
            <span className="text-xs text-white/70">Emergency</span>
            <span
              className={`flex items-center gap-1 text-xs font-medium ${emergencyMode ? "text-rose-400" : "text-emerald-400"}`}
            >
              {emergencyMode ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              {emergencyMode ? "On" : "Off"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
            <span className="text-xs text-white/70">Anti-Bot</span>
            <span
              className={`text-xs font-medium ${antiBotEnabled ? "text-emerald-400" : "text-neutral-400"}`}
            >
              {antiBotEnabled ? "On" : "Off"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
            <span className="text-xs text-white/70">Status</span>
            <span
              className={`text-xs font-medium ${isLive ? "text-emerald-400" : "text-amber-400"}`}
            >
              {isLive ? "Live" : "Not Live"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
            <span className="text-xs text-white/70">Updated</span>
            <span className="text-xs text-neutral-300">
              {claimStats?.lastUpdated
                ? new Date(claimStats.lastUpdated).toLocaleTimeString()
                : "N/A"}
            </span>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}

// ============ TRANSACTIONS TAB ============

type MonthlyRow = {
  month: string;
  total: number;
  success: number;
  failed: number;
  swapFee: number;
};

function TransactionsTab() {
  const history = useEonSwapStore((s) => s.history);
  const [dataSource, setDataSource] = useState<"local" | "relay">("local");
  const [relayRows, setRelayRows] = useState<ActivityItem[]>([]);
  const [relayStatus, setRelayStatus] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const [relayMessage, setRelayMessage] = useState("");
  const [adminSecretDraft, setAdminSecretDraft] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TxStatus>("all");
  const [periodFilter, setPeriodFilter] = useState<"all" | "custom">("custom");
  const [periodMonth, setPeriodMonth] = useState<number>(
    () => new Date().getMonth() + 1,
  );
  const [periodYear, setPeriodYear] = useState<number>(() =>
    new Date().getFullYear(),
  );
  const [monthlyYearFilter, setMonthlyYearFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const reportHistory = dataSource === "relay" ? relayRows : history;

  const saveRelaySecret = () => {
    setRelayMessage("Admin key is kept in memory for this tab.");
    toast.success("Relay key ready");
  };

  const loadFromRelay = async () => {
    const relay = getMonitorRelayBaseUrl();
    if (!relay) {
      setRelayStatus("error");
      setRelayMessage("Set VITE_MONITOR_RELAY_URL in the app environment.");
      return;
    }
    const secret = adminSecretDraft.trim();
    if (!secret) {
      setRelayStatus("error");
      setRelayMessage("Enter the relay admin secret.");
      return;
    }
    setRelayStatus("loading");
    setRelayMessage("");
    const result = await fetchRelayActivities(relay, secret);
    if (!result.ok) {
      setRelayStatus("error");
      setRelayMessage(result.error);
      return;
    }
    const rows = parseRelayActivities(result.activities);
    setRelayRows(rows);
    setDataSource("relay");
    setRelayStatus("idle");
    setRelayMessage(`Loaded ${rows.length} rows from relay`);
    toast.success(`Loaded ${rows.length} transactions`);
  };

  const metrics = useMemo(() => {
    const total = reportHistory.length;
    const pending = reportHistory.filter((h) => h.status === "pending").length;
    const success = reportHistory.filter((h) => h.status === "success").length;
    const failed = reportHistory.filter((h) => h.status === "failed").length;
    const successRate = total ? Math.round((success / total) * 100) : 0;
    const swapFeeRate =
      Number(import.meta.env.VITE_SWAP_FEE_BPS ?? "0") / 10_000;
    const swapFeeByToken = new Map<string, number>();

    for (const item of reportHistory) {
      if (item.status !== "success") continue;
      const swapParsed = parseAmountAndToken(item.summary, "Swap");
      if (swapParsed && swapFeeRate > 0) {
        const next =
          (swapFeeByToken.get(swapParsed.token) ?? 0) +
          swapParsed.amount * swapFeeRate;
        swapFeeByToken.set(swapParsed.token, next);
      }
    }

    const swapFeeTotal = [...swapFeeByToken.values()].reduce(
      (a, b) => a + b,
      0,
    );
    return {
      total,
      pending,
      success,
      failed,
      successRate,
      swapFeeRate,
      swapFeeTotal,
      swapFeeByToken,
    };
  }, [reportHistory]);

  const monthlyRows = useMemo<MonthlyRow[]>(() => {
    const swapFeeRate =
      Number(import.meta.env.VITE_SWAP_FEE_BPS ?? "0") / 10_000;
    const rows = new Map<string, MonthlyRow>();

    for (const item of reportHistory) {
      const d = new Date(item.createdAt);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const row = rows.get(month) ?? {
        month,
        total: 0,
        success: 0,
        failed: 0,
        swapFee: 0,
      };
      row.total += 1;
      if (item.status === "success") row.success += 1;
      if (item.status === "failed") row.failed += 1;

      if (item.status === "success") {
        const swapParsed = parseAmountAndToken(item.summary, "Swap");
        if (swapParsed && swapFeeRate > 0)
          row.swapFee += swapParsed.amount * swapFeeRate;
      }
      rows.set(month, row);
    }
    return [...rows.values()].sort((a, b) => b.month.localeCompare(a.month));
  }, [reportHistory]);

  const availableYears = useMemo(() => {
    const years = new Set(
      reportHistory.map((item) =>
        String(new Date(item.createdAt).getFullYear()),
      ),
    );
    years.add(String(new Date().getFullYear()));
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [reportHistory]);

  const monthOptions = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const yearOptions = useMemo(() => {
    const startYear = 2026;
    const current = new Date().getFullYear();
    const out: number[] = [];
    for (let y = current; y >= startYear; y--) out.push(y);
    return out;
  }, []);

  const monthlyRowsFiltered = useMemo(() => {
    const rows =
      monthlyYearFilter === "all"
        ? monthlyRows
        : monthlyRows.filter((row) =>
            row.month.startsWith(`${monthlyYearFilter}-`),
          );
    return rows.slice(0, 12);
  }, [monthlyRows, monthlyYearFilter]);

  const monthlyTotals = useMemo(() => {
    const totalTx = monthlyRowsFiltered.reduce(
      (acc, row) => acc + row.total,
      0,
    );
    const totalSuccess = monthlyRowsFiltered.reduce(
      (acc, row) => acc + row.success,
      0,
    );
    const totalFailed = monthlyRowsFiltered.reduce(
      (acc, row) => acc + row.failed,
      0,
    );
    const totalSwapFee = monthlyRowsFiltered.reduce(
      (acc, row) => acc + row.swapFee,
      0,
    );
    return { totalTx, totalSuccess, totalFailed, totalSwapFee };
  }, [monthlyRowsFiltered]);

  const filteredHistory = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reportHistory
      .filter((item) =>
        statusFilter === "all" ? true : item.status === statusFilter,
      )
      .filter((item) => {
        if (periodFilter === "all") return true;
        const d = new Date(item.createdAt);
        return (
          d.getMonth() + 1 === periodMonth && d.getFullYear() === periodYear
        );
      })
      .filter((item) => {
        if (!q) return true;
        return (
          item.summary.toLowerCase().includes(q) ||
          String(item.chainId).includes(q) ||
          (item.txHash ?? "").toLowerCase().includes(q) ||
          (item.from ?? "").toLowerCase().includes(q)
        );
      });
  }, [
    reportHistory,
    periodFilter,
    periodMonth,
    periodYear,
    query,
    statusFilter,
  ]);

  const exportCsv = () => {
    const header = [
      "createdAt",
      "kind",
      "status",
      "chainId",
      "summary",
      "txHash",
      "from",
      "blockNumber",
    ];
    const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = filteredHistory.map((item) =>
      [
        new Date(item.createdAt).toISOString(),
        item.kind,
        item.status,
        String(item.chainId),
        item.summary,
        item.txHash ?? "",
        item.from ?? "",
        item.blockNumber != null ? String(item.blockNumber) : "",
      ]
        .map(escapeCell)
        .join(","),
    );
    const csv = `${header.join(",")}\n${rows.join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eonswap-admin-${dataSource}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  };

  return (
    <div className="space-y-4">
      {/* Data Source */}
      <AdminCard title="Data Source" icon={Server}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-uni-border bg-uni-bg p-0.5">
            <button
              type="button"
              onClick={() => setDataSource("local")}
              className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                dataSource === "local"
                  ? "bg-uni-pink text-white"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Local
            </button>
            <button
              type="button"
              onClick={() => {
                setDataSource("relay");
                if (relayRows.length === 0 && relayStatus !== "loading") {
                  void loadFromRelay();
                }
              }}
              className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                dataSource === "relay"
                  ? "bg-uni-pink text-white"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Relay
            </button>
          </div>
          <input
            type="password"
            autoComplete="off"
            placeholder="Relay admin secret"
            value={adminSecretDraft}
            onChange={(e) => setAdminSecretDraft(e.target.value)}
            className="min-w-[160px] flex-1 rounded-lg border border-uni-border bg-uni-bg px-3 py-1.5 text-xs text-white outline-none focus:border-uni-pink/50"
          />
          <AdminButton variant="secondary" size="sm" onClick={saveRelaySecret}>
            Save
          </AdminButton>
          <AdminButton
            variant="primary"
            size="sm"
            icon={RefreshCw}
            loading={relayStatus === "loading"}
            onClick={() => void loadFromRelay()}
          >
            Refresh
          </AdminButton>
        </div>
        {relayMessage && (
          <p
            className={`mt-1.5 text-xs ${relayStatus === "error" ? "text-rose-400" : "text-white/70"}`}
          >
            {relayMessage}
          </p>
        )}
      </AdminCard>

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <AdminStatCard
          icon={Layers}
          label="Total TX"
          value={metrics.total}
          accent="pink"
        />
        <AdminStatCard
          icon={Clock}
          label="Pending"
          value={metrics.pending}
          accent="amber"
        />
        <AdminStatCard
          icon={CheckCircle2}
          label="Success"
          value={metrics.success}
          accent="green"
        />
        <AdminStatCard
          icon={AlertTriangle}
          label="Failed"
          value={metrics.failed}
          accent="pink"
        />
        <AdminStatCard
          icon={TrendingUp}
          label="Success Rate"
          value={`${metrics.successRate}%`}
          accent="blue"
        />
        <AdminStatCard
          icon={Coins}
          label="Swap Fee Est."
          value={metrics.swapFeeTotal.toFixed(4)}
          sub={`Rate: ${(metrics.swapFeeRate * 100).toFixed(2)}%`}
          accent="purple"
        />
        <AdminStatCard
          icon={Database}
          label="Source"
          value={dataSource === "relay" ? "Relay" : "Local"}
          accent="pink"
        />
      </div>

      {/* Filters */}
      <AdminCard title="Filters" icon={Settings}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-uni-border bg-uni-bg p-0.5">
            {(["all", "pending", "success", "failed"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded px-2.5 py-1 text-[10px] font-semibold uppercase transition ${
                  statusFilter === s
                    ? "bg-uni-pink text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setPeriodFilter((p) => (p === "all" ? "custom" : "all"))
            }
            className={`rounded-lg border px-3 py-1.5 text-[10px] font-semibold uppercase transition ${
              periodFilter === "all"
                ? "border-uni-pink bg-uni-pink/20 text-uni-pink"
                : "border-uni-border text-white/60 hover:text-white"
            }`}
          >
            All Time
          </button>
          <select
            value={periodMonth}
            onChange={(e) => {
              setPeriodFilter("custom");
              setPeriodMonth(Number(e.target.value));
            }}
            className="rounded-lg border border-uni-border bg-uni-bg px-2 py-1.5 text-xs text-white outline-none"
          >
            {monthOptions.map((m, idx) => (
              <option key={m} value={idx + 1} className="bg-uni-bg">
                {m}
              </option>
            ))}
          </select>
          <select
            value={periodYear}
            onChange={(e) => {
              setPeriodFilter("custom");
              setPeriodYear(Number(e.target.value));
            }}
            className="rounded-lg border border-uni-border bg-uni-bg px-2 py-1.5 text-xs text-white outline-none"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y} className="bg-uni-bg">
                {y}
              </option>
            ))}
          </select>
          <span className="text-xs text-neutral-400">
            {filteredHistory.length} rows
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="min-w-[160px] flex-1 rounded-lg border border-uni-border bg-uni-bg px-3 py-1.5 text-xs text-white outline-none focus:border-uni-pink/50"
          />
          <AdminButton
            variant="secondary"
            size="sm"
            icon={Download}
            onClick={exportCsv}
          >
            CSV
          </AdminButton>
        </div>
      </AdminCard>

      {/* Transaction Table */}
      <div className="overflow-hidden rounded-xl border border-uni-border bg-uni-surface/60">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-uni-pink" />
            <span className="text-sm font-semibold text-white">
              Transactions
            </span>
          </div>
          <span className="text-[10px] text-white/50">
            {periodFilter === "all"
              ? "All time"
              : `${monthOptions[periodMonth - 1]} ${periodYear}`}
          </span>
        </div>
        <div className="grid grid-cols-12 border-b border-white/5 bg-white/[0.02] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/50">
          <p className="col-span-3">Time</p>
          <p className="col-span-2">Status</p>
          <p className="col-span-2">Chain</p>
          <p className="col-span-3">Summary</p>
          <p className="col-span-2">Wallet</p>
        </div>
        {filteredHistory.length ? (
          <div className="max-h-[320px] overflow-y-auto">
            {filteredHistory.slice(0, 50).map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-12 border-b border-white/5 px-4 py-2 text-xs text-neutral-300 transition hover:bg-white/[0.02]"
              >
                <p className="col-span-3 truncate">{fmtTime(item.createdAt)}</p>
                <p
                  className={`col-span-2 font-medium ${
                    item.status === "success"
                      ? "text-emerald-400"
                      : item.status === "failed"
                        ? "text-rose-400"
                        : "text-amber-400"
                  }`}
                >
                  {item.status}
                </p>
                <p className="col-span-2 truncate">{chainName(item.chainId)}</p>
                <p className="col-span-3 truncate">{item.summary}</p>
                <p className="col-span-2 truncate font-mono text-xs">
                  {item.from ? truncateAddress(item.from, 6, 4) : "—"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-6 text-center text-xs text-white/50">
            No matching transactions
          </p>
        )}
      </div>

      {/* Monthly Report */}
      <div className="overflow-hidden rounded-xl border border-uni-border bg-uni-surface/60">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 text-uni-pink" />
            <span className="text-sm font-semibold text-white">
              Monthly Report
            </span>
            <span className="text-[10px] text-white/50">
              {monthlyTotals.totalTx} tx • {monthlyTotals.totalSuccess} success
              • {monthlyTotals.totalFailed} failed
            </span>
          </div>
          <select
            value={monthlyYearFilter}
            onChange={(e) => setMonthlyYearFilter(e.target.value)}
            className="rounded border border-uni-border bg-uni-bg px-2 py-1 text-xs text-white outline-none"
          >
            <option value="all" className="bg-uni-bg">
              All Years
            </option>
            {availableYears.map((y) => (
              <option key={y} value={y} className="bg-uni-bg">
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-12 border-b border-white/5 bg-white/[0.02] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/50">
          <p className="col-span-2">Month</p>
          <p className="col-span-2">Total</p>
          <p className="col-span-2">Success</p>
          <p className="col-span-2">Failed</p>
          <p className="col-span-4">Swap Fee Est.</p>
        </div>
        {monthlyRowsFiltered.length ? (
          monthlyRowsFiltered.map((row) => (
            <div
              key={row.month}
              className="grid grid-cols-12 border-b border-white/5 px-4 py-2 text-xs text-white/80"
            >
              <p className="col-span-2 font-medium">{row.month}</p>
              <p className="col-span-2">{row.total}</p>
              <p className="col-span-2 text-emerald-400">{row.success}</p>
              <p className="col-span-2 text-rose-400">{row.failed}</p>
              <p className="col-span-4 text-uni-pink">
                {row.swapFee.toFixed(6)}
              </p>
            </div>
          ))
        ) : (
          <p className="px-4 py-6 text-center text-xs text-white/50">
            No monthly data yet
          </p>
        )}
      </div>
    </div>
  );
}

// ============ PLATFORM TAB ============

function PlatformTab() {
  const { address } = useAccount();

  // Import contract config
  const contracts = [
    {
      category: "Core AMM",
      items: [
        {
          name: "Router",
          address: EON_BASE_MAINNET.amm.router,
        },
        {
          name: "Factory",
          address: EON_BASE_MAINNET.amm.factory,
        },
        { name: "WETH", address: EON_BASE_MAINNET.amm.weth },
        {
          name: "Integration Manager",
          address: EON_BASE_MAINNET.amm.integrationManager,
        },
        {
          name: "TWAP Guard",
          address: EON_BASE_MAINNET.amm.twapGuard,
        },
      ],
    },
    {
      category: "Tokens",
      items: [
        {
          name: "ESTF Token",
          address: EON_BASE_MAINNET.token.address,
        },
        {
          name: "ESR Token",
          address: EON_BASE_MAINNET.extraRewardToken.address,
        },
      ],
    },
    {
      category: "LP Pairs",
      items: [
        {
          name: "ESTF/WETH",
          address: EON_BASE_MAINNET.amm.pairEstfWeth,
        },
      ],
    },
    {
      category: "Farm",
      items: [
        {
          name: "MasterChef",
          address: EON_BASE_MAINNET.farm.masterChef,
        },
        {
          name: "Rewarder",
          address: EON_BASE_MAINNET.farm.rewarder,
        },
      ],
    },
    {
      category: "Operations",
      items: [
        {
          name: "Fee Treasury",
          address: EON_BASE_MAINNET.ops.feeTreasury,
        },
        {
          name: "Vesting Vault",
          address: EON_BASE_MAINNET.ops.vestingVault,
        },
        {
          name: "Emission Governor",
          address: EON_BASE_MAINNET.ops.emissionGovernor,
        },
      ],
    },
    {
      category: "Governance",
      items: [
        {
          name: "Timelock",
          address: EON_BASE_MAINNET.timelock,
        },
        {
          name: "Referral",
          address: "0xD878c03e94Dc9a42AB79C78Af7b06fAf341CAd55",
        },
      ],
    },
  ];

  const quickLinks = [
    {
      href: "/referral",
      icon: Gift,
      title: "Referral System",
      desc: "Manage user referrals",
      color: "pink" as const,
      external: false,
    },
    {
      href: "/airdrop",
      icon: Zap,
      title: "Airdrop Page",
      desc: "View public page",
      color: "purple" as const,
      external: false,
    },
    {
      href: "/status",
      icon: Activity,
      title: "Status Page",
      desc: "System health",
      color: "green" as const,
      external: false,
    },
    {
      href: "https://basescan.org",
      icon: ExternalLink,
      title: "BaseScan",
      desc: "Block explorer",
      color: "blue" as const,
      external: true,
    },
  ];

  const colorConfig = {
    pink: {
      border: "border-uni-pink/30 hover:border-uni-pink/50",
      bg: "from-uni-pink/15 via-uni-pink/5 to-transparent",
      icon: "bg-uni-pink/20 text-uni-pink group-hover:bg-uni-pink/30",
      arrow: "text-uni-pink",
    },
    purple: {
      border: "border-purple-500/30 hover:border-purple-500/50",
      bg: "from-purple-500/15 via-purple-500/5 to-transparent",
      icon: "bg-purple-500/20 text-purple-400 group-hover:bg-purple-500/30",
      arrow: "text-purple-400",
    },
    green: {
      border: "border-emerald-500/30 hover:border-emerald-500/50",
      bg: "from-emerald-500/15 via-emerald-500/5 to-transparent",
      icon: "bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30",
      arrow: "text-emerald-400",
    },
    blue: {
      border: "border-blue-500/30 hover:border-blue-500/50",
      bg: "from-blue-500/15 via-blue-500/5 to-transparent",
      icon: "bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30",
      arrow: "text-blue-400",
    },
  };

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((link, i) => {
          const config = colorConfig[link.color];
          return (
            <motion.a
              key={link.href}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className={`group relative overflow-hidden rounded-xl border bg-gradient-to-br p-3 backdrop-blur-sm transition-all ${config.border} ${config.bg}`}
            >
              <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-white/5 blur-xl transition-all group-hover:bg-white/10" />
              <div className="relative flex items-center gap-2.5">
                <div
                  className={`rounded-lg p-2 transition-colors ${config.icon}`}
                >
                  <link.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {link.title}
                  </p>
                  <p className="text-[10px] text-neutral-400 truncate">
                    {link.desc}
                  </p>
                </div>
                <ArrowRight
                  className={`h-4 w-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${config.arrow}`}
                />
              </div>
            </motion.a>
          );
        })}
      </div>

      {/* Admin Wallet Info */}
      <AdminCard title="Admin Wallet" icon={Wallet}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">Connected Address</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-white">
                {address ? truncateAddress(address, 8, 6) : "Not connected"}
              </span>
              {address && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(address);
                      toast.success("Address copied!");
                    }}
                    className="text-white/50 hover:text-white transition"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <a
                    href={`https://basescan.org/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 hover:text-uni-pink transition"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">Admin Status</span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Authorized
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">Network</span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-blue-400">
              <Layers className="h-3 w-3" />
              Base Mainnet (8453)
            </span>
          </div>
        </div>
      </AdminCard>

      {/* Key Wallets */}
      <AdminCard title="Key Wallets" icon={Shield}>
        <div className="space-y-2">
          {[
            {
              name: "Fee Treasury",
              address: "0x7f10d2bb44eafa46669e0befc23fd54808046d77",
              role: "Collects swap fees",
            },
            {
              name: "Vesting Vault",
              address: "0x5871de9b49198f8016932ffe6599a6199079c6b4",
              role: "Token vesting",
            },
            {
              name: "Emission Governor",
              address: "0x87fa28cf1e03cade52eaa26e24c4aecb00389944",
              role: "Emission control",
            },
            {
              name: "Timelock",
              address: "0x95c5b1c146dc2a3da953a99435395d311f6089ae",
              role: "48h delay",
            },
          ].map((wallet) => (
            <div
              key={wallet.name}
              className="rounded-lg bg-white/5 px-3 py-2.5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-white">
                    {wallet.name}
                  </span>
                  <p className="text-[10px] text-neutral-500">{wallet.role}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-white/60">
                    {truncateAddress(wallet.address, 6, 4)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(wallet.address);
                      toast.success("Copied!");
                    }}
                    className="text-white/50 hover:text-white transition"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <a
                    href={`https://basescan.org/address/${wallet.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 hover:text-uni-pink transition"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </AdminCard>

      {/* Contract Addresses by Category */}
      {contracts.map((category) => (
        <AdminCard
          key={category.category}
          title={category.category}
          icon={Database}
        >
          <div className="space-y-1.5">
            {category.items.map((contract) => (
              <div
                key={contract.name}
                className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
              >
                <span className="text-xs text-neutral-300">
                  {contract.name}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-white/60">
                    {truncateAddress(contract.address, 6, 4)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(contract.address);
                      toast.success("Copied!");
                    }}
                    className="text-white/50 hover:text-white transition"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <a
                    href={`https://basescan.org/address/${contract.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 hover:text-uni-pink transition"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </AdminCard>
      ))}
    </div>
  );
}

// ============ MAIN ADMIN PAGE ============

export function AdminPage() {
  const [searchParams] = useSearchParams();
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<
    "airdrop" | "transactions" | "platform"
  >("airdrop");

  const e2eBypassEnabled =
    import.meta.env.DEV && import.meta.env.VITE_E2E_ADMIN_BYPASS === "1";
  const e2eBypass = e2eBypassEnabled && searchParams.get("e2eAdmin") === "1";
  const authorized =
    e2eBypass ||
    (isConnected &&
      typeof address === "string" &&
      ADMIN_WALLETS.includes(address.toLowerCase()));

  if (!authorized) return <Navigate to="/swap" replace />;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Enhanced Background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {/* Main gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_-30%,rgba(255,0,122,0.2),transparent)]" />
        {/* Accent orbs */}
        <div className="absolute -right-40 top-20 h-[600px] w-[600px] rounded-full bg-uni-pink/10 blur-[120px]" />
        <div className="absolute -left-40 top-1/3 h-[400px] w-[400px] rounded-full bg-purple-500/10 blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 h-[300px] w-[800px] -translate-x-1/2 rounded-full bg-blue-500/5 blur-[80px]" />
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <section className="relative mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-uni-pink/30 bg-gradient-to-r from-uni-pink/20 to-transparent px-3 py-1 backdrop-blur-sm"
              >
                <Shield className="h-3 w-3 text-uni-pink" />
                <span className="text-[10px] font-bold tracking-wider text-uni-pink">
                  ADMIN DASHBOARD
                </span>
              </motion.div>
              <h1 className="bg-gradient-to-r from-white via-white to-neutral-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent md:text-3xl">
                Control Panel
              </h1>
              <p className="mt-1.5 text-sm text-neutral-400">
                Manage airdrop, transactions, and platform settings
              </p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-end gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
                  <div className="relative h-1.5 w-1.5">
                    <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400" />
                    <div className="relative h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </div>
                  Online
                </span>
                <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-white/80 backdrop-blur-sm">
                  {address ? truncateAddress(address, 6, 4) : "—"}
                </span>
              </div>
              <span className="text-[10px] text-white/50">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </motion.div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6 inline-flex rounded-xl border border-white/10 bg-white/5 p-1.5 backdrop-blur-xl"
        >
          <TabButton
            active={activeTab === "airdrop"}
            onClick={() => setActiveTab("airdrop")}
            icon={Gift}
            label="Airdrop"
          />
          <TabButton
            active={activeTab === "transactions"}
            onClick={() => setActiveTab("transactions")}
            icon={Activity}
            label="Transactions"
          />
          <TabButton
            active={activeTab === "platform"}
            onClick={() => setActiveTab("platform")}
            icon={Settings}
            label="Platform"
          />
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === "airdrop" && <AirdropTab />}
            {activeTab === "transactions" && <TransactionsTab />}
            {activeTab === "platform" && <PlatformTab />}
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}
