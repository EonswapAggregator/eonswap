# How It Works

EonSwap is an automated market maker (AMM) exchange on Base. The current app focuses on swaps, liquidity, farms, activity tracking, referrals, and leaderboard visibility.

## Non-Custodial Design

- You connect your wallet (MetaMask, Coinbase Wallet, and similar wallets)
- You always control your funds
- EonSwap never asks for seed phrases or private keys
- All transactions require your wallet signature

## Swap

1. Select the tokens you want to trade, such as ETH to ESTF
2. Enter the amount you want to trade
3. Review the quote, route, price impact, and fees
4. Approve token spending if needed
5. Confirm the swap in your wallet
6. The transaction settles on-chain on Base

**How pricing works:** EonSwap uses a constant product pool model. Larger trades move the pool ratio more and can increase price impact.

## Liquidity

1. Choose a token pair such as ESTF/WETH
2. Provide equal value of both assets
3. Receive LP tokens representing your pool share
4. Earn 0.3% of trading fees generated in that pool
5. Remove liquidity later by redeeming your LP position

**Impermanent loss:** If token prices diverge significantly, your position can underperform simply holding the assets. Learn more in our [Risk Disclosure](/risk-disclosure).

## Farm

1. Stake LP tokens in the MasterChef contract
2. Earn ESTF rewards based on pool emissions
3. Earn bonus ESR rewards on eligible pools
4. Claim rewards when you want
5. Unstake LP tokens when you are ready to exit

**Distribution model:** Rewards are split across pools according to their allocation settings in the farm contracts.

## Activity

1. Open the activity page to review recent protocol actions
2. Inspect swaps, liquidity actions, farm events, airdrop claims, and referral activity
3. Switch between market-wide activity and wallet-oriented views when available
4. Open transaction hashes in the explorer for deeper verification

## Leaderboard

1. EonSwap aggregates wallet activity and trading volume into leaderboard entries
2. Rankings can reflect swaps, liquidity, farm actions, and related indexed activity
3. The page is intended to highlight active wallets, not internal protocol addresses

## Airdrop

1. Check eligibility using your wallet address
2. Review your claimable amount if you qualify
3. Submit the claim transaction
4. Receive ESTF directly in your wallet

## Referral

1. Connect your wallet on the referral page
2. Generate and share your referral link
3. Track referred users, activity, and reward progress from the referral dashboard

## Smart Contracts

| Contract | Purpose |
|----------|---------|
| EonFactory | Creates trading pairs |
| EonRouter | Handles swaps and liquidity |
| EonPair | Individual trading pair pools |
| MasterChef | Farm reward distribution |
| EonToken (ESTF) | Ecosystem token |

All contracts are deployed on **Base Mainnet** and verified on BaseScan.
