/**
 * Referral Tracker Service
 *
 * Listens for swap events on EonPair contracts and calls EonReferral.trackSwap()
 * This allows referral tracking without modifying the router contract.
 *
 * Required ENV:
 * - TRACKER_PRIVATE_KEY: Private key of the tracker wallet
 * - TRACKER_RPC_URL: RPC endpoint for the chain (e.g., Base)
 * - EON_REFERRAL_ADDRESS: Address of EonReferral contract
 * - EON_FACTORY_ADDRESS: Address of EonFactory to get all pairs
 */

import { fileURLToPath } from "url";
import {
  createWalletClient,
  http,
  parseAbi,
  formatUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chainForId, createFallbackPublicClient, rpcUrlsFromEnv } from "./rpc.mjs";

// ABI fragments
const EonPairSwapEventAbi = parseAbi([
  "event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)",
]);

const EonFactoryEventAbi = parseAbi([
  "event PairCreated(address indexed token0, address indexed token1, address pair, uint256)",
]);

const EonReferralAbi = parseAbi([
  "function trackSwap(address user, uint256 volumeUsd, uint256 feeAmount) external",
  "function referrals(address) view returns (address referrer, uint256 joinedAt, uint256 totalVolume, uint256 totalSwaps)",
  "function tracker() view returns (address)",
]);

const EonFactoryAbi = parseAbi([
  "function allPairs(uint256) view returns (address)",
  "function allPairsLength() view returns (uint256)",
]);

const EonPairAbi = parseAbi([
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
]);

/**
 * ReferralTrackerService
 * Monitors swap events and updates EonReferral contract
 */
export class ReferralTrackerService {
  constructor(config) {
    this.chainId = config.chainId;
    this.chain = chainForId(this.chainId);

    // Setup clients
    this.publicClient = createFallbackPublicClient({
      chainId: this.chainId,
      rpcUrls: config.rpcUrls,
      wsRpcUrls: config.wsRpcUrls,
      preferWebSocket: false,
    });

    if (config.trackerPrivateKey) {
      const account = privateKeyToAccount(config.trackerPrivateKey);
      this.walletClient = createWalletClient({
        account,
        chain: this.chain,
        transport: http(config.rpcUrl),
      });
      this.trackerAddress = account.address;
    }

    this.referralAddress = config.referralAddress;
    this.factoryAddress = config.factoryAddress;
    this.swapFeeBps = config.swapFeeBps || 30; // 0.3% default

    // In-memory cache
    this.pairAddresses = new Set();
    this.processedTxs = new Set();
    this.maxProcessedTxs = 10000;

    // Price oracle (simple, you may want to integrate Chainlink or similar)
    this.ethPriceUsd = 3000; // Default, should be updated periodically

    console.log(`[ReferralTracker] Initialized for ${this.chain.name}`);
    console.log(
      `[ReferralTracker] Tracker address: ${this.trackerAddress || "READ-ONLY MODE"}`,
    );
    console.log(`[ReferralTracker] EonReferral: ${this.referralAddress}`);
    console.log(`[ReferralTracker] EonFactory: ${this.factoryAddress}`);
  }

  /**
   * Start listening for swap events
   */
  async start() {
    // Load all pair addresses from factory
    await this.loadAllPairs();

    this.watchSwapEvents();
    this.watchPairCreatedEvents();

    console.log(
      `[ReferralTracker] Watching ${this.pairAddresses.size} pairs for swaps`,
    );
  }

  /**
   * Stop watching
   */
  stop() {
    if (this.unwatch) {
      this.unwatch();
      console.log("[ReferralTracker] Stopped watching");
    }
    if (this.unwatchPairCreated) {
      this.unwatchPairCreated();
      console.log("[ReferralTracker] Stopped pair creation watcher");
    }
  }

  watchSwapEvents() {
    if (this.unwatch) {
      this.unwatch();
      this.unwatch = null;
    }
    const addresses = [...this.pairAddresses];
    if (!addresses.length) {
      console.warn("[ReferralTracker] No pairs loaded, swap watcher disabled");
      return;
    }
    this.unwatch = this.publicClient.watchContractEvent({
      address: addresses,
      abi: EonPairSwapEventAbi,
      eventName: "Swap",
      onLogs: (logs) => this.handleSwapLogs(logs),
      onError: (error) =>
        console.error("[ReferralTracker] Watch error:", error),
    });
  }

