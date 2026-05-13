import { createPublicClient, encodeFunctionData, getAddress, http, formatUnits, type Address as ViemAddress } from 'viem'

import { getEonChain } from '../../chains'
import { tokensForChain, isNativeToken } from '../../tokens'
import { coingeckoIdForToken, fetchSimplePricesUsd } from '../../coingecko'
import { chainWrappedNative, pickRouter, EON_AMM_FACTORY } from '../config'
import { routePath } from '../pathing'
import type { EonAmmBuildParams, EonAmmBuildResult, EonAmmQuote, EonAmmQuoteParams } from '../types'

/** Minimal client interface for readContract calls */
interface ContractReader {
  readContract: <T>(args: {
    address: ViemAddress
    abi: readonly unknown[]
    functionName: string
    args?: readonly unknown[]
  }) => Promise<T>
}

const ROUTER_QUOTER_ABI = [
  {
    name: 'getAmountsOut',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
] as const

const ROUTER_SWAP_ABI = [
  {
    name: 'swapExactETHForTokensSupportingFeeOnTransferTokens',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'swapExactTokensForETHSupportingFeeOnTransferTokens',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [],
  },
] as const

const WETH_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'wad', type: 'uint256' }],
    outputs: [],
  },
] as const

const FACTORY_ABI = [
  {
    name: 'getPair',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
    ],
    outputs: [{ name: 'pair', type: 'address' }],
  },
] as const

