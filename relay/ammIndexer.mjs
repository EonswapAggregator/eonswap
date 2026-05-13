import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAbi } from "viem";
import { createFallbackPublicClient, rpcUrlsFromEnv, wsRpcUrlsFromEnv } from "./rpc.mjs";

const FACTORY_ABI = parseAbi([
  "event PairCreated(address indexed token0, address indexed token1, address pair, uint256)",
  "function allPairs(uint256) view returns (address)",
  "function allPairsLength() view returns (uint256)",
]);

const PAIR_ABI = parseAbi([
  "event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)",
  "event Sync(uint112 reserve0, uint112 reserve1)",
  "event Mint(address indexed sender, uint256 amount0, uint256 amount1)",
  "event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function totalSupply() view returns (uint256)",
]);

const ERC20_ABI = parseAbi([
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
]);

const ZERO_STATE = {
  chainId: 8453,
  factoryAddress: "",
  lastProcessedBlock: "0",
  lastSafeBlock: "0",
  pairs: {},
  processedLogs: {},
};

const __dirname = dirname(fileURLToPath(import.meta.url));

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  try {
    await rename(tmp, path);
  } catch (error) {
    if (error?.code !== "EPERM" && error?.code !== "EEXIST") throw error;
    await rm(path, { force: true });
    await rename(tmp, path);
  }
}

function logId(log) {
  return `${log.blockHash}:${log.transactionHash}:${log.logIndex}`;
}

export class AmmIndexerService {
  constructor({
    chainId = 8453,
    factoryAddress,
    dataDir = process.env.INDEXER_DATA_DIR || join(__dirname, "data", "indexer"),
    confirmations = Number(process.env.INDEXER_CONFIRMATIONS || 8),
    batchBlocks = Number(process.env.INDEXER_BATCH_BLOCKS || 500),
    startBlock = process.env.INDEXER_START_BLOCK || "0",
  }) {
    if (!factoryAddress) throw new Error("INDEXER_FACTORY_ADDRESS is required.");
    this.chainId = chainId;
    this.factoryAddress = factoryAddress;
    this.confirmations = confirmations;
    this.batchBlocks = BigInt(Math.max(1, batchBlocks));
    this.startBlock = BigInt(String(startBlock || "0"));
    this.statePath = join(dataDir, `amm-${chainId}.json`);
    this.eventsPath = join(dataDir, `amm-${chainId}.jsonl`);
    this.publicClient = createFallbackPublicClient({
      chainId,
      rpcUrls: rpcUrlsFromEnv("INDEXER"),
      wsRpcUrls: wsRpcUrlsFromEnv("INDEXER"),
      preferWebSocket: false,
    });
    this.hasWebSocketWatch = wsRpcUrlsFromEnv("INDEXER").length > 0;
    this.watchClient = createFallbackPublicClient({
      chainId,
      rpcUrls: rpcUrlsFromEnv("INDEXER"),
      wsRpcUrls: wsRpcUrlsFromEnv("INDEXER"),
      preferWebSocket: this.hasWebSocketWatch,
    });
    this.state = { ...ZERO_STATE, chainId, factoryAddress };
    this.unwatchers = [];
    this.running = false;
  }

  async start() {
    this.state = await readJson(this.statePath, {
      ...ZERO_STATE,
      chainId: this.chainId,
      factoryAddress: this.factoryAddress,
    });
    await this.loadPairs();
    await this.backfill();
    if (this.hasWebSocketWatch) {
      this.watchFactory();
      this.watchPairs();
    }
    this.interval = setInterval(() => void this.backfill(), 30_000);
    console.log(`[AmmIndexer] started for ${Object.keys(this.state.pairs).length} pairs`);
  }

  stop() {
    for (const unwatch of this.unwatchers) unwatch();
    this.unwatchers = [];
    if (this.interval) clearInterval(this.interval);
  }

  async persist() {
    const keys = Object.keys(this.state.processedLogs || {});
    if (keys.length > 20_000) {
      const keep = keys.slice(-10_000);
      this.state.processedLogs = Object.fromEntries(keep.map((key) => [key, true]));
    }
    await writeJsonAtomic(this.statePath, this.state);
  }

  async appendEvent(event) {
    await mkdir(dirname(this.eventsPath), { recursive: true });
    await writeFile(this.eventsPath, `${JSON.stringify(event)}\n`, {
      flag: "a",
      encoding: "utf8",
    });
  }

  async loadPairs() {
    const length = await this.publicClient.readContract({
      address: this.factoryAddress,
      abi: FACTORY_ABI,
      functionName: "allPairsLength",
    });
    const calls = Array.from({ length: Number(length) }, (_, i) => ({
      address: this.factoryAddress,
      abi: FACTORY_ABI,
      functionName: "allPairs",
      args: [BigInt(i)],
    }));
    const results = calls.length ? await this.publicClient.multicall({ contracts: calls }) : [];
    for (const result of results) {
      if (result.status !== "success") continue;
      await this.addPair(result.result);
    }
    await this.persist();
  }

