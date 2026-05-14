import { appendFile, mkdir, readFile, stat, rename } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { URL, fileURLToPath } from "node:url";
import {
  createTrackerFromEnv,
  ReferralTrackerService,
} from "./referralTracker.mjs";
import { createAmmIndexerFromEnv } from "./ammIndexer.mjs";
import { TelegramRetryQueue } from "./telegramQueue.mjs";

// Global tracker instance for on-chain tracking
let referralTracker = null;
let ammIndexer = null;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACTIVITY_LOG_PATH =
  process.env.RELAY_ACTIVITY_LOG_PATH?.trim() ||
  join(__dirname, "data", "activities.jsonl");
const TX_EVENT_LOG_PATH =
  process.env.RELAY_TX_EVENT_LOG_PATH?.trim() ||
  join(__dirname, "data", "tx-events.jsonl");
const REFERRAL_LOG_PATH =
  process.env.RELAY_REFERRAL_LOG_PATH?.trim() ||
  join(__dirname, "data", "referrals.jsonl");
const TELEGRAM_QUEUE_PATH =
  process.env.RELAY_TELEGRAM_QUEUE_PATH?.trim() ||
  join(__dirname, "data", "telegram-queue.json");
const TELEGRAM_DEAD_LETTER_PATH =
  process.env.RELAY_TELEGRAM_DEAD_LETTER_PATH?.trim() ||
  join(__dirname, "data", "telegram-dead-letter.json");
const RELAY_ADMIN_SECRET = process.env.RELAY_ADMIN_SECRET?.trim() || "";
const DEFAULT_EONSWAP_SUBGRAPH_ID =
  "FoKBv95x7Z8uMuBZsBTkHKyHFGE9DTVVicwHp3U3eT5s";
const THE_GRAPH_API_KEY =
  process.env.THE_GRAPH_API_KEY?.trim() ||
  process.env.GRAPH_API_KEY?.trim() ||
  process.env.THE_GRAPH_GATEWAY_API_KEY?.trim() ||
  "";
const THE_GRAPH_SUBGRAPH_ID =
  process.env.THE_GRAPH_SUBGRAPH_ID?.trim() || DEFAULT_EONSWAP_SUBGRAPH_ID;
const THE_GRAPH_SUBGRAPH_URL =
  process.env.THE_GRAPH_SUBGRAPH_URL?.trim() ||
  process.env.RELAY_SUBGRAPH_URL?.trim() ||
  "";
const THE_GRAPH_CACHE_MS = Number(process.env.THE_GRAPH_CACHE_MS || 30_000);
console.log(
  `[relay] The Graph gateway ${isTheGraphConfigured() ? "configured" : "not configured"} ` +
    `(subgraph=${THE_GRAPH_SUBGRAPH_ID}, cacheMs=${THE_GRAPH_CACHE_MS})`,
);

const PORT = Number(process.env.PORT || process.env.RELAY_PORT || 8787);
/** Railway/Render/Fly expect HTTP on $PORT and often require binding all interfaces. */
const LISTEN_HOST = process.env.HOST?.trim() || "0.0.0.0";
const CHECK_TIMEOUT_MS = 12_000;
const POLL_MS = 300_000;
const ALERT_WEBHOOK_URL = process.env.RELAY_ALERT_WEBHOOK_URL?.trim() || "";
const ALERT_COOLDOWN_MS = Number(
  process.env.RELAY_ALERT_COOLDOWN_MS || 180_000,
);
const TELEGRAM_BOT_TOKEN = process.env.RELAY_TELEGRAM_BOT_TOKEN?.trim() || "";
const TELEGRAM_CHAT_ID = process.env.RELAY_TELEGRAM_CHAT_ID?.trim() || "";
const TELEGRAM_BANNER_URL = process.env.RELAY_TELEGRAM_BANNER_URL?.trim() || "";
const TELEGRAM_BANNER_LOCAL_PATH =
  process.env.RELAY_TELEGRAM_BANNER_LOCAL_PATH?.trim() ||
  join(__dirname, "..", "public", "hero-banner.png");
/** Comma-separated list, or `*` when unset / empty (dev). Entries match after trimming trailing `/`. */
// Require explicit allowed origin in production; default to empty (no wildcard)
const RELAY_CORS_RAW = process.env.RELAY_ALLOWED_ORIGIN?.trim() ?? "";
const CORS_ALLOW_ALL = RELAY_CORS_RAW === "*";
function normalizeCorsOrigin(s) {
  return String(s).trim().replace(/\/+$/u, "");
}
const CORS_ALLOWED_NORMALIZED = CORS_ALLOW_ALL
  ? new Set()
  : new Set(
      RELAY_CORS_RAW.split(",")
        .map((s) => normalizeCorsOrigin(s))
        .filter(Boolean),
    );

function corsOriginHeader(req) {
  if (CORS_ALLOW_ALL) return "*";
  const o = String(req.headers.origin ?? "").trim();
  if (!o) return null;
  if (CORS_ALLOWED_NORMALIZED.has(normalizeCorsOrigin(o))) return o;
  return null;
}
const EVENT_RATE_LIMIT_PER_MIN = Number(
  process.env.RELAY_EVENTS_RATE_LIMIT_PER_MIN || 60,
);
const EXPLORER_RATE_LIMIT_PER_MIN = Number(
  process.env.RELAY_EXPLORER_RATE_LIMIT_PER_MIN || 20,
);
const LEADERBOARD_RATE_LIMIT_PER_MIN = Number(
  process.env.RELAY_LEADERBOARD_RATE_LIMIT_PER_MIN || 30,
);
const EVENT_MAX_BODY_BYTES = Number(
  process.env.RELAY_EVENTS_MAX_BODY_BYTES || 262_144,
);
const EXPLORER_ACCESS_TOKEN =
  process.env.RELAY_EXPLORER_ACCESS_TOKEN?.trim() || "";
const WARN_LATENCY_MS = {
  eonswap: Number(process.env.RELAY_WARN_EONSWAP_MS || 2500),
  coingecko: Number(process.env.RELAY_WARN_COINGECKO_MS || 2500),
  etherscan: Number(process.env.RELAY_WARN_ETHERSCAN_MS || 3000),
};

// Log rotation / size limits
const MAX_LOG_BYTES = Number(
  process.env.RELAY_MAX_LOG_BYTES || 10 * 1024 * 1024,
); // 10MB

if (!RELAY_ADMIN_SECRET) {
  if (process.env.NODE_ENV === "production") {
    console.error(
      "FATAL: RELAY_ADMIN_SECRET must be set in production. Exiting.",
    );
    process.exit(1);
  } else {
    console.warn(
      "Warning: RELAY_ADMIN_SECRET is not set; running in insecure mode.",
    );
  }
}

const windows = {
  h1: 60 * 60 * 1000,
  h24: 24 * 60 * 60 * 1000,
};

const samples = {
  eonswap: [],
  coingecko: [],
  etherscan: [],
};

const status = {
  checkedAt: null,
  providers: {
    eonswap: {
      ok: false,
      detail: "not checked",
      latencyMs: null,
      h1: 100,
      h24: 100,
    },
    coingecko: {
      ok: false,
      detail: "not checked",
      latencyMs: null,
      h1: 100,
      h24: 100,
    },
    etherscan: {
      ok: false,
      detail: "not checked",
      latencyMs: null,
      h1: 100,
      h24: 100,
    },
  },
};
let lastAlertAt = 0;
const eventRateMap = new Map();
const explorerRateMap = new Map();
const leaderboardRateMap = new Map();
const referralRateMap = new Map();
const recentTxEvents = new Map();
const subgraphCache = new Map();

function getTheGraphEndpoint() {
  if (THE_GRAPH_SUBGRAPH_URL) return THE_GRAPH_SUBGRAPH_URL;
  if (THE_GRAPH_API_KEY) {
    return `https://gateway.thegraph.com/api/${THE_GRAPH_API_KEY}/subgraphs/id/${THE_GRAPH_SUBGRAPH_ID}`;
  }
  return `https://gateway.thegraph.com/api/subgraphs/id/${THE_GRAPH_SUBGRAPH_ID}`;
}

function isTheGraphConfigured() {
  return Boolean(THE_GRAPH_SUBGRAPH_URL || THE_GRAPH_API_KEY);
}

function normalizeTimestampMs(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return Date.now();
  return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
}

function normalizeGraphAddress(value, fallback = "0x0000000000000000000000000000000000000000") {
  const address = String(value || "").toLowerCase();
  return /^0x[a-f0-9]{40}$/u.test(address) ? address : fallback;
}

function graphCacheGet(key) {
  const entry = subgraphCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    subgraphCache.delete(key);
    return null;
  }
  return entry.value;
}

