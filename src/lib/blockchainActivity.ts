import { erc20Abi, formatUnits, type Address, type PublicClient } from "viem";
import { eonAmmFactoryAbi, eonAmmPairAbi } from "./amm/abis";
import { EON_BASE_MAINNET } from "./eonBaseMainnet";
import { getMonitorRelayBaseUrl } from "./monitorRelayUrl";

export type BlockchainSwapActivity = {
  id: string;
  kind?: string;
  pair: `0x${string}`;
  token0: `0x${string}`;
  token1: `0x${string}`;
  symbol0: string;
  symbol1: string;
  decimals0: number;
  decimals1: number;
  txHash: `0x${string}`;
  blockNumber: number;
  timestamp: number;
  from: `0x${string}`;
  amount0?: bigint;
  amount1?: bigint;
  amount0In: bigint;
  amount1In: bigint;
  amount0Out: bigint;
  amount1Out: bigint;
  points?: bigint;
  to: `0x${string}`;
};

const SWAP_EVENT = {
  type: "event",
  name: "Swap",
  inputs: [
    { type: "address", indexed: true, name: "sender" },
    { type: "uint256", indexed: false, name: "amount0In" },
    { type: "uint256", indexed: false, name: "amount1In" },
    { type: "uint256", indexed: false, name: "amount0Out" },
    { type: "uint256", indexed: false, name: "amount1Out" },
    { type: "address", indexed: true, name: "to" },
  ],
} as const;

const CACHE_NAMESPACE = "eonswap:blockchain-swap-activities:v5";
const INITIAL_LOOKBACK_BLOCKS = 1_000n;
const LOG_BATCH_SIZE = 10n;
const MAX_PAIRS_TO_SCAN = 500;
const MAX_CACHED_ACTIVITIES = 250;

type SerializedBlockchainSwapActivity = Omit<
  BlockchainSwapActivity,
  "amount0" | "amount1" | "amount0In" | "amount1In" | "amount0Out" | "amount1Out" | "points"
> & {
  amount0?: string;
  amount1?: string;
  amount0In: string;
  amount1In: string;
  amount0Out: string;
  amount1Out: string;
  points?: string;
};

type IndexedActivityRecord = Partial<SerializedBlockchainSwapActivity>;

type ActivityCache = {
  chainId: number;
  factory: `0x${string}`;
  walletAddress?: `0x${string}`;
  pairs: `0x${string}`[];
  scannedToBlock: string;
  activities: SerializedBlockchainSwapActivity[];
};

type FetchBlockchainSwapActivitiesOptions = {
  walletAddress?: Address;
};

export type BlockchainLeaderboardEntry = {
  rank: number;
  address: `0x${string}`;
  successCount: number;
  lastSuccessAt: number;
};

type PairInfo = {
  pair: `0x${string}`;
  token0: `0x${string}`;
  token1: `0x${string}`;
  symbol0: string;
  symbol1: string;
  decimals0: number;
  decimals1: number;
};

type IndexedActivityResponse = {
  ok?: boolean;
  data?: IndexedActivityRecord[];
  error?: string;
  message?: string;
};

function serializeActivity(
  activity: BlockchainSwapActivity,
): SerializedBlockchainSwapActivity {
  return {
    ...activity,
    amount0: activity.amount0?.toString(),
    amount1: activity.amount1?.toString(),
    amount0In: activity.amount0In.toString(),
    amount1In: activity.amount1In.toString(),
    amount0Out: activity.amount0Out.toString(),
    amount1Out: activity.amount1Out.toString(),
    points: activity.points?.toString(),
  };
}

function normalizeIndexedAddress(
  value: unknown,
  fallback: `0x${string}` = "0x0000000000000000000000000000000000000000",
): `0x${string}` {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/u.test(value)
    ? (value as `0x${string}`)
    : fallback;
}

function normalizeIndexedHash(value: unknown): `0x${string}` {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/u.test(value)
    ? (value as `0x${string}`)
    : "0x0000000000000000000000000000000000000000000000000000000000000000";
}

function parseIndexedBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.max(0, Math.floor(value)));
  }
  if (typeof value === "string" && value.trim()) {
    try {
      return BigInt(value);
    } catch {
      return 0n;
    }
  }
  return 0n;
}

