import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SlidersHorizontal, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import {
  MAX_SLIPPAGE_BPS,
  SLIPPAGE_PRESETS_BPS,
  DEADLINE_PRESETS_MINUTES,
  MIN_DEADLINE_MINUTES,
  MAX_DEADLINE_MINUTES,
  PRICE_IMPACT_PRESETS_PCT,
  MIN_PRICE_IMPACT_WARN_PCT,
  MAX_PRICE_IMPACT_WARN_PCT,
  formatSlippagePercent,
  percentInputToBps,
  clampDeadlineMinutes,
  clampPriceImpactWarnPct,
} from '../lib/slippage'
import { useEonSwapStore } from '../store/useEonSwapStore'

type Props = { disabled?: boolean }

export function SlippageSettings({ disabled }: Props) {
  const bps = useEonSwapStore((s) => s.slippageToleranceBps)
  const setBps = useEonSwapStore((s) => s.setSlippageToleranceBps)
  const deadlineMinutes = useEonSwapStore((s) => s.deadlineMinutes)
  const setDeadlineMinutes = useEonSwapStore((s) => s.setDeadlineMinutes)
  const priceImpactWarnPct = useEonSwapStore((s) => s.priceImpactWarnPct)
  const setPriceImpactWarnPct = useEonSwapStore((s) => s.setPriceImpactWarnPct)
  const [open, setOpen] = useState(false)
  const [customStr, setCustomStr] = useState('')
  const [deadlineStr, setDeadlineStr] = useState('')
  const [priceImpactStr, setPriceImpactStr] = useState('')

  useEffect(() => {
    if (!open) return
    const pct = bps / 100
    setCustomStr(
      pct >= 1 ? pct.toFixed(pct % 1 === 0 ? 0 : 2) : pct.toFixed(2),
    )
    setDeadlineStr(String(deadlineMinutes))
    setPriceImpactStr(String(priceImpactWarnPct))
  }, [open, bps, deadlineMinutes, priceImpactWarnPct])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const applyCustom = () => {
    const parsed = percentInputToBps(customStr)
    if (parsed != null) setBps(parsed)
  }

  const applyDeadline = () => {
    const val = parseInt(deadlineStr, 10)
    if (!Number.isNaN(val)) {
      setDeadlineMinutes(clampDeadlineMinutes(val))
    }
  }

  const applyPriceImpact = () => {
    const val = parseInt(priceImpactStr, 10)
    if (!Number.isNaN(val)) {
      setPriceImpactWarnPct(clampPriceImpactWarnPct(val))
    }
  }

  const modal =
    typeof document !== 'undefined' ? (
      createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              key="slippage-modal-root"
              role="presentation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[190] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="Transaction settings"
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[400px] max-h-[85vh] overflow-y-auto rounded-2xl border border-white/[0.12] bg-[#12132c]/98 p-4 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm font-semibold text-white">
                    Transaction Settings
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Grid Layout - stacked */}
                <div className="space-y-3">
                  {/* Slippage Column */}
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                    <p className="text-xs font-semibold text-white mb-1">Slippage</p>
                    <p className="text-[10px] text-slate-500 mb-2">
                      Max price movement tolerance
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {SLIPPAGE_PRESETS_BPS.map((p) => {
                        const active = bps === p
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setBps(p)}
                            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium tabular-nums transition ${
                              active
                                ? 'bg-eon-blue/20 text-eon-blue ring-1 ring-eon-blue/35'
                                : 'border border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.07]'
                            }`}
                          >
                            {formatSlippagePercent(p)}
                          </button>
                        )
                      })}
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={customStr}
                      onChange={(e) => setCustomStr(e.target.value)}
                      onBlur={applyCustom}
                      onKeyDown={(e) => e.key === 'Enter' && applyCustom()}
                      className="w-full rounded-lg border border-white/[0.1] bg-black/30 px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-slate-600 focus:ring-1 focus:ring-eon-blue/40"
                      placeholder="Custom %"
                    />
                    {bps >= 300 && (
                      <p className="mt-2 text-[10px] text-amber-400/90">
                        ⚠ High slippage (max {formatSlippagePercent(MAX_SLIPPAGE_BPS)})
                      </p>
                    )}
                  </div>

                  {/* Deadline Column */}
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-xs font-semibold text-white mb-1">Deadline</p>
                    <p className="text-[10px] text-slate-500 mb-3">
                      Tx reverts if pending too long
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {DEADLINE_PRESETS_MINUTES.map((m) => {
                        const active = deadlineMinutes === m
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setDeadlineMinutes(m)}
                            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium tabular-nums transition ${
                              active
                                ? 'bg-eon-blue/20 text-eon-blue ring-1 ring-eon-blue/35'
                                : 'border border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.07]'
                            }`}
                          >
                            {m}m
                          </button>
                        )
                      })}
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={deadlineStr}
                      onChange={(e) => setDeadlineStr(e.target.value)}
                      onBlur={applyDeadline}
                      onKeyDown={(e) => e.key === 'Enter' && applyDeadline()}
                      className="w-full rounded-lg border border-white/[0.1] bg-black/30 px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-slate-600 focus:ring-1 focus:ring-eon-blue/40"
                      placeholder={`${MIN_DEADLINE_MINUTES}-${MAX_DEADLINE_MINUTES} min`}
                    />
                  </div>

                  {/* Price Impact Column */}
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-xs font-semibold text-white mb-1">Impact Warning</p>
                    <p className="text-[10px] text-slate-500 mb-3">
                      Warn when impact exceeds
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {PRICE_IMPACT_PRESETS_PCT.map((p) => {
                        const active = priceImpactWarnPct === p
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPriceImpactWarnPct(p)}
                            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium tabular-nums transition ${
                              active
                                ? 'bg-eon-blue/20 text-eon-blue ring-1 ring-eon-blue/35'
                                : 'border border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.07]'
                            }`}
                          >
                            {p}%
                          </button>
                        )
                      })}
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={priceImpactStr}
                      onChange={(e) => setPriceImpactStr(e.target.value)}
                      onBlur={applyPriceImpact}
                      onKeyDown={(e) => e.key === 'Enter' && applyPriceImpact()}
                      className="w-full rounded-lg border border-white/[0.1] bg-black/30 px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-slate-600 focus:ring-1 focus:ring-eon-blue/40"
                      placeholder={`${MIN_PRICE_IMPACT_WARN_PCT}-${MAX_PRICE_IMPACT_WARN_PCT}%`}
                    />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )
    ) : null

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <SlidersHorizontal className="h-3.5 w-3.5 text-eon-blue/90" aria-hidden />
        <span className="tabular-nums">{formatSlippagePercent(bps)}</span>
      </button>
      {modal}
    </>
  )
}
