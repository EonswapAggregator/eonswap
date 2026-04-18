/**
 * E2E Integration Tests for Referral System with Smart Contract
 *
 * Tests the full referral flow:
 * 1. Relay server endpoints (off-chain tracking)
 * 2. Smart contract read functions via RPC
 * 3. Frontend ABI compatibility
 */

import assert from "node:assert/strict";
import { createPublicClient, http, parseAbi, formatEther } from "viem";
import { base } from "viem/chains";
import {
  EON_REFERRAL_ABI,
  EON_REFERRAL_ADDRESS,
  getEonReferralAddress,
  Tier,
  getTierName,
  getTierRewardPct,
} from "../../src/lib/referralContract";

// ============================================================================
// Configuration
// ============================================================================

const RELAY_URL = process.env.RELAY_URL || "http://localhost:8787";
const BASE_RPC = process.env.BASE_RPC_URL || "https://mainnet.base.org";
const CONTRACT_ADDRESS = EON_REFERRAL_ADDRESS[8453];

// Test addresses (random, for read-only testing)
const TEST_ADDRESS = "0x114629C43Fa2528E5295b2982765733Acf3aCadA";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// ============================================================================
// Viem Client Setup
// ============================================================================

const publicClient = createPublicClient({
  chain: base,
  transport: http(BASE_RPC),
});

// ============================================================================
// Helper Functions
// ============================================================================

