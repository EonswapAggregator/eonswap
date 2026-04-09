import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccount, useChainId } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { isSupportedChain } from '../lib/chains'
import { useEonSwapStore } from '../store/useEonSwapStore'
import { SwapTipsCard } from './SwapTipsCard'
import { SwapWidget } from './SwapWidget'
import { TokenPriceChart } from './TokenPriceChart'

export function SwapDashboard() {
  const { isConnected, chainId: accountChainId } = useAccount()
  const walletDefaultChain = useChainId()
  const sellToken = useEonSwapStore((s) => s.sellToken)
  const buyToken = useEonSwapStore((s) => s.buyToken)
  const sellAmountInput = useEonSwapStore((s) => s.sellAmountInput)
  const receiveFormatted = useEonSwapStore((s) => s.receiveFormatted)
  const quoteLoading = useEonSwapStore((s) => s.quoteLoading)
  const quoteError = useEonSwapStore((s) => s.quoteError)
  const [chartDays, setChartDays] = useState<7 | 30 | 90>(7)

  const routePairPrice = useMemo(() => {
    const pay = Number.parseFloat(sellAmountInput.trim())
    const receive = Number.parseFloat(receiveFormatted.trim())
    if (!Number.isFinite(pay) || !Number.isFinite(receive)) return null
    if (pay <= 0 || receive <= 0) return null
    return receive / pay
  }, [sellAmountInput, receiveFormatted])

  const chartChainId =
    isConnected && accountChainId != null && isSupportedChain(accountChainId)
      ? accountChainId
      : isSupportedChain(walletDefaultChain)
        ? walletDefaultChain
        : mainnet.id

  return (
    <section
      id="swap"
      className="scroll-mt-24 border-t border-white/[0.08] py-16 md:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-gradient-to-r from-white/[0.03] via-white/[0.015] to-transparent p-4 sm:flex-row sm:items-center sm:justify-between md:mb-7 md:p-5"
        >
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
                Route-aware execution
              </span>
            </div>
            <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Trade
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Swap execution desk
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-[15px]">
              Non-custodial swaps via Kyber routes. Connect on a supported
              network to quote and send transactions from your wallet.
            </p>
          </div>
          <Link
            to="/activity"
            className="inline-flex h-10 w-fit shrink-0 items-center justify-center rounded-xl border border-white/[0.14] bg-white/[0.04] px-4 text-sm font-medium text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-white/[0.2] hover:bg-white/[0.07] hover:text-white"
          >
            View activity
          </Link>
        </motion.div>

        {/* Swap card first (primary); side column = chart + tips */}
        <div className="grid min-w-0 items-stretch gap-5 lg:grid-cols-[minmax(0,392px)_minmax(0,1fr)] lg:gap-6 xl:gap-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="order-1 flex min-w-0 justify-center lg:justify-start"
          >
            <SwapWidget />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.06 }}
            className="order-2 flex min-h-0 min-w-0 w-full max-w-full flex-col gap-4"
          >
            <TokenPriceChart
              baseSymbol={sellToken.symbol}
              quoteSymbol={buyToken.symbol}
              chainId={chartChainId}
              baseAddress={sellToken.address}
              quoteAddress={buyToken.address}
              baseDecimals={sellToken.decimals}
              quoteDecimals={buyToken.decimals}
              routePairPrice={routePairPrice}
              routeLoading={quoteLoading}
              routeError={quoteError}
              days={chartDays}
              onDaysChange={setChartDays}
            />
            <SwapTipsCard />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