  watchPairCreatedEvents() {
    if (!this.factoryAddress) return;
    this.unwatchPairCreated = this.publicClient.watchContractEvent({
      address: this.factoryAddress,
      abi: EonFactoryEventAbi,
      eventName: "PairCreated",
      onLogs: (logs) => {
        let changed = false;
        for (const log of logs) {
          const pair = String(log.args?.pair || "").toLowerCase();
          if (/^0x[a-fA-F0-9]{40}$/.test(pair) && !this.pairAddresses.has(pair)) {
            this.pairAddresses.add(pair);
            changed = true;
            console.log(`[ReferralTracker] New pair detected: ${pair}`);
          }
        }
        if (changed) this.watchSwapEvents();
      },
      onError: (error) =>
        console.error("[ReferralTracker] PairCreated watch error:", error),
    });
  }

  /**
   * Load all pair addresses from factory
   */
  async loadAllPairs() {
    if (!this.factoryAddress) {
      console.warn(
        "[ReferralTracker] No factory address, skipping pair loading",
      );
      return;
    }

    try {
      const length = await this.publicClient.readContract({
        address: this.factoryAddress,
        abi: EonFactoryAbi,
        functionName: "allPairsLength",
      });

      for (let i = 0n; i < length; i++) {
        const pairAddress = await this.publicClient.readContract({
          address: this.factoryAddress,
          abi: EonFactoryAbi,
          functionName: "allPairs",
          args: [i],
        });
        this.pairAddresses.add(pairAddress.toLowerCase());
      }

      console.log(
        `[ReferralTracker] Loaded ${this.pairAddresses.size} pairs from factory`,
      );
    } catch (error) {
      console.error("[ReferralTracker] Failed to load pairs:", error.message);
    }
  }

  /**
   * Handle incoming swap logs
   */
  async handleSwapLogs(logs) {
    for (const log of logs) {
      const txHash = log.transactionHash;
      const pairAddress = String(log.address || "").toLowerCase();

      if (!this.pairAddresses.has(pairAddress)) continue;

      // Skip if already processed
      if (this.processedTxs.has(txHash)) continue;
      this.processedTxs.add(txHash);

      // Cleanup old processed txs
      if (this.processedTxs.size > this.maxProcessedTxs) {
        const toDelete = [...this.processedTxs].slice(
          0,
          this.maxProcessedTxs / 2,
        );
        toDelete.forEach((tx) => this.processedTxs.delete(tx));
      }

      try {
        await this.processSwapEvent(log);
      } catch (error) {
        console.error(
          `[ReferralTracker] Error processing swap ${txHash}:`,
          error.message,
        );
      }
    }
  }

  /**
   * Process a single swap event
   */
  async processSwapEvent(log) {
    const { transactionHash, address: pairAddress, args } = log;
    const { sender, amount0In, amount1In, amount0Out, amount1Out, to } = args;

    // Get transaction to find the actual user (msg.sender to router)
    const tx = await this.publicClient.getTransaction({
      hash: transactionHash,
    });
    const userAddress = tx.from;

    // Check if user is referred
    const referralData = await this.publicClient.readContract({
      address: this.referralAddress,
      abi: EonReferralAbi,
      functionName: "referrals",
      args: [userAddress],
    });

    const [referrer] = referralData;
    if (referrer === "0x0000000000000000000000000000000000000000") {
      // User not referred, skip
      return;
    }

    // Calculate swap value in USD
    const volumeUsd = await this.calculateSwapVolumeUsd(pairAddress, {
      amount0In,
      amount1In,
      amount0Out,
      amount1Out,
    });

    // Calculate fee amount (in wei of reward token)
    const feeAmount = (volumeUsd * BigInt(this.swapFeeBps)) / 10000n;

    console.log(`[ReferralTracker] Swap detected:`);
    console.log(`  User: ${userAddress}`);
    console.log(`  Referrer: ${referrer}`);
    console.log(`  Volume USD: ${formatUnits(volumeUsd, 18)}`);
    console.log(`  Fee Amount: ${formatUnits(feeAmount, 18)}`);
    console.log(`  TxHash: ${transactionHash}`);

    // Call trackSwap on EonReferral
    if (this.walletClient) {
      await this.callTrackSwap(userAddress, volumeUsd, feeAmount);
    } else {
      console.log(
        `[ReferralTracker] READ-ONLY: Would call trackSwap(${userAddress}, ${volumeUsd}, ${feeAmount})`,
      );
    }
  }

