import {
  ArrowLeft,
  Copy,
  Droplets,
  ExternalLink,
  Layers,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatUnits, isAddress, type Address } from "viem";
import { base } from "viem/chains";
import { useAccount } from "wagmi";

import { TokenLogo } from "../components/TokenLogo";
import { useEonPools } from "../hooks/useEonPools";
import { tokenByAddress, type Token } from "../lib/tokens";

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
  const raw = Number(formatUnits(value, decimals));
  if (!Number.isFinite(raw)) return formatUnits(value, decimals);
  if (raw === 0) return "0";
  if (raw < 0.0001) return "< 0.0001";
  if (raw < 1) return raw.toLocaleString(undefined, { maximumFractionDigits: 6 });
  if (raw < 1_000_000) {
    return raw.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  if (raw < 1_000_000_000) return `${(raw / 1_000_000).toFixed(2)}M`;
  return `${(raw / 1_000_000_000).toFixed(2)}B`;
}

function tokenForDisplay(address: Address, symbol: string, decimals: number): Token {
  return (
    tokenByAddress(base.id, address) ?? {
      address,
      symbol,
      name: symbol,
      decimals,
    }
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Droplets;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-uni-border bg-uni-surface p-5 shadow-uni-card">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-uni-pink/10 text-uni-pink">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            {label}
          </p>
          <p className="mt-1 truncate text-lg font-semibold text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export function PoolDetailPage() {
  const { address: addressParam = "" } = useParams();
  const { isConnected } = useAccount();
  const [copied, setCopied] = useState(false);
  const { pools, userPositions, loading, error, refresh } = useEonPools(base.id);

  const poolAddress = useMemo(() => {
    const normalized = addressParam.trim();
    return isAddress(normalized) ? (normalized as Address) : null;
  }, [addressParam]);

  const pool = poolAddress
    ? pools.find((item) => item.address.toLowerCase() === poolAddress.toLowerCase())
    : undefined;
  const position = pool
    ? userPositions.find(
        (item) => item.poolAddress.toLowerCase() === pool.address.toLowerCase(),
      )
    : undefined;

  const token0 = pool
    ? tokenForDisplay(pool.token0, pool.symbol0, pool.decimals0)
    : null;
  const token1 = pool
    ? tokenForDisplay(pool.token1, pool.symbol1, pool.decimals1)
    : null;

  const copyAddress = async () => {
    if (!poolAddress) return;
    await navigator.clipboard.writeText(poolAddress);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  if (!poolAddress) {
    return (
      <div className="relative min-w-0 max-w-full overflow-hidden">
        <section className="relative border-t border-uni-border px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl rounded-3xl border border-uni-border bg-uni-surface p-8 text-center shadow-uni-card">
            <p className="text-sm font-medium uppercase tracking-wider text-uni-pink">
              Pool Details
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white">
              Invalid pool address
            </h1>
            <p className="mt-3 text-sm text-neutral-400">
              Check the pair contract address and open a Base Eon AMM pool route.
            </p>
            <Link
              to="/liquidity"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-uni-pink px-5 py-3 text-sm font-semibold text-white transition hover:bg-uni-pink-light"
            >
              Back to liquidity
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (loading && !pool) {
    return (
      <div className="relative min-w-0 max-w-full overflow-hidden">
        <section className="relative border-t border-uni-border px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-3xl items-center justify-center gap-3 rounded-3xl border border-uni-border bg-uni-surface py-16 text-neutral-400 shadow-uni-card">
            <RefreshCw className="h-5 w-5 animate-spin text-uni-pink" />
            Loading pool...
          </div>
        </section>
      </div>
    );
  }

  if (!pool || !token0 || !token1) {
    return (
      <div className="relative min-w-0 max-w-full overflow-hidden">
        <section className="relative border-t border-uni-border px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl rounded-3xl border border-uni-border bg-uni-surface p-8 text-center shadow-uni-card">
            <p className="text-sm font-medium uppercase tracking-wider text-uni-pink">
              Pool Details
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white">
              Pool not found
            </h1>
            <p className="mt-3 text-sm text-neutral-400">
              This pair is not currently indexed by the Eon AMM factory.
            </p>
            {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-uni-pink px-5 py-3 text-sm font-semibold text-white transition hover:bg-uni-pink-light"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </section>
      </div>
    );
  }

  const pairLabel = `${pool.symbol0}/${pool.symbol1}`;

  return (
    <div className="relative min-w-0 max-w-full overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,0,122,0.12),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(80,70,255,0.12),transparent_28%)]"
        aria-hidden
      />

      <section className="relative border-t border-uni-border px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Link
            to="/liquidity"
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to liquidity
          </Link>

          <div className="mt-6 overflow-hidden rounded-3xl border border-uni-border bg-uni-surface shadow-uni-card">
            <div className="p-6 md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex shrink-0 items-center -space-x-3">
                    <TokenLogo chainId={base.id} token={token0} size="lg" />
                    <TokenLogo chainId={base.id} token={token1} size="lg" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Eon AMM Pool
                    </p>
                    <h1 className="mt-1 truncate text-3xl font-semibold text-white md:text-4xl">
                      {pairLabel}
                    </h1>
                    <p className="mt-1 text-lg font-medium text-uni-pink">
                      LP Pair
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={copyAddress}
                    className="inline-flex items-center gap-2 rounded-xl border border-uni-border bg-uni-surface-2 px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:border-uni-pink/30 hover:text-white"
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <a
                    href={`https://basescan.org/address/${pool.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-uni-pink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-uni-pink-light"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Basescan
                  </a>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-uni-border bg-uni-bg px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Pair Contract
                </p>
                <p className="mt-1 break-all font-mono text-sm text-neutral-200">
                  {pool.address}
                </p>
              </div>
            </div>

            <div className="grid gap-px bg-uni-border sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="TVL" value={formatUsd(pool.tvlUsd)} icon={Droplets} />
              <StatCard
                label="Total LP Supply"
                value={`${formatTokenAmount(pool.totalSupply, 18)} LP`}
                icon={Layers}
              />
              <StatCard
                label="Your LP"
                value={
                  isConnected
                    ? position
                      ? `${formatTokenAmount(position.lpBalance, 18)} LP`
                      : "0 LP"
                    : "Not connected"
                }
                icon={Wallet}
              />
              <StatCard
                label="Pool Share"
                value={
                  position ? `${(position.shareOfPool * 100).toFixed(4)}%` : "0%"
                }
                icon={Layers}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-uni-border bg-uni-surface p-5 shadow-uni-card">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <TokenLogo chainId={base.id} token={token0} size="md" />
                  <div className="min-w-0">
                    <Link
                      to={`/tokens/${pool.token0}`}
                      className="truncate text-sm font-semibold text-white transition hover:text-uni-pink"
                    >
                      {pool.symbol0}
                    </Link>
                    <p className="truncate text-xs text-neutral-500">
                      {shortAddress(pool.token0)}
                    </p>
                  </div>
                </div>
                <p className="min-w-0 truncate text-right text-sm font-semibold tabular-nums text-neutral-200">
                  {formatTokenAmount(pool.reserve0, pool.decimals0)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-uni-border bg-uni-surface p-5 shadow-uni-card">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <TokenLogo chainId={base.id} token={token1} size="md" />
                  <div className="min-w-0">
                    <Link
                      to={`/tokens/${pool.token1}`}
                      className="truncate text-sm font-semibold text-white transition hover:text-uni-pink"
                    >
                      {pool.symbol1}
                    </Link>
                    <p className="truncate text-xs text-neutral-500">
                      {shortAddress(pool.token1)}
                    </p>
                  </div>
                </div>
                <p className="min-w-0 truncate text-right text-sm font-semibold tabular-nums text-neutral-200">
                  {formatTokenAmount(pool.reserve1, pool.decimals1)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-uni-border bg-uni-surface p-5 shadow-uni-card">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Reserve Updated
                </p>
                <p className="mt-1 text-sm text-neutral-300">
                  {new Date(pool.blockTimestampLast * 1000).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-uni-border bg-uni-surface-2 px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:border-uni-pink/30 hover:text-white disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