function deserializeActivity(activity: IndexedActivityRecord): BlockchainSwapActivity {
  const amount0In = parseIndexedBigInt(activity.amount0In);
  const amount1In = parseIndexedBigInt(activity.amount1In);
  const amount0Out = parseIndexedBigInt(activity.amount0Out);
  const amount1Out = parseIndexedBigInt(activity.amount1Out);
  const amount0 = activity.amount0 != null ? parseIndexedBigInt(activity.amount0) : undefined;
  const amount1 = activity.amount1 != null ? parseIndexedBigInt(activity.amount1) : undefined;
  const txHash = normalizeIndexedHash(activity.txHash);
  const logId =
    typeof activity.id === "string" && activity.id.trim()
      ? activity.id
      : `${txHash}-${activity.blockNumber ?? 0}`;

  return {
    ...activity,
    id: logId,
    kind: activity.kind ?? "SWAP",
    pair: normalizeIndexedAddress(activity.pair, EON_BASE_MAINNET.amm.pairEstfWeth),
    token0: normalizeIndexedAddress(activity.token0, EON_BASE_MAINNET.token.address),
    token1: normalizeIndexedAddress(activity.token1, EON_BASE_MAINNET.amm.weth),
    symbol0: activity.symbol0 ?? EON_BASE_MAINNET.token.symbol,
    symbol1: activity.symbol1 ?? "WETH",
    decimals0: Number(activity.decimals0 ?? 18),
    decimals1: Number(activity.decimals1 ?? 18),
    txHash,
    blockNumber: Number(activity.blockNumber ?? 0),
    timestamp: Number(activity.timestamp ?? Date.now()),
    from: normalizeIndexedAddress(activity.from),
    amount0,
    amount1,
    amount0In,
    amount1In,
    amount0Out,
    amount1Out,
    points: activity.points != null ? parseIndexedBigInt(activity.points) : undefined,
    to: normalizeIndexedAddress(activity.to),
  };
}

