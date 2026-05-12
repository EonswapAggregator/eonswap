import type { VercelRequest, VercelResponse } from "@vercel/node";

const FACTORY_ADDRESS = "0x24FF44E8B0839660Dfc381466be1fF8d946cE5C8";
const RPC_URL = "https://mainnet.base.org";

// Known pairs from deployment
const KNOWN_PAIRS = [
  {
    address: "0x539e2da338ca3ae9b5fedc6d102978a741b641cf",
    token0: "0x295685df8e07a6d529a849AE7688c524494fD010", // ESTF
    token1: "0x4200000000000000000000000000000000000006", // WETH
    symbol: "ESTF/WETH",
  },
];

// ABI selectors
const GET_RESERVES_SELECTOR = "0x0902f1ac";
const TOKEN0_SELECTOR = "0x0dfe1681";
const TOKEN1_SELECTOR = "0xd21220a7";
const TOTAL_SUPPLY_SELECTOR = "0x18160ddd";

/**
 * GET /api/pairs
 * Get liquidity pool information
 *
 * Query params:
 * - pair: Pair address (optional - returns all known pairs if not provided)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { pair } = req.query;

  try {
    if (pair) {
      // Get specific pair
      const pairAddress = String(pair).toLowerCase().trim();

      if (!/^0x[a-f0-9]{40}$/i.test(pairAddress)) {
        return res.status(400).json({ error: "Invalid pair address format" });
      }

      const pairData = await getPairData(pairAddress);

      if (!pairData) {
        return res
          .status(404)
          .json({ error: "Pair not found or has no liquidity" });
      }

      return res.status(200).json({ data: pairData });
    }

    // Get all known pairs
    const pairsData = await Promise.all(
      KNOWN_PAIRS.map(async (p) => {
        const data = await getPairData(p.address);
        return data ? { ...data, symbol: p.symbol } : null;
      }),
    );

    const validPairs = pairsData.filter(Boolean);

    return res.status(200).json({
      data: validPairs,
      factory: FACTORY_ADDRESS,
      chainId: 8453,
    });
  } catch (error) {
    console.error("Pairs error:", error);
    return res.status(500).json({
      error: "Failed to get pair data",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface PairData {
  address: string;
  token0: string;
  token1: string;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  chainId: number;
}

async function getPairData(pairAddress: string): Promise<PairData | null> {
  try {
    // Batch RPC calls
    const [reservesResult, token0Result, token1Result, totalSupplyResult] =
      await Promise.all([
        ethCall(pairAddress, GET_RESERVES_SELECTOR),
        ethCall(pairAddress, TOKEN0_SELECTOR),
        ethCall(pairAddress, TOKEN1_SELECTOR),
        ethCall(pairAddress, TOTAL_SUPPLY_SELECTOR),
      ]);

    if (!reservesResult || reservesResult === "0x") {
      return null;
    }

    // Decode reserves (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)
    const reserve0 = BigInt("0x" + reservesResult.slice(2, 66)).toString();
    const reserve1 = BigInt("0x" + reservesResult.slice(66, 130)).toString();

    // Decode addresses (32 bytes each, address is last 20 bytes)
    const token0 = "0x" + token0Result.slice(-40);
    const token1 = "0x" + token1Result.slice(-40);

    // Decode total supply
    const totalSupply = BigInt("0x" + totalSupplyResult.slice(2)).toString();

    return {
      address: pairAddress.toLowerCase(),
      token0: token0.toLowerCase(),
      token1: token1.toLowerCase(),
      reserve0,
      reserve1,
      totalSupply,
      chainId: 8453,
    };
  } catch {
    return null;
  }
}

async function ethCall(to: string, data: string): Promise<string> {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_call",
      params: [{ to, data }, "latest"],
      id: 1,
    }),
    signal: AbortSignal.timeout(10000),
  });

  const json = await response.json();

  if (json.error) {
    throw new Error(json.error.message || "RPC call failed");
  }

  return json.result;
}
