import { useEffect, useRef } from 'react'
import { parseUnits } from 'viem'
import { useAccount, useChainId } from 'wagmi'
import { isSupportedChain } from '../lib/chains'
import { formatTokenAmountUi } from '../lib/format'
import { fetchKyberRoute, kyberRouteExchanges } from '../lib/kyber'
import { useEonSwapStore } from '../store/useEonSwapStore'

const DEBOUNCE_MS = 450

const emptyQuoteMeta = {
  amountInUsd: '',
  amountOutUsd: '',
  gasUsd: '',
  l1FeeUsd: '',
  amountOutWei: '',
} as const

export function useKyberQuote() {
  const chainId = useChainId()
  const { address } = useAccount()
  const sellToken = useEonSwapStore((s) => s.sellToken)
  const buyToken = useEonSwapStore((s) => s.buyToken)
  const sellAmountInput = useEonSwapStore((s) => s.sellAmountInput)
  const setQuoteLoading = useEonSwapStore((s) => s.setQuoteLoading)
  const setQuoteResult = useEonSwapStore((s) => s.setQuoteResult)

  const seq = useRef(0)

  useEffect(() => {
    if (!isSupportedChain(chainId)) {
      setQuoteLoading(false)
      setQuoteResult({
        receiveFormatted: '',
        routeSources: [],
        error: 'Switch to a supported network in your wallet.',
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
          const { routeSummary } = await fetchKyberRoute({
            chainId,
            tokenIn: sellToken.address,
            tokenOut: buyToken.address,
            amountIn: amountInWei.toString(),
            origin: address,
          })

          if (seq.current !== id) return

          const receive = formatTokenAmountUi(
            BigInt(routeSummary.amountOut),
            buyToken.decimals,
          )
          const sources = kyberRouteExchanges(routeSummary)

          setQuoteResult({
            receiveFormatted: receive,
            routeSources: sources,
            error: null,
            zid: routeSummary.routeID,
            amountInUsd: routeSummary.amountInUsd,
            amountOutUsd: routeSummary.amountOutUsd,
            gasUsd: routeSummary.gasUsd,
            l1FeeUsd: routeSummary.l1FeeUsd,
            amountOutWei: routeSummary.amountOut,
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