function readActivityCache(
  chainId: number,
  factory: `0x${string}`,
  walletAddress?: Address,
): ActivityCache | null {
  if (typeof localStorage === "undefined") return null;

  try {
    const raw = localStorage.getItem(
      activityCacheKey(chainId, factory, walletAddress),
    );
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ActivityCache;
    if (
      parsed.chainId !== chainId ||
      parsed.factory?.toLowerCase() !== factory.toLowerCase()
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeActivityCache(cache: ActivityCache): void {
  if (typeof localStorage === "undefined") return;

  try {
    localStorage.setItem(
      activityCacheKey(cache.chainId, cache.factory, cache.walletAddress),
      JSON.stringify(cache),
    );
  } catch {
    // Cache is best-effort. The feed can still render from the current fetch.
  }
}

function activityCacheKey(
  chainId: number,
  factory: `0x${string}`,
  walletAddress?: Address,
): string {
  const scope = walletAddress?.toLowerCase() ?? "global";
  return `${CACHE_NAMESPACE}:${chainId}:${factory.toLowerCase()}:${scope}`;
}

function matchesWalletActivity(
  activity: BlockchainSwapActivity,
  walletAddress?: Address,
): boolean {
  if (!walletAddress) return true;
  const wallet = walletAddress.toLowerCase();
  return (
    activity.from.toLowerCase() === wallet ||
    activity.to.toLowerCase() === wallet
  );
}

export async function fetchIndexedSwapActivities(
  limit = 50,
  lookbackBlocks = 100_000,
  walletAddress?: Address,
): Promise<
  | { ok: true; activities: BlockchainSwapActivity[] }
  | { ok: false; error: string }
> {
  try {
    const relayBaseUrl = getMonitorRelayBaseUrl();
    const q = new URLSearchParams({
      limit: String(limit),
      lookbackBlocks: String(lookbackBlocks),
    });
    if (walletAddress) q.set("wallet", walletAddress);
    const url = relayBaseUrl
      ? `${relayBaseUrl}/api/activity?${q}`
      : `/api/activity?${q}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    const payload = (await response.json()) as IndexedActivityResponse;

    if (!response.ok) {
      return {
        ok: false,
        error:
          payload.message ||
          payload.error ||
          `Activity index returned ${response.status}`,
      };
    }

    if (payload.ok === false) {
      return {
        ok: false,
        error: payload.message || payload.error || "Activity index is not ready",
      };
    }

    return {
      ok: true,
      activities: (payload.data ?? []).map(deserializeActivity),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Activity index failed",
    };
  }
}

export async function fetchEonAmmPairAddresses(
  client: PublicClient,
): Promise<`0x${string}`[]> {
  const factory = EON_BASE_MAINNET.amm.factory;
  const pairsLength = await client.readContract({
    address: factory,
    abi: eonAmmFactoryAbi,
    functionName: "allPairsLength",
  });
  const count = Math.min(Number(pairsLength), MAX_PAIRS_TO_SCAN);
  if (count <= 0) return [];

  const pairCalls = Array.from({ length: count }, (_, i) => ({
    address: factory,
    abi: eonAmmFactoryAbi,
    functionName: "allPairs" as const,
    args: [BigInt(i)] as const,
  }));

  const pairResults = await client.multicall({ contracts: pairCalls });
  return pairResults
    .filter((result) => result.status === "success")
    .map((result) => result.result as `0x${string}`);
}

async function fetchPairInfo(
  client: PublicClient,
  pairs: readonly `0x${string}`[],
): Promise<Map<string, PairInfo>> {
  if (pairs.length === 0) return new Map();

  const tokenCalls = pairs.flatMap((pair) => [
    { address: pair, abi: eonAmmPairAbi, functionName: "token0" as const },
    { address: pair, abi: eonAmmPairAbi, functionName: "token1" as const },
  ]);
  const tokenResults = await client.multicall({ contracts: tokenCalls });

  const baseInfo = pairs
    .map((pair, index) => {
      const token0Result = tokenResults[index * 2];
      const token1Result = tokenResults[index * 2 + 1];
      if (
        token0Result?.status !== "success" ||
        token1Result?.status !== "success"
      ) {
        return null;
      }
      return {
        pair,
        token0: token0Result.result as `0x${string}`,
        token1: token1Result.result as `0x${string}`,
      };
    })
    .filter(
      (info): info is { pair: `0x${string}`; token0: `0x${string}`; token1: `0x${string}` } =>
        info != null,
    );

  const tokenAddresses = [
    ...new Set(
      baseInfo.flatMap((info) => [
        info.token0.toLowerCase(),
        info.token1.toLowerCase(),
      ]),
    ),
  ] as `0x${string}`[];

  const metadataCalls = tokenAddresses.flatMap((token) => [
    { address: token, abi: erc20Abi, functionName: "symbol" as const },
    { address: token, abi: erc20Abi, functionName: "decimals" as const },
  ]);
  const metadataResults =
    metadataCalls.length > 0
      ? await client.multicall({ contracts: metadataCalls })
      : [];

  const tokenMetadata = new Map<string, { symbol: string; decimals: number }>();
  for (let i = 0; i < tokenAddresses.length; i++) {
    const symbolResult = metadataResults[i * 2];
    const decimalsResult = metadataResults[i * 2 + 1];
    tokenMetadata.set(tokenAddresses[i]!.toLowerCase(), {
      symbol:
        symbolResult?.status === "success"
          ? String(symbolResult.result)
          : "TKN",
      decimals:
        decimalsResult?.status === "success"
          ? Number(decimalsResult.result)
          : 18,
    });
  }

  const infoMap = new Map<string, PairInfo>();
  for (const info of baseInfo) {
    const meta0 = tokenMetadata.get(info.token0.toLowerCase()) ?? {
      symbol: "TKN",
      decimals: 18,
    };
    const meta1 = tokenMetadata.get(info.token1.toLowerCase()) ?? {
      symbol: "TKN",
      decimals: 18,
    };
    infoMap.set(info.pair.toLowerCase(), {
      ...info,
      symbol0: meta0.symbol,
      symbol1: meta1.symbol,
      decimals0: meta0.decimals,
      decimals1: meta1.decimals,
    });
  }
  return infoMap;
}

/**
 * Fetch recent swap activities from all Eon AMM pair contracts.
 *
 * Swap history is emitted as pair logs, not stored in router state. Base RPC
 * free tier limits eth_getLogs to 10 blocks, so each scan is deliberately tiny.
 */
export async function fetchBlockchainSwapActivities(
  client: PublicClient,
  limit = 50,
  options: FetchBlockchainSwapActivitiesOptions = {},
): Promise<
  | { ok: true; activities: BlockchainSwapActivity[] }
  | { ok: false; error: string }
> {
  try {
    const chainId = EON_BASE_MAINNET.chainId;
    const factory = EON_BASE_MAINNET.amm.factory;
    const walletAddress = options.walletAddress;
    const pairs = await fetchEonAmmPairAddresses(client);
    const pairInfo = await fetchPairInfo(client, pairs);
    const cached = readActivityCache(chainId, factory, walletAddress);
    const cachedActivities =
      cached?.activities.map(deserializeActivity).filter(Boolean) ?? [];

    if (pairs.length === 0) {
      return { ok: true, activities: cachedActivities.slice(0, limit) };
    }

    const latestBlock = await client.getBlockNumber();
    const cachedScannedToBlock = cached ? BigInt(cached.scannedToBlock) : null;
    const firstScanStart =
      latestBlock > INITIAL_LOOKBACK_BLOCKS
        ? latestBlock - INITIAL_LOOKBACK_BLOCKS
        : 0n;
    const fromBlock =
      cachedScannedToBlock == null || cachedScannedToBlock < firstScanStart
        ? firstScanStart
        : cachedScannedToBlock + 1n;

    if (fromBlock > latestBlock) {
      return { ok: true, activities: cachedActivities.slice(0, limit) };
    }

    const allLogs = [];

    for (
      let batchStart = fromBlock;
      batchStart <= latestBlock;
      batchStart += LOG_BATCH_SIZE
    ) {
      const batchEnd =
        batchStart + LOG_BATCH_SIZE - 1n > latestBlock
          ? latestBlock
          : batchStart + LOG_BATCH_SIZE - 1n;

      try {
        const batchLogs = await client.getLogs({
          address: pairs,
          event: SWAP_EVENT,
          fromBlock: batchStart,
          toBlock: batchEnd,
        });
        allLogs.push(...batchLogs);
      } catch (err) {
        console.warn(
          `Swap log batch ${batchStart}-${batchEnd} failed, continuing...`,
          err,
        );
      }
    }

    const uniqueBlocks = [...new Set(allLogs.map((log) => log.blockNumber))];
    const blockTimestamps = new Map<bigint, number>();
    const uniqueTxHashes = [
      ...new Set(allLogs.map((log) => log.transactionHash).filter(Boolean)),
    ] as `0x${string}`[];
    const txSenders = new Map<string, `0x${string}`>();

    await Promise.all([
      ...uniqueBlocks.map(async (blockNum) => {
        try {
          const block = await client.getBlock({ blockNumber: blockNum });
          blockTimestamps.set(blockNum, Number(block.timestamp) * 1000);
        } catch (e) {
          console.warn(`Failed to fetch timestamp for block ${blockNum}`, e);
        }
      }),
      ...uniqueTxHashes.map(async (txHash) => {
        try {
          const tx = await client.getTransaction({ hash: txHash });
          txSenders.set(txHash.toLowerCase(), tx.from);
        } catch (e) {
          console.warn(`Failed to fetch sender for tx ${txHash}`, e);
        }
      }),
    ]);

    const freshActivities: BlockchainSwapActivity[] = allLogs
      .map((log) => {
        if (!log.args || !log.blockNumber || !log.transactionHash) return null;

        const { sender, amount0In, amount1In, amount0Out, amount1Out, to } =
          log.args as {
            sender: `0x${string}`;
            amount0In: bigint;
            amount1In: bigint;
            amount0Out: bigint;
            amount1Out: bigint;
            to: `0x${string}`;
          };
        const pairAddress = log.address as `0x${string}`;
        const info = pairInfo.get(pairAddress.toLowerCase());
        if (!info) return null;

        return {
          id: `${log.transactionHash}-${log.logIndex}`,
          pair: pairAddress,
          token0: info.token0,
          token1: info.token1,
          symbol0: info.symbol0,
          symbol1: info.symbol1,
          decimals0: info.decimals0,
          decimals1: info.decimals1,
          txHash: log.transactionHash,
          blockNumber: Number(log.blockNumber),
          timestamp: blockTimestamps.get(log.blockNumber) || Date.now(),
          from: txSenders.get(log.transactionHash.toLowerCase()) ?? sender,
          amount0In,
          amount1In,
          amount0Out,
          amount1Out,
          to,
        };
      })
      .filter(
        (activity): activity is BlockchainSwapActivity =>
          activity != null && matchesWalletActivity(activity, walletAddress),
      );

    const merged = [...freshActivities, ...cachedActivities]
      .filter(
        (activity, index, list) =>
          list.findIndex((item) => item.id === activity.id) === index,
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_CACHED_ACTIVITIES);

    writeActivityCache({
      chainId,
      factory,
      walletAddress,
      pairs,
      scannedToBlock: latestBlock.toString(),
      activities: merged.map(serializeActivity),
    });

    return { ok: true, activities: merged.slice(0, limit) };
  } catch (error) {
    console.error("Failed to fetch blockchain activities:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function fetchBlockchainSwapLeaderboard(
  client: PublicClient,
  limit = 50,
): Promise<
  | { ok: true; entries: BlockchainLeaderboardEntry[] }
  | { ok: false; error: string }
> {
  const result = await fetchBlockchainSwapActivities(client, MAX_CACHED_ACTIVITIES);
  if (!result.ok) return result;

  const byWallet = new Map<
    string,
    { address: `0x${string}`; successCount: number; lastSuccessAt: number }
  >();

  for (const activity of result.activities) {
    const key = activity.from.toLowerCase();
    const current = byWallet.get(key);
    if (!current) {
      byWallet.set(key, {
        address: activity.from,
        successCount: 1,
        lastSuccessAt: activity.timestamp,
      });
      continue;
    }
    current.successCount += 1;
    current.lastSuccessAt = Math.max(current.lastSuccessAt, activity.timestamp);
  }

  const entries = [...byWallet.values()]
    .sort(
      (a, b) =>
        b.successCount - a.successCount || b.lastSuccessAt - a.lastSuccessAt,
    )
    .slice(0, Math.min(100, Math.max(1, Math.floor(limit))))
    .map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));

  return { ok: true, entries };
}

/**
 * Format swap activity for display.
 */
export function formatSwapActivity(activity: BlockchainSwapActivity): string {
  const kind = activity.kind;
  if (kind) {
    const amount0 = activity.amount0 ?? activity.amount0In + activity.amount0Out;
    const amount1 = activity.amount1 ?? activity.amount1In + activity.amount1Out;
    const value0 = Number(formatUnits(amount0, activity.decimals0));
    const value1 = Number(formatUnits(amount1, activity.decimals1));
    const text0 = Number.isFinite(value0)
      ? value0.toFixed(value0 < 1 ? 6 : 4)
      : "0";
    const text1 = Number.isFinite(value1)
      ? value1.toFixed(value1 < 1 ? 6 : 4)
      : "0";

    switch (kind) {
      case "SWAP":
        return `Swap ${text0} ${activity.symbol0} / ${text1} ${activity.symbol1}`;
      case "LIQUIDITY_ADD":
        return `Added liquidity ${text0} ${activity.symbol0} + ${text1} ${activity.symbol1}`;
      case "LIQUIDITY_REMOVE":
        return `Removed liquidity ${text0} ${activity.symbol0} + ${text1} ${activity.symbol1}`;
      case "LP_TOKEN_MINT":
        return `LP tokens minted ${text0}`;
      case "FARM_DEPOSIT":
        return `Farm deposit ${text0}`;
      case "FARM_WITHDRAW":
        return `Farm withdraw ${text0}`;
      case "FARM_EMERGENCY_WITHDRAW":
        return `Emergency farm withdraw ${text0}`;
      case "FARM_HARVEST":
        return `Farm harvest ${text0}`;
      case "VESTING_GRANT":
        return `Vesting grant ${text0}`;
      case "VESTING_CLAIM":
        return `Vesting claim ${text0}`;
      case "AIRDROP_CLAIM":
        return `Airdrop claim ${text0}`;
      case "REFERRAL_REGISTERED":
        return "Referral registered";
      case "REFERRAL_SWAP":
        return `Referral swap volume ${text0}`;
      case "REFERRAL_REWARD_CLAIM":
        return `Referral reward claim ${text0}`;
      default:
        return kind.replaceAll("_", " ").toLowerCase();
    }
  }

  const token0In = activity.amount0In > 0n;
  const inputAmount = token0In ? activity.amount0In : activity.amount1In;
  const outputAmount = token0In ? activity.amount1Out : activity.amount0Out;
  const inputDecimals = token0In ? activity.decimals0 : activity.decimals1;
  const outputDecimals = token0In ? activity.decimals1 : activity.decimals0;
  const inputSymbol = token0In ? activity.symbol0 : activity.symbol1;
  const outputSymbol = token0In ? activity.symbol1 : activity.symbol0;

  const input = Number(formatUnits(inputAmount, inputDecimals));
  const output = Number(formatUnits(outputAmount, outputDecimals));

  const inputText = Number.isFinite(input) ? input.toFixed(input < 1 ? 6 : 4) : "0";
  const outputText = Number.isFinite(output)
    ? output.toFixed(output < 1 ? 6 : 4)
    : "0";

  return `Swapped ${inputText} ${inputSymbol} -> ${outputText} ${outputSymbol}`;
}
