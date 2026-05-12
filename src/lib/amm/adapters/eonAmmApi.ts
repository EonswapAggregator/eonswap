import { decodeFunctionData, getAddress, type Address } from 'viem'

import { eonAmmApiBaseUrl, eonAmmClientHeaders, EON_AMM_TIMEOUT_MS, pickRouter } from '../config'
import { routePath } from '../pathing'
import type { EonAmmBuildParams, EonAmmBuildResult, EonAmmQuote, EonAmmQuoteParams } from '../types'
import { isNativeToken } from '../../tokens'

const API_SWAP_ABI = [
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

function unwrapData<T>(json: unknown): T {
  if (json && typeof json === 'object' && 'data' in json) {
    return (json as { data: T }).data
  }
  return json as T
}

function sameAddress(a: string, b: string): boolean {
  return getAddress(a).toLowerCase() === getAddress(b).toLowerCase()
}

function assertSamePath(actual: readonly Address[], expected: readonly Address[]) {
  if (actual.length !== expected.length) {
    throw new Error('Eon AMM API calldata path does not match the quoted route.')
  }
  for (let i = 0; i < expected.length; i += 1) {
    if (!sameAddress(actual[i]!, expected[i]!)) {
      throw new Error('Eon AMM API calldata path does not match the quoted route.')
    }
  }
}

function validateApiSwapCalldata(
  params: EonAmmBuildParams,
  data: `0x${string}`,
  transactionValue: string,
): void {
  const decoded = decodeFunctionData({
    abi: API_SWAP_ABI,
    data,
  })
  const expectedPath = routePath(
    params.quote.tokenIn,
    params.quote.tokenOut,
    params.chainId,
  )
  const expectedAmountIn = BigInt(params.quote.amountIn || '0')
  const quotedOut = BigInt(params.quote.amountOut || '0')
  const minAllowedOut =
    (quotedOut * BigInt(10_000 - params.slippageToleranceBps)) / 10_000n

  if (decoded.functionName === 'swapExactETHForTokensSupportingFeeOnTransferTokens') {
    const [amountOutMin, path, to] = decoded.args
    if (!isNativeToken(params.quote.tokenIn)) {
      throw new Error('Eon AMM API calldata uses native swap for a non-native input.')
    }
    if (BigInt(transactionValue || '0') !== expectedAmountIn) {
      throw new Error('Eon AMM API calldata value does not match the quote.')
    }
    assertSamePath(path, expectedPath)
    if (!sameAddress(to, params.recipient)) {
      throw new Error('Eon AMM API calldata recipient does not match the wallet.')
    }
    if (amountOutMin < minAllowedOut) {
      throw new Error('Eon AMM API calldata amountOutMin is below slippage tolerance.')
    }
    return
  }

  const [amountIn, amountOutMin, path, to] = decoded.args
  if (BigInt(transactionValue || '0') !== 0n) {
    throw new Error('Eon AMM API calldata includes unexpected native value.')
  }
  if (
    decoded.functionName === 'swapExactTokensForETHSupportingFeeOnTransferTokens' &&
    !isNativeToken(params.quote.tokenOut)
  ) {
    throw new Error('Eon AMM API calldata uses native output for a non-native route.')
  }
  if (
    decoded.functionName === 'swapExactTokensForTokensSupportingFeeOnTransferTokens' &&
    (isNativeToken(params.quote.tokenIn) || isNativeToken(params.quote.tokenOut))
  ) {
    throw new Error('Eon AMM API calldata uses token swap for a native route.')
  }
  assertSamePath(path, expectedPath)
  if (amountIn !== expectedAmountIn) {
    throw new Error('Eon AMM API calldata amountIn does not match the quote.')
  }
  if (!sameAddress(to, params.recipient)) {
    throw new Error('Eon AMM API calldata recipient does not match the wallet.')
  }
  if (amountOutMin < minAllowedOut) {
    throw new Error('Eon AMM API calldata amountOutMin is below slippage tolerance.')
  }
}

export async function fetchEonAmmQuoteFromApi(params: EonAmmQuoteParams): Promise<EonAmmQuote> {
  const baseUrl = eonAmmApiBaseUrl()
  if (!baseUrl) throw new Error('Eon AMM API base URL is not configured.')

  const q = new URLSearchParams({
    chainId: String(params.chainId),
    tokenIn: params.tokenIn,
    tokenOut: params.tokenOut,
    amountIn: params.amountIn,
  })
  if (params.sender) q.set('sender', params.sender)

  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), EON_AMM_TIMEOUT_MS)
  try {
    const res = await fetch(`${baseUrl}/v1/quote?${q}`, {
      headers: eonAmmClientHeaders(),
      signal: ctrl.signal,
    })
    const json = (await res.json()) as unknown
    if (!res.ok) {
      const msg =
        json && typeof json === 'object' && 'message' in json
          ? String((json as { message: unknown }).message)
          : `Eon AMM quote failed (${res.status})`
      throw new Error(msg)
    }

    const row = unwrapData<{
      amountOut?: string
      routeId?: string
      routerAddress?: string
      amountInUsd?: string
      amountOutUsd?: string
      gasUsd?: string
      buildPayload?: Record<string, unknown>
    }>(json)

    const amountOut = row.amountOut?.trim()
    const routeId = row.routeId?.trim()
    if (!amountOut || !routeId) {
      throw new Error('Eon AMM quote response missing amountOut or routeId.')
    }

    return {
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      amountOut,
      routeId,
      routerAddress: pickRouter(params.chainId, row.routerAddress),
      amountInUsd: row.amountInUsd,
      amountOutUsd: row.amountOutUsd,
      gasUsd: row.gasUsd,
      buildPayload: row.buildPayload,
    }
  } finally {
    window.clearTimeout(timer)
  }
}