  async addPair(pairAddress, known = {}) {
    const pair = String(pairAddress).toLowerCase();
    if (this.state.pairs[pair]) return false;
    const [token0, token1, reserves, totalSupply] = await Promise.all([
      known.token0 || this.publicClient.readContract({ address: pairAddress, abi: PAIR_ABI, functionName: "token0" }),
      known.token1 || this.publicClient.readContract({ address: pairAddress, abi: PAIR_ABI, functionName: "token1" }),
      this.publicClient.readContract({ address: pairAddress, abi: PAIR_ABI, functionName: "getReserves" }).catch(() => [0n, 0n, 0]),
      this.publicClient.readContract({ address: pairAddress, abi: PAIR_ABI, functionName: "totalSupply" }).catch(() => 0n),
    ]);
    const [symbol0, decimals0, symbol1, decimals1] = await Promise.all([
      this.publicClient.readContract({ address: token0, abi: ERC20_ABI, functionName: "symbol" }).catch(() => "TKN"),
      this.publicClient.readContract({ address: token0, abi: ERC20_ABI, functionName: "decimals" }).catch(() => 18),
      this.publicClient.readContract({ address: token1, abi: ERC20_ABI, functionName: "symbol" }).catch(() => "TKN"),
      this.publicClient.readContract({ address: token1, abi: ERC20_ABI, functionName: "decimals" }).catch(() => 18),
    ]);
    this.state.pairs[pair] = {
      address: pair,
      token0: String(token0).toLowerCase(),
      token1: String(token1).toLowerCase(),
      symbol0: String(symbol0),
      symbol1: String(symbol1),
      decimals0: Number(decimals0),
      decimals1: Number(decimals1),
      reserve0: String(reserves[0] || 0n),
      reserve1: String(reserves[1] || 0n),
      totalSupply: String(totalSupply || 0n),
      createdAt: Date.now(),
    };
    await this.appendEvent({ type: "pair", pair: this.state.pairs[pair], indexedAt: Date.now() });
    return true;
  }

  async backfill() {
    if (this.running) return;
    this.running = true;
    try {
      const latest = await this.publicClient.getBlockNumber();
      const safe = latest > BigInt(this.confirmations) ? latest - BigInt(this.confirmations) : 0n;
      let from = BigInt(this.state.lastProcessedBlock || "0") + 1n;
      if (from === 1n) from = this.startBlock;
      while (from <= safe) {
        const to = from + this.batchBlocks - 1n > safe ? safe : from + this.batchBlocks - 1n;
        await this.indexRange(from, to);
        this.state.lastProcessedBlock = to.toString();
        this.state.lastSafeBlock = safe.toString();
        await this.persist();
        from = to + 1n;
      }
    } finally {
      this.running = false;
    }
  }

  async indexRange(fromBlock, toBlock) {
    const pairs = Object.keys(this.state.pairs);
    const [pairLogs, factoryLogs] = await Promise.all([
      pairs.length
        ? this.publicClient.getLogs({
            address: pairs,
            events: PAIR_ABI.filter((item) => item.type === "event"),
            fromBlock,
            toBlock,
          })
        : [],
      this.publicClient.getLogs({
        address: this.factoryAddress,
        event: FACTORY_ABI[0],
        fromBlock,
        toBlock,
      }),
    ]);
    await this.handleFactoryLogs(factoryLogs);
    await this.handlePairLogs(pairLogs);
  }

  watchFactory() {
    this.unwatchers.push(
      this.watchClient.watchContractEvent({
        address: this.factoryAddress,
        abi: FACTORY_ABI,
        eventName: "PairCreated",
        onLogs: (logs) => void this.handleFactoryLogs(logs),
        onError: (error) => console.error("[AmmIndexer] factory watcher", error),
      }),
    );
  }

  watchPairs() {
    const pairs = Object.keys(this.state.pairs);
    if (!pairs.length) return;
    this.unwatchers.push(
      this.watchClient.watchContractEvent({
        address: pairs,
        abi: PAIR_ABI,
        onLogs: (logs) => void this.handlePairLogs(logs),
        onError: (error) => console.error("[AmmIndexer] pair watcher", error),
      }),
    );
  }

  async handleFactoryLogs(logs) {
    let changed = false;
    for (const log of logs) {
      const id = logId(log);
      if (this.state.processedLogs[id]) continue;
      this.state.processedLogs[id] = true;
      const added = await this.addPair(log.args.pair, {
        token0: log.args.token0,
        token1: log.args.token1,
      });
      changed ||= added;
    }
    if (changed) {
      for (const unwatch of this.unwatchers.splice(1)) unwatch();
      this.watchPairs();
    }
    await this.persist();
  }

