/**
 * Referral system utilities.
 * Connects to backend API for referral tracking and rewards.
 * Falls back to localStorage when API is unavailable.
 */

import { getMonitorRelayBaseUrl } from "./monitorRelayUrl";

const REFERRAL_STORAGE_KEY = "eonswap_referrals";
const REFERRED_BY_KEY = "eonswap_referred_by";
const USE_API = true; // Toggle to use API server instead of localStorage

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  pendingRewards: number;
  tier: ReferralTier;
  referredAddresses: ReferredUser[];
  source?: "subgraph" | "relay-log" | "local";
  updatedAt?: number;
  subgraphError?: string;
}

export interface ReferredUser {
  address: string;
  joinedAt: number;
  swapCount: number;
  volumeUsd: number;
  rewardEarned: number;
}

export type ReferralTier = "bronze" | "silver" | "gold" | "platinum";

const TIER_THRESHOLDS: Record<
  ReferralTier,
  { min: number; rewardPct: number }
> = {
  bronze: { min: 0, rewardPct: 5 },
  silver: { min: 5, rewardPct: 7.5 },
  gold: { min: 15, rewardPct: 10 },
  platinum: { min: 50, rewardPct: 15 },
};

/**
 * Generate a short referral code from wallet address.
 * Format: first 4 chars + last 4 chars of address (lowercase)
 */
export function generateReferralCode(address: string): string {
  if (!address || address.length < 10) return "";
  const clean = address.toLowerCase().replace("0x", "");
  return clean.slice(0, 4) + clean.slice(-4);
}

/**
 * Build a full referral link.
 */
export function buildReferralLink(address: string, baseUrl?: string): string {
  const code = generateReferralCode(address);
  if (!code) return "";
  const base = baseUrl || window.location.origin;
  return `${base}?ref=${code}`;
}

/**
 * Parse referral code from current URL.
 */
export function parseReferralFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("ref");
}

/**
 * Store that user was referred by someone.
 */
export function storeReferredBy(code: string): void {
  if (!code) return;
  try {
    const existing = localStorage.getItem(REFERRED_BY_KEY);
    if (!existing) {
      localStorage.setItem(REFERRED_BY_KEY, code);
    }
  } catch {
    // localStorage not available
  }
}

/**
 * Get the referral code this user was referred by.
 */
export function getReferredBy(): string | null {
  try {
    return localStorage.getItem(REFERRED_BY_KEY);
  } catch {
    return null;
  }
}

/**
 * Calculate tier based on number of referrals.
 */
export function calculateTier(referralCount: number): ReferralTier {
  if (referralCount >= TIER_THRESHOLDS.platinum.min) return "platinum";
  if (referralCount >= TIER_THRESHOLDS.gold.min) return "gold";
  if (referralCount >= TIER_THRESHOLDS.silver.min) return "silver";
  return "bronze";
}

/**
 * Get reward percentage for a tier.
 */
export function getTierRewardPct(tier: ReferralTier): number {
  return TIER_THRESHOLDS[tier].rewardPct;
}

/**
 * Get tier display info.
 */
export function getTierInfo(tier: ReferralTier): {
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  nextTier: ReferralTier | null;
  nextTierAt: number;
} {
  const tierInfo: Record<
    ReferralTier,
    { name: string; color: string; bgColor: string; borderColor: string }
  > = {
    bronze: {
      name: "Bronze",
      color: "text-amber-600",
      bgColor: "bg-amber-600/10",
      borderColor: "border-amber-600/20",
    },
    silver: {
      name: "Silver",
      color: "text-neutral-300",
      bgColor: "bg-neutral-300/10",
      borderColor: "border-neutral-300/20",
    },
    gold: {
      name: "Gold",
      color: "text-yellow-400",
      bgColor: "bg-yellow-400/10",
      borderColor: "border-yellow-400/20",
    },
    platinum: {
      name: "Platinum",
      color: "text-cyan-300",
      bgColor: "bg-cyan-300/10",
      borderColor: "border-cyan-300/20",
    },
  };

  const nextTierMap: Record<ReferralTier, ReferralTier | null> = {
    bronze: "silver",
    silver: "gold",
    gold: "platinum",
    platinum: null,
  };

  const nextTier = nextTierMap[tier];
  const nextTierAt = nextTier ? TIER_THRESHOLDS[nextTier].min : 0;

  return {
    ...tierInfo[tier],
    nextTier,
    nextTierAt,
  };
}

/**
 * Load referral stats from API server.
 * Falls back to localStorage when API is unavailable.
 */