export async function buildEonAmmSwapFromApi(params: EonAmmBuildParams): Promise<EonAmmBuildResult> {
  const baseUrl = eonAmmApiBaseUrl()
  if (!baseUrl) throw new Error('Eon AMM API base URL is not configured.')

  // ✅ SECURITY FIX (M-1): Allowlist buildPayload keys to prevent injection
  const ALLOWED_BUILD_PAYLOAD_KEYS = ['mode', 'poolId', 'routeHint'] as const
  const safeBuildPayload: Record<string, unknown> = {}
  if (params.quote.buildPayload) {
    for (const key of ALLOWED_BUILD_PAYLOAD_KEYS) {
      if (key in params.quote.buildPayload) {
        safeBuildPayload[key] = params.quote.buildPayload[key]
      }
    }
  }

  const body = {
    chainId: params.chainId,
    routeId: params.quote.routeId,
    tokenIn: params.quote.tokenIn,
    tokenOut: params.quote.tokenOut,
    amountIn: params.quote.amountIn,
    sender: params.sender,
    recipient: params.recipient,
    slippageToleranceBps: params.slippageToleranceBps,
    deadlineMinutes: params.deadlineMinutes,
    ...safeBuildPayload,
  }

  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), EON_AMM_TIMEOUT_MS)
  try {
    const res = await fetch(`${baseUrl}/v1/route/build`, {
      method: 'POST',
      headers: eonAmmClientHeaders(),
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    const json = (await res.json()) as unknown
    if (!res.ok) {
      const msg =
        json && typeof json === 'object' && 'message' in json
          ? String((json as { message: unknown }).message)
          : `Eon AMM build failed (${res.status})`
      throw new Error(msg)
    }

    const row = unwrapData<{
      data?: string
      routerAddress?: string
      transactionValue?: string
      value?: string
      gas?: string
    }>(json)

    const data = row.data?.trim()
    if (!data?.startsWith('0x')) throw new Error('Eon AMM build response missing calldata.')

    const routerAddress = pickRouter(params.chainId, row.routerAddress ?? params.quote.routerAddress)
    const transactionValue = (row.transactionValue ?? row.value ?? '0').trim() || '0'
    validateApiSwapCalldata(params, data as `0x${string}`, transactionValue)

    return {
      routerAddress,
      data: data as `0x${string}`,
      transactionValue,
      gas: (row.gas ?? '0').trim() || '0',
      source: 'api',
    }
  } finally {
    window.clearTimeout(timer)
  }
}