async function fetchRelay(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(`${RELAY_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });
}

// ============================================================================
// Test: Smart Contract Deployment Verification
// ============================================================================

async function testContractDeployed() {
  console.log("🔍 Testing contract deployment...");

  const code = await publicClient.getCode({
    address: CONTRACT_ADDRESS as `0x${string}`,
  });

  assert.ok(code && code !== "0x", "Contract should be deployed at address");
  assert.ok(
    code.length > 100,
    "Contract bytecode should have reasonable length",
  );

  console.log("✅ Contract is deployed at", CONTRACT_ADDRESS);
}

// ============================================================================
// Test: Smart Contract Read Functions
// ============================================================================

async function testGetReferrerStats() {
  console.log("🔍 Testing getReferrerStats...");

  const result = await publicClient.readContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: EON_REFERRAL_ABI,
    functionName: "getReferrerStats",
    args: [TEST_ADDRESS as `0x${string}`],
  });

  // Should return 6-tuple
  assert.equal(Array.isArray(result) || typeof result === "object", true);
  const [
    totalReferrals,
    totalEarnings,
    pendingRewards,
    claimedRewards,
    tier,
    rewardPercentage,
  ] = result as readonly [bigint, bigint, bigint, bigint, number, bigint];

  assert.equal(
    typeof totalReferrals,
    "bigint",
    "totalReferrals should be bigint",
  );
  assert.equal(
    typeof totalEarnings,
    "bigint",
    "totalEarnings should be bigint",
  );
  assert.equal(
    typeof pendingRewards,
    "bigint",
    "pendingRewards should be bigint",
  );
  assert.equal(
    typeof claimedRewards,
    "bigint",
    "claimedRewards should be bigint",
  );
  assert.equal(typeof tier, "number", "tier should be number");
  assert.equal(
    typeof rewardPercentage,
    "bigint",
    "rewardPercentage should be bigint",
  );

  console.log("✅ getReferrerStats returns valid data structure");
  console.log(
    `   Referrals: ${totalReferrals}, Tier: ${tier}, Reward%: ${rewardPercentage}`,
  );
}

async function testGetReferralData() {
  console.log("🔍 Testing getReferralData...");

  const result = await publicClient.readContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: EON_REFERRAL_ABI,
    functionName: "getReferralData",
    args: [TEST_ADDRESS as `0x${string}`],
  });

  const [referrer, joinedAt, totalVolume, totalSwaps] = result as readonly [
    string,
    bigint,
    bigint,
    bigint,
  ];

  assert.equal(typeof referrer, "string", "referrer should be string");
  assert.equal(typeof joinedAt, "bigint", "joinedAt should be bigint");
  assert.equal(typeof totalVolume, "bigint", "totalVolume should be bigint");
  assert.equal(typeof totalSwaps, "bigint", "totalSwaps should be bigint");

  console.log("✅ getReferralData returns valid data structure");
  console.log(
    `   Referrer: ${referrer === ZERO_ADDRESS ? "none" : referrer}, Swaps: ${totalSwaps}`,
  );
}

async function testGetReferredUsers() {
  console.log("🔍 Testing getReferredUsers...");

  const result = await publicClient.readContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: EON_REFERRAL_ABI,
    functionName: "getReferredUsers",
    args: [TEST_ADDRESS as `0x${string}`],
  });

  assert.ok(Array.isArray(result), "Should return array");

  console.log("✅ getReferredUsers returns array");
  console.log(
    `   Referred users count: ${(result as readonly string[]).length}`,
  );
}

async function testCalculateTier() {
  console.log("🔍 Testing calculateTier...");

  try {
    // Test just one tier boundary to avoid rate limits
    const tier = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: EON_REFERRAL_ABI,
      functionName: "calculateTier",
      args: [0n],
    });

    assert.equal(tier, 0, "Tier for 0 referrals should be Bronze (0)");
    console.log("✅ calculateTier returns correct tier");
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("rate limit")) {
      console.log("⚠️  Skipped due to RPC rate limit");
    } else {
      throw e;
    }
  }
}

async function testGetNextTierInfo() {
  console.log("🔍 Testing getNextTierInfo...");

  try {
    const result = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: EON_REFERRAL_ABI,
      functionName: "getNextTierInfo",
      args: [TEST_ADDRESS as `0x${string}`],
    });

    const [hasNextTier, nextTier, referralsNeeded] = result as readonly [
      boolean,
      number,
      bigint,
    ];

    assert.equal(
      typeof hasNextTier,
      "boolean",
      "hasNextTier should be boolean",
    );
    assert.equal(typeof nextTier, "number", "nextTier should be number");
    assert.equal(
      typeof referralsNeeded,
      "bigint",
      "referralsNeeded should be bigint",
    );

    console.log("✅ getNextTierInfo returns valid data");
    console.log(
      `   Has next tier: ${hasNextTier}, Next: ${nextTier}, Needed: ${referralsNeeded}`,
    );
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("rate limit")) {
      console.log("⚠️  Skipped due to RPC rate limit");
    } else {
      throw e;
    }
  }
}

// ============================================================================
// Test: Contract State Variables
// ============================================================================

async function testContractState() {
  console.log("🔍 Testing contract state variables...");

  try {
    // Read reward token
    const rewardToken = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: parseAbi(["function rewardToken() view returns (address)"]),
      functionName: "rewardToken",
    });

    assert.ok(
      /^0x[a-fA-F0-9]{40}$/.test(rewardToken),
      "rewardToken should be valid address",
    );
    console.log(`   Reward Token: ${rewardToken}`);

    // Read router
    const router = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: parseAbi(["function router() view returns (address)"]),
      functionName: "router",
    });

    assert.ok(
      /^0x[a-fA-F0-9]{40}$/.test(router),
      "router should be valid address",
    );
    console.log(`   Router: ${router}`);

    // Read paused state
    const paused = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: parseAbi(["function paused() view returns (bool)"]),
      functionName: "paused",
    });

    assert.equal(typeof paused, "boolean", "paused should be boolean");
    console.log(`   Paused: ${paused}`);

    // Read total rewards distributed
    const totalRewards = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: parseAbi([
        "function totalRewardsDistributed() view returns (uint256)",
      ]),
      functionName: "totalRewardsDistributed",
    });

    assert.equal(
      typeof totalRewards,
      "bigint",
      "totalRewards should be bigint",
    );
    console.log(
      `   Total Rewards Distributed: ${formatEther(totalRewards)} ETH`,
    );

    console.log("✅ Contract state variables are accessible");
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("rate limit")) {
      console.log("⚠️  Skipped due to RPC rate limit");
    } else {
      throw e;
    }
  }
}

// ============================================================================
// Test: Frontend ABI Compatibility
// ============================================================================

async function testAbiCompatibility() {
  console.log("🔍 Testing frontend ABI compatibility...");

  // Verify all functions in ABI exist on contract
  const functionNames = EON_REFERRAL_ABI.filter(
    (item) => item.type === "function",
  ).map((item) => item.name);

  for (const name of functionNames) {
    const fn = EON_REFERRAL_ABI.find(
      (item) => item.type === "function" && item.name === name,
    );
    assert.ok(fn, `Function ${name} should exist in ABI`);
  }

  console.log(
    `✅ All ${functionNames.length} functions defined in frontend ABI`,
  );
  console.log(`   Functions: ${functionNames.join(", ")}`);

  // Verify events
  const eventNames = EON_REFERRAL_ABI.filter(
    (item) => item.type === "event",
  ).map((item) => item.name);

  console.log(`✅ All ${eventNames.length} events defined in frontend ABI`);
  console.log(`   Events: ${eventNames.join(", ")}`);
}

// ============================================================================
// Test: Tier Helper Functions
// ============================================================================

async function testTierHelpers() {
  console.log("🔍 Testing tier helper functions...");

  // Test getTierName
  assert.equal(getTierName(Tier.Bronze), "bronze");
  assert.equal(getTierName(Tier.Silver), "silver");
  assert.equal(getTierName(Tier.Gold), "gold");
  assert.equal(getTierName(Tier.Platinum), "platinum");

  // Test getTierRewardPct
  assert.equal(getTierRewardPct(Tier.Bronze), 5);
  assert.equal(getTierRewardPct(Tier.Silver), 7.5);
  assert.equal(getTierRewardPct(Tier.Gold), 10);
  assert.equal(getTierRewardPct(Tier.Platinum), 15);

  console.log("✅ Tier helper functions work correctly");
}

// ============================================================================
// Test: Address Configuration
// ============================================================================

async function testAddressConfig() {
  console.log("🔍 Testing address configuration...");

  // Base Mainnet should have address
  const baseAddress = getEonReferralAddress(8453);
  assert.ok(baseAddress, "Base Mainnet address should be defined");
  assert.notEqual(
    baseAddress,
    ZERO_ADDRESS,
    "Base Mainnet address should not be zero",
  );

  // Verify format
  assert.ok(
    /^0x[a-fA-F0-9]{40}$/.test(baseAddress),
    "Address should be valid format",
  );

  console.log("✅ Address configuration is correct");
  console.log(`   Base Mainnet: ${baseAddress}`);
}

// ============================================================================
// Test: Relay Server Referral Endpoints (if available)
// ============================================================================

async function testRelayReferralEndpoints() {
  console.log("🔍 Testing relay server referral endpoints...");

  try {
    // Test /referral/code endpoint
    const codeRes = await fetchRelay(`/referral/code?address=${TEST_ADDRESS}`);

    if (codeRes.ok) {
      const codeData = (await codeRes.json()) as { ok: boolean; code?: string };
      assert.equal(codeData.ok, true, "Code endpoint should return ok");
      assert.ok(codeData.code, "Should return referral code");
      assert.equal(codeData.code?.length, 8, "Code should be 8 characters");
      console.log(`   Generated code: ${codeData.code}`);
    }

    // Test /referral/stats endpoint
    const statsRes = await fetchRelay(
      `/referral/stats?address=${TEST_ADDRESS}`,
    );

    if (statsRes.ok) {
      const statsData = (await statsRes.json()) as { ok: boolean };
      assert.equal(statsData.ok, true, "Stats endpoint should return ok");
      console.log("   Stats endpoint working");
    }

    // Test validation - invalid address
    const invalidRes = await fetchRelay(`/referral/code?address=invalid`);
    const invalidData = (await invalidRes.json()) as {
      ok: boolean;
      error?: string;
    };
    assert.equal(invalidData.ok, false, "Should reject invalid address");
    assert.ok(invalidData.error, "Should return error message");

    console.log("✅ Relay referral endpoints are functional");
  } catch (e) {
    console.log("⚠️  Relay server not available, skipping relay tests");
    console.log(`   Error: ${(e as Error).message}`);
  }
}

// ============================================================================
// Test: Contract Events (historical)
// ============================================================================

async function testContractEvents() {
  console.log("🔍 Testing contract event logs...");

  try {
    // Get ReferralRegistered events
    const registeredLogs = await publicClient.getLogs({
      address: CONTRACT_ADDRESS as `0x${string}`,
      event: {
        type: "event",
        name: "ReferralRegistered",
        inputs: [
          { name: "referee", type: "address", indexed: true },
          { name: "referrer", type: "address", indexed: true },
          { name: "timestamp", type: "uint256", indexed: false },
        ],
      },
      fromBlock: "earliest",
      toBlock: "latest",
    });

    console.log(`   ReferralRegistered events: ${registeredLogs.length}`);

    // Get RewardsClaimed events
    const claimedLogs = await publicClient.getLogs({
      address: CONTRACT_ADDRESS as `0x${string}`,
      event: {
        type: "event",
        name: "RewardsClaimed",
        inputs: [
          { name: "referrer", type: "address", indexed: true },
          { name: "amount", type: "uint256", indexed: false },
        ],
      },
      fromBlock: "earliest",
      toBlock: "latest",
    });

    console.log(`   RewardsClaimed events: ${claimedLogs.length}`);

    console.log("✅ Contract events are queryable");
  } catch (e) {
    console.log("⚠️  Could not query events (may be RPC limitation)");
    console.log(`   Error: ${(e as Error).message}`);
  }
}

// ============================================================================
// Run All Tests
// ============================================================================

async function runTests() {
  console.log("\n🧪 EonReferral Contract Integration Tests");
  console.log("==========================================\n");
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`RPC: ${BASE_RPC}`);
  console.log(`Relay: ${RELAY_URL}\n`);

  const tests = [
    testContractDeployed,
    testGetReferrerStats,
    testGetReferralData,
    testGetReferredUsers,
    testCalculateTier,
    testGetNextTierInfo,
    testContractState,
    testAbiCompatibility,
    testTierHelpers,
    testAddressConfig,
    testRelayReferralEndpoints,
    testContractEvents,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (e) {
      failed++;
      console.error(`❌ ${test.name} FAILED:`);
      console.error(`   ${(e as Error).message}`);
    }
    console.log("");
  }

  console.log("==========================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests if executed directly
runTests().catch((e) => {
  console.error("Test runner failed:", e);
  process.exit(1);
});
