import { motion } from 'framer-motion'
import { ArrowRightLeft, Shield } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccount, useChainId } from 'wagmi'
import { base } from 'wagmi/chains'
import { isEonAmmSwapChain } from '../lib/chains'
import { useEonSwapStore } from '../store/useEonSwapStore'
import { SwapTipsCard } from './SwapTipsCard'
import { SwapWidget } from './SwapWidget'
import { TokenPriceChart } from './TokenPriceChart'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: 'easeOut' as const },
  }),
}

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

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

  const routePairPrice = useMemo(() => {
    const pay = Number.parseFloat(sellAmountInput.trim())
    const receive = Number.parseFloat(receiveFormatted.trim())
    if (!Number.isFinite(pay) || !Number.isFinite(receive)) return null
    if (pay <= 0 || receive <= 0) return null
    
    const price = receive / pay
    
    // Validate price is reasonable (not extreme outlier)
    if (!Number.isFinite(price) || price <= 0) return null
    
    // Reject prices that are clearly wrong (e.g., from rounding errors)
    // Most crypto pairs won't have ratios > 1,000,000 or < 0.000001
    if (price > 1_000_000 || price < 0.000001) return null
    
    return price
  }, [sellAmountInput, receiveFormatted])

  const chartChainId =
    isConnected && accountChainId != null && isEonAmmSwapChain(accountChainId)
      ? accountChainId
      : isEonAmmSwapChain(walletDefaultChain)
        ? walletDefaultChain
        : base.id

  return (
    <section
      id="swap"
      className="relative min-h-screen overflow-hidden border-t border-uni-border"
    >
      {/* Gradient backdrop - matching liquidity page */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,0,122,0.12),transparent)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-uni-bg" />
        <div
          className="absolute -left-32 top-[-10%] h-[min(420px,45vw)] w-[min(420px,45vw)] rounded-full bg-uni-pink/10 blur-[100px]"
          style={{
            animation: prefersReducedMotion ? 'none' : 'eon-gradient-drift 22s ease-in-out infinite',
          }}
        />
        <div
          className="absolute -right-24 top-[30%] h-[min(360px,40vw)] w-[min(360px,40vw)] rounded-full bg-uni-purple/[0.08] blur-[90px]"
          style={{
            animation: prefersReducedMotion ? 'none' : 'eon-gradient-drift 28s ease-in-out infinite reverse',
          }}
        />
      </div>

      {/* Hero Section */}
      <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-10 md:px-6 md:pb-12 md:pt-14">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            show: { transition: { staggerChildren: 0.08 } },
          }}
          className="text-center"
        >
          <motion.div
            custom={0}
            variants={fadeUp}
            className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-uni-border bg-uni-surface px-4 py-2 text-xs font-medium uppercase tracking-widest text-neutral-400">
              <ArrowRightLeft className="h-3.5 w-3.5 text-uni-pink" />
              Token Swap
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
              <Shield className="h-3.5 w-3.5 text-uni-pink/80" aria-hidden />
              Route-aware execution
            </span>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            className="text-balance text-[clamp(1.75rem,8vw,2.75rem)] font-semibold leading-[1.15] tracking-tight text-white"
          >
            <span className="block">Swap tokens,</span>
            <span className="mt-1 block text-uni-pink">instantly.</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-neutral-400 md:text-lg"
          >
            Non-custodial swaps via EonSwap liquidity. Connect on a supported 
            network to quote and send transactions from your wallet.
          </motion.p>

          <motion.div
            custom={3}
            variants={fadeUp}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              to="/activity"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-uni-border bg-transparent px-6 py-3 text-sm font-medium text-white transition hover:bg-uni-surface"
            >
              View Activity
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Main content */}
      <div className="relative mx-auto max-w-7xl px-4 pb-16 md:px-6">
        {/* Swap card first (primary); side column = chart + tips */}
        <div className="grid min-w-0 items-stretch gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-6 xl:gap-8">
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
