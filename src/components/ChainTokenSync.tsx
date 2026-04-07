import { useEffect, useRef } from 'react'
import { useChainId } from 'wagmi'
import { isSupportedChain } from '../lib/chains'
import { tokensForChain } from '../lib/tokens'
import { useEonSwapStore } from '../store/useEonSwapStore'

/** Keep token pair + quote aligned with the active (or default) supported chain */
export function ChainTokenSync() {
  const chainId = useChainId()
  const setSellToken = useEonSwapStore((s) => s.setSellToken)
  const setBuyToken = useEonSwapStore((s) => s.setBuyToken)
  const setSellAmountInput = useEonSwapStore((s) => s.setSellAmountInput)
  const setQuoteResult = useEonSwapStore((s) => s.setQuoteResult)
  const prev = useRef<number | null>(null)

  useEffect(() => {
    if (!isSupportedChain(chainId)) {
      prev.current = -1
      return
    }
    if (prev.current === chainId) return
    prev.current = chainId

    const list = tokensForChain(chainId)
    const sell = list[0]!
    const buy = list[2] ?? list[1] ?? list[0]!

    setSellToken(sell)
    setBuyToken(buy)
    setSellAmountInput('')
    setQuoteResult({
      receiveFormatted: '',
      routeSources: [],
      error: null,
      zid: null,
    })
  }, [
    chainId,
    setSellToken,
    setBuyToken,
    setSellAmountInput,
    setQuoteResult,
  ])

  return null
}
