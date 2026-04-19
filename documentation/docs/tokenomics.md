# Tokenomics

## ESTF Token Overview

| Property   | Value                                        |
| ---------- | -------------------------------------------- |
| Token Name | EONSWAP TOKEN                                |
| Symbol     | ESTF                                         |
| Network    | Base Mainnet                                 |
| Contract   | `0x295685df8e07a6d529a849AE7688c524494fD010` |
| Standard   | ERC-20 (with EIP-2612 Permit)                |
| Max Supply | 1,000,000,000 ESTF                           |
| Decimals   | 18                                           |

## Token Distribution

| Allocation           | Amount      | Percentage | Purpose                     |
| -------------------- | ----------- | ---------- | --------------------------- |
| 🌾 Farm Rewards      | 400,000,000 | 40%        | Liquidity mining incentives |
| 💧 Liquidity         | 200,000,000 | 20%        | DEX liquidity & LP programs |
| 🏦 Treasury          | 150,000,000 | 15%        | Protocol development & DAO  |
| 🎁 Community Airdrop | 100,000,000 | 10%        | Community distribution      |
| 👥 Team & Advisors   | 100,000,000 | 10%        | Core contributors           |
| 📢 Marketing         | 50,000,000  | 5%         | Growth & partnerships       |

## Detailed Breakdown

### 🌾 Farm Rewards (40%)

Distributed via MasterChef contract over ~4 years.

- **Emission Rate**: ~3.17 ESTF per second
- **Distribution**: Proportional to staked LP tokens
- **Pools**: ESTF/WETH, ESR/WETH, and future pairs

**Yearly Distribution:**

- Year 1: ~100M ESTF
- Year 2: ~100M ESTF
- Year 3: ~100M ESTF
- Year 4: ~100M ESTF

### 💧 Liquidity (20%)

| Purpose               | Amount           |
| --------------------- | ---------------- |
| Initial DEX Liquidity | 50,000,000 ESTF  |
| LP Incentive Programs | 100,000,000 ESTF |
| Future CEX Listings   | 50,000,000 ESTF  |

### 🎁 Community Airdrop (10%)

| Campaign  | Amount          | Status   |
| --------- | --------------- | -------- |
| Airdrop 1 | 10,000,000 ESTF | Active   |
| Airdrop 2 | 20,000,000 ESTF | Planned  |
| Airdrop 3 | 30,000,000 ESTF | Planned  |
| Future    | 40,000,000 ESTF | Reserved |

### 🏦 Treasury (15%)

Controlled by governance for:

- Protocol development
- Security audits
- Bug bounties
- Strategic investments
- Emergency reserves

### 👥 Team & Advisors (10%)

| Recipient    | Amount     | Vesting                          |
| ------------ | ---------- | -------------------------------- |
| Core Team    | 70,000,000 | 12-month cliff + 36-month linear |
| Advisors     | 20,000,000 | 6-month cliff + 24-month linear  |
| Future Hires | 10,000,000 | Reserved                         |

### 📢 Marketing (5%)

| Purpose                | Amount          |
| ---------------------- | --------------- |
| Marketing Campaigns    | 20,000,000 ESTF |
| Strategic Partnerships | 15,000,000 ESTF |
| Ambassador Program     | 10,000,000 ESTF |
| Bounties & Contests    | 5,000,000 ESTF  |

## Token Utility

1. **Governance** — Vote on protocol parameters and proposals
2. **Staking** — Stake for additional rewards and benefits
3. **Fee Sharing** — Future protocol fee distribution
4. **Boosted Rewards** — Enhanced farming yields for stakers

## ESR Token

| Property   | Value                                        |
| ---------- | -------------------------------------------- |
| Token Name | EONSWAP REWARD                               |
| Symbol     | ESR                                          |
| Contract   | `0xd48463DB303dA9818Ef565e84aCa266234B38f08` |
| Purpose    | Secondary farming reward token               |

ESR is distributed as bonus rewards in eligible farming pools.

## Contracts

| Contract      | Address                                      | Purpose           |
| ------------- | -------------------------------------------- | ----------------- |
| ESTF Token    | `0x295685df8e07a6d529a849AE7688c524494fD010` | Governance token  |
| ESR Token     | `0xd48463DB303dA9818Ef565e84aCa266234B38f08` | Reward token      |
| MasterChef    | `0xbdD705BF5D4844db3d62ee8B6A8f7865CAd731A1` | Farm rewards      |
| Vesting Vault | `0xDDfa6d58762E8841B6aCFDbbfde0Fb22CbeE88E3` | Team vesting      |
| Fee Treasury  | `0x35312a53E99a08df9b3747Ec786079C85675f8e4` | Protocol fees     |
| Timelock      | `0x3e43C8894fa3e89d952E73bd72E46FFdaB95F986` | Delayed execution |
| Governor      | `0x281dB692B726b88f546Fe776e52B4216378b3644` | Emission control  |

All contracts are verified on [BaseScan](https://basescan.org).

## Related Reading

- [How It Works](/how-it-works)
- [Features](/features)
- [Roadmap](/roadmap)
