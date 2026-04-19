import { type PublicClient } from "viem";
import { EON_BASE_MAINNET } from "./eonBaseMainnet";

export type BlockchainSwapActivity = {
  id: string;
  txHash: `0x${string}`;
  blockNumber: number;
  timestamp: number;
  from: `0x${string}`;
  amount0In: bigint;
  amount1In: bigint;
  amount0Out: bigint;
  amount1Out: bigint;
  to: `0x${string}`;
};

/**
 * Fetch recent swap activities from blockchain (LP Pair Swap events)
 */
export async function fetchBlockchainSwapActivities(
  client: PublicClient,
  limit = 50,
): Promise<
  | { ok: true; activities: BlockchainSwapActivity[] }
  | { ok: false; error: string }
> {
  try {
    const lpPair = EON_BASE_MAINNET.amm.pairEstfWeth;

    // Get latest block
    const latestBlock = await client.getBlockNumber();

    // Fetch last ~2000 blocks (roughly last ~1 hour on Base)
    // Split into batches of 500 blocks to avoid RPC limits
    const totalBlocks = 2000;
    const batchSize = 500;
    const numBatches = Math.ceil(totalBlocks / batchSize);

    const allLogs = [];

    for (let i = 0; i < numBatches; i++) {
      const batchEnd = latestBlock - BigInt(i * batchSize);
      const batchStart = batchEnd - BigInt(batchSize) + BigInt(1);

      try {
        const batchLogs = await client.getLogs({
          address: lpPair,
          event: {
            type: "event",
            name: "Swap",
            inputs: [
              { type: "address", indexed: true, name: "sender" },
              { type: "uint256", indexed: false, name: "amount0In" },
              { type: "uint256", indexed: false, name: "amount1In" },
              { type: "uint256", indexed: false, name: "amount0Out" },
              { type: "uint256", indexed: false, name: "amount1Out" },
              { type: "address", indexed: true, name: "to" },
            ],
          },
          fromBlock: batchStart,
          toBlock: batchEnd,
        });
        allLogs.push(...batchLogs);
      } catch (err) {
        console.warn(`Batch ${i} failed, continuing...`, err);
      }
    }

    const logs = allLogs;

    // Get block timestamps for all unique blocks
    const uniqueBlocks = [...new Set(logs.map((log) => log.blockNumber))];
    const blockTimestamps = new Map<bigint, number>();

    await Promise.all(
      uniqueBlocks.map(async (blockNum) => {
        try {
          const block = await client.getBlock({ blockNumber: blockNum });
          blockTimestamps.set(blockNum, Number(block.timestamp) * 1000);
        } catch (e) {
          console.warn(`Failed to fetch timestamp for block ${blockNum}`, e);
        }
      }),
    );

    // Parse logs into activities
    const activities: BlockchainSwapActivity[] = logs
      .map((log) => {
        if (!log.args || !log.blockNumber) return null;

        const { sender, amount0In, amount1In, amount0Out, amount1Out, to } =
          log.args as {
            sender: `0x${string}`;
            amount0In: bigint;
            amount1In: bigint;
            amount0Out: bigint;
            amount1Out: bigint;
            to: `0x${string}`;
          };

        return {
          id: `${log.transactionHash}-${log.logIndex}`,
          txHash: log.transactionHash as string,
          blockNumber: Number(log.blockNumber),
          timestamp: blockTimestamps.get(log.blockNumber) || Date.now(),
          from: sender as string,
          amount0In,
          amount1In,
          amount0Out,
          amount1Out,
          to: to as string,
        };
      })
      .filter((a): a is BlockchainSwapActivity => a !== null)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return { ok: true, activities };
  } catch (error) {
    console.error("Failed to fetch blockchain activities:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Format swap activity for display
 */
export function formatSwapActivity(activity: BlockchainSwapActivity): string {
  const isEthToEstf = activity.amount1In > 0n;

  if (isEthToEstf) {
    // ETH -> ESTF swap
    const ethIn = Number(activity.amount1In) / 1e18;
    const estfOut = Number(activity.amount0Out) / 1e18;
    return `Swapped ${ethIn.toFixed(4)} ETH → ${estfOut.toFixed(2)} ESTF`;
  } else {
    // ESTF -> ETH swap
    const estfIn = Number(activity.amount0In) / 1e18;
    const ethOut = Number(activity.amount1Out) / 1e18;
    return `Swapped ${estfIn.toFixed(2)} ESTF → ${ethOut.toFixed(4)} ETH`;
  }
}
