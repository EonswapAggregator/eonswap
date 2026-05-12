import type { VercelRequest, VercelResponse } from "@vercel/node";

const CHAIN_ID = 8453;
const PAIR_ESTF_WETH = "0x539e2da338ca3ae9b5fedc6d102978a741b641cf";
const DEFAULT_RPC_URL = "https://mainnet.base.org";
const SWAP_TOPIC =
  "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822";
const DEFAULT_LOOKBACK_BLOCKS = 10_000n;
const MAX_LOOKBACK_BLOCKS = 100_000n;
const LOG_BATCH_SIZE = 250n;
const MAX_CACHED_ACTIVITIES = 500;
const MAX_LIMIT = 100;

type RpcLog = {
  address: string;
  blockNumber: `0x${string}`;
  transactionHash: `0x${string}`;
  logIndex: `0x${string}`;
  data: `0x${string}`;
  topics: `0x${string}`[];
};

type IndexedSwapActivity = {
  id: string;
  txHash: `0x${string}`;
  blockNumber: number;
  timestamp: number;
  from: `0x${string}`;
  amount0In: string;
  amount1In: string;
  amount0Out: string;
  amount1Out: string;
  to: `0x${string}`;
};

type ActivityCache = {
  scannedToBlock: bigint;
  activities: IndexedSwapActivity[];
  blockTimestamps: Map<string, number>;
};

const cache: ActivityCache = {
  scannedToBlock: 0n,
  activities: [],
  blockTimestamps: new Map(),
};

let indexingPromise: Promise<void> | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "s-maxage=10, stale-while-revalidate=30");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const limit = clampLimit(req.query.limit);

  try {
    const lookbackBlocks = clampLookbackBlocks(req.query.lookbackBlocks);

    if (!indexingPromise) {
      indexingPromise = refreshIndex(lookbackBlocks).finally(() => {
        indexingPromise = null;
      });
    }

    await indexingPromise;

    return res.status(200).json({
      data: cache.activities.slice(0, limit),
      meta: {
        chainId: CHAIN_ID,
        pair: PAIR_ESTF_WETH,
        scannedToBlock: cache.scannedToBlock.toString(),
        cached: cache.activities.length,
      },
    });
  } catch (error) {
    console.error("Activity index error:", error);
    return res.status(500).json({
      error: "Failed to index activity",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function refreshIndex(lookbackBlocks: bigint): Promise<void> {
  const latestBlock = await rpc<`0x${string}`>("eth_blockNumber", []);
  const latest = BigInt(latestBlock);
  const firstScanStart =
    latest > lookbackBlocks ? latest - lookbackBlocks : 0n;
  const fromBlock =
    cache.scannedToBlock > 0n ? cache.scannedToBlock + 1n : firstScanStart;

  if (fromBlock > latest) return;

  const logs: RpcLog[] = [];

  for (
    let batchStart = fromBlock;
    batchStart <= latest;
    batchStart += LOG_BATCH_SIZE
  ) {
    const batchEnd =
      batchStart + LOG_BATCH_SIZE - 1n > latest
        ? latest
        : batchStart + LOG_BATCH_SIZE - 1n;

    const batchLogs = await rpc<RpcLog[]>("eth_getLogs", [
      {
        address: PAIR_ESTF_WETH,
        topics: [SWAP_TOPIC],
        fromBlock: toHex(batchStart),
        toBlock: toHex(batchEnd),
      },
    ]);
    logs.push(...batchLogs);
  }

  const freshActivities = await Promise.all(logs.map(logToActivity));
  const merged = [...freshActivities, ...cache.activities]
    .filter(
      (activity, index, list) =>
        list.findIndex((item) => item.id === activity.id) === index,
    )
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_CACHED_ACTIVITIES);

  cache.activities = merged;
  cache.scannedToBlock = latest;
}

async function logToActivity(log: RpcLog): Promise<IndexedSwapActivity> {
  const blockNumber = BigInt(log.blockNumber);
  const timestamp = await getBlockTimestamp(blockNumber);
  const amounts = decodeSwapAmounts(log.data);

  return {
    id: `${log.transactionHash}-${Number(BigInt(log.logIndex))}`,
    txHash: log.transactionHash,
    blockNumber: Number(blockNumber),
    timestamp,
    from: topicToAddress(log.topics[1]),
    amount0In: amounts[0],
    amount1In: amounts[1],
    amount0Out: amounts[2],
    amount1Out: amounts[3],
    to: topicToAddress(log.topics[2]),
  };
}

async function getBlockTimestamp(blockNumber: bigint): Promise<number> {
  const key = blockNumber.toString();
  const cached = cache.blockTimestamps.get(key);
  if (cached != null) return cached;

  const block = await rpc<{ timestamp: `0x${string}` }>("eth_getBlockByNumber", [
    toHex(blockNumber),
    false,
  ]);
  const timestamp = Number(BigInt(block.timestamp)) * 1000;
  cache.blockTimestamps.set(key, timestamp);
  return timestamp;
}

function decodeSwapAmounts(data: `0x${string}`): [string, string, string, string] {
  const raw = data.slice(2);
  return [0, 1, 2, 3].map((index) => {
    const start = index * 64;
    return BigInt(`0x${raw.slice(start, start + 64)}`).toString();
  }) as [string, string, string, string];
}

function topicToAddress(topic: `0x${string}` | undefined): `0x${string}` {
  if (!topic) return "0x0000000000000000000000000000000000000000";
  return `0x${topic.slice(-40)}`;
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(getRpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      id: 1,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const json = await response.json();
  if (json.error) {
    throw new Error(json.error.message || `${method} failed`);
  }

  return json.result as T;
}

function getRpcUrl(): string {
  if (process.env.BASE_RPC_URL) return process.env.BASE_RPC_URL;
  if (process.env.VITE_ALCHEMY_API_KEY) {
    return `https://base-mainnet.g.alchemy.com/v2/${process.env.VITE_ALCHEMY_API_KEY}`;
  }
  return DEFAULT_RPC_URL;
}

function clampLimit(input: string | string[] | undefined): number {
  const value = Array.isArray(input) ? input[0] : input;
  const parsed = Number(value ?? 50);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(parsed)));
}

function clampLookbackBlocks(input: string | string[] | undefined): bigint {
  const value = Array.isArray(input) ? input[0] : input;
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return DEFAULT_LOOKBACK_BLOCKS;

  const parsed = BigInt(Math.max(0, Math.floor(numeric)));
  if (parsed <= 0n) return DEFAULT_LOOKBACK_BLOCKS;
  return parsed > MAX_LOOKBACK_BLOCKS ? MAX_LOOKBACK_BLOCKS : parsed;
}

function toHex(value: bigint): `0x${string}` {
  return `0x${value.toString(16)}`;
}
