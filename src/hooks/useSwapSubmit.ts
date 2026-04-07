import { useCallback, useState } from 'react'
import {
  erc20Abi,
  maxUint256,
  parseUnits,
  UserRejectedRequestError,
} from 'viem'
import { getPublicClient, getWalletClient } from 'wagmi/actions'
import { useAccount, useSendTransaction } from 'wagmi'
import { getEonChain, isSupportedChain } from '../lib/chains'
import {
  buildKyberSwap,
  fetchKyberRoute,
  type KyberRouteSummary,
} from '../lib/kyber'
import { formatTokenAmountUi } from '../lib/format'
import { isNativeToken } from '../lib/tokens'
import { toUserFacingErrorMessage } from '../lib/errors'
import { wagmiConfig } from '../wagmi'
import { useEonSwapStore } from '../store/useEonSwapStore'

export function useSwapSubmit() {
  const { address, chainId } = useAccount()
  const { sendTransactionAsync } = useSendTransaction()
  const [isWorking, setIsWorking] = useState(false)

  const sellToken = useEonSwapStore((s) => s.sellToken)
  const buyToken = useEonSwapStore((s) => s.buyToken)
  const sellAmountInput = useEonSwapStore((s) => s.sellAmountInput)
  const receiveFormatted = useEonSwapStore((s) => s.receiveFormatted)
  const slippageToleranceBps = useEonSwapStore((s) => s.slippageToleranceBps)
  const addActivity = useEonSwapStore((s) => s.addActivity)
  const patchActivity = useEonSwapStore((s) => s.patchActivity)

  const submit = useCallback(async () => {
    if (!address || !chainId || !isSupportedChain(chainId)) {
      throw new Error('Connect your wallet on a supported network to swap.')
    }

    const chain = getEonChain(chainId)
    if (!chain) {
      throw new Error('Unsupported network.')
    }

    const publicClient = getPublicClient(wagmiConfig, { chainId: chain.id })
    if (!publicClient) {
      throw new Error('No RPC client for this network.')
    }

    const raw = sellAmountInput.trim()
    if (!raw || !receiveFormatted) {
      throw new Error('Enter an amount and wait for a quote.')
    }

    let amountInWei: bigint
    try {
      amountInWei = parseUnits(raw, sellToken.decimals)
    } catch {
      throw new Error('Invalid sell amount')
    }

    setIsWorking(true)
    const activityId = crypto.randomUUID()
    const sellLabel = formatTokenAmountUi(amountInWei, sellToken.decimals)
    const summary = `Swap ${sellLabel} ${sellToken.symbol} → ~${receiveFormatted} ${buyToken.symbol}`

    addActivity({
      id: activityId,
      status: 'pending',
      summary,
      chainId,
      from: address,
    })

    try {
      let routeSummary: KyberRouteSummary

      const initial = await fetchKyberRoute({
        chainId,
        tokenIn: sellToken.address,
        tokenOut: buyToken.address,
        amountIn: amountInWei.toString(),
        origin: address,
      })
      routeSummary = initial.routeSummary

      if (!isNativeToken(sellToken.address)) {
        const allowance = await publicClient.readContract({
          address: sellToken.address as `0x${string}`,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, initial.routerAddress],
        })

        if (allowance < amountInWei) {
          const walletClient = await getWalletClient(wagmiConfig)
          if (!walletClient) throw new Error('Wallet not available')

          const approveHash = await walletClient.writeContract({
            chain,
            address: sellToken.address as `0x${string}`,
            abi: erc20Abi,
            functionName: 'approve',
            args: [initial.routerAddress, maxUint256],
          })

          await publicClient.waitForTransactionReceipt({ hash: approveHash })
        }

        const refreshed = await fetchKyberRoute({
          chainId,
          tokenIn: sellToken.address,
          tokenOut: buyToken.address,
          amountIn: amountInWei.toString(),
          origin: address,
        })
        routeSummary = refreshed.routeSummary
      }

      const built = await buildKyberSwap({
        chainId,
        routeSummary,
        sender: address,
        recipient: address,
        origin: address,
        slippageTolerance: slippageToleranceBps,
      })

      const hash = await sendTransactionAsync({
        chainId: chain.id,
        to: built.routerAddress,
        data: built.data,
        value: BigInt(built.transactionValue),
        gas: BigInt(built.gas),
      })

      patchActivity(activityId, { txHash: hash })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      patchActivity(activityId, {
        status: receipt.status === 'success' ? 'success' : 'failed',
        blockNumber: Number(receipt.blockNumber),
      })
    } catch (e) {
      if (e instanceof UserRejectedRequestError) {
        patchActivity(activityId, {
          status: 'failed',
          summary: `${summary} (rejected)`,
        })
      } else {
        const msg = toUserFacingErrorMessage(e, 'Swap failed')
        patchActivity(activityId, {
          status: 'failed',
          summary: `${summary} — ${msg.slice(0, 120)}`,
        })
      }
    } finally {
      setIsWorking(false)
    }
  }, [
    address,
    chainId,
    sellAmountInput,
    receiveFormatted,
    sellToken.address,
    sellToken.symbol,
    sellToken.decimals,
    buyToken.address,
    buyToken.symbol,
    addActivity,
    patchActivity,
    sendTransactionAsync,
    slippageToleranceBps,
  ])

  return { submitSwap: submit, isWorking }
}
