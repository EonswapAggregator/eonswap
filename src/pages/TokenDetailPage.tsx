import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Hash,
  Layers,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatUnits, isAddress, type Address } from "viem";
import { base } from "viem/chains";
import { useAccount, useBalance, useReadContracts } from "wagmi";

import { TokenLogo } from "../components/TokenLogo";
import { tokenByAddress, type Token } from "../lib/tokens";

const ERC20_METADATA_ABI = [
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatLargeTokenAmount(value: bigint | null, decimals: number): string {
  if (value === null) return "Unavailable";
  const raw = Number(formatUnits(value, decimals));
  if (!Number.isFinite(raw)) return formatUnits(value, decimals);
  if (raw === 0) return "0";
  if (raw < 0.0001) return "< 0.0001";
  if (raw < 1) return raw.toLocaleString(undefined, { maximumFractionDigits: 6 });
  if (raw < 1_000_000) {
    return raw.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  if (raw < 1_000_000_000) return `${(raw / 1_000_000).toFixed(2)}M`;
  if (raw < 1_000_000_000_000) return `${(raw / 1_000_000_000).toFixed(2)}B`;
  return `${(raw / 1_000_000_000_000).toFixed(2)}T`;
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Hash;
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

export function TokenDetailPage() {
  const { address: addressParam = "" } = useParams();
  const { address: walletAddress } = useAccount();
  const [copied, setCopied] = useState(false);

  const tokenAddress = useMemo(() => {
    const normalized = addressParam.trim();
    return isAddress(normalized) ? (normalized as Address) : null;
  }, [addressParam]);

  const knownToken = tokenAddress
    ? tokenByAddress(base.id, tokenAddress)
    : undefined;

  const { data: metadata, isLoading } = useReadContracts({
    contracts: tokenAddress
      ? ([
          {
            address: tokenAddress,
            abi: ERC20_METADATA_ABI,
            functionName: "name",
            chainId: base.id,
          },
          {
            address: tokenAddress,
            abi: ERC20_METADATA_ABI,
            functionName: "symbol",
            chainId: base.id,
          },
          {
            address: tokenAddress,
            abi: ERC20_METADATA_ABI,
            functionName: "decimals",
            chainId: base.id,
          },
          {
            address: tokenAddress,
            abi: ERC20_METADATA_ABI,
            functionName: "totalSupply",
            chainId: base.id,
          },
        ] as const)
      : [],
    query: {
      enabled: Boolean(tokenAddress),
      staleTime: 60_000,
    },
    allowFailure: true,
  });

  const onChainName =
    metadata?.[0]?.status === "success" ? String(metadata[0].result) : null;
  const onChainSymbol =
    metadata?.[1]?.status === "success" ? String(metadata[1].result) : null;
  const onChainDecimals =
    metadata?.[2]?.status === "success" ? Number(metadata[2].result) : null;
  const totalSupply =
    metadata?.[3]?.status === "success" ? BigInt(metadata[3].result) : null;

  const token: Token | null = tokenAddress
    ? {
        address: tokenAddress,
        symbol: knownToken?.symbol || onChainSymbol || shortAddress(tokenAddress),
        name: knownToken?.name || onChainName || "Unknown token",
        decimals: knownToken?.decimals ?? onChainDecimals ?? 18,
      }
    : null;

  const { data: balance } = useBalance({
    address: walletAddress,
    token: tokenAddress ?? undefined,
    chainId: base.id,
    query: {
      enabled: Boolean(walletAddress && tokenAddress),
      staleTime: 30_000,
    },
  });

  const copyAddress = async () => {
    if (!tokenAddress) return;
    await navigator.clipboard.writeText(tokenAddress);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  if (!tokenAddress || !token) {
    return (
      <div className="relative min-w-0 max-w-full overflow-hidden">
        <section className="relative border-t border-uni-border px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl rounded-3xl border border-uni-border bg-uni-surface p-8 text-center shadow-uni-card">
            <p className="text-sm font-medium uppercase tracking-wider text-uni-pink">
              Token Details
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white">
              Invalid token address
            </h1>
            <p className="mt-3 text-sm text-neutral-400">
              Check the address and open a Base ERC-20 token route.
            </p>
            <Link
              to="/swap"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-uni-pink px-5 py-3 text-sm font-semibold text-white transition hover:bg-uni-pink-light"
            >
              Back to swap
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="relative min-w-0 max-w-full overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,0,122,0.12),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(80,70,255,0.12),transparent_28%)]"
        aria-hidden
      />

      <section className="relative border-t border-uni-border px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Link
            to="/swap"
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to swap
          </Link>

          <div className="mt-6 overflow-hidden rounded-3xl border border-uni-border bg-uni-surface shadow-uni-card">
            <div className="p-6 md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <TokenLogo chainId={base.id} token={token} size="lg" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Base token
                    </p>
                    <h1 className="mt-1 truncate text-3xl font-semibold text-white md:text-4xl">
                      {token.name}
                    </h1>
                    <p className="mt-1 text-lg font-medium text-uni-pink">
                      {token.symbol}
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
                    href={`https://basescan.org/token/${token.address}`}
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
                  Contract
                </p>
                <p className="mt-1 break-all font-mono text-sm text-neutral-200">
                  {token.address}
                </p>
              </div>
            </div>

            <div className="grid gap-px bg-uni-border sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Symbol" value={token.symbol} icon={Hash} />
              <StatCard
                label="Decimals"
                value={String(token.decimals)}
                icon={Layers}
              />
              <StatCard
                label="Total Supply"
                value={
                  isLoading
                    ? "Loading..."
                    : formatLargeTokenAmount(totalSupply, token.decimals)
                }
                icon={Layers}
              />
              <StatCard
                label="Wallet Balance"
                value={
                  walletAddress && balance
                    ? `${formatLargeTokenAmount(balance.value, token.decimals)} ${token.symbol}`
                    : walletAddress
                      ? "Loading..."
                      : "Not connected"
                }
                icon={Wallet}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Link
              to="/swap"
              className="rounded-2xl border border-uni-border bg-uni-surface p-5 transition hover:border-uni-pink/30 hover:bg-uni-surface-2"
            >
              <p className="text-sm font-semibold text-white">Trade token</p>
              <p className="mt-1 text-sm text-neutral-400">
                Open the swap interface and select this asset from the token list.
              </p>
            </Link>
            <Link
              to="/liquidity"
              className="rounded-2xl border border-uni-border bg-uni-surface p-5 transition hover:border-uni-pink/30 hover:bg-uni-surface-2"
            >
              <p className="text-sm font-semibold text-white">View liquidity</p>
              <p className="mt-1 text-sm text-neutral-400">
                Check Eon AMM pools, reserves, and available LP actions.
              </p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
