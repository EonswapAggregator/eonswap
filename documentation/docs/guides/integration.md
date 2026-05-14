# EonSwap API Integration Guide

This guide explains how to integrate EonSwap into your application.

## Prerequisites

### 1. Install Dependencies

```bash
# Using ethers.js v6
npm install ethers

# Or using viem (modern alternative)
npm install viem
```

### 2. Setup Provider

```typescript
// ethers.js
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');

// For write operations, use signer from wallet
const signer = await provider.getSigner();
```

```typescript
// viem
import { createPublicClient, createWalletClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// For write operations
const walletClient = createWalletClient({
  chain: base,
  transport: http(),
});
```

---

## Contract Addresses

```typescript
const CONTRACTS = {
  // Tokens
  ESTF: '0x295685df8e07a6d529a849AE7688c524494fD010',
  ESR: '0xd48463DB303dA9818Ef565e84aCa266234B38f08',
  WETH: '0x4200000000000000000000000000000000000006',
  
  // AMM
  ROUTER: '0xEbEe6F5518482c2de9EcF5483916d7591bf0d474',
  FACTORY: '0x24FF44E8B0839660Dfc381466be1fF8d946cE5C8',
  
  // Pairs
  ESTF_WETH_PAIR: '0x539e2da338ca3ae9b5fedc6d102978a741b641cf',
  ESR_WETH_PAIR: '',
  
  // Farming
  MASTERCHEF: '0xbdD705BF5D4844db3d62ee8B6A8f7865CAd731A1',
};
```

---

## ABIs (Minimal)

```typescript
const ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function getAmountsIn(uint amountOut, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)',
  'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)',
  'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB, uint liquidity)',
  'function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) payable returns (uint amountToken, uint amountETH, uint liquidity)',
  'function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB)',
  'function removeLiquidityETH(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline) returns (uint amountToken, uint amountETH)',
];

const FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) view returns (address pair)',
  'function allPairs(uint) view returns (address pair)',
  'function allPairsLength() view returns (uint)',
];

const PAIR_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function totalSupply() view returns (uint)',
  'function balanceOf(address) view returns (uint)',
  'function approve(address spender, uint amount) returns (bool)',
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint)',
  'function allowance(address owner, address spender) view returns (uint)',
  'function approve(address spender, uint amount) returns (bool)',
  'function transfer(address to, uint amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

const MASTERCHEF_ABI = [
  'function deposit(uint256 pid, uint256 amount)',
  'function withdraw(uint256 pid, uint256 amount)',
  'function harvest(uint256 pid)',
  'function pendingReward(uint256 pid, address user) view returns (uint256)',
  'function userInfo(uint256 pid, address user) view returns (uint256 amount, uint256 rewardDebt)',
  'function poolInfo(uint256 pid) view returns (address lpToken, uint256 allocPoint, uint256 lastRewardTime, uint256 accRewardPerShare)',
  'function poolLength() view returns (uint256)',
];
```

---

## Example: Get Swap Quote

```typescript
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const router = new ethers.Contract(CONTRACTS.ROUTER, ROUTER_ABI, provider);

async function getQuote(amountIn: bigint, tokenIn: string, tokenOut: string) {
  const path = [tokenIn, tokenOut];
  const amounts = await router.getAmountsOut(amountIn, path);
  return amounts[1]; // Output amount
}

// Example: 1 ETH -> ESTF
const amountIn = ethers.parseEther('1');
const amountOut = await getQuote(amountIn, CONTRACTS.WETH, CONTRACTS.ESTF);
console.log('1 ETH =', ethers.formatUnits(amountOut, 18), 'ESTF');
```

---

## Example: Swap ETH to Token

