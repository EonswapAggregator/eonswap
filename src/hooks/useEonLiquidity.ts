import { useCallback, useState } from 'react'
import {
  erc20Abi,
  type Address,
  type Hash,
  maxUint256,
} from 'viem'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'

import { EON_AMM_ROUTER_FALLBACK, EON_AMM_FACTORY } from '../lib/amm/config'
import { eonAmmRouterAbi, eonAmmFactoryAbi, eonAmmPairAbi } from '../lib/amm/abis'
import type {
  AddLiquidityParams,
  AddLiquidityETHParams,
  RemoveLiquidityParams,
  RemoveLiquidityETHParams,
} from '../lib/amm/poolTypes'

const DEADLINE_BUFFER_SEC = 1200 // 20 minutes

type LiquidityState = {
  status: 'idle' | 'approving' | 'pending' | 'success' | 'error'
  hash: Hash | null
  error: string | null
}

type UseEonLiquidityResult = LiquidityState & {
  addLiquidity: (params: AddLiquidityParams) => Promise<Hash | null>
  addLiquidityETH: (params: AddLiquidityETHParams) => Promise<Hash | null>
  removeLiquidity: (params: RemoveLiquidityParams) => Promise<Hash | null>
  removeLiquidityETH: (params: RemoveLiquidityETHParams) => Promise<Hash | null>
  approveToken: (token: Address, spender: Address, amount: bigint) => Promise<Hash | null>
  approveLP: (pairAddress: Address, amount: bigint) => Promise<Hash | null>
  checkAllowance: (token: Address, spender: Address, required: bigint) => Promise<boolean>
  getPairAddress: (tokenA: Address, tokenB: Address) => Promise<Address | null>
  quoteRemoveLiquidity: (
    pairAddress: Address,
    liquidity: bigint
  ) => Promise<{ amount0: bigint; amount1: bigint } | null>
  reset: () => void
}

