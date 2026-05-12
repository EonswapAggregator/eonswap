# API & Smart Contracts

This page documents EonSwap's smart contract addresses and how to interact with them.

## Network

All contracts are deployed on **Base Mainnet** (Chain ID: 8453).

| Property | Value |
|----------|-------|
| Network | Base Mainnet |
| Chain ID | 8453 |
| RPC | `https://mainnet.base.org` |
| Explorer | [BaseScan](https://basescan.org) |

## Contract Addresses

### Tokens

| Contract | Address | Verified |
|----------|---------|----------|
| ESTF Token | [`0x7bd09674b3c721e35973993d5b6a79cda7da9c7f`](https://basescan.org/token/0x7bd09674b3c721e35973993d5b6a79cda7da9c7f) | ✅ |
| ESR Token | [`0xbc11e3093afdbeb88d32ef893027202fc2b84f9d`](https://basescan.org/token/0xbc11e3093afdbeb88d32ef893027202fc2b84f9d) | ✅ |

### AMM (Swap & Liquidity)

| Contract | Address | Verified |
|----------|---------|----------|
| EonFactory | [`0xd7b56729dcaa67aa2fa4a72795e3ed94ac03071b`](https://basescan.org/address/0xd7b56729dcaa67aa2fa4a72795e3ed94ac03071b) | ✅ |
| EonRouter | [`0xccc8b61b06544c942446846b6715f86c1c2823ce`](https://basescan.org/address/0xccc8b61b06544c942446846b6715f86c1c2823ce) | ✅ |
| WETH | [`0x4200000000000000000000000000000000000006`](https://basescan.org/token/0x4200000000000000000000000000000000000006) | ✅ |

### Liquidity Pairs

| Pair | Address | Verified |
|------|---------|----------|
| ESTF/WETH | [`0x79680a4500df8e0599e9916c52b3b1983bd6ee04`](https://basescan.org/address/0x79680a4500df8e0599e9916c52b3b1983bd6ee04) | ✅ |
| ESR/WETH | [`0x1a46207d6c02b95c159ab2f4b8b521b061b49173`](https://basescan.org/address/0x1a46207d6c02b95c159ab2f4b8b521b061b49173) | ✅ |

### Farming

| Contract | Address | Verified |
|----------|---------|----------|
| MasterChef | [`0x1ffbe00f3810e97a8306961d8dc4054abd4f4a2c`](https://basescan.org/address/0x1ffbe00f3810e97a8306961d8dc4054abd4f4a2c) | ✅ |
| Rewarder | [`0x769142cd599cd46fd8f833a3bf5bc1147129e887`](https://basescan.org/address/0x769142cd599cd46fd8f833a3bf5bc1147129e887) | ✅ |

### Operations

| Contract | Address | Verified |
|----------|---------|----------|
| Fee Treasury | [`0x7f10d2bb44eafa46669e0befc23fd54808046d77`](https://basescan.org/address/0x7f10d2bb44eafa46669e0befc23fd54808046d77) | ✅ |
| Vesting Vault | [`0x5871de9b49198f8016932ffe6599a6199079c6b4`](https://basescan.org/address/0x5871de9b49198f8016932ffe6599a6199079c6b4) | ✅ |
| Emission Governor | [`0x87fa28cf1e03cade52eaa26e24c4aecb00389944`](https://basescan.org/address/0x87fa28cf1e03cade52eaa26e24c4aecb00389944) | ✅ |
| Timelock | [`0x95c5b1c146dc2a3da953a99435395d311f6089ae`](https://basescan.org/address/0x95c5b1c146dc2a3da953a99435395d311f6089ae) | ✅ |
| Integration Manager | [`0x0589ee6bf6635cbb5bad92fa638b96c6f506f302`](https://basescan.org/address/0x0589ee6bf6635cbb5bad92fa638b96c6f506f302) | ✅ |
| TWAP Guard | [`0x3f98649e3844bf06ecf8ee303469c35dfb4d3f5f`](https://basescan.org/address/0x3f98649e3844bf06ecf8ee303469c35dfb4d3f5f) | ✅ |

---

## EonRouter API

The EonRouter is the main contract for swapping and liquidity operations.

### Swap Functions

#### `swapExactTokensForTokens`

Swap exact input tokens for output tokens.

```solidity
function swapExactTokensForTokens(
    uint amountIn,
    uint amountOutMin,
    address[] calldata path,
    address to,
    uint deadline
) external returns (uint[] memory amounts);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `amountIn` | uint256 | Amount of input tokens to swap |
| `amountOutMin` | uint256 | Minimum output (slippage protection) |
| `path` | address[] | Token path (e.g., [ESTF, WETH]) |
| `to` | address | Recipient address |
| `deadline` | uint256 | Transaction deadline timestamp |

#### `swapExactETHForTokens`

Swap exact ETH for tokens.

```solidity
function swapExactETHForTokens(
    uint amountOutMin,
    address[] calldata path,
    address to,
    uint deadline
) external payable returns (uint[] memory amounts);
```

#### `swapExactTokensForETH`

Swap exact tokens for ETH.

```solidity
function swapExactTokensForETH(
    uint amountIn,
    uint amountOutMin,
    address[] calldata path,
    address to,
    uint deadline
) external returns (uint[] memory amounts);
```

### Liquidity Functions

#### `addLiquidity`

Add liquidity to a token pair.

```solidity
function addLiquidity(
    address tokenA,
    address tokenB,
    uint amountADesired,
    uint amountBDesired,
    uint amountAMin,
    uint amountBMin,
    address to,
    uint deadline
) external returns (uint amountA, uint amountB, uint liquidity);
```

#### `addLiquidityETH`

Add liquidity with ETH.

```solidity
function addLiquidityETH(
    address token,
    uint amountTokenDesired,
    uint amountTokenMin,
    uint amountETHMin,
    address to,
    uint deadline
) external payable returns (uint amountToken, uint amountETH, uint liquidity);
```

#### `removeLiquidity`

Remove liquidity and receive tokens.

```solidity
function removeLiquidity(
    address tokenA,
    address tokenB,
    uint liquidity,
    uint amountAMin,
    uint amountBMin,
    address to,
    uint deadline
) external returns (uint amountA, uint amountB);
```

#### `removeLiquidityETH`

Remove liquidity and receive ETH.

```solidity
function removeLiquidityETH(
    address token,
    uint liquidity,
    uint amountTokenMin,
    uint amountETHMin,
    address to,
    uint deadline
) external returns (uint amountToken, uint amountETH);
```

### Read Functions

#### `getAmountsOut`

Calculate output amounts for a swap path.

```solidity
function getAmountsOut(
    uint amountIn, 
    address[] calldata path
) external view returns (uint[] memory amounts);
```

#### `getAmountsIn`

Calculate required input for desired output.

```solidity
function getAmountsIn(
    uint amountOut, 
    address[] calldata path
) external view returns (uint[] memory amounts);
```

---

## EonFactory API

### Read Functions

#### `getPair`

Get pair address for two tokens.

```solidity
function getPair(
    address tokenA, 
    address tokenB
) external view returns (address pair);
```

#### `allPairs`

Get pair address by index.

```solidity
function allPairs(uint index) external view returns (address pair);
```

#### `allPairsLength`

Get total number of pairs.

```solidity
function allPairsLength() external view returns (uint);
```

---

## MasterChef API (Farming)

### Write Functions

#### `deposit`

Stake LP tokens in a pool.

```solidity
function deposit(uint256 pid, uint256 amount) external;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `pid` | uint256 | Pool ID (0 = ESTF/WETH) |
| `amount` | uint256 | Amount of LP tokens to stake |

#### `withdraw`

Unstake LP tokens from a pool.

```solidity
function withdraw(uint256 pid, uint256 amount) external;
```

#### `harvest`

Claim pending rewards.

```solidity
function harvest(uint256 pid) external;
```

### Read Functions

#### `pendingReward`

Get pending ESTF rewards.

```solidity
function pendingReward(uint256 pid, address user) external view returns (uint256);
```

#### `userInfo`

Get user's staked amount and reward debt.

```solidity
function userInfo(uint256 pid, address user) external view returns (
    uint256 amount,
    uint256 rewardDebt
);
```

#### `poolInfo`

Get pool information.

```solidity
function poolInfo(uint256 pid) external view returns (
    address lpToken,
    uint256 allocPoint,
    uint256 lastRewardTime,
    uint256 accRewardPerShare
);
```

#### `poolLength`

Get total number of pools.

```solidity
function poolLength() external view returns (uint256);
```

---

## EonPair API (LP Token)

### Read Functions

#### `getReserves`

Get current reserves of both tokens.

```solidity
function getReserves() external view returns (
    uint112 reserve0,
    uint112 reserve1,
    uint32 blockTimestampLast
);
```

#### `token0` / `token1`

Get token addresses in the pair.

```solidity
function token0() external view returns (address);
function token1() external view returns (address);
```

#### `totalSupply`

Get total LP token supply.

```solidity
function totalSupply() external view returns (uint256);
```

#### `balanceOf`

Get LP token balance.

```solidity
function balanceOf(address owner) external view returns (uint256);
```

---

## JavaScript/TypeScript Examples

### Using ethers.js

```typescript
import { ethers } from 'ethers';

const ROUTER = '0xccc8b61b06544c942446846b6715f86c1c2823ce';
const ESTF = '0x7bd09674b3c721e35973993d5b6a79cda7da9c7f';
const WETH = '0x4200000000000000000000000000000000000006';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');

// Get quote
const routerAbi = ['function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)'];
const router = new ethers.Contract(ROUTER, routerAbi, provider);

const amountIn = ethers.parseEther('1'); // 1 ETH
const path = [WETH, ESTF];
const amounts = await router.getAmountsOut(amountIn, path);
console.log('Output:', ethers.formatUnits(amounts[1], 18), 'ESTF');
```

### Using viem

```typescript
import { createPublicClient, http, parseEther, formatUnits } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
  chain: base,
  transport: http(),
});

const amounts = await client.readContract({
  address: '0xccc8b61b06544c942446846b6715f86c1c2823ce',
  abi: [{
    name: 'getAmountsOut',
    type: 'function',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' }
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view'
  }],
  functionName: 'getAmountsOut',
  args: [
    parseEther('1'),
    ['0x4200000000000000000000000000000000000006', '0x7bd09674b3c721e35973993d5b6a79cda7da9c7f']
  ],
});

console.log('Output:', formatUnits(amounts[1], 18), 'ESTF');
```

---

## ABIs

Full contract ABIs are available on BaseScan:

- [EonRouter ABI](https://basescan.org/address/0xccc8b61b06544c942446846b6715f86c1c2823ce#code)
- [EonFactory ABI](https://basescan.org/address/0xd7b56729dcaa67aa2fa4a72795e3ed94ac03071b#code)
- [MasterChef ABI](https://basescan.org/address/0x1ffbe00f3810e97a8306961d8dc4054abd4f4a2c#code)
- [ESTF Token ABI](https://basescan.org/token/0x7bd09674b3c721e35973993d5b6a79cda7da9c7f#code)

---

## Rate Limits

The Base RPC has rate limits. For production apps, use:
- [Alchemy](https://www.alchemy.com/)
- [Infura](https://www.infura.io/)
- [QuickNode](https://www.quicknode.com/)

---

## REST API

EonSwap provides a REST API at `https://eonswap.us/api` for easy integration.

### Base URL

```
https://eonswap.us/api
```

### Endpoints

#### `GET /api/health`

Check API status and connectivity.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-04-17T12:00:00.000Z",
  "version": "1.0.0",
  "chain": {
    "id": 8453,
    "name": "Base",
    "blockNumber": 12345678
  },
  "latency": "45ms",
  "contracts": {
    "router": "0xccc8b61b06544c942446846b6715f86c1c2823ce",
    "factory": "0xd7b56729dcaa67aa2fa4a72795e3ed94ac03071b",
    "masterChef": "0x1ffbe00f3810e97a8306961d8dc4054abd4f4a2c"
  }
}
```

---

#### `GET /api/quote`

Get swap quote from the router.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tokenIn` | address | Yes | Input token address |
| `tokenOut` | address | Yes | Output token address |
| `amountIn` | string | Yes | Amount in wei |
| `chainId` | number | No | Chain ID (default: 8453) |

**Example:**

```
GET /api/quote?tokenIn=0x4200000000000000000000000000000000000006&tokenOut=0x7bd09674b3c721e35973993d5b6a79cda7da9c7f&amountIn=1000000000000000000
```

**Response:**

```json
{
  "data": {
    "tokenIn": "0x4200000000000000000000000000000000000006",
    "tokenOut": "0x7bd09674b3c721e35973993d5b6a79cda7da9c7f",
    "amountIn": "1000000000000000000",
    "amountOut": "12345678901234567890",
    "path": ["0x4200000000000000000000000000000000000006", "0x7bd09674b3c721e35973993d5b6a79cda7da9c7f"],
    "routerAddress": "0xccc8b61b06544c942446846b6715f86c1c2823ce",
    "priceImpact": "< 0.5%",
    "fee": "0.3%",
    "chainId": 8453
  }
}
```

---

#### `GET /api/status`

Get transaction status.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `txHash` | string | Yes | Transaction hash (0x...) |
| `chainId` | number | No | Chain ID (default: 8453) |

**Example:**

```
GET /api/status?txHash=0x123abc...
```

**Response:**

```json
{
  "data": {
    "txHash": "0x123abc...",
    "status": "SUCCESS",
    "chainId": 8453,
    "blockNumber": 12345678,
    "from": "0x...",
    "to": "0x...",
    "gasUsed": 150000,
    "explorerUrl": "https://basescan.org/tx/0x123abc..."
  }
}
```

**Status values:**
- `SUCCESS` - Transaction confirmed successfully
- `FAILED` - Transaction reverted
- `PENDING` - Transaction in mempool
- `NOT_FOUND` - Transaction not found

---

#### `GET /api/prices`

Get token prices in USD.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tokens` | string | Yes | Comma-separated tokens (address or symbol) |
| `vs` | string | No | Currency (default: usd) |

**Example:**

```
GET /api/prices?tokens=ETH,USDC
GET /api/prices?tokens=0x4200000000000000000000000000000000000006
```

**Response:**

```json
{
  "data": {
    "eth": { "price": 3500.50, "currency": "USD" },
    "usdc": { "price": 1.00, "currency": "USD" }
  },
  "timestamp": "2026-04-17T12:00:00.000Z",
  "source": "coingecko"
}
```

---

#### `GET /api/pairs`

Get liquidity pool information.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pair` | address | No | Specific pair address (returns all if omitted) |

**Example:**

```
GET /api/pairs
GET /api/pairs?pair=0x79680a4500df8e0599e9916c52b3b1983bd6ee04
```

**Response:**

```json
{
  "data": [
    {
      "address": "0x79680a4500df8e0599e9916c52b3b1983bd6ee04",
      "symbol": "ESTF/WETH",
      "token0": "0x7bd09674b3c721e35973993d5b6a79cda7da9c7f",
      "token1": "0x4200000000000000000000000000000000000006",
      "reserve0": "1000000000000000000000",
      "reserve1": "500000000000000000",
      "totalSupply": "707106781186547524",
      "chainId": 8453
    }
  ],
  "factory": "0xd7b56729dcaa67aa2fa4a72795e3ed94ac03071b",
  "chainId": 8453
}
```

---

#### `GET /api/tokens`

Get supported tokens list.

**Response:**

```json
{
  "name": "EonSwap Token List",
  "timestamp": "2026-04-17T12:00:00.000Z",
  "version": { "major": 1, "minor": 0, "patch": 0 },
  "tokens": [
    {
      "chainId": 8453,
      "address": "0x7bd09674b3c721e35973993d5b6a79cda7da9c7f",
      "name": "EonSwap Token",
      "symbol": "ESTF",
      "decimals": 18,
      "logoURI": "https://eonswap.us/tokens/estf.png"
    }
  ]
}
```

---

### Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message",
  "message": "Detailed error description"
}
```

| HTTP Code | Description |
|-----------|-------------|
| 400 | Bad request (invalid parameters) |
| 404 | Resource not found |
| 405 | Method not allowed |
| 500 | Internal server error |
| 503 | Service unavailable |

---

### cURL Examples

```bash
# Health check
curl https://eonswap.us/api/health

# Get swap quote (1 ETH → ESTF)
curl "https://eonswap.us/api/quote?tokenIn=0x4200000000000000000000000000000000000006&tokenOut=0x7bd09674b3c721e35973993d5b6a79cda7da9c7f&amountIn=1000000000000000000"

# Get ETH and USDC prices
curl "https://eonswap.us/api/prices?tokens=ETH,USDC"

# Get all pairs
curl https://eonswap.us/api/pairs

# Get token list
curl https://eonswap.us/api/tokens

# Check transaction status
curl "https://eonswap.us/api/status?txHash=0x..."
```

---

## Related

- [How It Works](/how-it-works)
- [Integration Guide](/guides/integration)
- [Tokenomics](/tokenomics)
- [Getting Started](/getting-started)
