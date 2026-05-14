import { createPublicClient, fallback, http, webSocket } from "viem";
import { base, baseSepolia, sepolia } from "viem/chains";

const baseWithEonMulticall = {
  ...base,
  contracts: {
    ...(base.contracts ?? {}),
    multicall3: {
      address: "0x8B34F397a7E8170e93Ff93Cf65d1e1742409E3d2",
      blockCreated: 30168079,
    },
  },
};

const CHAIN_CONFIGS = {
  8453: baseWithEonMulticall,
  84532: baseSepolia,
  11155111: sepolia,
};

function splitUrls(value) {
  return String(value || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
}

export function rpcUrlsFromEnv(prefix = "TRACKER") {
  const primary = splitUrls(process.env[`${prefix}_RPC_URL`]);
  const fallbacks = splitUrls(process.env[`${prefix}_FALLBACK_RPC_URLS`]);
  const basePublic =
    prefix === "TRACKER" || prefix === "INDEXER"
      ? ["https://mainnet.base.org", "https://base-rpc.publicnode.com"]
      : [];
  return [...primary, ...fallbacks, ...basePublic];
}

export function wsRpcUrlsFromEnv(prefix = "TRACKER") {
  return splitUrls(process.env[`${prefix}_WS_RPC_URL`]);
}

export function chainForId(chainId) {
  const chain = CHAIN_CONFIGS[chainId];
  if (!chain) throw new Error(`Unsupported chain: ${chainId}`);
  return chain;
}

export function createFallbackPublicClient({
  chainId,
  rpcUrls = rpcUrlsFromEnv(),
  wsRpcUrls = [],
  preferWebSocket = false,
}) {
  const chain = chainForId(chainId);
  const transports = [];

  if (preferWebSocket) {
    for (const url of wsRpcUrls) {
      transports.push(webSocket(url, { retryCount: 5, retryDelay: 1_000 }));
    }
  }

  for (const url of rpcUrls) {
    transports.push(http(url, { retryCount: 2, retryDelay: 700 }));
  }

  if (!transports.length) {
    throw new Error("No RPC URLs configured.");
  }

  return createPublicClient({
    chain,
    transport: fallback(transports, {
      rank: true,
      retryCount: 2,
      retryDelay: 800,
    }),
  });
}