  /**
   * Calculate swap volume in USD (scaled 1e18)
   */
  async calculateSwapVolumeUsd(pairAddress, amounts) {
    const { amount0In, amount1In, amount0Out, amount1Out } = amounts;

    // Get token addresses
    const [token0, token1] = await Promise.all([
      this.publicClient.readContract({
        address: pairAddress,
        abi: EonPairAbi,
        functionName: "token0",
      }),
      this.publicClient.readContract({
        address: pairAddress,
        abi: EonPairAbi,
        functionName: "token1",
      }),
    ]);

    // Calculate total swap amount
    // For simplicity, we use the larger of in/out amounts
    const totalIn0 = amount0In > 0n ? amount0In : 0n;
    const totalIn1 = amount1In > 0n ? amount1In : 0n;
    const totalOut0 = amount0Out > 0n ? amount0Out : 0n;
    const totalOut1 = amount1Out > 0n ? amount1Out : 0n;

    // Use the input amount as the volume
    const volumeWei = totalIn0 > 0n ? totalIn0 : totalIn1;

    // TODO: Integrate proper price oracle (Chainlink, etc.)
    // For now, assume 1 ETH = $ethPriceUsd and all tokens are 18 decimals
    // This is a simplification - production should use proper price feeds
    const volumeUsd =
      ((volumeWei * BigInt(this.ethPriceUsd)) / BigInt(1e18)) * BigInt(1e18);

    return volumeUsd;
  }

  /**
   * Call trackSwap on EonReferral contract
   */
  async callTrackSwap(user, volumeUsd, feeAmount) {
    if (!this.walletClient) {
      throw new Error("Wallet client not configured");
    }

    try {
      const hash = await this.walletClient.writeContract({
        address: this.referralAddress,
        abi: EonReferralAbi,
        functionName: "trackSwap",
        args: [user, volumeUsd, feeAmount],
      });

      console.log(`[ReferralTracker] trackSwap tx sent: ${hash}`);

      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash,
      });
      console.log(`[ReferralTracker] trackSwap confirmed: ${receipt.status}`);

      return receipt;
    } catch (error) {
      console.error(`[ReferralTracker] trackSwap failed:`, error.message);
      throw error;
    }
  }

  /**
   * Update ETH price (should be called periodically)
   */
  updateEthPrice(priceUsd) {
    this.ethPriceUsd = priceUsd;
    console.log(`[ReferralTracker] ETH price updated: $${priceUsd}`);
  }
}

/**
 * Create and start tracker from environment variables
 */
export async function createTrackerFromEnv() {
  const chainId = Number(process.env.TRACKER_CHAIN_ID || 8453);
  const rpcUrl = process.env.TRACKER_RPC_URL;
  const rpcUrls = rpcUrlsFromEnv("TRACKER");
  const trackerPrivateKey = process.env.TRACKER_PRIVATE_KEY;
  const referralAddress = process.env.EON_REFERRAL_ADDRESS;
  const factoryAddress = process.env.EON_FACTORY_ADDRESS;
  const swapFeeBps = Number(process.env.SWAP_FEE_BPS || 30);

  if (!rpcUrls.length || !referralAddress) {
    console.error(
      "[ReferralTracker] Missing required env vars: TRACKER_RPC_URL, EON_REFERRAL_ADDRESS",
    );
    return null;
  }

  const tracker = new ReferralTrackerService({
    chainId,
    rpcUrl: rpcUrls[0],
    rpcUrls,
    trackerPrivateKey,
    referralAddress,
    factoryAddress,
    swapFeeBps,
  });

  await tracker.start();
  return tracker;
}

// If running directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createTrackerFromEnv().catch(console.error);
}