```typescript
async function swapETHForTokens(
  signer: ethers.Signer,
  amountInETH: string,
  tokenOut: string,
  slippagePercent: number = 0.5
) {
  const router = new ethers.Contract(CONTRACTS.ROUTER, ROUTER_ABI, signer);
  
  const amountIn = ethers.parseEther(amountInETH);
  const path = [CONTRACTS.WETH, tokenOut];
  
  // Get quote
  const amounts = await router.getAmountsOut(amountIn, path);
  const amountOutMin = amounts[1] * BigInt(1000 - slippagePercent * 10) / 1000n;
  
  // Deadline 20 minutes from now
  const deadline = Math.floor(Date.now() / 1000) + 20 * 60;
  
  // Execute swap
  const tx = await router.swapExactETHForTokens(
    amountOutMin,
    path,
    await signer.getAddress(),
    deadline,
    { value: amountIn }
  );
  
  console.log('Tx hash:', tx.hash);
  const receipt = await tx.wait();
  console.log('Confirmed in block:', receipt.blockNumber);
  
  return receipt;
}

// Usage
const signer = await provider.getSigner();
await swapETHForTokens(signer, '0.1', CONTRACTS.ESTF);
```

---

## Example: Swap Token to ETH

```typescript
async function swapTokensForETH(
  signer: ethers.Signer,
  amountIn: string,
  tokenIn: string,
  slippagePercent: number = 0.5
) {
  const router = new ethers.Contract(CONTRACTS.ROUTER, ROUTER_ABI, signer);
  const token = new ethers.Contract(tokenIn, ERC20_ABI, signer);
  
  const amount = ethers.parseUnits(amountIn, 18);
  const path = [tokenIn, CONTRACTS.WETH];
  const userAddress = await signer.getAddress();
  
  // Check & approve
  const allowance = await token.allowance(userAddress, CONTRACTS.ROUTER);
  if (allowance < amount) {
    console.log('Approving token...');
    const approveTx = await token.approve(CONTRACTS.ROUTER, ethers.MaxUint256);
    await approveTx.wait();
  }
  
  // Get quote
  const amounts = await router.getAmountsOut(amount, path);
  const amountOutMin = amounts[1] * BigInt(1000 - slippagePercent * 10) / 1000n;
  
  const deadline = Math.floor(Date.now() / 1000) + 20 * 60;
  
  // Execute swap
  const tx = await router.swapExactTokensForETH(
    amount,
    amountOutMin,
    path,
    userAddress,
    deadline
  );
  
  return await tx.wait();
}
```

---

## Example: Add Liquidity with ETH

```typescript
async function addLiquidityETH(
  signer: ethers.Signer,
  tokenAddress: string,
  tokenAmount: string,
  ethAmount: string,
  slippagePercent: number = 0.5
) {
  const router = new ethers.Contract(CONTRACTS.ROUTER, ROUTER_ABI, signer);
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  
  const amountToken = ethers.parseUnits(tokenAmount, 18);
  const amountETH = ethers.parseEther(ethAmount);
  const userAddress = await signer.getAddress();
  
  // Approve token
  const allowance = await token.allowance(userAddress, CONTRACTS.ROUTER);
  if (allowance < amountToken) {
    console.log('Approving token...');
    const approveTx = await token.approve(CONTRACTS.ROUTER, ethers.MaxUint256);
    await approveTx.wait();
  }
  
  // Calculate min amounts with slippage
  const slippageMultiplier = BigInt(1000 - slippagePercent * 10);
  const amountTokenMin = amountToken * slippageMultiplier / 1000n;
  const amountETHMin = amountETH * slippageMultiplier / 1000n;
  
  const deadline = Math.floor(Date.now() / 1000) + 20 * 60;
  
  // Add liquidity
  const tx = await router.addLiquidityETH(
    tokenAddress,
    amountToken,
    amountTokenMin,
    amountETHMin,
    userAddress,
    deadline,
    { value: amountETH }
  );
  
  return await tx.wait();
}

// Example: Add 1000 ESTF + 0.5 ETH as liquidity
await addLiquidityETH(signer, CONTRACTS.ESTF, '1000', '0.5');
```

---

## Example: Get Pool Reserves

```typescript
async function getPoolReserves(pairAddress: string) {
  const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
  
  const [reserves, token0, token1] = await Promise.all([
    pair.getReserves(),
    pair.token0(),
    pair.token1(),
  ]);
  
  return {
    reserve0: reserves[0],
    reserve1: reserves[1],
    token0,
    token1,
  };
}

// Example: ESTF/WETH pool
const reserves = await getPoolReserves(CONTRACTS.ESTF_WETH_PAIR);
console.log('ESTF Reserve:', ethers.formatUnits(reserves.reserve0, 18));
console.log('WETH Reserve:', ethers.formatUnits(reserves.reserve1, 18));
```

