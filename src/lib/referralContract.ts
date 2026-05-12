/**
 * EonReferral contract ABI and address configuration
 */

export const EON_REFERRAL_ABI = [
  {
    type: "function",
    name: "register",
    inputs: [{ name: "referrer", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimRewards",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getReferralData",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [
      { name: "referrer", type: "address", internalType: "address" },
      { name: "joinedAt", type: "uint256", internalType: "uint256" },
      { name: "totalVolume", type: "uint256", internalType: "uint256" },
      { name: "totalSwaps", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getReferrerStats",
    inputs: [{ name: "referrer", type: "address", internalType: "address" }],
    outputs: [
      { name: "totalReferrals", type: "uint256", internalType: "uint256" },
      { name: "totalEarnings", type: "uint256", internalType: "uint256" },
      { name: "pendingRewards", type: "uint256", internalType: "uint256" },
      { name: "claimedRewards", type: "uint256", internalType: "uint256" },
      { name: "tier", type: "uint8", internalType: "enum EonReferral.Tier" },
      { name: "rewardPercentage", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getReferredUsers",
    inputs: [{ name: "referrer", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "address[]", internalType: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "calculateTier",
    inputs: [
      { name: "referralCount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      { name: "", type: "uint8", internalType: "enum EonReferral.Tier" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getNextTierInfo",
    inputs: [{ name: "referrer", type: "address", internalType: "address" }],
    outputs: [
      { name: "hasNextTier", type: "bool", internalType: "bool" },
      {
        name: "nextTier",
        type: "uint8",
        internalType: "enum EonReferral.Tier",
      },
      { name: "referralsNeeded", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "ReferralRegistered",
    inputs: [
      { name: "referee", type: "address", indexed: true },
      { name: "referrer", type: "address", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "SwapTracked",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "referrer", type: "address", indexed: true },
      { name: "volumeUsd", type: "uint256", indexed: false },
      { name: "feeAmount", type: "uint256", indexed: false },
      { name: "referralReward", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "RewardsClaimed",
    inputs: [
      { name: "referrer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TierUpgraded",
    inputs: [
      { name: "referrer", type: "address", indexed: true },
      { name: "newTier", type: "uint8", indexed: false },
      { name: "referralCount", type: "uint256", indexed: false },
    ],
  },
] as const;

/**
 * EonReferral contract addresses by chain ID
 */
export const EON_REFERRAL_ADDRESS: Record<number, `0x${string}`> = {
  // Base Mainnet
  8453: "0xD878c03e94Dc9a42AB79C78Af7b06fAf341CAd55",
  // Base Sepolia
  84532: "0x0000000000000000000000000000000000000000", // TODO: Update after deployment
  // Ethereum Sepolia
  11155111: "0x0000000000000000000000000000000000000000", // TODO: Update after deployment
};

/**
 * Get EonReferral contract address for current chain
 */
export function getEonReferralAddress(
  chainId: number,
): `0x${string}` | undefined {
  return EON_REFERRAL_ADDRESS[chainId];
}

/**
 * Tier enum matching contract
 */
export enum Tier {
  Bronze = 0,
  Silver = 1,
  Gold = 2,
  Platinum = 3,
}

/**
 * Get tier name from enum value
 */
export function getTierName(
  tier: Tier,
): "bronze" | "silver" | "gold" | "platinum" {
  const names: readonly ["bronze", "silver", "gold", "platinum"] = [
    "bronze",
    "silver",
    "gold",
    "platinum",
  ] as const;
  return names[tier] || "bronze";
}

/**
 * Get tier reward percentage
 */
export function getTierRewardPct(tier: Tier): number {
  const pcts = [5, 7.5, 10, 15];
  return pcts[tier] || 5;
}