export async function loadReferralStats(
  address: string,
): Promise<ReferralStats> {
  const code = generateReferralCode(address);
  const emptyStats: ReferralStats = {
    totalReferrals: 0,
    activeReferrals: 0,
    totalEarnings: 0,
    pendingRewards: 0,
    tier: "bronze",
    referredAddresses: [],
    source: "local",
  };

  if (!code) return emptyStats;

  // Try API first
  if (USE_API) {
    const base = getMonitorRelayBaseUrl();
    if (base) {
      try {
        const paths = [
          `/public/referral/stats?address=${address}`,
          `/referral/stats?address=${address}`,
        ];
        for (const path of paths) {
          const res = await fetch(`${base}${path}`, {
            headers: { accept: "application/json" },
          });
          if (res.ok) {
            const json = await res.json();
            if (json.ok) {
              return {
                totalReferrals: Number(json.totalReferrals) || 0,
                activeReferrals: Number(json.activeReferrals) || 0,
                totalEarnings: Number(json.totalEarnings) || 0,
                pendingRewards: Number(json.pendingRewards) || 0,
                tier: json.tier || "bronze",
                referredAddresses: Array.isArray(json.referredAddresses)
                  ? json.referredAddresses
                  : [],
                source: json.source || "relay-log",
                updatedAt: Number(json.updatedAt) || undefined,
                subgraphError: json.subgraphError,
              };
            }
          }
        }
      } catch {
        // Fall through to localStorage
      }
    }
  }

  // Fallback: localStorage
  try {
    const stored = localStorage.getItem(`${REFERRAL_STORAGE_KEY}_${code}`);
    if (stored) {
      const data = JSON.parse(stored) as ReferralStats;
      data.tier = calculateTier(data.totalReferrals);
      data.source = "local";
      return data;
    }
  } catch {
    // Parse error or localStorage not available
  }

  return emptyStats;
}

/**
 * Register a new referral via API server.
 * Falls back to localStorage when API is unavailable.
 */
export async function registerReferral(
  referrerCode: string,
  newUserAddress: string,
): Promise<{ success: boolean; message: string }> {
  if (!referrerCode || !newUserAddress) {
    return { success: false, message: "Invalid referral code or address" };
  }

  // Try API first
  if (USE_API) {
    const base = getMonitorRelayBaseUrl();
    if (base) {
      try {
        const res = await fetch(`${base}/referral/register`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({
            referrerCode: referrerCode.toLowerCase(),
            referredAddress: newUserAddress,
          }),
        });
        const json = await res.json();
        if (res.ok && json.ok) {
          return {
            success: true,
            message: json.message || "Referral registered",
          };
        }
        if (json.duplicate) {
          return { success: false, message: "Already referred" };
        }
        return { success: false, message: json.error || "Failed to register" };
      } catch {
        // Fall through to localStorage
      }
    }
  }

  // Fallback: localStorage
  try {
    const stored = localStorage.getItem(
      `${REFERRAL_STORAGE_KEY}_${referrerCode}`,
    );
    let stats: ReferralStats;

    if (stored) {
      stats = JSON.parse(stored) as ReferralStats;
    } else {
      stats = {
        totalReferrals: 0,
        activeReferrals: 0,
        totalEarnings: 0,
        pendingRewards: 0,
        tier: "bronze",
        referredAddresses: [],
        source: "local",
      };
    }

    const alreadyReferred = stats.referredAddresses.some(
      (u) => u.address.toLowerCase() === newUserAddress.toLowerCase(),
    );

    if (alreadyReferred) {
      return { success: false, message: "Address already referred" };
    }

    stats.referredAddresses.push({
      address: newUserAddress,
      joinedAt: Date.now(),
      swapCount: 0,
      volumeUsd: 0,
      rewardEarned: 0,
    });
    stats.totalReferrals += 1;
    stats.activeReferrals += 1;
    stats.tier = calculateTier(stats.totalReferrals);

    localStorage.setItem(
      `${REFERRAL_STORAGE_KEY}_${referrerCode}`,
      JSON.stringify(stats),
    );

    return { success: true, message: "Referral registered successfully" };
  } catch {
    return { success: false, message: "Failed to register referral" };
  }
}

/**
 * Register referrer address mapping in relay.
 * Call this when user visits referral page to store their code -> address mapping.
 */
export async function registerReferrerAddress(
  address: string,
): Promise<{ success: boolean }> {
  if (!address) return { success: false };

  const base = getMonitorRelayBaseUrl();
  if (!base) return { success: false };

  try {
    const res = await fetch(`${base}/referral/register-referrer`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ address }),
    });
    const json = await res.json();
    return { success: res.ok && json.ok };
  } catch {
    return { success: false };
  }
}

/**
 * Lookup referrer address by referral code.
 * Returns the wallet address of the referrer, or null if not found.
 */
export async function lookupReferrerAddress(
  code: string,
): Promise<string | null> {
  if (!code || code.length !== 8) return null;

  const base = getMonitorRelayBaseUrl();
  if (!base) return null;

  try {
    const res = await fetch(
      `${base}/referral/lookup?code=${code.toLowerCase()}`,
      {
        headers: { accept: "application/json" },
      },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.address || null;
  } catch {
    return null;
  }
}

/**
 * Track a swap from referred user (for rewards calculation).
 * Call this after a successful swap.
 */
export async function trackReferralSwap(
  address: string,
  volumeUsd: number,
  txHash?: string,
): Promise<{ success: boolean }> {
  if (!address) return { success: false };
  // Note: volumeUsd can be 0 if price not available, still track for stats

  const base = getMonitorRelayBaseUrl();
  if (!base) return { success: false };

  try {
    const res = await fetch(`${base}/referral/track-swap`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        address,
        volumeUsd,
        txHash,
      }),
    });
    const json = await res.json();
    return { success: res.ok && json.ok };
  } catch {
    return { success: false };
  }
}

/**
 * Save referral stats to localStorage (backup/fallback).
 */
export function saveReferralStats(code: string, stats: ReferralStats): void {
  try {
    localStorage.setItem(
      `${REFERRAL_STORAGE_KEY}_${code}`,
      JSON.stringify(stats),
    );
  } catch {
    // localStorage not available or quota exceeded
  }
}

/**
 * Truncate address for display.
 */
export function truncateAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format relative time for display.
 */
export function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