  async handlePairLogs(logs) {
    const uniqueBlocks = [...new Set(logs.map((log) => log.blockNumber).filter(Boolean))];
    const uniqueTxHashes = [...new Set(logs.map((log) => log.transactionHash).filter(Boolean))];
    const blockTimestamps = new Map();
    const txSenders = new Map();

    await Promise.all([
      ...uniqueBlocks.map(async (blockNumber) => {
        try {
          const block = await this.publicClient.getBlock({ blockNumber });
          blockTimestamps.set(String(blockNumber), Number(block.timestamp) * 1000);
        } catch {
          // Timestamp is best-effort. The event still remains usable.
        }
      }),
      ...uniqueTxHashes.map(async (txHash) => {
        try {
          const tx = await this.publicClient.getTransaction({ hash: txHash });
          txSenders.set(String(txHash).toLowerCase(), tx.from);
        } catch {
          // Sender is best-effort. Fall back to event sender below.
        }
      }),
    ]);

    for (const log of logs) {
      const id = logId(log);
      if (this.state.processedLogs[id]) continue;
      this.state.processedLogs[id] = true;
      const pair = String(log.address).toLowerCase();
      if (log.eventName === "Sync" && this.state.pairs[pair]) {
        this.state.pairs[pair].reserve0 = String(log.args.reserve0);
        this.state.pairs[pair].reserve1 = String(log.args.reserve1);
        this.state.pairs[pair].updatedAt = Date.now();
      }
      await this.appendEvent({
        type: log.eventName,
        chainId: this.chainId,
        pair,
        txHash: log.transactionHash,
        logIndex: Number(log.logIndex),
        blockNumber: Number(log.blockNumber),
        timestamp: blockTimestamps.get(String(log.blockNumber)) || Date.now(),
        from: txSenders.get(String(log.transactionHash).toLowerCase()) || log.args?.sender,
        args: Object.fromEntries(
          Object.entries(log.args || {}).map(([key, value]) => [key, typeof value === "bigint" ? value.toString() : value]),
        ),
        indexedAt: Date.now(),
      });
    }
    await this.persist();
  }

  async getSwapActivities({ limit = 100, walletAddress } = {}) {
    const raw = await readFile(this.eventsPath, "utf8").catch(() => "");
    const wallet = walletAddress ? String(walletAddress).toLowerCase() : "";
    const rows = raw
      .split(/\r?\n/u)
      .filter(Boolean)
      .reverse();
    const activities = [];

    for (const row of rows) {
      if (activities.length >= limit) break;
      let event;
      try {
        event = JSON.parse(row);
      } catch {
        continue;
      }
      if (event.type !== "Swap") continue;
      const pair = this.state.pairs?.[String(event.pair).toLowerCase()];
      if (!pair) continue;
      const args = event.args || {};
      const from = String(event.from || args.sender || "0x0000000000000000000000000000000000000000");
      const to = String(args.to || "0x0000000000000000000000000000000000000000");
      if (wallet && from.toLowerCase() !== wallet && to.toLowerCase() !== wallet) continue;
      activities.push({
        id: `${event.txHash}-${event.logIndex}`,
        pair: pair.address,
        token0: pair.token0,
        token1: pair.token1,
        symbol0: pair.symbol0 || "TKN",
        symbol1: pair.symbol1 || "TKN",
        decimals0: Number(pair.decimals0 ?? 18),
        decimals1: Number(pair.decimals1 ?? 18),
        txHash: event.txHash,
        blockNumber: Number(event.blockNumber || 0),
        timestamp: Number(event.timestamp || event.indexedAt || Date.now()),
        from,
        amount0In: String(args.amount0In || "0"),
        amount1In: String(args.amount1In || "0"),
        amount0Out: String(args.amount0Out || "0"),
        amount1Out: String(args.amount1Out || "0"),
        to,
      });
    }

    return activities;
  }
}

export async function createAmmIndexerFromEnv() {
  const enabled = String(process.env.INDEXER_ENABLED || "").toLowerCase();
  if (enabled === "0" || enabled === "false") return null;
  const factoryAddress = process.env.INDEXER_FACTORY_ADDRESS || process.env.EON_FACTORY_ADDRESS;
  if (enabled !== "1" && !factoryAddress) return null;
  const indexer = new AmmIndexerService({
    chainId: Number(process.env.INDEXER_CHAIN_ID || 8453),
    factoryAddress,
    startBlock: process.env.INDEXER_START_BLOCK || "0",
  });
  await indexer.start();
  return indexer;
}
