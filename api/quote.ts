import type { VercelRequest, VercelResponse } from "@vercel/node";

const ROUTER_ADDRESS = "0xEbEe6F5518482c2de9EcF5483916d7591bf0d474";
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
const RPC_URL = "https://mainnet.base.org";

// ABI for getAmountsOut
const GET_AMOUNTS_OUT_SELECTOR = "0xd06ca61f";

/**
 * GET /api/quote
 * Get swap quote from EonSwap Router
 *
 * Query params:
 * - tokenIn: Input token address
 * - tokenOut: Output token address
 * - amountIn: Amount in (wei string)
 * - chainId: Chain ID (optional, default 8453)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
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

  const { tokenIn, tokenOut, amountIn, chainId = "8453" } = req.query;

  // Validate required params
  if (!tokenIn || !tokenOut || !amountIn) {
    return res.status(400).json({
      error: "Missing required parameters",
      required: ["tokenIn", "tokenOut", "amountIn"],
      example:
        "/api/quote?tokenIn=0x4200000000000000000000000000000000000006&tokenOut=0x295685df8e07a6d529a849AE7688c524494fD010&amountIn=1000000000000000000",
    });
  }

  if (chainId !== "8453") {
    return res.status(400).json({
      error: "Unsupported chain",
      supported: [8453],
      chainName: "Base",
    });
  }

  // Normalize addresses
  const tokenInAddr = normalizeAddress(String(tokenIn));
  const tokenOutAddr = normalizeAddress(String(tokenOut));
  const amount = String(amountIn);

  if (!isValidAddress(tokenInAddr) || !isValidAddress(tokenOutAddr)) {
    return res.status(400).json({ error: "Invalid token address format" });
  }

  if (!isValidAmount(amount)) {
    return res.status(400).json({ error: "Invalid amount format" });
  }

  try {
    // Handle native ETH → wrap to WETH for routing
    const actualTokenIn = isNativeEth(tokenInAddr) ? WETH_ADDRESS : tokenInAddr;
    const actualTokenOut = isNativeEth(tokenOutAddr)
      ? WETH_ADDRESS
      : tokenOutAddr;

    // Build path
    const path = [actualTokenIn, actualTokenOut];

    // Encode getAmountsOut call
    const calldata = encodeGetAmountsOut(amount, path);

    // Call router contract
    const result = await ethCall(ROUTER_ADDRESS, calldata);

    if (!result || result === "0x") {
      return res.status(400).json({
        error: "No liquidity for this pair",
        tokenIn: tokenInAddr,
        tokenOut: tokenOutAddr,
      });
    }

    // Decode amounts array
    const amounts = decodeAmountsOut(result);
    const amountOut = amounts[amounts.length - 1];

    // Calculate price impact (simplified)
    const priceImpact = calculatePriceImpact(amount, amountOut);

    return res.status(200).json({
      data: {
        tokenIn: tokenInAddr,
        tokenOut: tokenOutAddr,
        amountIn: amount,
        amountOut,
        path: path.map((p) => p.toLowerCase()),
        routerAddress: ROUTER_ADDRESS,
        priceImpact,
        fee: "0.3%",
        chainId: 8453,
      },
    });
  } catch (error) {
    console.error("Quote error:", error);
    return res.status(500).json({
      error: "Failed to get quote",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function normalizeAddress(addr: string): string {
  return addr.toLowerCase().trim();
}

function isValidAddress(addr: string): boolean {
  return /^0x[a-f0-9]{40}$/i.test(addr);
}

function isValidAmount(amount: string): boolean {
  return /^\d+$/.test(amount) && BigInt(amount) > 0n;
}

function isNativeEth(addr: string): boolean {
  return addr === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
}

function encodeGetAmountsOut(amountIn: string, path: string[]): string {
  // Encode: getAmountsOut(uint256 amountIn, address[] path)
  const amountHex = BigInt(amountIn).toString(16).padStart(64, "0");

  // Dynamic array offset (64 bytes = 0x40)
  const arrayOffset =
    "0000000000000000000000000000000000000000000000000000000000000040";

  // Array length
  const arrayLength = path.length.toString(16).padStart(64, "0");

  // Array elements (addresses padded to 32 bytes)
  const elements = path.map((addr) => addr.slice(2).padStart(64, "0")).join("");

  return (
    GET_AMOUNTS_OUT_SELECTOR + amountHex + arrayOffset + arrayLength + elements
  );
}

function decodeAmountsOut(result: string): string[] {
  // Skip 0x prefix and first 64 bytes (offset)
  const data = result.slice(2);

  // Get array length (next 32 bytes = 64 hex chars)
  const lengthHex = data.slice(64, 128);
  const length = parseInt(lengthHex, 16);

  // Decode each uint256
  const amounts: string[] = [];
  for (let i = 0; i < length; i++) {
    const start = 128 + i * 64;
    const hex = data.slice(start, start + 64);
    amounts.push(BigInt("0x" + hex).toString());
  }

  return amounts;
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

function calculatePriceImpact(_amountIn: string, _amountOut: string): string {
  // Simplified: would need reserves for accurate calculation
  // Return placeholder
  return "< 0.5%";
}