function graphCacheSet(key, value, ttlMs = THE_GRAPH_CACHE_MS) {
  if (ttlMs <= 0) return;
  subgraphCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

async function queryTheGraph(
  query,
  variables = {},
  cacheKey = "",
  cacheTtlMs = THE_GRAPH_CACHE_MS,
) {
  if (!isTheGraphConfigured()) {
    throw new Error("The Graph gateway is not configured");
  }
  if (cacheKey) {
    const cached = graphCacheGet(cacheKey);
    if (cached) return cached;
  }

  const headers = {
    accept: "application/json",
    "content-type": "application/json",
  };
  if (THE_GRAPH_API_KEY && THE_GRAPH_SUBGRAPH_URL) {
    headers.authorization = `Bearer ${THE_GRAPH_API_KEY}`;
  }

  const response = await fetch(getTheGraphEndpoint(), {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.errors?.[0]?.message || payload?.error || response.statusText;
    throw new Error(`The Graph HTTP ${response.status}: ${String(detail).slice(0, 180)}`);
  }
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    throw new Error(String(payload.errors[0]?.message || "The Graph query failed").slice(0, 180));
  }
  const data = payload?.data || {};
  if (cacheKey) graphCacheSet(cacheKey, data, cacheTtlMs);
  return data;
}

async function fetchSubgraphSwapActivities({ limit = 100, walletAddress } = {}) {
  const capped = Math.min(500, Math.max(1, Math.floor(Number(limit) || 100)));
  const wallet = walletAddress ? normalizeGraphAddress(walletAddress, "") : "";
  const walletVar = wallet ? ", $wallet: String!" : "";
  const where = wallet ? ", where: { wallet: $wallet }" : "";
  const query = `
    query EonSwapActivities($first: Int!${walletVar}) {
      activities(first: $first, orderBy: timestamp, orderDirection: desc${where}) {
        id
        type
        pair {
          id
          address
          token0 { id address symbol decimals }
          token1 { id address symbol decimals }
        }
        token0 { id address symbol decimals }
        token1 { id address symbol decimals }
        wallet { id }
        amount0
        amount1
        points
        txHash
        logIndex
        blockNumber
        timestamp
      }
    }
  `;
  const variables = wallet ? { first: capped, wallet } : { first: capped };
  const data = await queryTheGraph(
    query,
    variables,
    `swaps:${capped}:${wallet || "global"}`,
  );

  return (Array.isArray(data.activities) ? data.activities : []).map((activity) => {
    const pair = activity?.pair || {};
    const token0 = activity.token0 || pair.token0 || {};
    const token1 = activity.token1 || pair.token1 || {};
    const amount0 = String(activity.amount0 || "0");
    const amount1 = String(activity.amount1 || "0");
    return {
      id: String(activity.id || `${activity.txHash || "0x"}-${activity.logIndex || 0}`),
      kind: String(activity.type || "ACTIVITY"),
      pair: normalizeGraphAddress(pair.address || pair.id),
      token0: normalizeGraphAddress(token0.address || token0.id),
      token1: normalizeGraphAddress(token1.address || token1.id),
      symbol0: String(token0.symbol || "TKN"),
      symbol1: String(token1.symbol || "TKN"),
      decimals0: Number(token0.decimals ?? 18),
      decimals1: Number(token1.decimals ?? 18),
      txHash: String(activity.txHash || "0x"),
      blockNumber: Number(activity.blockNumber || 0),
      timestamp: normalizeTimestampMs(activity.timestamp),
      from: normalizeGraphAddress(activity.wallet?.id),
      amount0,
      amount1,
      amount0In: amount0,
      amount1In: amount1,
      amount0Out: "0",
      amount1Out: "0",
      points: String(activity.points || "0"),
      to: normalizeGraphAddress(activity.wallet?.id),
    };
  });
}

async function fetchSubgraphLeaderboard(limit = 50) {
  const capped = Math.min(100, Math.max(1, Math.floor(Number(limit) || 50)));
  const query = `
    query EonSwapLeaderboard($first: Int!) {
      wallets(first: $first, orderBy: totalPoints, orderDirection: desc, where: { totalPoints_gt: 0 }) {
        id
        swapCount
        liquidityEventCount
        farmEventCount
        referralCount
        totalWethVolume
        totalPoints
        swapPoints
        liquidityPoints
        farmPoints
        referralPoints
        updatedAt
      }
    }
  `;
  const data = await queryTheGraph(query, { first: capped }, `leaderboard:${capped}`);
  return (Array.isArray(data.wallets) ? data.wallets : []).map((wallet, index) => ({
    rank: index + 1,
    address: normalizeGraphAddress(wallet.id),
    successCount: Number(wallet.swapCount || 0),
    activityCount:
      Number(wallet.swapCount || 0) +
      Number(wallet.liquidityEventCount || 0) +
      Number(wallet.farmEventCount || 0) +
      Number(wallet.referralCount || 0),
    liquidityEventCount: Number(wallet.liquidityEventCount || 0),
    farmEventCount: Number(wallet.farmEventCount || 0),
    referralCount: Number(wallet.referralCount || 0),
    totalWethVolume: String(wallet.totalWethVolume || "0"),
    totalPoints: String(wallet.totalPoints || "0"),
    swapPoints: String(wallet.swapPoints || "0"),
    liquidityPoints: String(wallet.liquidityPoints || "0"),
    farmPoints: String(wallet.farmPoints || "0"),
    referralPoints: String(wallet.referralPoints || "0"),
    tier: leaderboardTier({
      activityCount:
        Number(wallet.swapCount || 0) +
        Number(wallet.liquidityEventCount || 0) +
        Number(wallet.farmEventCount || 0) +
        Number(wallet.referralCount || 0),
      totalPoints: String(wallet.totalPoints || "0"),
    }),
    lastSuccessAt: normalizeTimestampMs(wallet.updatedAt),
  }));
}

function leaderboardTier({ activityCount = 0, totalPoints = "0" } = {}) {
  let points = 0n;
  try {
    points = BigInt(String(totalPoints || "0"));
  } catch {
    points = 0n;
  }
  if (activityCount >= 100 || points >= 100000000000000000000n) return "Diamond";
  if (activityCount >= 50 || points >= 50000000000000000000n) return "Platinum";
  if (activityCount >= 20 || points >= 10000000000000000000n) return "Gold";
  if (activityCount >= 5 || points > 0n) return "Silver";
  return "Bronze";
}

function classifyError(error) {
  const msg = String(error?.message || error || "");
  if (/abort|timeout/i.test(msg)) return "Timeout";
  if (/429|rate/i.test(msg)) return "Rate limited (429)";
  if (/cors/i.test(msg)) return "CORS blocked";
  return msg.slice(0, 120) || "Unknown error";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function explorerTxUrl(chainId, txHash) {
  const prefixByChain = {
    1: "https://etherscan.io/tx/",
    10: "https://optimistic.etherscan.io/tx/",
    56: "https://bscscan.com/tx/",
    137: "https://polygonscan.com/tx/",
    8453: "https://basescan.org/tx/",
    42161: "https://arbiscan.io/tx/",
  };
  const prefix = prefixByChain[Number(chainId)] || "https://etherscan.io/tx/";
  return `${prefix}${txHash}`;
}

function explorerAddressUrl(chainId, wallet) {
  const prefixByChain = {
    1: "https://etherscan.io/address/",
    10: "https://optimistic.etherscan.io/address/",
    56: "https://bscscan.com/address/",
    137: "https://polygonscan.com/address/",
    8453: "https://basescan.org/address/",
    42161: "https://arbiscan.io/address/",
  };
  const prefix = prefixByChain[Number(chainId)];
  if (!prefix) return null;
  return `${prefix}${wallet}`;
}

function chainLabel(chainId) {
  const labels = {
    1: "Ethereum",
    10: "Optimism",
    56: "BNB Smart Chain",
    137: "Polygon",
    8453: "Base",
    42161: "Arbitrum",
  };
  const id = Number(chainId);
  const name = labels[id];
  return name ? `${name} (${id})` : `Unknown (${id || "n/a"})`;
}

function shortHex(value, start = 8, end = 6) {
  const v = String(value || "");
  return v.length > start + end + 3
    ? `${v.slice(0, start)}...${v.slice(-end)}`
    : v;
}

function parsePriceSnapshot(summary) {
  const s = String(summary || "").trim();
  const arrow = s.includes("→") ? "→" : s.includes("->") ? "->" : null;
  if (!arrow) return null;
  const [leftRaw, rightRaw] = s.split(arrow);
  const left = leftRaw?.replace(/^\s*Swap\s+/iu, "").trim();
  const right = rightRaw
    ?.replace(/\((done|failed|rejected)\)\s*$/iu, "")
    .trim();
  if (!left && !right) return null;
  return {
    from: left || "",
    to: right || "",
  };
}

async function fetchJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CHECK_TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { accept: "application/json" },
    });
    const json = await res.json().catch(() => null);
    return { res, json, latencyMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonWithFallback(urls) {
  let lastErr = null;
  for (const url of urls) {
    try {
      return await fetchJson(url);
    } catch (error) {
      lastErr = error;
    }
  }
  throw lastErr ?? new Error("All fallback endpoints failed");
}

function updateSla(provider, ok) {
  const now = Date.now();
  samples[provider].push({ at: now, ok });
  samples[provider] = samples[provider].filter(
    (s) => now - s.at <= windows.h24,
  );
  const h1s = samples[provider].filter((s) => now - s.at <= windows.h1);
  const h24s = samples[provider];
  const h1 = h1s.length
    ? Math.round((h1s.filter((s) => s.ok).length / h1s.length) * 100)
    : 100;
  const h24 = h24s.length
    ? Math.round((h24s.filter((s) => s.ok).length / h24s.length) * 100)
    : 100;
  status.providers[provider].h1 = h1;
  status.providers[provider].h24 = h24;
}

function getClientIp(req) {
  const xff = String(req.headers["x-forwarded-for"] || "");
  return xff.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

function isRateLimited(req) {
  const now = Date.now();
  const key = getClientIp(req);
  const entry = eventRateMap.get(key) || { count: 0, resetAt: now + 60_000 };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + 60_000;
  }
  entry.count += 1;
  eventRateMap.set(key, entry);
  return entry.count > EVENT_RATE_LIMIT_PER_MIN;
}

function isExplorerRateLimited(req) {
  const now = Date.now();
  const key = getClientIp(req);
  const entry = explorerRateMap.get(key) || { count: 0, resetAt: now + 60_000 };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + 60_000;
  }
  entry.count += 1;
  explorerRateMap.set(key, entry);
  return entry.count > EXPLORER_RATE_LIMIT_PER_MIN;
}

