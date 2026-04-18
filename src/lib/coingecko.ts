/** CoinGecko API ids for common swap tokens (symbol → id) */
const SYMBOL_TO_ID: Record<string, string> = {
  ETH: "ethereum",
  WETH: "ethereum",
  WBTC: "wrapped-bitcoin",
  BTC: "bitcoin",
  USDC: "usd-coin",
  USDT: "tether",
  DAI: "dai",
};

/** Address-level mappings (lowercase) to improve pricing coverage per chain. */
const ADDRESS_TO_ID: Record<string, string> = {
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": "ethereum",
  // Base mainnet
  "0x4200000000000000000000000000000000000006": "ethereum",
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": "usd-coin",
  "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2": "tether",
};

/** Fallback prices for stablecoins when API fails */
const FALLBACK_PRICES: Record<string, number> = {
  "usd-coin": 1.0,
  tether: 1.0,
  dai: 1.0,
};

/** Use proxy to avoid CORS in both dev and production */
function getCoingeckoBaseUrl(): string {
  // Use proxy endpoint - Netlify rewrites /api/coingecko/* to api.coingecko.com/*
  return "/api/coingecko/api/v3";
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache & Rate Limiting
// ─────────────────────────────────────────────────────────────────────────────

/** Cache TTL: 5 minutes for price data */
const PRICE_CACHE_TTL_MS = 5 * 60 * 1000;

/** Minimum interval between API calls: 3 seconds (CoinGecko free tier: ~20/min) */
const MIN_REQUEST_INTERVAL_MS = 3000;

/** Backoff period after rate limit hit */
let rateLimitBackoffUntil = 0;

type CacheEntry<T> = { data: T; expiresAt: number };
const priceCache = new Map<string, CacheEntry<number>>();
const chartCache = new Map<string, CacheEntry<MarketChartPoint[]>>();

/** Track in-flight requests to dedupe concurrent calls */
const inflightRequests = new Map<string, Promise<Record<string, number>>>();

/** Last request timestamp for rate limiting */
let lastRequestTime = 0;

/** Queue for pending requests */
const requestQueue: Array<() => Promise<void>> = [];
let isProcessingQueue = false;

async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const now = Date.now();
    // Check rate limit backoff
    if (now < rateLimitBackoffUntil) {
      await new Promise((r) => setTimeout(r, rateLimitBackoffUntil - now));
    }
    const elapsed = Date.now() - lastRequestTime;
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      await new Promise((r) =>
        setTimeout(r, MIN_REQUEST_INTERVAL_MS - elapsed),
      );
    }
    const task = requestQueue.shift();
    if (task) {
      lastRequestTime = Date.now();
      await task();
    }
  }

  isProcessingQueue = false;
}

function getCachedPrices(ids: string[]): {
  cached: Record<string, number>;
  missing: string[];
} {
  const now = Date.now();
  const cached: Record<string, number> = {};
  const missing: string[] = [];

  for (const id of ids) {
    const entry = priceCache.get(id);
    if (entry && entry.expiresAt > now) {
      cached[id] = entry.data;
    } else {
      missing.push(id);
    }
  }

  return { cached, missing };
}

function setCachedPrices(prices: Record<string, number>) {
  const expiresAt = Date.now() + PRICE_CACHE_TTL_MS;
  for (const [id, price] of Object.entries(prices)) {
    priceCache.set(id, { data: price, expiresAt });
  }
}

export function coingeckoIdForSymbol(symbol: string): string | null {
  return SYMBOL_TO_ID[symbol.trim().toUpperCase()] ?? null;
}

export function coingeckoIdForToken(token: {
  symbol: string;
  address?: string;
}): string | null {
  const byAddress = token.address
    ? ADDRESS_TO_ID[token.address.trim().toLowerCase()]
    : null;
  if (byAddress) return byAddress;
  return coingeckoIdForSymbol(token.symbol);
}

export type MarketChartPoint = { t: number; price: number };

/**
 * Fetch USD prices with caching and rate limiting.
 * Returns cached data when available, queues requests to avoid 429 errors.
 */
