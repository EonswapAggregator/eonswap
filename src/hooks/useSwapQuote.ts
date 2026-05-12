import { useEffect, useRef } from 'react'
import { parseUnits } from 'viem'
import { createPublicClient, formatUnits, http } from 'viem'
import { useAccount, useChainId } from 'wagmi'
import { getEonChain, isEonAmmSwapChain } from '../lib/chains'
import { fetchSimplePricesUsd } from '../lib/coingecko'
import { eonAmmRouteLabel, fetchEonAmmQuote } from '../lib/eonAmm'
import { formatTokenAmountUi } from '../lib/format'
import { useEonSwapStore } from '../store/useEonSwapStore'

const DEBOUNCE_MS = 450
const SWAP_GAS_LIMIT_ESTIMATE = 300_000n

const emptyQuoteMeta = {
  amountInUsd: '',
  amountOutUsd: '',
  gasUsd: '',
  l1FeeUsd: '',
  amountOutWei: '',
  priceImpact: '',
} as const

async function estimateGasUsdFallback(chainId: number): Promise<string> {
  try {
    const chain = getEonChain(chainId)
    const rpcUrl = chain?.rpcUrls.default.http[0]
    if (!rpcUrl) return ''
    const client = createPublicClient({ chain, transport: http(rpcUrl) })
    const gasPrice = await client.getGasPrice()
    if (gasPrice <= 0n) return ''
    const nativeSpent = Number(formatUnits(gasPrice * SWAP_GAS_LIMIT_ESTIMATE, 18))
    if (!Number.isFinite(nativeSpent) || nativeSpent <= 0) return ''
    const prices = await fetchSimplePricesUsd(['ethereum'])
    const ethUsd = prices.ethereum
    if (!Number.isFinite(ethUsd) || ethUsd <= 0) return ''
    const usd = nativeSpent * ethUsd
    return Number.isFinite(usd) && usd > 0 ? usd.toFixed(4) : ''
  } catch {
    return ''
  }
}

export function useSwapQuote() {
  const chainId = useChainId()
  const { address } = useAccount()
  const sellToken = useEonSwapStore((s) => s.sellToken)
  const buyToken = useEonSwapStore((s) => s.buyToken)
  const sellAmountInput = useEonSwapStore((s) => s.sellAmountInput)
  const setQuoteLoading = useEonSwapStore((s) => s.setQuoteLoading)
  const setQuoteResult = useEonSwapStore((s) => s.setQuoteResult)

  const seq = useRef(0)

  useEffect(() => {
    if (!isEonAmmSwapChain(chainId)) {
      setQuoteLoading(false)
      setQuoteResult({
        receiveFormatted: '',
        routeSources: [],
        error: 'Switch to Base network your wallet.',
        zid: null,
        ...emptyQuoteMeta,
      })
      return
    }

    const raw = sellAmountInput.trim()
    if (!raw || Number.parseFloat(raw) <= 0) {
      setQuoteLoading(false)
      setQuoteResult({
        receiveFormatted: '',
        routeSources: [],
        error: null,
        zid: null,
        ...emptyQuoteMeta,
      })
      return
    }

    let amountInWei: bigint
    try {
      amountInWei = parseUnits(raw, sellToken.decimals)
    } catch {
      setQuoteLoading(false)
      setQuoteResult({
        receiveFormatted: '',
        routeSources: [],
        error: 'Invalid amount',
        zid: null,
        ...emptyQuoteMeta,
      })
      return
    }

    if (amountInWei === 0n) {
      setQuoteResult({
        receiveFormatted: '',
        routeSources: [],
        error: null,
        zid: null,
        ...emptyQuoteMeta,
      })
      return
    }

    const id = ++seq.current
    setQuoteLoading(true)
    setQuoteResult({
      receiveFormatted: '',
      routeSources: [],
      error: null,
      zid: null,
      ...emptyQuoteMeta,
    })

    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const quote = await fetchEonAmmQuote({
            chainId,
            tokenIn: sellToken.address,
            tokenOut: buyToken.address,
            amountIn: amountInWei.toString(),
            sender: address,
          })
          const gasUsd =
            quote.gasUsd && Number.parseFloat(quote.gasUsd) > 0
              ? quote.gasUsd
              : await estimateGasUsdFallback(chainId)

          // ✅ SECURITY FIX (M-2): Prevent race condition - check sequence before setState
          if (seq.current !== id) return

          const receive = formatTokenAmountUi(
            BigInt(quote.amountOut),
            buyToken.decimals,
          )

          setQuoteResult({
            receiveFormatted: receive,
            routeSources: eonAmmRouteLabel(chainId),
            error: null,
            zid: quote.routeId,
            routerAddress: quote.routerAddress,
            amountInUsd: quote.amountInUsd ?? '',
            amountOutUsd: quote.amountOutUsd ?? '',
            gasUsd,
            l1FeeUsd: '',
            amountOutWei: quote.amountOut,
            priceImpact: quote.priceImpact ?? '',
          })
        } catch (e) {
          if (seq.current !== id) return
          const msg = e instanceof Error ? e.message : 'Failed to fetch quote'
          setQuoteResult({
            receiveFormatted: '',
            routeSources: [],
            error: msg,
            zid: null,
            ...emptyQuoteMeta,
          })
        } finally {
          if (seq.current === id) setQuoteLoading(false)
        }
      })()
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(t)
  }, [
    address,
    chainId,
    sellAmountInput,
    sellToken.address,
    sellToken.decimals,
    buyToken.address,
    buyToken.decimals,
    setQuoteLoading,
    setQuoteResult,
  ])
}