function isLeaderboardRateLimited(req) {
  const now = Date.now();
  const key = getClientIp(req);
  const entry = leaderboardRateMap.get(key) || {
    count: 0,
    resetAt: now + 60_000,
  };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + 60_000;
  }
  entry.count += 1;
  leaderboardRateMap.set(key, entry);
  return entry.count > LEADERBOARD_RATE_LIMIT_PER_MIN;
}

const REFERRAL_RATE_LIMIT_PER_MIN = Number(
  process.env.RELAY_REFERRAL_RATE_LIMIT_PER_MIN || 30,
);

function isReferralRateLimited(req) {
  const now = Date.now();
  const key = getClientIp(req);
  const entry = referralRateMap.get(key) || { count: 0, resetAt: now + 60_000 };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + 60_000;
  }
  entry.count += 1;
  referralRateMap.set(key, entry);
  return entry.count > REFERRAL_RATE_LIMIT_PER_MIN;
}

// ==================== REFERRAL DATA HANDLING ====================

async function appendReferralRecord(record) {
  await mkdir(dirname(REFERRAL_LOG_PATH), { recursive: true });
  const line = JSON.stringify(record) + "\n";
  try {
    const st = await stat(REFERRAL_LOG_PATH);
    if (st.size > MAX_LOG_BYTES) {
      const bak = `${REFERRAL_LOG_PATH}.${Date.now()}.bak`;
      await rename(REFERRAL_LOG_PATH, bak);
    }
  } catch {
    /* file doesn't exist yet */
  }
  await appendFile(REFERRAL_LOG_PATH, line, "utf8");
}

async function readReferralsMerged(maxLines = 50_000) {
  let raw = "";
  try {
    raw = await readFile(REFERRAL_LOG_PATH, "utf8");
  } catch {
    return [];
  }
  const lines = raw.split("\n").filter((l) => l.trim());
  const slice = lines.length > maxLines ? lines.slice(-maxLines) : lines;
  const records = [];
  for (const line of slice) {
    try {
      const obj = JSON.parse(line);
      records.push(obj);
    } catch {
      // skip corrupt line
    }
  }
  return records;
}

function generateReferralCode(address) {
  if (!address || address.length < 10) return "";
  const clean = address.toLowerCase().replace("0x", "");
  return clean.slice(0, 4) + clean.slice(-4);
}

function calculateTier(referralCount) {
  if (referralCount >= 50) return "platinum";
  if (referralCount >= 15) return "gold";
  if (referralCount >= 5) return "silver";
  return "bronze";
}

function getTierRewardPct(tier) {
  const pcts = { bronze: 5, silver: 7.5, gold: 10, platinum: 15 };
  return pcts[tier] || 5;
}

function scaledBigIntToNumber(value, decimals = 18) {
  try {
    const raw = BigInt(String(value || "0"));
    const scale = 10n ** BigInt(decimals);
    const whole = raw / scale;
    const fraction = raw % scale;
    return Number(whole) + Number(fraction) / Number(scale);
  } catch {
    return 0;
  }
}

function emptyReferralStats(source = "relay") {
  return {
    ok: true,
    source,
    totalReferrals: 0,
    activeReferrals: 0,
    totalEarnings: 0,
    pendingRewards: 0,
    tier: "bronze",
    referredAddresses: [],
  };
}

async function fetchSubgraphReferralStats(address) {
  const referrer = normalizeGraphAddress(address, "");
  if (!referrer) throw new Error("Invalid referral address");

  const query = `
    query EonSwapReferralStats($referrer: String!) {
      wallet(id: $referrer) {
        id
        referralCount
        referralPoints
        updatedAt
      }
      referrals(first: 1000, orderBy: updatedAt, orderDirection: desc, where: { referrer: $referrer }) {
        id
        referee { id }
        joinedAt
        swapCount
        totalVolumeUsd
        totalReward
        updatedAt
      }
    }
  `;
  const data = await queryTheGraph(
    query,
    { referrer },
    `referral-stats:${referrer}`,
    10_000,
  );
  const referrals = Array.isArray(data.referrals) ? data.referrals : [];
  const referredAddresses = referrals.map((referral) => ({
    address: normalizeGraphAddress(referral?.referee?.id || referral?.id),
    joinedAt: normalizeTimestampMs(referral?.joinedAt),
    swapCount: Number(referral?.swapCount || 0),
    volumeUsd: scaledBigIntToNumber(referral?.totalVolumeUsd),
    rewardEarned: scaledBigIntToNumber(referral?.totalReward),
  }));
  const walletReferralCount = Number(data.wallet?.referralCount || 0);
  const totalReferrals = Math.max(walletReferralCount, referredAddresses.length);
  const activeReferrals = referredAddresses.filter((r) => r.swapCount > 0).length;
  const totalEarnings = referredAddresses.reduce(
    (sum, r) => sum + r.rewardEarned,
    0,
  );

  return {
    ok: true,
    source: "subgraph",
    totalReferrals,
    activeReferrals,
    totalEarnings,
    pendingRewards: 0,
    tier: calculateTier(totalReferrals),
    referredAddresses,
    updatedAt: normalizeTimestampMs(data.wallet?.updatedAt),
  };
}

async function buildReferralStats(address) {
  const code = generateReferralCode(address);
  if (!code) {
    return emptyReferralStats();
  }

  const records = await readReferralsMerged();

  // Find all referrals for this code
  const referrals = records.filter(
    (r) => r.type === "referral" && r.referrerCode === code,
  );
  const referredAddresses = [];

  for (const ref of referrals) {
    // Count swaps for this referred user
    const swaps = records.filter(
      (r) =>
        r.type === "swap" &&
        r.referredAddress?.toLowerCase() === ref.referredAddress?.toLowerCase(),
    );
    const volumeUsd = swaps.reduce(
      (sum, s) => sum + (Number(s.volumeUsd) || 0),
      0,
    );
    const tier = calculateTier(referrals.length);
    const rewardPct = getTierRewardPct(tier) / 100;
    const rewardEarned = volumeUsd * 0.003 * rewardPct; // 0.3% fee * reward %

    referredAddresses.push({
      address: ref.referredAddress,
      joinedAt: ref.createdAt,
      swapCount: swaps.length,
      volumeUsd,
      rewardEarned,
    });
  }

  const totalEarnings = referredAddresses.reduce(
    (sum, r) => sum + r.rewardEarned,
    0,
  );
  const tier = calculateTier(referrals.length);

  return {
    ok: true,
    source: "relay-log",
    totalReferrals: referrals.length,
    activeReferrals: referredAddresses.filter((r) => r.swapCount > 0).length,
    totalEarnings,
    pendingRewards: totalEarnings * 0.1, // 10% pending simulation
    tier,
    referredAddresses,
  };
}

async function getReferralStats(address) {
  try {
    return await fetchSubgraphReferralStats(address);
  } catch (error) {
    const fallback = await buildReferralStats(address);
    return {
      ...fallback,
      source: fallback.source || "relay-log",
      subgraphError: classifyError(error),
    };
  }
}

async function readJsonBody(req, maxBytes = EVENT_MAX_BODY_BYTES) {
  let body = "";
  let size = 0;
  await new Promise((resolve, reject) => {
    req.on("data", (chunk) => {
      const text = String(chunk);
      size += Buffer.byteLength(text, "utf8");
      if (size > maxBytes) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      body += text;
    });
    req.on("end", resolve);
    req.on("error", reject);
  });
  return JSON.parse(body || "{}");
}