export async function fetchSimplePricesUsd(
  coinIds: string[],
): Promise<Record<string, number>> {
  const ids = [...new Set(coinIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return {};

  // Check cache first
  const { cached, missing } = getCachedPrices(ids);
  if (missing.length === 0) {
    return cached;
  }

  // Check for in-flight request with same IDs
  const cacheKey = missing.sort().join(",");
  const existing = inflightRequests.get(cacheKey);
  if (existing) {
    const freshPrices = await existing;
    return { ...cached, ...freshPrices };
  }

  // Create queued request
  const requestPromise = new Promise<Record<string, number>>((resolve) => {
    const task = async () => {
      try {
        const baseUrl = getCoingeckoBaseUrl();
        const url = new URL(`${baseUrl}/simple/price`, window.location.origin);
        url.searchParams.set("ids", missing.join(","));
        url.searchParams.set("vs_currencies", "usd");

        const res = await fetch(url.toString());

        if (res.status === 429) {
          // Rate limited - backoff for 60 seconds
          console.warn("[CoinGecko] Rate limited (429), backing off 60s");
          rateLimitBackoffUntil = Date.now() + 60_000;
          resolve({});
          return;
        }

        if (!res.ok) {
          throw new Error(`CoinGecko ${res.status}`);
        }

        // Check if response is JSON error structure
        const text = await res.text();
        let json: Record<string, unknown>;
        try {
          json = JSON.parse(text);
        } catch {
          console.warn("[CoinGecko] Invalid JSON response");
          resolve({});
          return;
        }

        // Check for rate limit in JSON body
        if (
          typeof json === "object" &&
          json !== null &&
          "status" in json &&
          typeof json.status === "object" &&
          json.status !== null &&
          "error_code" in (json.status as Record<string, unknown>)
        ) {
          const errorCode = (json.status as Record<string, unknown>).error_code;
          if (errorCode === 429) {
            console.warn("[CoinGecko] Rate limited (JSON 429), backing off 60s");
            rateLimitBackoffUntil = Date.now() + 60_000;
            resolve({});
            return;
          }
        }

        const priceData = json as Record<string, { usd?: number }>;
        const out: Record<string, number> = {};
        for (const id of missing) {
          const v = Number(priceData[id]?.usd ?? 0);
          if (Number.isFinite(v) && v > 0) out[id] = v;
        }

        // Update cache
        setCachedPrices(out);
        resolve(out);
      } catch (err) {
        console.warn("[CoinGecko] Fetch failed:", err);
        resolve({}); // Return empty instead of throwing
      } finally {
        inflightRequests.delete(cacheKey);
      }
    };

    requestQueue.push(task);
    void processQueue();
  });

  inflightRequests.set(cacheKey, requestPromise);
  const freshPrices = await requestPromise;

  // Merge with fallbacks for any still-missing prices
  const result = { ...cached, ...freshPrices };
  for (const id of ids) {
    if (!(id in result) && FALLBACK_PRICES[id]) {
      result[id] = FALLBACK_PRICES[id];
    }
  }

  return result;
}

/**
 * Fetch market chart data with caching and rate limiting.
 */
export async function fetchMarketChartUsd(
  coinId: string,
  days: 7 | 30 | 90 = 7,
): Promise<MarketChartPoint[]> {
  const cacheKey = `chart:${coinId}:${days}`;

  // Check cache
  const cached = chartCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  return new Promise((resolve) => {
    const task = async () => {
      try {
        const baseUrl = getCoingeckoBaseUrl();
        const url = new URL(
          `${baseUrl}/coins/${coinId}/market_chart`,
          window.location.origin,
        );
        url.searchParams.set("vs_currency", "usd");
        url.searchParams.set("days", String(days));

        const res = await fetch(url.toString());

        if (res.status === 429) {
          console.warn("[CoinGecko] Rate limited (429) for chart data");
          resolve(cached?.data ?? []);
          return;
        }

        if (!res.ok) {
          throw new Error(`CoinGecko ${res.status}`);
        }

        const data = (await res.json()) as { prices?: [number, number][] };
        const prices = data.prices;
        if (!Array.isArray(prices) || prices.length === 0) {
          resolve([]);
          return;
        }

        const result = prices.map(([t, price]) => ({ t, price }));

        // Cache for 5 minutes for chart data
        chartCache.set(cacheKey, {
          data: result,
          expiresAt: Date.now() + 5 * 60 * 1000,
        });
        resolve(result);
      } catch (err) {
        console.warn("[CoinGecko] Chart fetch failed:", err);
        resolve(cached?.data ?? []);
      }
    };

    requestQueue.push(task);
    void processQueue();
  });
}
