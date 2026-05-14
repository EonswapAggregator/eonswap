# API & Smart Contracts

This page documents the current EonSwap Base mainnet deployment used by the app.

## Network

All contracts are deployed on **Base Mainnet**.

| Property | Value |
|----------|-------|
| Network | Base Mainnet |
| Chain ID | 8453 |
| RPC | `https://mainnet.base.org` |
| Explorer | [BaseScan](https://basescan.org) |

## Contract Addresses

### Tokens

| Contract | Address |
|----------|---------|
| ESTF Token | [`0x295685df8e07a6d529a849AE7688c524494fD010`](https://basescan.org/token/0x295685df8e07a6d529a849AE7688c524494fD010) |
| ESR Token | [`0xd48463DB303dA9818Ef565e84aCa266234B38f08`](https://basescan.org/token/0xd48463DB303dA9818Ef565e84aCa266234B38f08) |
| WETH | [`0x4200000000000000000000000000000000000006`](https://basescan.org/token/0x4200000000000000000000000000000000000006) |

### AMM

| Contract | Address |
|----------|---------|
| EonFactory | [`0x24FF44E8B0839660Dfc381466be1fF8d946cE5C8`](https://basescan.org/address/0x24FF44E8B0839660Dfc381466be1fF8d946cE5C8) |
| EonRouter | [`0xEbEe6F5518482c2de9EcF5483916d7591bf0d474`](https://basescan.org/address/0xEbEe6F5518482c2de9EcF5483916d7591bf0d474) |
| ESTF/WETH Pair | [`0x539e2da338ca3ae9b5fedc6d102978a741b641cf`](https://basescan.org/address/0x539e2da338ca3ae9b5fedc6d102978a741b641cf) |

`ESR/WETH` is not deployed in the current Base mainnet deployment.

### Farming

| Contract | Address |
|----------|---------|
| MasterChef | [`0xbdD705BF5D4844db3d62ee8B6A8f7865CAd731A1`](https://basescan.org/address/0xbdD705BF5D4844db3d62ee8B6A8f7865CAd731A1) |
| Rewarder | [`0xA8F9569C1d2D01Aeb09E6407Dd34adbBbBf9d468`](https://basescan.org/address/0xA8F9569C1d2D01Aeb09E6407Dd34adbBbBf9d468) |

### Operations

| Contract | Address |
|----------|---------|
| Fee Treasury | [`0x35312a53E99a08df9b3747Ec786079C85675f8e4`](https://basescan.org/address/0x35312a53E99a08df9b3747Ec786079C85675f8e4) |
| Vesting Vault | [`0xDDfa6d58762E8841B6aCFDbbfde0Fb22CbeE88E3`](https://basescan.org/address/0xDDfa6d58762E8841B6aCFDbbfde0Fb22CbeE88E3) |
| Emission Governor | [`0x281dB692B726b88f546Fe776e52B4216378b3644`](https://basescan.org/address/0x281dB692B726b88f546Fe776e52B4216378b3644) |
| Timelock | [`0x3e43C8894fa3e89d952E73bd72E46FFdaB95F986`](https://basescan.org/address/0x3e43C8894fa3e89d952E73bd72E46FFdaB95F986) |
| Integration Manager | [`0x89887F8C700586EA8321CD65309D001e935b299d`](https://basescan.org/address/0x89887F8C700586EA8321CD65309D001e935b299d) |
| TWAP Guard | [`0x9B7b5B6DC78c4996A77a1eC5F6Be37b4AE18869D`](https://basescan.org/address/0x9B7b5B6DC78c4996A77a1eC5F6Be37b4AE18869D) |

## Router Example

### ethers.js

```typescript
import { ethers } from 'ethers'

const ROUTER = '0xEbEe6F5518482c2de9EcF5483916d7591bf0d474'
const ESTF = '0x295685df8e07a6d529a849AE7688c524494fD010'
const WETH = '0x4200000000000000000000000000000000000006'

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
const routerAbi = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
]

const router = new ethers.Contract(ROUTER, routerAbi, provider)
const amountIn = ethers.parseEther('1')
const path = [WETH, ESTF]
const amounts = await router.getAmountsOut(amountIn, path)

console.log('Output:', ethers.formatUnits(amounts[1], 18), 'ESTF')
```

### viem

```typescript
import { createPublicClient, formatUnits, http, parseEther } from 'viem'
import { base } from 'viem/chains'

const client = createPublicClient({
  chain: base,
  transport: http(),
})

const amounts = await client.readContract({
  address: '0xEbEe6F5518482c2de9EcF5483916d7591bf0d474',
  abi: [
    {
      name: 'getAmountsOut',
      type: 'function',
      inputs: [
        { name: 'amountIn', type: 'uint256' },
        { name: 'path', type: 'address[]' },
      ],
      outputs: [{ name: 'amounts', type: 'uint256[]' }],
      stateMutability: 'view',
    },
  ],
  functionName: 'getAmountsOut',
  args: [
    parseEther('1'),
    [
      '0x4200000000000000000000000000000000000006',
      '0x295685df8e07a6d529a849AE7688c524494fD010',
    ],
  ],
})

console.log('Output:', formatUnits(amounts[1], 18), 'ESTF')
```

## REST API Examples

Base URL:

```text
https://eonswap.us/api
```

Quote example:

```text
GET /api/quote?tokenIn=0x4200000000000000000000000000000000000006&tokenOut=0x295685df8e07a6d529a849AE7688c524494fD010&amountIn=1000000000000000000
```

Pairs example:

```text
GET /api/pairs?pair=0x539e2da338ca3ae9b5fedc6d102978a741b641cf
```

## ABI References

- [EonRouter ABI](https://basescan.org/address/0xEbEe6F5518482c2de9EcF5483916d7591bf0d474#code)
- [EonFactory ABI](https://basescan.org/address/0x24FF44E8B0839660Dfc381466be1fF8d946cE5C8#code)
- [MasterChef ABI](https://basescan.org/address/0xbdD705BF5D4844db3d62ee8B6A8f7865CAd731A1#code)
- [ESTF Token ABI](https://basescan.org/token/0x295685df8e07a6d529a849AE7688c524494fD010#code)

## Related

- [How It Works](/how-it-works)
- [Integration Guide](/guides/integration)
- [Tokenomics](/tokenomics)
- [Getting Started](/getting-started)