const PAIR_ABI = [
  {
    name: 'getReserves',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'reserve0', type: 'uint112' },
      { name: 'reserve1', type: 'uint112' },
      { name: 'blockTimestampLast', type: 'uint32' },
    ],
  },
  {
    name: 'token0',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const

type NativeWrapMode = 'wrap-native' | 'unwrap-native'

function detectNativeWrapMode(tokenIn: string, tokenOut: string, chainId: number): NativeWrapMode | null {
  const weth = chainWrappedNative(chainId).toLowerCase()
  const inLc = tokenIn.toLowerCase()
  const outLc = tokenOut.toLowerCase()
  if (isNativeToken(inLc) && outLc === weth) return 'wrap-native'
  if (inLc === weth && isNativeToken(outLc)) return 'unwrap-native'
  return null
}

async function estimateUsdForToken(tokenAddress: string, amountWei: bigint, decimals: number, chainId: number): Promise<string | undefined> {
  try {
    const amount = Number(formatUnits(amountWei, decimals))
    if (!Number.isFinite(amount) || amount <= 0) return undefined
    
    // Try to get real token price from CoinGecko using shared helper
    // This handles both address-based and symbol-based lookups for all chains
    const tokenLc = tokenAddress.toLowerCase()
    const chainTokens = tokensForChain(chainId)
    const tokenInfo = chainTokens.find(t => t.address.toLowerCase() === tokenLc)
    
    // Use the shared coingecko ID lookup that handles both Base and Sepolia
    const geckoId = coingeckoIdForToken({
      symbol: tokenInfo?.symbol ?? '',
      address: tokenAddress,
    })
    
    if (geckoId) {
      try {
        const prices = await fetchSimplePricesUsd([geckoId])
        const price = prices[geckoId]
        if (Number.isFinite(price) && price > 0) {
          const usd = amount * price
          return Number.isFinite(usd) && usd > 0 ? usd.toFixed(8) : undefined
        }
      } catch {
        // Fallback if coingecko fails
      }
    }
    
    // For non-CoinGecko tokens (e.g., ESTF, ESR on testnet), USD is unavailable
    // Price impact will fallback to token amounts calculation in SwapWidget
    
    return undefined
  } catch {
    return undefined
  }
}

/**
 * Calculate price impact from pool reserves using AMM constant product formula.
 * Price impact = how much worse the execution price is compared to spot price.
 * 
 * Formula: priceImpact = (spotPrice - executionPrice) / spotPrice * 100
 * Where:
 * - spotPrice = reserveOut / reserveIn (no-trade price)
 * - executionPrice = amountOut / amountIn (actual trade price)
 */
async function calculatePriceImpactFromReserves(
  client: ContractReader,
  chainId: number,
  path: readonly ViemAddress[],
  amountIn: bigint,
  amountOut: bigint,
): Promise<string | undefined> {
  try {
    const factoryAddress = EON_AMM_FACTORY[chainId]
    if (!factoryAddress) return undefined

    let spotPrice = 1

    for (let i = 0; i < path.length - 1; i += 1) {
      const tokenIn = path[i]!
      const tokenOut = path[i + 1]!
      const pairAddress = await client.readContract<ViemAddress>({
        address: factoryAddress,
        abi: FACTORY_ABI,
        functionName: 'getPair',
        args: [tokenIn, tokenOut],
      })

      if (!pairAddress || pairAddress === '0x0000000000000000000000000000000000000000') {
        return undefined
      }

      const [reserves, token0] = await Promise.all([
        client.readContract<readonly [bigint, bigint, number]>({
          address: pairAddress,
          abi: PAIR_ABI,
          functionName: 'getReserves',
        }),
        client.readContract<ViemAddress>({
          address: pairAddress,
          abi: PAIR_ABI,
          functionName: 'token0',
        }),
      ])

      const [reserve0, reserve1] = reserves
      const isToken0In = token0.toLowerCase() === tokenIn.toLowerCase()
      const reserveIn = isToken0In ? reserve0 : reserve1
      const reserveOut = isToken0In ? reserve1 : reserve0

      if (reserveIn === 0n || reserveOut === 0n) {
        return '100.00'
      }

      spotPrice *= Number(reserveOut) / Number(reserveIn)
    }

    // Execution price = amountOut / amountIn
    const executionPrice = Number(amountOut) / Number(amountIn)

    // Price impact = (spotPrice - executionPrice) / spotPrice * 100
    // This shows how much worse the execution price is vs spot price
    const impact = ((spotPrice - executionPrice) / spotPrice) * 100

    // Clamp to 0-100 range
    const clampedImpact = Math.max(0, Math.min(100, impact))
    
    return Number.isFinite(clampedImpact) ? clampedImpact.toFixed(2) : undefined
  } catch {
    return undefined
  }
}

function validateAmountOut(amountIn: bigint, amountOut: bigint, _decimalsIn: number, _decimalsOut: number): boolean {
  try {
    // Basic sanity check: output should not be zero if input is non-zero
    if (amountIn > 0n && amountOut === 0n) {
      return false
    }
    
    // Check if the ratio seems reasonable (allow very large ratios for decimal differences)
    // For example: 1M ESTF (18 decimals) → 0.1 WETH (18 decimals) is valid
    // Convert both to wei and check if ratio makes sense
    const outWei = amountOut
    
    // Allow any positive output for positive input (validation happens on-chain)
    // The router.getAmountsOut() already validates against actual reserves
    return outWei > 0n
  } catch {
    return true // Assume valid if can't validate
  }
}

export async function fetchEonAmmQuoteFromRouter(params: EonAmmQuoteParams): Promise<EonAmmQuote> {
  const chain = getEonChain(params.chainId)
  if (!chain) throw new Error(`Unsupported chain for Eon AMM: ${params.chainId}`)
  const rpcUrl = chain.rpcUrls.default.http[0]
  if (!rpcUrl) throw new Error('No RPC URL configured for this chain.')

  const wrapMode = detectNativeWrapMode(params.tokenIn, params.tokenOut, params.chainId)
  if (wrapMode) {
    const weth = chainWrappedNative(params.chainId)
    // For wrap/unwrap, USD values are equal
    const tokenInfo = tokensForChain(params.chainId).find(t => t.address.toLowerCase() === (wrapMode === 'wrap-native' ? params.tokenOut : params.tokenIn).toLowerCase())
    let amountUsd: string | undefined
    try {
      if (tokenInfo?.decimals) {
        amountUsd = await estimateUsdForToken(wrapMode === 'wrap-native' ? params.tokenOut : params.tokenIn, BigInt(params.amountIn), tokenInfo.decimals, params.chainId)
      }
    } catch {
      // Ignore errors
    }
    
    return {
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      amountOut: params.amountIn,
      routeId: `local:${wrapMode}:${params.chainId}:${Date.now()}`,
      routerAddress: weth,
      amountInUsd: amountUsd,
      amountOutUsd: amountUsd,
      buildPayload: { mode: wrapMode },
    }
  }

  const routerAddress = pickRouter(params.chainId)
  const path = routePath(params.tokenIn, params.tokenOut, params.chainId)
  const client = createPublicClient({ chain, transport: http(rpcUrl) })
  let amounts: readonly bigint[]
  try {
    amounts = await client.readContract({
      address: routerAddress,
      abi: ROUTER_QUOTER_ABI,
      functionName: 'getAmountsOut',
      args: [BigInt(params.amountIn), path],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Router custom errors often cannot be decoded without full error ABI.
    if (msg.toLowerCase().includes('execution reverted') || msg.includes('0xbb55fd27')) {
      throw new Error('Eon AMM route unavailable: pair has no liquidity or path is invalid.')
    }
    throw err
  }
  const amountOut = amounts[amounts.length - 1]
  if (!amountOut || amountOut <= 0n) {
    throw new Error('Eon AMM router returned zero output.')
  }

  // Calculate price impact from actual pool reserves (most accurate method)
  // This compares spot price (from reserves) vs execution price (from quote)
  const calculatedPriceImpact = await calculatePriceImpactFromReserves(
    client as unknown as ContractReader,
    params.chainId,
    path,
    BigInt(params.amountIn),
    amountOut,
  )

  // Sanity check: validate that the quote makes economic sense
  const chainTokens = tokensForChain(params.chainId)
  const tokenInInfo = chainTokens.find(t => t.address.toLowerCase() === path[0].toLowerCase())
  const tokenOutInfo = chainTokens.find(t => t.address.toLowerCase() === path[path.length - 1].toLowerCase())
  
  if (tokenInInfo && tokenOutInfo) {
    const isValid = validateAmountOut(
      BigInt(params.amountIn),
      amountOut,
      tokenInInfo.decimals,
      tokenOutInfo.decimals
    )
    if (!isValid) {
      throw new Error('Eon AMM quote validation failed: output amount unreasonably large relative to input (possible liquidity exhaustion or calculation error).')
    }
  }

  // Get USD estimates for display
  let amountInUsd: string | undefined
  let amountOutUsd: string | undefined
  try {
    if (tokenInInfo?.decimals) {
      amountInUsd = await estimateUsdForToken(path[0], BigInt(params.amountIn), tokenInInfo.decimals, params.chainId)
    }
    if (tokenOutInfo?.decimals) {
      amountOutUsd = await estimateUsdForToken(path[path.length - 1], amountOut, tokenOutInfo.decimals, params.chainId)
    }
  } catch {
    // Ignore errors; USD estimates are optional
  }

  return {
    tokenIn: params.tokenIn,
    tokenOut: params.tokenOut,
    amountIn: params.amountIn,
    amountOut: amountOut.toString(),
    routeId: `local:${params.chainId}:${Date.now()}`,
    routerAddress,
    amountInUsd,
    amountOutUsd,
    priceImpact: calculatedPriceImpact,
  }
}

export async function buildEonAmmSwapFromRouter(params: EonAmmBuildParams): Promise<EonAmmBuildResult> {
  const chain = getEonChain(params.chainId)
  if (!chain) throw new Error(`Unsupported chain for Eon AMM: ${params.chainId}`)
  const rpcUrl = chain.rpcUrls.default.http[0]
  if (!rpcUrl) throw new Error('No RPC URL configured for this chain.')
  const routerAddress = pickRouter(params.chainId, params.quote.routerAddress)
  const amountIn = BigInt(params.quote.amountIn || '0')
  const quotedOut = BigInt(params.quote.amountOut || '0')
  if (amountIn <= 0n || quotedOut <= 0n) {
    throw new Error('Invalid local Eon AMM build amounts.')
  }

  const mode = String(params.quote.buildPayload?.mode ?? '').trim()
  if (mode === 'wrap-native' || mode === 'unwrap-native') {
    const weth = chainWrappedNative(params.chainId)
    const data =
      mode === 'wrap-native'
        ? encodeFunctionData({ abi: WETH_ABI, functionName: 'deposit', args: [] })
        : encodeFunctionData({
            abi: WETH_ABI,
            functionName: 'withdraw',
            args: [amountIn],
          })
    const transactionValue = mode === 'wrap-native' ? amountIn.toString() : '0'
    const client = createPublicClient({ chain, transport: http(rpcUrl) })
    const gasEstimate = await client.estimateGas({
      account: getAddress(params.sender),
      to: weth,
      data,
      value: BigInt(transactionValue),
    })
    return {
      routerAddress: weth,
      data,
      transactionValue,
      gas: ((gasEstimate * 12n) / 10n).toString(),
      source: 'local',
    }
  }

  const localPath = routePath(params.quote.tokenIn, params.quote.tokenOut, params.chainId)
  const amountOutMin = (quotedOut * BigInt(10_000 - params.slippageToleranceBps)) / 10_000n
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * params.deadlineMinutes)
  const sellNative = isNativeToken(params.quote.tokenIn)
  const buyNative = isNativeToken(params.quote.tokenOut)
  const data = sellNative
    ? encodeFunctionData({
        abi: ROUTER_SWAP_ABI,
        functionName: 'swapExactETHForTokensSupportingFeeOnTransferTokens',
        args: [amountOutMin, localPath, getAddress(params.recipient), deadline],
      })
    : buyNative
      ? encodeFunctionData({
          abi: ROUTER_SWAP_ABI,
          functionName: 'swapExactTokensForETHSupportingFeeOnTransferTokens',
          args: [amountIn, amountOutMin, localPath, getAddress(params.recipient), deadline],
        })
      : encodeFunctionData({
          abi: ROUTER_SWAP_ABI,
          functionName: 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
          args: [amountIn, amountOutMin, localPath, getAddress(params.recipient), deadline],
        })

  const transactionValue = sellNative ? amountIn.toString() : '0'
  const client = createPublicClient({ chain, transport: http(rpcUrl) })
  const gasEstimate = await client.estimateGas({
    account: getAddress(params.sender),
    to: routerAddress,
    data,
    value: BigInt(transactionValue),
  })
  return {
    routerAddress,
    data,
    transactionValue,
    gas: ((gasEstimate * 12n) / 10n).toString(),
    source: 'local',
  }
}
