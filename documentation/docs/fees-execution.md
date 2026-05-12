# Fees

This page explains all fees involved when using EonSwap.

## Fee Summary

| Action | Fee | Recipient |
|--------|-----|-----------|
| Swap | 0.3% | Liquidity Providers |
| Add Liquidity | Gas only | Network |
| Remove Liquidity | Gas only | Network |
| Stake LP | Gas only | Network |
| Unstake LP | Gas only | Network |
| Claim Rewards | Gas only | Network |
| Airdrop Claim | Gas only | Network |

## Swap Fee (0.3%)

Every swap incurs a 0.3% fee that goes entirely to liquidity providers.

**Example:**
- You swap 1 ETH for ESTF
- 0.003 ETH (0.3%) goes to the ETH/ESTF liquidity pool
- You receive ESTF based on the remaining 0.997 ETH

## Gas Fees

All transactions require ETH on Base for gas. Typical costs:

| Transaction | Estimated Gas |
|-------------|---------------|
| Token Approval | ~$0.001 |
| Swap | ~$0.005 |
| Add Liquidity | ~$0.008 |
| Remove Liquidity | ~$0.006 |
| Stake LP | ~$0.004 |
| Claim Rewards | ~$0.003 |

*Gas costs vary with network congestion.*

## Price Impact

Large trades can move the market price. This is called **price impact**.

| Price Impact | Recommendation |
|--------------|----------------|
| < 1% | Safe to proceed |
| 1-3% | Review carefully |
| 3-5% | Consider splitting trade |
| > 5% | High impact warning |

**Tip:** Split large trades into smaller amounts to reduce price impact.

## Slippage

Slippage is the difference between expected and actual execution price.

**Default:** 0.5%

You can adjust slippage in Settings:
- **Lower (0.1%)**: May cause transaction to fail
- **Default (0.5%)**: Balanced for most trades
- **Higher (1%+)**: For volatile tokens

## No Hidden Fees

EonSwap does not charge:
- Protocol fees (currently)
- Interface fees
- Withdrawal fees
- Deposit fees

## LP Earnings

When you provide liquidity, you earn:
- 0.3% of all trades in your pool (proportional to your share)
- ESTF + ESR rewards when staking LP tokens in farms

## Related Reading

- [How It Works](/how-it-works)
- [Risk Disclosure](/risk-disclosure)
- [Troubleshooting](/guides/troubleshooting)
