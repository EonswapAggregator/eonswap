import { useAccount, useBlockNumber } from "wagmi";
import { base } from "viem/chains";
import { getEonChain, isSupportedChain } from "../lib/chains";
import { nativeChainDisplayLogoUrl } from "../lib/tokenLogos";
import { Link } from "react-router-dom";
import { Wallet, Globe, User, RefreshCw } from "lucide-react";

interface ActivityLiveBannerProps {
  viewMode?: "global" | "my";
  onViewModeChange?: (mode: "global" | "my") => void;
  stats?: { total: number };
  onRefresh?: () => void;
  refreshLoading?: boolean;
}

export function ActivityLiveBanner({
  viewMode = "global",
  onViewModeChange,
  stats,
  onRefresh,
  refreshLoading = false,
}: ActivityLiveBannerProps) {
  const { address, chainId, isConnected } = useAccount();
  const ok =
    isConnected && address && chainId != null && isSupportedChain(chainId);
  const activeChainId = ok ? chainId : base.id;
  const requiresWallet = viewMode === "my";
  const walletRequired = requiresWallet && !ok;

  const { data: block } = useBlockNumber({
    chainId: activeChainId,
    watch: true,
    query: { enabled: ok || !requiresWallet },
  });

  const name = getEonChain(activeChainId)?.name ?? `Chain ${activeChainId}`;
  const chainLogo = nativeChainDisplayLogoUrl(activeChainId);

  return (
    <div className="overflow-hidden rounded-2xl border border-uni-pink/20 bg-gradient-to-r from-uni-pink/[0.08] via-uni-surface to-uni-surface">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {/* Activity Tabs */}
          {onViewModeChange && (
            <>
              <div
                className="flex min-w-0 gap-1 rounded-2xl border border-uni-border bg-uni-surface p-1"
                role="tablist"
                aria-label="Activity view"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "global"}
                  onClick={() => onViewModeChange("global")}
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:min-h-0 ${
                    viewMode === "global"
                      ? "bg-uni-pink text-white shadow-glow"
                      : "text-neutral-500 hover:bg-white/[0.05] hover:text-neutral-300"
                  }`}
                >
                  <Globe className="h-4 w-4" />
                  Global Activity
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "my"}
                  onClick={() => onViewModeChange("my")}
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:min-h-0 ${
                    viewMode === "my"
                      ? "bg-uni-pink text-white shadow-glow"
                      : "text-neutral-500 hover:bg-white/[0.05] hover:text-neutral-300"
                  }`}
                >
                  <User className="h-4 w-4" />
                  My Activity
                  {stats && stats.total > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${viewMode === "my" ? "bg-white/20" : "bg-uni-surface-2"}`}
                    >
                      {stats.total}
                    </span>
                  )}
                </button>
              </div>
              <span
                className="hidden h-5 w-px bg-uni-border sm:block"
                aria-hidden
              />
            </>
          )}

          {!walletRequired && (
            <>
              {/* Live Indicator */}
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-uni-pink/60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-uni-pink shadow-[0_0_12px_rgba(255,0,122,0.6)]" />
                </span>
                <span className="text-sm font-bold text-uni-pink">LIVE</span>
              </div>

              <span
                className="hidden h-5 w-px bg-uni-border sm:block"
                aria-hidden
              />

              {/* Network */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Network
                </span>
                <span className="inline-flex items-center gap-2 rounded-lg bg-uni-surface-2 px-3 py-1.5 ring-1 ring-uni-border">
                  <img
                    src={chainLogo ?? undefined}
                    alt={name}
                    className="h-5 w-5 rounded-full object-cover ring-1 ring-white/10"
                    loading="lazy"
                  />
                  <span className="text-sm font-semibold text-white">
                    {name}
                  </span>
                </span>
              </div>

              <span
                className="hidden h-5 w-px bg-uni-border sm:block"
                aria-hidden
              />

              {/* Block Number */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Block
                </span>
                {block != null ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-uni-pink/10 px-3 py-1.5 font-mono text-sm font-bold tabular-nums text-uni-pink ring-1 ring-uni-pink/20">
                    #{block.toLocaleString()}
                  </span>
                ) : (
                  <span className="rounded-lg bg-uni-surface-2 px-3 py-1.5 text-sm text-neutral-500">
                    Loading...
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshLoading}
            className="ml-auto inline-flex items-center gap-2 rounded-xl border border-uni-border bg-uni-surface px-4 py-2 text-sm font-medium text-neutral-400 transition hover:bg-uni-surface-2 hover:text-white disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        )}
      </div>
      {walletRequired && (
        <div className="border-t border-uni-border px-5 py-5">
          <div className="flex flex-col items-center justify-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-uni-surface-2 ring-1 ring-uni-border">
              <Wallet className="h-6 w-6 text-neutral-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">
                Connect Your Wallet
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                My Activity shows transactions from your connected wallet. You
                can switch back to Global Activity anytime.
              </p>
            </div>
            <Link
              to="/swap"
              className="inline-flex items-center gap-2 rounded-xl bg-uni-pink px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-uni-pink-light"
            >
              Connect Wallet
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
