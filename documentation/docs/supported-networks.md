# Supported Networks

EonSwap supports selected EVM networks for swap and bridge routing.

## Currently supported

| Network | Typical Use | Explorer |
| --- | --- | --- |
| Ethereum | Deep liquidity, mainnet settlement | [Etherscan](https://etherscan.io) |
| Arbitrum | Lower-cost execution, high activity | [Arbiscan](https://arbiscan.io) |
| Base | Low-cost retail and app activity | [BaseScan](https://basescan.org) |
| Optimism | Fast confirmations, lower fees | [OP Mainnet Explorer](https://optimistic.etherscan.io) |
| Polygon | Cost-sensitive swaps and transfers | [PolygonScan](https://polygonscan.com) |
| BNB Smart Chain | High-throughput retail activity | [BscScan](https://bscscan.com) |

## Network selection guidance

- Select source chain based on your current wallet assets.
- Confirm destination chain before bridge execution.
- Validate gas token availability on source chain.
- Re-check route details after changing chain.

## Operational notes

- Availability can vary by RPC and routing provider conditions.
- Temporary degradation may affect quote freshness and status indexing.
- Chain congestion may increase confirmation time and effective cost.

## Best practice

For first-time routes on a new chain pair, run a small test transaction before larger execution.

## Related reading

- [Getting Started](/getting-started)
- [Wallet Setup Guide](/guides/wallet-setup)
- [Status Codes Reference](/guides/status-codes)
- [Risk Disclosure](/risk-disclosure)