function validateActivityPayload(payload) {
  const id = String(payload?.id || "");
  if (id.length < 4 || id.length > 128) return { error: "Invalid id" };
  const kind = "swap";
  const status = payload?.status;
  if (!["pending", "success", "failed"].includes(status))
    return { error: "Invalid status" };
  const createdAt = Number(payload?.createdAt);
  if (!Number.isFinite(createdAt) || createdAt < 0)
    return { error: "Invalid createdAt" };
  const summary = String(payload?.summary ?? "");
  if (summary.length > 4000) return { error: "Summary too long" };
  const chainId = Number(payload?.chainId);
  if (!Number.isInteger(chainId) || chainId < 1 || chainId > 99_999_999) {
    return { error: "Invalid chainId" };
  }
  const out = { id, kind, status, createdAt, summary, chainId };
  if (payload?.txHash) {
    const h = String(payload.txHash);
    if (!/^0x[a-fA-F0-9]{64}$/.test(h)) return { error: "Invalid txHash" };
    out.txHash = h;
  }
  if (payload?.from) {
    const f = String(payload.from);
    if (!/^0x[a-fA-F0-9]{40}$/.test(f)) return { error: "Invalid from" };
    out.from = f;
  }
  if (payload?.blockNumber != null && payload.blockNumber !== "") {
    const b = Number(payload.blockNumber);
    if (!Number.isFinite(b)) return { error: "Invalid blockNumber" };
    out.blockNumber = Math.floor(b);
  }
  return { record: out };
}

function normalizeActivityFromLine(obj) {
  if (!obj || typeof obj.id !== "string") return null;
  if (!["pending", "success", "failed"].includes(obj.status)) return null;
  const createdAt = Number(obj.createdAt);
  if (!Number.isFinite(createdAt)) return null;
  const kind = "swap";
  const row = {
    id: obj.id,
    kind,
    status: obj.status,
    createdAt,
    summary: String(obj.summary ?? ""),
    chainId: Number(obj.chainId) || 0,
  };
  if (obj.txHash) row.txHash = String(obj.txHash);
  if (obj.from) row.from = String(obj.from);
  if (obj.blockNumber != null) row.blockNumber = Number(obj.blockNumber);
  if (obj.serverAt != null && obj.serverAt !== "") {
    const s = Number(obj.serverAt);
    if (Number.isFinite(s)) row.serverAt = Math.floor(s);
  }
  return row;
}

async function fetchEtherscanTxListForRelay({ chainId, address, offset = 35 }) {
  const apiKey = etherscanApiKeyForRelay();
  if (!apiKey) {
    throw new Error(
      "Missing API key: set ETHERSCAN_API_KEY or RELAY_ETHERSCAN_API_KEY on the relay",
    );
  }
  const q = new URLSearchParams({
    chainid: String(chainId),
    module: "account",
    action: "txlist",
    address,
    startblock: "0",
    endblock: "99999999",
    page: "1",
    offset: String(offset),
    sort: "desc",
    apikey: apiKey,
  });
  const { res, json } = await fetchJson(`https://api.etherscan.io/v2/api?${q}`);
  if (!res.ok) throw new Error(`Explorer HTTP ${res.status}`);
  if (Array.isArray(json?.result)) return json.result;
  const msg = String(json?.result || json?.message || "");
  if (/no transactions found|no records found/i.test(msg)) return [];
  throw new Error(msg || "Explorer API error");
}

async function appendActivityRecord(record) {
  const dir = dirname(ACTIVITY_LOG_PATH);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  // rotate if the log file is too large
  try {
    const s = await stat(ACTIVITY_LOG_PATH);
    if (s.size >= MAX_LOG_BYTES) {
      await rename(
        ACTIVITY_LOG_PATH,
        `${ACTIVITY_LOG_PATH}.${Date.now()}.rotated`,
      );
    }
  } catch (e) {
    // ignore ENOENT and other transient errors
  }
  await appendFile(ACTIVITY_LOG_PATH, `${JSON.stringify(record)}\n`, "utf8");
}

async function appendTxEventRecord(record) {
  const dir = dirname(TX_EVENT_LOG_PATH);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  try {
    const s = await stat(TX_EVENT_LOG_PATH);
    if (s.size >= MAX_LOG_BYTES) {
      await rename(
        TX_EVENT_LOG_PATH,
        `${TX_EVENT_LOG_PATH}.${Date.now()}.rotated`,
      );
    }
  } catch (e) {
    // ignore ENOENT and other transient errors
  }
  await appendFile(TX_EVENT_LOG_PATH, `${JSON.stringify(record)}\n`, "utf8");
}

async function readActivitiesMerged(maxLines = 20_000) {
  let raw = "";
  try {
    raw = await readFile(ACTIVITY_LOG_PATH, "utf8");
  } catch {
    return [];
  }
  const lines = raw.split("\n").filter((l) => l.trim());
  const slice = lines.length > maxLines ? lines.slice(-maxLines) : lines;
  const byId = new Map();
  for (const line of slice) {
    try {
      const obj = JSON.parse(line);
      const row = normalizeActivityFromLine(obj);
      if (row) byId.set(row.id, row);
    } catch {
      // skip corrupt line
    }
  }
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}

/** Count successful swap rows per wallet (`from`), from merged activity log. */
function buildAddressLeaderboard(activities, limit) {
  const byAddr = new Map();
  for (const row of activities) {
    if (row.status !== "success") continue;
    const addr = row.from;
    if (!addr || !/^0x[a-fA-F0-9]{40}$/i.test(addr)) continue;
    const key = addr.toLowerCase();
    const cur = byAddr.get(key) || {
      successCount: 0,
      activityCount: 0,
      liquidityEventCount: 0,
      farmEventCount: 0,
      referralCount: 0,
      lastSuccessAt: 0,
    };
    const kind = String(row.kind || "").toLowerCase();
    cur.activityCount += 1;
    if (kind.includes("swap")) {
      cur.successCount += 1;
    } else if (kind.includes("lp") || kind.includes("liquidity")) {
      cur.liquidityEventCount += 1;
    } else if (kind.includes("farm")) {
      cur.farmEventCount += 1;
    } else if (kind.includes("referral")) {
      cur.referralCount += 1;
    }
    const t = Number(row.serverAt) || Number(row.createdAt) || 0;
    if (t > cur.lastSuccessAt) cur.lastSuccessAt = t;
    byAddr.set(key, cur);
  }
  const sorted = [...byAddr.entries()].sort((a, b) => {
    const [, ca] = a;
    const [, cb] = b;
    if (cb.activityCount !== ca.activityCount)
      return cb.activityCount - ca.activityCount;
    return cb.lastSuccessAt - ca.lastSuccessAt;
  });
  return sorted.slice(0, limit).map(([address, stats], i) => ({
    rank: i + 1,
    address,
    successCount: stats.successCount,
    activityCount: stats.activityCount,
    liquidityEventCount: stats.liquidityEventCount,
    farmEventCount: stats.farmEventCount,
    referralCount: stats.referralCount,
    totalWethVolume: "0",
    totalPoints: String(stats.activityCount),
    swapPoints: String(stats.successCount),
    liquidityPoints: String(stats.liquidityEventCount),
    farmPoints: String(stats.farmEventCount),
    referralPoints: String(stats.referralCount),
    tier: leaderboardTier({
      activityCount: stats.activityCount,
      totalPoints: String(stats.activityCount),
    }),
    lastSuccessAt: stats.lastSuccessAt,
  }));
}

async function readTxEventsMerged(maxLines = 50_000) {
  let raw = "";
  try {
    raw = await readFile(TX_EVENT_LOG_PATH, "utf8");
  } catch {
    return [];
  }
  const lines = raw.split("\n").filter((l) => l.trim());
  const slice = lines.length > maxLines ? lines.slice(-maxLines) : lines;
  const byHash = new Map();
  for (const line of slice) {
    try {
      const obj = JSON.parse(line);
      const txHash = String(obj?.txHash || "");
      if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) continue;
      byHash.set(txHash, {
        txHash,
        chainId: Number(obj?.chainId) || 0,
        kind: "swap",
        at: Number(obj?.at) || Date.now(),
        feeQuoteUsd: Number.isFinite(Number(obj?.feeQuoteUsd))
          ? Number(obj.feeQuoteUsd)
          : null,
        feeRealizedUsd: Number.isFinite(Number(obj?.feeRealizedUsd))
          ? Number(obj.feeRealizedUsd)
          : null,
      });
    } catch {
      // skip corrupt line
    }
  }
  return [...byHash.values()].sort((a, b) => b.at - a.at);
}

async function buildFeeDashboard() {
  const rows = await readTxEventsMerged();
  const byChain = new Map();
  const byDay = new Map();
  let quoteTotal = 0;
  let realizedTotal = 0;
  let coverageCount = 0;
  for (const row of rows) {
    const q = Number(row.feeQuoteUsd || 0);
    const r = Number(row.feeRealizedUsd || 0);
    const day = new Date(row.at).toISOString().slice(0, 10);
    const chainKey = String(row.chainId);
    const c = byChain.get(chainKey) || {
      chainId: row.chainId,
      txCount: 0,
      quoteFeeUsd: 0,
      realizedFeeUsd: 0,
    };
    c.txCount += 1;
    c.quoteFeeUsd += q;
    c.realizedFeeUsd += r;
    byChain.set(chainKey, c);
    const d = byDay.get(day) || {
      day,
      txCount: 0,
      quoteFeeUsd: 0,
      realizedFeeUsd: 0,
    };
    d.txCount += 1;
    d.quoteFeeUsd += q;
    d.realizedFeeUsd += r;
    byDay.set(day, d);
    quoteTotal += q;
    realizedTotal += r;
    if (row.feeRealizedUsd != null) coverageCount += 1;
  }
  return {
    checkedAt: Date.now(),
    totals: {
      txCount: rows.length,
      quoteFeeUsd: quoteTotal,
      realizedFeeUsd: realizedTotal,
      deltaUsd: realizedTotal - quoteTotal,
      realizedCoveragePct: rows.length
        ? Math.round((coverageCount / rows.length) * 100)
        : 0,
    },
    perChain: [...byChain.values()].sort(
      (a, b) => b.quoteFeeUsd - a.quoteFeeUsd,
    ),
    perDay: [...byDay.values()].sort((a, b) =>
      String(b.day).localeCompare(String(a.day)),
    ),
    recent: rows.slice(0, 120),
  };
}

