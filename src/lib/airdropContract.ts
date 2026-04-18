/**
 * EonMerkleAirdrop contract configuration and ABI
 *
 * Airdrop config is loaded dynamically from /config/airdrop.json
 * When contract is deployed, update that file and frontend will auto-detect
 */

// Types for airdrop config
export type AirdropChainConfig = {
  name: string;
  status: "coming-soon" | "live" | "ended" | "paused";
  contractAddress: `0x${string}` | null;
  merkleTreeUrl: string | null;
  claimDeadline: number | null; // Unix timestamp
  totalAllocation: string;
  snapshotBlock: number | null;
  eligibleWallets?: number;
  claimedWallets?: number;
  claimedAmount?: string;
};

export type AirdropConfig = {
  version: number;
  updatedAt: string;
  chains: Record<string, AirdropChainConfig>;
};

// Cache for airdrop config
let cachedConfig: AirdropConfig | null = null;
let configLastFetched = 0;
const CONFIG_CACHE_TTL = 60 * 1000; // 1 minute cache

/**
 * Fetch airdrop config from server
 * Auto-refreshes every minute to detect deployment changes
 */
export async function fetchAirdropConfig(): Promise<AirdropConfig> {
  const now = Date.now();

  // Return cached if still valid
  if (cachedConfig && now - configLastFetched < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }

  try {
    const response = await fetch("/config/airdrop.json", {
      cache: "no-store", // Always fetch fresh
    });

    if (!response.ok) {
      throw new Error("Failed to fetch airdrop config");
    }

    cachedConfig = await response.json();
    configLastFetched = now;
    return cachedConfig!;
  } catch (error) {
    console.error("Failed to fetch airdrop config:", error);
    // Return default config if fetch fails
    return {
      version: 0,
      updatedAt: new Date().toISOString(),
      chains: {},
    };
  }
}

/**
 * Get chain-specific airdrop config
 */
export function getChainAirdropConfig(
  config: AirdropConfig,
  chainId: number,
): AirdropChainConfig | null {
  return config.chains[String(chainId)] ?? null;
}

// Legacy compatibility - these now work with dynamic config
export function getAirdropAddress(
  chainId: number,
  config?: AirdropConfig,
): `0x${string}` | undefined {
  if (!config) return undefined;
  const chainConfig = config.chains[String(chainId)];
  return chainConfig?.contractAddress ?? undefined;
}

export function isAirdropDeployed(
  chainId: number,
  config?: AirdropConfig,
): boolean {
  if (!config) return false;
  const chainConfig = config.chains[String(chainId)];
  return (
    chainConfig?.status === "live" && Boolean(chainConfig?.contractAddress)
  );
}

export function getMerkleTreeUrl(
  chainId: number,
  config?: AirdropConfig,
): string | undefined {
  if (!config) return undefined;
  const chainConfig = config.chains[String(chainId)];
  return chainConfig?.merkleTreeUrl ?? undefined;
}

// ABI for EonMerkleAirdrop contract
export const EON_MERKLE_AIRDROP_ABI = [
  // Read functions
  {
    name: "token",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "merkleRoot",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    name: "claimDeadline",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "emergencyMode",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "antiBotEnabled",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "antiBotUntil",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // Write functions
  {
    name: "claim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "index_", type: "uint256" },
      { name: "account_", type: "address" },
      { name: "amount_", type: "uint256" },
      { name: "merkleProof_", type: "bytes32[]" },
    ],
    outputs: [],
  },
  // Admin functions
  {
    name: "setEmergencyMode",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "enabled_", type: "bool" }],
    outputs: [],
  },
  {
    name: "setAntiBotEnabled",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "enabled_", type: "bool" }],
    outputs: [],
  },
  {
    name: "setClaimDeadline",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "deadline_", type: "uint256" }],
    outputs: [],
  },
  {
    name: "withdrawRemainingTokens",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "to_", type: "address" }],
    outputs: [],
  },
  // Events
  {
    name: "Claimed",
    type: "event",
    inputs: [
      { name: "index", type: "uint256", indexed: true },
      { name: "account", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  // Errors
  { name: "EmergencyActive", type: "error", inputs: [] },
  { name: "AntiBotSenderMismatch", type: "error", inputs: [] },
  { name: "AntiBotContractCaller", type: "error", inputs: [] },
  { name: "CampaignEnded", type: "error", inputs: [] },
  { name: "AlreadyClaimed", type: "error", inputs: [] },
  { name: "BadProof", type: "error", inputs: [] },
  { name: "ZeroAccount", type: "error", inputs: [] },
] as const;

// Merkle tree data type
export type AirdropClaim = {
  index: number;
  address: string;
  amount: string;
  amountReadable: string;
  leaf: string;
  proof: string[];
};

export type MerkleTreeData = {
  generatedAt: string;
  description: string;
  token: {
    symbol: string;
    address: string;
    decimals: number;
  };
  merkleRoot: string;
  totalRecipients: number;
  totalAllocation: string;
  totalAllocationReadable: string;
  claims: AirdropClaim[];
};

/**
 * Fetch merkle tree data from URL
 */
export async function fetchMerkleTree(
  url: string,
): Promise<MerkleTreeData | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch merkle tree");
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch merkle tree:", error);
    return null;
  }
}

/**
 * Find a user's claim data from the merkle tree
 */
export function findUserClaim(
  merkleTree: MerkleTreeData,
  userAddress: string,
): AirdropClaim | undefined {
  const normalizedAddress = userAddress.toLowerCase();
  return merkleTree.claims.find(
    (claim) => claim.address.toLowerCase() === normalizedAddress,
  );
}

/**
 * Parse contract error to user-friendly message
 */
export function parseAirdropError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("AlreadyClaimed")) {
    return "You have already claimed your airdrop.";
  }
  if (message.includes("CampaignEnded")) {
    return "The airdrop campaign has ended.";
  }
  if (message.includes("BadProof")) {
    return "Invalid merkle proof. Please refresh and try again.";
  }
  if (message.includes("EmergencyActive")) {
    return "Claims are temporarily paused.";
  }
  if (message.includes("AntiBotSenderMismatch")) {
    return "You must claim from the eligible wallet directly.";
  }
  if (message.includes("AntiBotContractCaller")) {
    return "Claims from smart contracts are not allowed.";
  }
  if (message.includes("User rejected") || message.includes("User denied")) {
    return "Transaction cancelled.";
  }

  return "Failed to claim. Please try again.";
}
