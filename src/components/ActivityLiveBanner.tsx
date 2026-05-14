import { useAccount, useBlockNumber } from "wagmi";
import { base } from "viem/chains";
import { getEonChain, isSupportedChain } from "../lib/chains";
import { nativeChainDisplayLogoUrl } from "../lib/tokenLogos";
import { Link } from "react-router-dom";
import { Wallet, Globe, User, RefreshCw } from "lucide-react";

interface ActivityLiveBannerProps {
  viewMode?: "global" | "my";
  onViewModeChange?: (mode: "global" | "my") => void;
  onRefresh?: () => void;
  refreshLoading?: boolean;
}

export function ActivityLiveBanner({
  viewMode = "global",
  onViewModeChange,
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
  const blockLabel = block != null ? `#${block.toLocaleString()}` : "Loading...";

  return (
    <div className="overflow-hidden rounded-2xl border border-uni-pink/20 bg-gradient-to-r from-uni-pink/[0.08] via-uni-surface to-uni-surface">
      <div className="flex min-w-0 flex-col gap-3 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-3 sm:px-5 sm:py-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          {/* Activity Tabs */}
          {onViewModeChange && (
            <>
              <div
                className="grid w-full min-w-0 grid-cols-2 gap-1 rounded-2xl border border-uni-border bg-uni-surface p-1 sm:w-auto sm:grid-cols-none sm:flex"
                role="tablist"
                aria-label="Activity view"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "global"}
                  onClick={() => onViewModeChange("global")}
                  className={`inline-flex min-h-[44px] min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition sm:min-h-0 sm:px-4 ${
                    viewMode === "global"
                      ? "bg-uni-pink text-white shadow-glow"
                      : "text-neutral-500 hover:bg-white/[0.05] hover:text-neutral-300"
                  }`}
                >
                  <Globe className="h-4 w-4 shrink-0" />
                  <span className="sm:hidden">Global</span>
                  <span className="hidden sm:inline">Global Activity</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "my"}
                  onClick={() => onViewModeChange("my")}
                  className={`inline-flex min-h-[44px] min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition sm:min-h-0 sm:px-4 ${
                    viewMode === "my"
                      ? "bg-uni-pink text-white shadow-glow"
                      : "text-neutral-500 hover:bg-white/[0.05] hover:text-neutral-300"
                  }`}
                >
                  <User className="h-4 w-4 shrink-0" />
                  <span className="sm:hidden">My</span>
                  <span className="hidden sm:inline">My Activity</span>
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
              <div className="grid w-full min-w-0 grid-cols-3 gap-2 sm:w-auto sm:grid-cols-none sm:flex sm:items-center sm:gap-3">
                <div className="flex min-w-0 items-center justify-center gap-2 rounded-xl border border-uni-border bg-uni-surface-2 px-2.5 py-2 sm:justify-start sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
                  <span className="relative flex h-3 w-3 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-uni-pink/60" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-uni-pink shadow-[0_0_12px_rgba(255,0,122,0.6)]" />
                  </span>
                  <span className="truncate whitespace-nowrap text-xs font-bold text-uni-pink sm:text-sm">
                    LIVE
                  </span>
                </div>

                <span
                  className="hidden h-5 w-px bg-uni-border sm:block"
                  aria-hidden
                />

                {/* Network */}
                <div className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-uni-border bg-uni-surface-2 px-2 py-2 sm:justify-start sm:gap-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
                  <span className="hidden text-xs font-medium uppercase tracking-wider text-neutral-500 sm:inline">
                    Network
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg sm:bg-uni-surface-2 sm:px-3 sm:py-1.5 sm:ring-1 sm:ring-uni-border">
                    <img
                      src={chainLogo ?? undefined}
                      alt={name}
                      className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                      loading="lazy"
                    />
                    <span className="min-w-0 truncate whitespace-nowrap text-xs font-semibold text-white sm:text-sm">
                      {name}
                    </span>
                  </span>
                </div>

                <span className="hidden h-5 w-px bg-uni-border sm:block" />

                {/* Block Number */}
                <div className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-uni-border bg-uni-surface-2 px-2 py-2 sm:justify-start sm:gap-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
                  <span className="hidden text-xs font-medium uppercase tracking-wider text-neutral-500 sm:inline">
                    Block
                  </span>
                  <span
                    className={`min-w-0 truncate whitespace-nowrap rounded-lg px-2 py-1.5 text-center font-mono text-xs tabular-nums sm:px-3 sm:text-sm ${
                      block != null
                        ? "bg-uni-pink/10 font-bold text-uni-pink ring-1 ring-uni-pink/20"
                        : "bg-uni-surface-2 text-neutral-500"
                    }`}
                    title={blockLabel}
                  >
                    {blockLabel}
                  </span>
                </div>
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
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-uni-border bg-uni-surface px-4 py-2 text-sm font-medium text-neutral-400 transition hover:bg-uni-surface-2 hover:text-white disabled:opacity-50 sm:ml-auto sm:w-auto sm:min-h-0"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        )}
      </div>
      {walletRequired && (
        <div className="border-t border-uni-border px-4 py-5 sm:px-5">
          <div className="flex flex-col items-center justify-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-uni-surface-2 ring-1 ring-uni-border">
              <Wallet className="h-6 w-6 text-neutral-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">
                Connect Your Wallet
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                Connect your wallet to view your swaps, liquidity actions, and
                farm activity across EonSwap.
              </p>
            </div>
            <Link
              to="/swap"
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-uni-pink px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-uni-pink-light sm:w-auto"
            >
              Connect Wallet
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