function alreadyProcessedTx(hash) {
  if (!hash) return false;
  const now = Date.now();
  for (const [h, t] of recentTxEvents.entries()) {
    if (now - t > 15 * 60_000) recentTxEvents.delete(h);
  }
  if (recentTxEvents.has(hash)) return true;
  recentTxEvents.set(hash, now);
  return false;
}

async function sendAlert(message) {
  if (!ALERT_WEBHOOK_URL) return;
  const now = Date.now();
  if (now - lastAlertAt < ALERT_COOLDOWN_MS) return;
  lastAlertAt = now;
  try {
    await fetch(ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: `[EonSwap Relay] ${message}`,
        at: new Date(now).toISOString(),
      }),
    });
  } catch {
    // swallow webhook errors to keep relay non-blocking
  }
}

async function sendTelegramNow(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  if (TELEGRAM_BANNER_URL) {
    const photoRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          photo: TELEGRAM_BANNER_URL,
          caption: message.slice(0, 1024),
          parse_mode: "HTML",
          disable_notification: false,
        }),
      },
    );
    if (photoRes.ok) return;
    await throwTelegramError(photoRes);
  }
  try {
    const bytes = await readFile(TELEGRAM_BANNER_LOCAL_PATH);
    const form = new FormData();
    form.set("chat_id", TELEGRAM_CHAT_ID);
    form.set("parse_mode", "HTML");
    form.set("caption", message.slice(0, 1024));
    form.set(
      "photo",
      new Blob([bytes], { type: "image/png" }),
      TELEGRAM_BANNER_LOCAL_PATH.split("/").pop() || "hero-banner.png",
    );
    const localPhotoRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
      {
        method: "POST",
        body: form,
      },
    );
    if (localPhotoRes.ok) return;
  } catch {
    // local banner fallback is best-effort
  }
  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    },
  );
  if (!res.ok) await throwTelegramError(res);
}

async function throwTelegramError(res) {
  const json = await res.json().catch(() => null);
  const retryAfter = Number(json?.parameters?.retry_after || 0);
  const error = new Error(json?.description || `Telegram request failed (${res.status})`);
  if (retryAfter > 0) error.retryAfterMs = retryAfter * 1_000;
  throw error;
}

const telegramQueue = new TelegramRetryQueue({
  queuePath: TELEGRAM_QUEUE_PATH,
  deadLetterPath: TELEGRAM_DEAD_LETTER_PATH,
  sendNow: sendTelegramNow,
});

async function sendTelegramMessage(message, dedupeKey = "") {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  await telegramQueue.enqueue({ dedupeKey, message });
}

function etherscanApiKeyForRelay() {
  const k =
    process.env.RELAY_ETHERSCAN_API_KEY?.trim() ||
    process.env.ETHERSCAN_API_KEY?.trim() ||
    process.env.VITE_ETHERSCAN_API_KEY?.trim();
  return k || "";
}

async function runChecks() {
  const etherscanKey = etherscanApiKeyForRelay();
  const checks = await Promise.allSettled([
    (async () => {
      const q = new URLSearchParams({
        chainId: "8453",
        tokenIn: "0x4200000000000000000000000000000000000006",
        tokenOut: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        amountIn: "1000000000000000",
      });
      const base = String(process.env.VITE_EON_AMM_API_BASE_URL || "").trim();
      if (!base) {
        status.providers.eonswap = {
          ...status.providers.eonswap,
          ok: false,
          latencyMs: null,
          detail: "Missing VITE_EON_AMM_API_BASE_URL",
        };
        updateSla("eonswap", false);
        return;
      }
      const { res, json, latencyMs } = await fetchJson(`${base}/v1/quote?${q}`);
      const ok = res.ok && (json?.amountOut || json?.data?.amountOut);
      status.providers.eonswap = {
        ...status.providers.eonswap,
        ok,
        latencyMs,
        detail: ok ? "healthy" : `HTTP ${res.status}`,
      };
      updateSla("eonswap", ok);
    })(),
    (async () => {
      const q = new URLSearchParams({
        vs_currency: "usd",
        days: "1",
        interval: "daily",
      });
      const { res, json, latencyMs } = await fetchJson(
        `https://api.coingecko.com/api/v3/coins/ethereum/market_chart?${q}`,
      );
      const ok = res.ok && Array.isArray(json?.prices);
      status.providers.coingecko = {
        ...status.providers.coingecko,
        ok,
        latencyMs,
        detail: ok ? "healthy" : `HTTP ${res.status}`,
      };
      updateSla("coingecko", ok);

      // Update ETH price for referral tracker
      if (ok && json?.prices?.length > 0) {
        const latestPrice = json.prices[json.prices.length - 1][1];
        if (
          referralTracker &&
          typeof latestPrice === "number" &&
          latestPrice > 0
        ) {
          referralTracker.updateEthPrice(latestPrice);
        }
      }
    })(),
    (async () => {
      if (!etherscanKey) {
        status.providers.etherscan = {
          ...status.providers.etherscan,
          ok: false,
          latencyMs: null,
          detail:
            "Missing API key: set ETHERSCAN_API_KEY or RELAY_ETHERSCAN_API_KEY on the relay (Railway)",
        };
        updateSla("etherscan", false);
        return;
      }
      const q = new URLSearchParams({
        chainid: "1",
        module: "account",
        action: "txlist",
        address: "0x0000000000000000000000000000000000000000",
        startblock: "0",
        endblock: "latest",
        page: "1",
        offset: "1",
        sort: "desc",
        apikey: etherscanKey,
      });
      const { res, json, latencyMs } = await fetchJson(
        `https://api.etherscan.io/v2/api?${q}`,
      );
      const ok = res.ok && typeof json?.status !== "undefined";
      status.providers.etherscan = {
        ...status.providers.etherscan,
        ok,
        latencyMs,
        detail: ok ? "healthy" : `HTTP ${res.status}`,
      };
      updateSla("etherscan", ok);
    })(),
  ]);

  checks.forEach((result, idx) => {
    if (result.status === "fulfilled") return;
    const key = ["eonswap", "coingecko", "etherscan"][idx];
    status.providers[key] = {
      ...status.providers[key],
      ok: false,
      detail: classifyError(result.reason),
      latencyMs: null,
    };
    updateSla(key, false);
  });

  status.checkedAt = Date.now();

  const degradedCore = ["eonswap"].filter((id) => !status.providers[id].ok);
  const slowProviders = Object.entries(status.providers)
    .filter(
      ([id, p]) =>
        p.ok &&
        typeof p.latencyMs === "number" &&
        p.latencyMs > WARN_LATENCY_MS[id],
    )
    .map(([id, p]) => `${id}:${p.latencyMs}ms`);

  if (degradedCore.length) {
    await sendAlert(`Critical provider degraded: ${degradedCore.join(", ")}`);
  } else if (slowProviders.length) {
    await sendAlert(`High latency detected: ${slowProviders.join(", ")}`);
  }
}

function json(req, res, code, payload, opts = {}) {
  const acao = corsOriginHeader(req);
  const cacheControl =
    typeof opts.cacheControl === "string" ? opts.cacheControl : "no-store";
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": cacheControl,
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
  };
  if (acao) headers["access-control-allow-origin"] = acao;
  res.writeHead(code, headers);
  res.end(JSON.stringify(payload));
}

function isForbiddenOrigin(req) {
  return !CORS_ALLOW_ALL && !corsOriginHeader(req);
}

function hasAdminAuthorization(req) {
  if (!RELAY_ADMIN_SECRET) return false;
  const auth = String(req.headers.authorization || "");
  return auth === `Bearer ${RELAY_ADMIN_SECRET}`;
}

