# How It Works

EonSwap is an automated market maker (AMM) DEX on Base, similar to Uniswap V2. Here's how each feature works.

## Non-Custodial Design

- You connect your wallet (MetaMask, Coinbase Wallet, etc.)
- You always control your funds
- EonSwap never asks for seed phrases or private keys
- All transactions require your wallet signature

## Swap

1. Select tokens to swap (e.g., ETH → ESTF)
2. Enter the amount you want to trade
3. Review quote, price impact, and fees
4. Approve token spending (first time only)
5. Confirm swap in your wallet
6. Transaction executes on-chain

**How pricing works:** EonSwap uses the constant product formula (x × y = k) to determine prices. Larger trades have more price impact.

## Liquidity

1. Choose a token pair (e.g., ESTF/WETH)
2. Provide equal value of both tokens
3. Receive LP tokens representing your pool share
4. Earn 0.3% of all trades in that pair
5. Withdraw anytime by burning LP tokens

**Impermanent loss:** If token prices diverge significantly, you may have less value than holding. Learn more in our [Risk Disclosure](/risk-disclosure).

## Farm

1. Stake LP tokens in the MasterChef contract
2. Earn ESTF rewards every block (~2 seconds on Base)
3. Earn bonus ESR rewards on eligible pools
4. Claim or compound rewards anytime
5. Unstake LP tokens when ready

**Emission:** ~3.17 ESTF per second, distributed across all pools proportionally.

## Airdrop

1. Check eligibility using your wallet address
2. If eligible, see your claimable amount
3. Click claim and confirm transaction
4. ESTF tokens are sent to your wallet

## Smart Contracts

| Contract | Purpose |
|----------|---------|
| EonFactory | Creates trading pairs |
| EonRouter | Handles swaps and liquidity |
| EonPair | Individual trading pair pools |
| MasterChef | Farm reward distribution |
| EonToken (ESTF) | Governance token |

All contracts are deployed on **Base Mainnet** and verified on BaseScan.
