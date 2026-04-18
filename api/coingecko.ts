import type { VercelRequest, VercelResponse } from "@vercel/node";

const COINGECKO_BASE = "https://api.coingecko.com";

// Cache for responses (2 minute TTL)
const responseCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000;

/**
 * Proxy endpoint for CoinGecko API to avoid CORS issues.
 *
 * Usage: /api/coingecko?path=/api/v3/simple/price&ids=ethereum&vs_currencies=usd
 *
 * The `path` query param specifies the CoinGecko API path.
 * All other query params are forwarded to CoinGecko.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { path, ...queryParams } = req.query;

    // Build the CoinGecko URL
    let cgPath = typeof path === "string" ? path : "/api/v3/simple/price";
    if (!cgPath.startsWith("/")) {
      cgPath = "/" + cgPath;
    }

    // Build query string from remaining params
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParams)) {
      if (typeof value === "string") {
        searchParams.set(key, value);
      } else if (Array.isArray(value)) {
        searchParams.set(key, value.join(","));
      }
    }

    const queryString = searchParams.toString();
    const cgUrl = `${COINGECKO_BASE}${cgPath}${queryString ? "?" + queryString : ""}`;

    // Check cache
    const cacheKey = cgUrl;
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.setHeader("X-Cache", "HIT");
      return res.status(200).json(cached.data);
    }

    // Fetch from CoinGecko
    const response = await fetch(cgUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "EonSwap/1.0",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[CoinGecko Proxy] Error:", response.status, text);
      return res.status(response.status).json({
        error: "CoinGecko API error",
        status: response.status,
        detail: text.slice(0, 200),
      });
    }

    const data = await response.json();

    // Cache the response
    responseCache.set(cacheKey, { data, timestamp: Date.now() });
    res.setHeader("X-Cache", "MISS");

    return res.status(200).json(data);
  } catch (error) {
    console.error("[CoinGecko Proxy] Fetch error:", error);
    return res.status(500).json({
      error: "Failed to fetch from CoinGecko",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
