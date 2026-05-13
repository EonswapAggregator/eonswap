import type { VercelRequest, VercelResponse } from "@vercel/node";

const ROUTER_ADDRESS = "0xEbEe6F5518482c2de9EcF5483916d7591bf0d474";
const FACTORY_ADDRESS = "0x24FF44E8B0839660Dfc381466be1fF8d946cE5C8";
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
const RPC_URLS = [
  process.env.BASE_RPC_URL,
  process.env.VITE_BASE_RPC_URL,
  ...(process.env.BASE_FALLBACK_RPC_URLS || "").split(","),
  "https://mainnet.base.org",
]
  .map((url) => String(url || "").trim())
  .filter(Boolean);

// ABI for getAmountsOut
const GET_AMOUNTS_OUT_SELECTOR = "0xd06ca61f";
const GET_PAIR_SELECTOR = "0xe6a43905";
const TOKEN0_SELECTOR = "0x0dfe1681";
const GET_RESERVES_SELECTOR = "0x0902f1ac";

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

    const priceImpact = await calculatePriceImpact(
      actualTokenIn,
      actualTokenOut,
      amount,
      amountOut,
    );

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

function encodeGetPair(tokenA: string, tokenB: string): string {
  return (
    GET_PAIR_SELECTOR +
    tokenA.slice(2).padStart(64, "0") +
    tokenB.slice(2).padStart(64, "0")
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
  let lastError: unknown = null;
  for (const rpcUrl of RPC_URLS) {
    try {
      const response = await fetch(rpcUrl, {
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
      if (json.error) throw new Error(json.error.message || "RPC call failed");
      return json.result;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("All RPC calls failed");
}

function decodeAddress(result: string): string {
  return `0x${result.slice(-40)}`.toLowerCase();
}

function formatImpactBps(bps: bigint): string {
  if (bps <= 0n) return "0.00%";
  const whole = bps / 100n;
  const frac = (bps % 100n).toString().padStart(2, "0");
  return `${whole}.${frac}%`;
}

async function calculatePriceImpact(
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
  amountOut: string,
): Promise<string | undefined> {
  const pairResult = await ethCall(FACTORY_ADDRESS, encodeGetPair(tokenIn, tokenOut));
  const pairAddress = decodeAddress(pairResult);
  if (pairAddress === "0x0000000000000000000000000000000000000000") {
    return undefined;
  }

  const [token0Result, reservesResult] = await Promise.all([
    ethCall(pairAddress, TOKEN0_SELECTOR),
    ethCall(pairAddress, GET_RESERVES_SELECTOR),
  ]);
  const token0 = decodeAddress(token0Result);
  const reserve0 = BigInt(`0x${reservesResult.slice(2, 66)}`);
  const reserve1 = BigInt(`0x${reservesResult.slice(66, 130)}`);
  const reserveIn = tokenIn.toLowerCase() === token0 ? reserve0 : reserve1;
  const reserveOut = tokenIn.toLowerCase() === token0 ? reserve1 : reserve0;
  const input = BigInt(amountIn);
  const output = BigInt(amountOut);

  if (reserveIn <= 0n || reserveOut <= 0n || input <= 0n || output <= 0n) {
    return undefined;
  }

  const spotOutput = (input * reserveOut) / reserveIn;
  if (spotOutput <= 0n || output >= spotOutput) return "0.00%";
  const impactBps = ((spotOutput - output) * 10_000n) / spotOutput;
  return formatImpactBps(impactBps);
}