---

## Example: Farming - Stake LP Token

```typescript
async function stakeLPToken(
  signer: ethers.Signer,
  poolId: number,
  amount: string
) {
  const masterchef = new ethers.Contract(CONTRACTS.MASTERCHEF, MASTERCHEF_ABI, signer);
  const poolInfo = await masterchef.poolInfo(poolId);
  const lpToken = new ethers.Contract(poolInfo.lpToken, ERC20_ABI, signer);
  
  const stakeAmount = ethers.parseUnits(amount, 18);
  const userAddress = await signer.getAddress();
  
  // Approve LP token
  const allowance = await lpToken.allowance(userAddress, CONTRACTS.MASTERCHEF);
  if (allowance < stakeAmount) {
    console.log('Approving LP token...');
    const approveTx = await lpToken.approve(CONTRACTS.MASTERCHEF, ethers.MaxUint256);
    await approveTx.wait();
  }
  
  // Deposit
  const tx = await masterchef.deposit(poolId, stakeAmount);
  return await tx.wait();
}

// Example: Stake LP in Pool 0 (ESTF/WETH)
await stakeLPToken(signer, 0, '1.5');
```

---

## Example: Farming - Claim Rewards

```typescript
async function claimRewards(signer: ethers.Signer, poolId: number) {
  const masterchef = new ethers.Contract(CONTRACTS.MASTERCHEF, MASTERCHEF_ABI, signer);
  
  // Check pending rewards
  const userAddress = await signer.getAddress();
  const pending = await masterchef.pendingReward(poolId, userAddress);
  console.log('Pending rewards:', ethers.formatUnits(pending, 18), 'ESTF');
  
  if (pending > 0n) {
    const tx = await masterchef.harvest(poolId);
    return await tx.wait();
  }
  
  return null;
}
```

---

## Example: Get User Farm Position

```typescript
async function getUserFarmPosition(userAddress: string, poolId: number) {
  const masterchef = new ethers.Contract(CONTRACTS.MASTERCHEF, MASTERCHEF_ABI, provider);
  
  const [userInfo, poolInfo, pending] = await Promise.all([
    masterchef.userInfo(poolId, userAddress),
    masterchef.poolInfo(poolId),
    masterchef.pendingReward(poolId, userAddress),
  ]);
  
  return {
    stakedAmount: ethers.formatUnits(userInfo.amount, 18),
    pendingRewards: ethers.formatUnits(pending, 18),
    lpToken: poolInfo.lpToken,
  };
}
```

---

## Using viem

```typescript
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// Get quote
const amounts = await publicClient.readContract({
  address: CONTRACTS.ROUTER as `0x${string}`,
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
  args: [parseEther('1'), [CONTRACTS.WETH, CONTRACTS.ESTF]],
});

console.log('1 ETH =', formatEther(amounts[1]), 'ESTF');
```

---

## Error Handling

```typescript
try {
  const tx = await router.swapExactETHForTokens(...);
  await tx.wait();
} catch (error: any) {
  if (error.code === 'INSUFFICIENT_FUNDS') {
    console.error('Not enough ETH for gas');
  } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
    console.error('Transaction will fail - check slippage or liquidity');
  } else if (error.message.includes('INSUFFICIENT_OUTPUT_AMOUNT')) {
    console.error('Slippage exceeded - increase slippage tolerance');
  } else if (error.message.includes('EXPIRED')) {
    console.error('Transaction deadline passed - try again');
  } else {
    console.error('Transaction failed:', error.message);
  }
}
```

---

## Tips

1. **Always approve before swap** - ERC20 tokens need approval before the router can transfer them
2. **Set reasonable deadline** - 10-20 minutes is usually sufficient
3. **Slippage protection** - Use 0.5% for stablecoins, 1-3% for volatile tokens
4. **Gas estimation** - Base fees are very low, but always estimate gas to avoid failed transactions
5. **Rate limiting** - Public RPC has rate limits, use Alchemy/Infura for production

## Related

- [API Reference](/api) - Full contract reference
- [How It Works](/how-it-works) - AMM mechanics explained
- [Tokenomics](/tokenomics) - ESTF token information