createServer(async (req, res) => {
  const u = new URL(req.url || "/", `http://${req.headers.host}`);
  if (req.method === "OPTIONS") {
    const acao = corsOriginHeader(req);
    const h = {
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,accept,authorization",
    };
    if (acao) h["access-control-allow-origin"] = acao;
    res.writeHead(204, h);
    res.end();
    return;
  }
  if (req.method === "GET" && u.pathname === "/admin/activities") {
    if (!RELAY_ADMIN_SECRET) {
      return json(req, res, 503, {
        ok: false,
        error: "Admin export not configured",
      });
    }
    const auth = String(req.headers.authorization || "");
    if (auth !== `Bearer ${RELAY_ADMIN_SECRET}`) {
      return json(req, res, 401, { ok: false, error: "Unauthorized" });
    }
    const activities = await readActivitiesMerged();
    return json(req, res, 200, { ok: true, activities });
  }
  if (req.method === "GET" && u.pathname === "/public/leaderboard") {
    if (isLeaderboardRateLimited(req)) {
      return json(req, res, 429, { ok: false, error: "Rate limited" });
    }
    if (!CORS_ALLOW_ALL && !corsOriginHeader(req)) {
      return json(req, res, 403, { ok: false, error: "Forbidden origin" });
    }
    const limitRaw = Number(u.searchParams.get("limit") || "50");
    const limit = Number.isFinite(limitRaw)
      ? Math.min(100, Math.max(1, Math.floor(limitRaw)))
      : 50;
    if (isTheGraphConfigured()) {
      try {
        const entries = await fetchSubgraphLeaderboard(limit);
        return json(
          req,
          res,
          200,
          {
            ok: true,
            generatedAt: Date.now(),
            metric: "total_points",
            source: "subgraph",
            entries,
          },
          { cacheControl: "public, max-age=30, stale-while-revalidate=60" },
        );
      } catch (e) {
        console.warn(
          "Subgraph leaderboard failed, falling back to relay activity log:",
          e instanceof Error ? e.message : e,
        );
      }
    }
    const activities = await readActivitiesMerged();
    const entries = buildAddressLeaderboard(activities, limit);
    return json(
      req,
      res,
      200,
      {
        ok: true,
        generatedAt: Date.now(),
        metric: "activity_count",
        entries,
      },
      { cacheControl: "public, max-age=30" },
    );
  }
  // Public global activity feed (recent swaps from all users)
  if (req.method === "GET" && u.pathname === "/public/activities") {
    if (isLeaderboardRateLimited(req)) {
      return json(req, res, 429, { ok: false, error: "Rate limited" });
    }
    if (!CORS_ALLOW_ALL && !corsOriginHeader(req)) {
      return json(req, res, 403, { ok: false, error: "Forbidden origin" });
    }
    const limitRaw = Number(u.searchParams.get("limit") || "50");
    const limit = Number.isFinite(limitRaw)
      ? Math.min(200, Math.max(1, Math.floor(limitRaw)))
      : 50;
    const all = await readActivitiesMerged();
    // Return most recent activities (sorted by serverAt desc)
    const sorted = all
      .filter((a) => a.status === "success" && a.kind === "swap")
      .sort(
        (a, b) =>
          (b.serverAt || b.createdAt || 0) - (a.serverAt || a.createdAt || 0),
      )
      .slice(0, limit);
    return json(
      req,
      res,
      200,
      {
        ok: true,
        generatedAt: Date.now(),
        activities: sorted,
      },
      { cacheControl: "public, max-age=15" },
    );
  }
  if (
    req.method === "GET" &&
    (u.pathname === "/api/activity" ||
      u.pathname === "/public/onchain-activities")
  ) {
    if (isLeaderboardRateLimited(req)) {
      return json(req, res, 429, { ok: false, error: "Rate limited" });
    }
    if (!CORS_ALLOW_ALL && !corsOriginHeader(req)) {
      return json(req, res, 403, { ok: false, error: "Forbidden origin" });
    }
    const limitRaw = Number(u.searchParams.get("limit") || "100");
    const limit = Number.isFinite(limitRaw)
      ? Math.min(500, Math.max(1, Math.floor(limitRaw)))
      : 100;
    const wallet = String(u.searchParams.get("wallet") || "").trim();
    if (wallet && !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return json(req, res, 400, { ok: false, error: "Invalid wallet" });
    }
    if (isTheGraphConfigured()) {
      try {
        const activities = await fetchSubgraphSwapActivities({
          limit,
          walletAddress: wallet || undefined,
        });
        return json(
          req,
          res,
          200,
          {
            ok: true,
            data: activities,
            meta: {
              source: "subgraph",
              chainId: 8453,
              subgraphId: THE_GRAPH_SUBGRAPH_ID,
              cachedForMs: THE_GRAPH_CACHE_MS,
            },
          },
          { cacheControl: "public, max-age=15, stale-while-revalidate=45" },
        );
      } catch (e) {
        console.warn(
          "Subgraph activity failed, falling back to AMM indexer:",
          e instanceof Error ? e.message : e,
        );
      }
    }
    if (!ammIndexer) {
      return json(req, res, 200, {
        ok: false,
        data: [],
        error: "AMM indexer is not ready",
        meta: {
          indexerReady: false,
          indexerEnabled: process.env.INDEXER_ENABLED !== "0",
          subgraphConfigured: isTheGraphConfigured(),
        },
      });
    }
    const activities = await ammIndexer.getSwapActivities({
      limit,
      walletAddress: wallet || undefined,
    });
    return json(
      req,
      res,
      200,
      {
        ok: true,
        data: activities,
        meta: {
          chainId: ammIndexer.chainId,
          factory: ammIndexer.factoryAddress,
          indexedPairs: Object.keys(ammIndexer.state?.pairs || {}).length,
          lastProcessedBlock: ammIndexer.state?.lastProcessedBlock || "0",
          lastSafeBlock: ammIndexer.state?.lastSafeBlock || "0",
        },
      },
      { cacheControl: "public, max-age=10" },
    );
  }
  if (req.method === "GET" && u.pathname === "/explorer/txlist") {
    if (isExplorerRateLimited(req))
      return json(req, res, 429, { ok: false, error: "Rate limited" });
    // Require browser Origin to match allowlist when allowlist is configured.
    if (!CORS_ALLOW_ALL && !corsOriginHeader(req)) {
      return json(req, res, 403, { ok: false, error: "Forbidden origin" });
    }
    if (EXPLORER_ACCESS_TOKEN) {
      const token = String(req.headers["x-relay-explorer-token"] || "").trim();
      if (!token || token !== EXPLORER_ACCESS_TOKEN) {
        return json(req, res, 401, {
          ok: false,
          error: "Unauthorized explorer token",
        });
      }
    }
    const chainId = Number(u.searchParams.get("chainId") || "0");
    const address = String(u.searchParams.get("address") || "").trim();
    const offsetRaw = Number(u.searchParams.get("offset") || "35");
    const offset = Number.isFinite(offsetRaw)
      ? Math.min(100, Math.max(1, Math.floor(offsetRaw)))
      : 35;
    if (!Number.isInteger(chainId) || chainId < 1) {
      return json(req, res, 400, { ok: false, error: "Invalid chainId" });
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return json(req, res, 400, { ok: false, error: "Invalid address" });
    }
    try {
      const txs = await fetchEtherscanTxListForRelay({
        chainId,
        address,
        offset,
      });
      return json(req, res, 200, { ok: true, result: txs });
    } catch (e) {
      const msg = String(
        e instanceof Error ? e.message : e || "Explorer proxy error",
      );
      return json(req, res, 502, { ok: false, error: msg.slice(0, 200) });
    }
  }
  if (req.method === "POST" && u.pathname === "/events/activity") {
    if (isRateLimited(req))
      return json(req, res, 429, { ok: false, error: "Rate limited" });
    try {
      const payload = await readJsonBody(req);
      const checked = validateActivityPayload(payload);
      if (checked.error)
        return json(req, res, 400, { ok: false, error: checked.error });
      await appendActivityRecord({ ...checked.record, serverAt: Date.now() });
      return json(req, res, 200, { ok: true });
    } catch (e) {
      if (
        String(e instanceof Error ? e.message : e).includes("Payload too large")
      ) {
        return json(req, res, 413, { ok: false, error: "Payload too large" });
      }
      return json(req, res, 400, { ok: false, error: "Invalid payload" });
    }
  }
  if (req.method === "POST" && u.pathname === "/events/tx") {
    if (isRateLimited(req))
      return json(req, res, 429, { ok: false, error: "Rate limited" });
    try {
      const payload = await readJsonBody(req);
      const txHash = String(payload?.txHash || "");
      if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
        return json(req, res, 400, { ok: false, error: "Invalid tx hash" });
      }
      if (alreadyProcessedTx(txHash))
        return json(req, res, 200, { ok: true, dedup: true });

      const kind = String(payload?.kind || "swap");
      const shortHash = shortHex(txHash, 10, 6) || "unknown";
      const chainId = Number(payload?.chainId || 0);
      const wallet = String(payload?.wallet || "");
      const summary = String(payload?.summary || "");
      const poolName = String(payload?.poolName || "");
      const amount = String(payload?.amount || "");
      const rewards = String(payload?.rewards || "");
      const timestampUtc = new Date().toISOString();
      const feeQuoteUsd = Number(payload?.feeQuoteUsd);
      const feeRealizedUsd = Number(payload?.feeRealizedUsd);
      const txUrl = explorerTxUrl(chainId, txHash);
      const walletUrl = /^0x[a-fA-F0-9]{40}$/.test(wallet)
        ? explorerAddressUrl(chainId, wallet)
        : null;
      const shortWallet = wallet ? shortHex(wallet, 8, 6) : "";
      const timeFormatted = timestampUtc.replace("T", " ").replace("Z", " UTC");

      const walletLine = shortWallet
        ? walletUrl
          ? `• Wallet       : <a href="${escapeHtml(walletUrl)}"><code>${escapeHtml(shortWallet)}</code></a>`
          : `• Wallet       : <code>${escapeHtml(shortWallet)}</code>`
        : "";

      let msg = "";

      if (kind === "farm_deposit") {
        msg = [
          "🌾 <b>EonSwap · Farm Deposit</b>",
          "━━━━━━━━━━━━━━━━━━━━━━━━",
          "",
          "📊 <b>Transaction Details</b>",
          `• Network      : ${escapeHtml(chainLabel(chainId))}`,
          `• Status       : ✓ Success`,
          `• Tx Hash      : <code>${escapeHtml(shortHash)}</code>`,
          walletLine,
          `• Time         : ${escapeHtml(timeFormatted)}`,
          "",
          "🌱 <b>Farm Details</b>",
          poolName ? `• Pool         : ${escapeHtml(poolName)}` : "",
          amount ? `• Deposited    : ${escapeHtml(amount)}` : "",
          "",
          "━━━━━━━━━━━━━━━━━━━━━━━━",
          `🔗 <a href="${escapeHtml(txUrl)}">View on Explorer</a>`,
        ]
          .filter(Boolean)
          .join("\n");
      } else if (kind === "farm_withdraw") {
        msg = [
          "🌾 <b>EonSwap · Farm Withdraw</b>",
          "━━━━━━━━━━━━━━━━━━━━━━━━",
          "",
          "📊 <b>Transaction Details</b>",
          `• Network      : ${escapeHtml(chainLabel(chainId))}`,
          `• Status       : ✓ Success`,
          `• Tx Hash      : <code>${escapeHtml(shortHash)}</code>`,
          walletLine,
          `• Time         : ${escapeHtml(timeFormatted)}`,
          "",
          "📤 <b>Withdrawal Details</b>",
          poolName ? `• Pool         : ${escapeHtml(poolName)}` : "",
          amount ? `• Withdrawn    : ${escapeHtml(amount)}` : "",
          rewards ? `• Harvested    : ${escapeHtml(rewards)}` : "",
          "",
          "━━━━━━━━━━━━━━━━━━━━━━━━",
          `🔗 <a href="${escapeHtml(txUrl)}">View on Explorer</a>`,
        ]
          .filter(Boolean)
          .join("\n");
      } else if (kind === "farm_harvest") {
        msg = [
          "🎉 <b>EonSwap · Rewards Harvested</b>",
          "━━━━━━━━━━━━━━━━━━━━━━━━",
          "",
          "📊 <b>Transaction Details</b>",
          `• Network      : ${escapeHtml(chainLabel(chainId))}`,
          `• Status       : ✓ Success`,
          `• Tx Hash      : <code>${escapeHtml(shortHash)}</code>`,
          walletLine,
          `• Time         : ${escapeHtml(timeFormatted)}`,
          "",
          "💰 <b>Harvest Details</b>",
          poolName ? `• Pool         : ${escapeHtml(poolName)}` : "",
          rewards ? `• Rewards      : ${escapeHtml(rewards)}` : "",
          "",
          "━━━━━━━━━━━━━━━━━━━━━━━━",
          `🔗 <a href="${escapeHtml(txUrl)}">View on Explorer</a>`,
        ]
          .filter(Boolean)
          .join("\n");
      } else if (kind === "lp_add") {
        msg = [
          "💧 <b>EonSwap · Liquidity Added</b>",
          "━━━━━━━━━━━━━━━━━━━━━━━━",
          "",
          "📊 <b>Transaction Details</b>",
          `• Network      : ${escapeHtml(chainLabel(chainId))}`,
          `• Status       : ✓ Success`,
          `• Tx Hash      : <code>${escapeHtml(shortHash)}</code>`,
          walletLine,
          `• Time         : ${escapeHtml(timeFormatted)}`,
          "",
          "🏊 <b>Liquidity Details</b>",
          poolName ? `• Pool         : ${escapeHtml(poolName)}` : "",
          summary ? `• Added        : ${escapeHtml(summary)}` : "",
          "",
          "━━━━━━━━━━━━━━━━━━━━━━━━",
          `🔗 <a href="${escapeHtml(txUrl)}">View on Explorer</a>`,
        ]
          .filter(Boolean)
          .join("\n");
      } else if (kind === "lp_remove") {
        msg = [
          "💧 <b>EonSwap · Liquidity Removed</b>",
          "━━━━━━━━━━━━━━━━━━━━━━━━",
          "",
          "📊 <b>Transaction Details</b>",
          `• Network      : ${escapeHtml(chainLabel(chainId))}`,
          `• Status       : ✓ Success`,
          `• Tx Hash      : <code>${escapeHtml(shortHash)}</code>`,
          walletLine,
          `• Time         : ${escapeHtml(timeFormatted)}`,
          "",
          "📤 <b>Removal Details</b>",
          poolName ? `• Pool         : ${escapeHtml(poolName)}` : "",
          summary ? `• Removed      : ${escapeHtml(summary)}` : "",
          "",
          "━━━━━━━━━━━━━━━━━━━━━━━━",
          `🔗 <a href="${escapeHtml(txUrl)}">View on Explorer</a>`,
        ]
          .filter(Boolean)
          .join("\n");
      } else {
        // Default: swap
        const price = parsePriceSnapshot(summary);
        const feeDisplay =
          Number.isFinite(feeRealizedUsd) && feeRealizedUsd > 0
            ? `$${feeRealizedUsd.toFixed(2)}`
            : Number.isFinite(feeQuoteUsd) && feeQuoteUsd > 0
              ? `~$${feeQuoteUsd.toFixed(2)}`
              : null;
        msg = [
          "✅ <b>EonSwap · Swap Confirmed</b>",
          "━━━━━━━━━━━━━━━━━━━━━━━━",
          "",
          "📊 <b>Transaction Details</b>",
          `• Network      : ${escapeHtml(chainLabel(chainId))}`,
          `• Status       : ✓ Success`,
          `• Tx Hash      : <code>${escapeHtml(shortHash)}</code>`,
          walletLine,
          `• Time         : ${escapeHtml(timeFormatted)}`,
          "",
          "💱 <b>Swap Details</b>",
          price?.from ? `• Sold         : ${escapeHtml(price.from)}` : "",
          price?.to ? `• Received     : ${escapeHtml(price.to)}` : "",
          feeDisplay ? `• Fee          : ${feeDisplay}` : "",
          "",
          "━━━━━━━━━━━━━━━━━━━━━━━━",
          `🔗 <a href="${escapeHtml(txUrl)}">View on Explorer</a>`,
        ]
          .filter(Boolean)
          .join("\n");
      }

      await appendTxEventRecord({
        kind,
        status: "success",
        txHash,
        chainId,
        wallet: /^0x[a-fA-F0-9]{40}$/.test(wallet) ? wallet : undefined,
        summary,
        poolName: poolName || undefined,
        amount: amount || undefined,
        rewards: rewards || undefined,
        at: Number(payload?.at) || Date.now(),
        feeQuoteUsd: Number.isFinite(feeQuoteUsd) ? feeQuoteUsd : undefined,
        feeRealizedUsd: Number.isFinite(feeRealizedUsd)
          ? feeRealizedUsd
          : undefined,
      });
      await sendTelegramMessage(
        msg,
        `${chainId}:${txHash}:${kind}:${wallet || "unknown"}`,
      );
      return json(req, res, 200, { ok: true });
    } catch (e) {
      if (
        String(e instanceof Error ? e.message : e).includes("Payload too large")
      ) {
        return json(req, res, 413, { ok: false, error: "Payload too large" });
      }
      return json(req, res, 400, { ok: false, error: "Invalid payload" });
    }
  }
  if (u.pathname === "/healthz") {
    return json(req, res, 200, { ok: true, service: "eonswap-monitor-relay" });
  }
  if (u.pathname === "/monitor/status") {
    return json(req, res, 200, status);
  }
  if (u.pathname === "/monitor/fees") {
    const out = await buildFeeDashboard();
    return json(req, res, 200, out);
  }
  if (u.pathname === "/monitor/check-now") {
    if (RELAY_ADMIN_SECRET) {
      const auth = String(req.headers.authorization || "");
      if (auth !== `Bearer ${RELAY_ADMIN_SECRET}`) {
        return json(req, res, 401, { ok: false, error: "Unauthorized" });
      }
    }
    await runChecks();
    return json(req, res, 200, status);
  }

  // ==================== REFERRAL ENDPOINTS ====================

  // POST /referral/register-referrer - Store referrer address mapping
  if (req.method === "POST" && u.pathname === "/referral/register-referrer") {
    if (isReferralRateLimited(req)) {
      return json(req, res, 429, { ok: false, error: "Rate limited" });
    }
    if (isForbiddenOrigin(req)) {
      return json(req, res, 403, { ok: false, error: "Forbidden origin" });
    }
    try {
      const payload = await readJsonBody(req);
      const address = String(payload?.address || "").trim();

      if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) {
        return json(req, res, 400, { ok: false, error: "Invalid address" });
      }

      const code = generateReferralCode(address);

      // Check if already registered
      const records = await readReferralsMerged();
      const existing = records.find(
        (r) => r.type === "referrer" && r.code === code,
      );

      if (existing) {
        return json(req, res, 200, {
          ok: true,
          code,
          message: "Already registered",
        });
      }

      await appendReferralRecord({
        type: "referrer",
        code,
        address: address.toLowerCase(),
        createdAt: Date.now(),
      });

      return json(req, res, 200, {
        ok: true,
        code,
        message: "Referrer registered",
      });
    } catch (e) {
      return json(req, res, 400, { ok: false, error: "Invalid payload" });
    }
  }

  // GET /public/referral/stats?address=0x... - Get referral stats from subgraph, with relay-log fallback.
  // Legacy /referral/stats is kept for existing frontend deployments.
  if (
    req.method === "GET" &&
    (u.pathname === "/public/referral/stats" ||
      u.pathname === "/referral/stats")
  ) {
    if (isReferralRateLimited(req)) {
      return json(req, res, 429, { ok: false, error: "Rate limited" });
    }
    if (isForbiddenOrigin(req)) {
      return json(req, res, 403, { ok: false, error: "Forbidden origin" });
    }
    const address = String(u.searchParams.get("address") || "").trim();
    if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) {
      return json(req, res, 400, { ok: false, error: "Invalid address" });
    }
    const stats = await getReferralStats(address);
    return json(
      req,
      res,
      200,
      stats,
      { cacheControl: "public, max-age=10" },
    );
  }

  // POST /referral/register - Register a new referral
  if (req.method === "POST" && u.pathname === "/referral/register") {
    if (isReferralRateLimited(req)) {
      return json(req, res, 429, { ok: false, error: "Rate limited" });
    }
    if (isForbiddenOrigin(req)) {
      return json(req, res, 403, { ok: false, error: "Forbidden origin" });
    }
    try {
      const payload = await readJsonBody(req);
      const referrerCode = String(payload?.referrerCode || "")
        .trim()
        .toLowerCase();
      const referredAddress = String(payload?.referredAddress || "").trim();

      if (!referrerCode || referrerCode.length !== 8) {
        return json(req, res, 400, {
          ok: false,
          error: "Invalid referrer code",
        });
      }
      if (!/^0x[a-fA-F0-9]{40}$/i.test(referredAddress)) {
        return json(req, res, 400, {
          ok: false,
          error: "Invalid referred address",
        });
      }

      // Check if this referral already exists
      const records = await readReferralsMerged();
      const existing = records.find(
        (r) =>
          r.type === "referral" &&
          r.referredAddress?.toLowerCase() === referredAddress.toLowerCase(),
      );
      if (existing) {
        return json(req, res, 200, {
          ok: true,
          message: "Already referred",
          duplicate: true,
        });
      }

      // Check self-referral
      const selfCode = generateReferralCode(referredAddress);
      if (selfCode === referrerCode) {
        return json(req, res, 400, { ok: false, error: "Cannot self-refer" });
      }

      await appendReferralRecord({
        type: "referral",
        referrerCode,
        referredAddress: referredAddress.toLowerCase(),
        createdAt: Date.now(),
        serverAt: Date.now(),
      });

      return json(req, res, 200, { ok: true, message: "Referral registered" });
    } catch (e) {
      if (
        String(e instanceof Error ? e.message : e).includes("Payload too large")
      ) {
        return json(req, res, 413, { ok: false, error: "Payload too large" });
      }
      return json(req, res, 400, { ok: false, error: "Invalid payload" });
    }
  }

  // POST /referral/track-swap - Track a swap from referred user (for rewards calculation)
  if (req.method === "POST" && u.pathname === "/referral/track-swap") {
    if (isReferralRateLimited(req)) {
      return json(req, res, 429, { ok: false, error: "Rate limited" });
    }
    if (isForbiddenOrigin(req)) {
      return json(req, res, 403, { ok: false, error: "Forbidden origin" });
    }
    if (!hasAdminAuthorization(req)) {
      return json(req, res, 401, {
        ok: false,
        error: "Server-side swap tracking required",
      });
    }
    try {
      const payload = await readJsonBody(req);
      const address = String(payload?.address || "").trim();
      const volumeUsd = Number(payload?.volumeUsd || 0);
      const feeUsd = Number(payload?.feeUsd || volumeUsd * 0.003); // Default 0.3% fee
      const txHash = String(payload?.txHash || "");

      if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) {
        return json(req, res, 400, { ok: false, error: "Invalid address" });
      }

      // Save to off-chain log
      await appendReferralRecord({
        type: "swap",
        referredAddress: address.toLowerCase(),
        volumeUsd: Number.isFinite(volumeUsd) ? volumeUsd : 0,
        feeUsd: Number.isFinite(feeUsd) ? feeUsd : 0,
        txHash: /^0x[a-fA-F0-9]{64}$/.test(txHash) ? txHash : undefined,
        createdAt: Date.now(),
        serverAt: Date.now(),
      });

      // Call on-chain trackSwap if tracker is configured
      let onChainResult = null;
      if (referralTracker && referralTracker.walletClient) {
        try {
          // Convert USD to wei (scaled 1e18)
          const volumeUsdWei = BigInt(Math.floor(volumeUsd * 1e18));

          // IMPORTANT: feeAmount must be in WETH, not USD!
          // Contract calculates: reward = (feeAmount * tierBps) / 10000
          // And transfers reward amount of WETH to referrer
          // So we need to convert feeUsd to WETH amount using ETH price
          const ethPriceUsd = referralTracker.ethPriceUsd || 3000; // Default fallback
          const feeWethAmount = feeUsd / ethPriceUsd;
          const feeAmountWei = BigInt(Math.floor(feeWethAmount * 1e18));

          const receipt = await referralTracker.callTrackSwap(
            address,
            volumeUsdWei,
            feeAmountWei,
          );
          onChainResult = {
            success: true,
            txHash: receipt.transactionHash,
            status: receipt.status,
          };
          console.log(`[relay] On-chain trackSwap: ${receipt.transactionHash}`);
        } catch (err) {
          console.error(`[relay] On-chain trackSwap failed: ${err.message}`);
          onChainResult = { success: false, error: err.message };
        }
      }

      return json(req, res, 200, { ok: true, onChain: onChainResult });
    } catch (e) {
      if (
        String(e instanceof Error ? e.message : e).includes("Payload too large")
      ) {
        return json(req, res, 413, { ok: false, error: "Payload too large" });
      }
      return json(req, res, 400, { ok: false, error: "Invalid payload" });
    }
  }

  // GET /referral/code?address=0x... - Get referral code for an address
  if (req.method === "GET" && u.pathname === "/referral/code") {
    if (isReferralRateLimited(req)) {
      return json(req, res, 429, { ok: false, error: "Rate limited" });
    }
    if (isForbiddenOrigin(req)) {
      return json(req, res, 403, { ok: false, error: "Forbidden origin" });
    }
    const address = String(u.searchParams.get("address") || "").trim();
    if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) {
      return json(req, res, 400, { ok: false, error: "Invalid address" });
    }
    const code = generateReferralCode(address);
    return json(req, res, 200, { ok: true, code });
  }

  // GET /referral/lookup?code=xxx - Lookup referrer address by code
  if (req.method === "GET" && u.pathname === "/referral/lookup") {
    if (isReferralRateLimited(req)) {
      return json(req, res, 429, { ok: false, error: "Rate limited" });
    }
    if (isForbiddenOrigin(req)) {
      return json(req, res, 403, { ok: false, error: "Forbidden origin" });
    }
    const code = String(u.searchParams.get("code") || "")
      .trim()
      .toLowerCase();
    if (!code || code.length !== 8) {
      return json(req, res, 400, { ok: false, error: "Invalid code" });
    }

    const records = await readReferralsMerged();

    // Find referrer address from stored mapping
    const referrer = records.find(
      (r) => r.type === "referrer" && r.code === code,
    );

    if (referrer && referrer.address) {
      return json(req, res, 200, {
        ok: true,
        code,
        address: referrer.address,
        active: true,
      });
    }

    // Fallback: check if code has any referrals (legacy)
    const hasReferrals = records.some(
      (r) => r.type === "referral" && r.referrerCode === code,
    );

    return json(req, res, 200, {
      ok: true,
      code,
      address: null,
      active: hasReferrals,
    });
  }

  return json(req, res, 404, { error: "Not found" });
}).listen(PORT, LISTEN_HOST, () => {
  console.log(
    `[relay] listening http://${LISTEN_HOST}:${PORT} (env PORT=${process.env.PORT ?? "unset"} RELAY_PORT=${process.env.RELAY_PORT ?? "unset"})`,
  );
  void runChecks();
  setInterval(() => void runChecks(), POLL_MS);
  telegramQueue.start();

  // Start referral tracker if configured
  if (process.env.EON_REFERRAL_ADDRESS && process.env.TRACKER_RPC_URL) {
    createTrackerFromEnv()
      .then((tracker) => {
        if (tracker) {
          referralTracker = tracker;
          console.log("[relay] Referral tracker started");
        }
      })
      .catch((err) =>
        console.error("[relay] Failed to start referral tracker:", err.message),
      );
  }

  createAmmIndexerFromEnv()
    .then((indexer) => {
      if (indexer) {
        ammIndexer = indexer;
        console.log("[relay] AMM indexer started");
      }
    })
    .catch((err) =>
      console.error("[relay] Failed to start AMM indexer:", err.message),
    );
});