export function useEonLiquidity(chainId: number): UseEonLiquidityResult {
  const { address: userAddress } = useAccount()
  const publicClient = usePublicClient({ chainId })
  const { data: walletClient } = useWalletClient({ chainId })

  const [state, setState] = useState<LiquidityState>({
    status: 'idle',
    hash: null,
    error: null,
  })

  const routerAddress = EON_AMM_ROUTER_FALLBACK[chainId]
  const factoryAddress = EON_AMM_FACTORY[chainId]

  const reset = useCallback(() => {
    setState({ status: 'idle', hash: null, error: null })
  }, [])

  const checkAllowance = useCallback(
    async (token: Address, spender: Address, required: bigint): Promise<boolean> => {
      if (!publicClient || !userAddress) return false
      try {
        const allowance = await publicClient.readContract({
          address: token,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [userAddress, spender],
        })
        return allowance >= required
      } catch {
        return false
      }
    },
    [publicClient, userAddress]
  )

  const approveToken = useCallback(
    async (token: Address, spender: Address, amount: bigint): Promise<Hash | null> => {
      if (!walletClient || !userAddress || !publicClient) {
        setState({ status: 'error', hash: null, error: 'Wallet not connected' })
        return null
      }

      try {
        setState({ status: 'approving', hash: null, error: null })

        const hash = await walletClient.writeContract({
          address: token,
          abi: erc20Abi,
          functionName: 'approve',
          args: [spender, amount > 0 ? amount : maxUint256],
        })

        await publicClient.waitForTransactionReceipt({ hash })
        setState({ status: 'idle', hash, error: null })
        return hash
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Approval failed'
        setState({ status: 'error', hash: null, error: msg })
        return null
      }
    },
    [walletClient, userAddress, publicClient]
  )

  const approveLP = useCallback(
    async (pairAddress: Address, amount: bigint): Promise<Hash | null> => {
      if (!routerAddress) {
        setState({ status: 'error', hash: null, error: 'Router not configured' })
        return null
      }
      return approveToken(pairAddress, routerAddress, amount)
    },
    [approveToken, routerAddress]
  )

  const getPairAddress = useCallback(
    async (tokenA: Address, tokenB: Address): Promise<Address | null> => {
      if (!publicClient || !factoryAddress) return null
      try {
        const pair = await publicClient.readContract({
          address: factoryAddress,
          abi: eonAmmFactoryAbi,
          functionName: 'getPair',
          args: [tokenA, tokenB],
        })
        return pair !== '0x0000000000000000000000000000000000000000' ? (pair as Address) : null
      } catch {
        return null
      }
    },
    [publicClient, factoryAddress]
  )

  const quoteRemoveLiquidity = useCallback(
    async (
      pairAddress: Address,
      liquidity: bigint
    ): Promise<{ amount0: bigint; amount1: bigint } | null> => {
      if (!publicClient) return null
      try {
        const [reserves, totalSupply] = await Promise.all([
          publicClient.readContract({
            address: pairAddress,
            abi: eonAmmPairAbi,
            functionName: 'getReserves',
          }),
          publicClient.readContract({
            address: pairAddress,
            abi: eonAmmPairAbi,
            functionName: 'totalSupply',
          }),
        ])

        const [reserve0, reserve1] = reserves as [bigint, bigint, number]
        if (totalSupply === 0n) return null

        const amount0 = (reserve0 * liquidity) / totalSupply
        const amount1 = (reserve1 * liquidity) / totalSupply

        return { amount0, amount1 }
      } catch {
        return null
      }
    },
    [publicClient]
  )

  const addLiquidity = useCallback(
    async (params: AddLiquidityParams): Promise<Hash | null> => {
      if (!walletClient || !userAddress || !publicClient || !routerAddress) {
        setState({ status: 'error', hash: null, error: 'Wallet not connected or router not configured' })
        return null
      }

      try {
        setState({ status: 'pending', hash: null, error: null })

        const deadline = BigInt(Math.floor(Date.now() / 1000) + DEADLINE_BUFFER_SEC)

        const hash = await walletClient.writeContract({
          address: routerAddress,
          abi: eonAmmRouterAbi,
          functionName: 'addLiquidity',
          args: [
            params.tokenA,
            params.tokenB,
            params.amountADesired,
            params.amountBDesired,
            params.amountAMin,
            params.amountBMin,
            params.to,
            deadline,
          ],
        })

        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        setState({
          status: receipt.status === 'success' ? 'success' : 'error',
          hash,
          error: receipt.status !== 'success' ? 'Transaction reverted' : null,
        })
        return hash
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Add liquidity failed'
        setState({ status: 'error', hash: null, error: msg })
        return null
      }
    },
    [walletClient, userAddress, publicClient, routerAddress]
  )

  const addLiquidityETH = useCallback(
    async (params: AddLiquidityETHParams): Promise<Hash | null> => {
      if (!walletClient || !userAddress || !publicClient || !routerAddress) {
        setState({ status: 'error', hash: null, error: 'Wallet not connected or router not configured' })
        return null
      }

      try {
        setState({ status: 'pending', hash: null, error: null })

        const deadline = BigInt(Math.floor(Date.now() / 1000) + DEADLINE_BUFFER_SEC)

        const hash = await walletClient.writeContract({
          address: routerAddress,
          abi: eonAmmRouterAbi,
          functionName: 'addLiquidityETH',
          args: [
            params.token,
            params.amountTokenDesired,
            params.amountTokenMin,
            params.amountETHMin,
            params.to,
            deadline,
          ],
          value: params.value,
        })

        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        setState({
          status: receipt.status === 'success' ? 'success' : 'error',
          hash,
          error: receipt.status !== 'success' ? 'Transaction reverted' : null,
        })
        return hash
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Add liquidity ETH failed'
        setState({ status: 'error', hash: null, error: msg })
        return null
      }
    },
    [walletClient, userAddress, publicClient, routerAddress]
  )

  const removeLiquidity = useCallback(
    async (params: RemoveLiquidityParams): Promise<Hash | null> => {
      if (!walletClient || !userAddress || !publicClient || !routerAddress) {
        setState({ status: 'error', hash: null, error: 'Wallet not connected or router not configured' })
        return null
      }

      try {
        setState({ status: 'pending', hash: null, error: null })

        const deadline = BigInt(Math.floor(Date.now() / 1000) + DEADLINE_BUFFER_SEC)

        const hash = await walletClient.writeContract({
          address: routerAddress,
          abi: eonAmmRouterAbi,
          functionName: 'removeLiquidity',
          args: [
            params.tokenA,
            params.tokenB,
            params.liquidity,
            params.amountAMin,
            params.amountBMin,
            params.to,
            deadline,
          ],
        })

        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        setState({
          status: receipt.status === 'success' ? 'success' : 'error',
          hash,
          error: receipt.status !== 'success' ? 'Transaction reverted' : null,
        })
        return hash
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Remove liquidity failed'
        setState({ status: 'error', hash: null, error: msg })
        return null
      }
    },
    [walletClient, userAddress, publicClient, routerAddress]
  )

  const removeLiquidityETH = useCallback(
    async (params: RemoveLiquidityETHParams): Promise<Hash | null> => {
      if (!walletClient || !userAddress || !publicClient || !routerAddress) {
        setState({ status: 'error', hash: null, error: 'Wallet not connected or router not configured' })
        return null
      }

      try {
        setState({ status: 'pending', hash: null, error: null })

        const deadline = BigInt(Math.floor(Date.now() / 1000) + DEADLINE_BUFFER_SEC)

        const hash = await walletClient.writeContract({
          address: routerAddress,
          abi: eonAmmRouterAbi,
          functionName: 'removeLiquidityETH',
          args: [
            params.token,
            params.liquidity,
            params.amountTokenMin,
            params.amountETHMin,
            params.to,
            deadline,
          ],
        })

        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        setState({
          status: receipt.status === 'success' ? 'success' : 'error',
          hash,
          error: receipt.status !== 'success' ? 'Transaction reverted' : null,
        })
        return hash
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Remove liquidity ETH failed'
        setState({ status: 'error', hash: null, error: msg })
        return null
      }
    },
    [walletClient, userAddress, publicClient, routerAddress]
  )

  return {
    ...state,
    addLiquidity,
    addLiquidityETH,
    removeLiquidity,
    removeLiquidityETH,
    approveToken,
    approveLP,
    checkAllowance,
    getPairAddress,
    quoteRemoveLiquidity,
    reset,
  }
}
