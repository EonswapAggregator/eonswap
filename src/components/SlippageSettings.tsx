import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SlidersHorizontal, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import {
  SLIPPAGE_PRESETS_BPS,
  formatSlippagePercent,
  percentInputToBps,
} from '../lib/slippage'
import { useEonSwapStore } from '../store/useEonSwapStore'

type Props = { disabled?: boolean }

export function SlippageSettings({ disabled }: Props) {
  const bps = useEonSwapStore((s) => s.slippageToleranceBps)
  const setBps = useEonSwapStore((s) => s.setSlippageToleranceBps)
  const [open, setOpen] = useState(false)
  const [customStr, setCustomStr] = useState('')

  useEffect(() => {
    if (!open) return
    const pct = bps / 100
    setCustomStr(
      pct >= 1 ? pct.toFixed(pct % 1 === 0 ? 0 : 2) : pct.toFixed(2),
    )
  }, [open, bps])

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
                aria-label="Slippage tolerance"
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-2xl border border-white/[0.12] bg-[#12132c]/98 p-5 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold text-white">
                    Slippage tolerance
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
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  If the price moves more than this before your tx is mined, the
                  swap may revert or fill at a worse rate.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {SLIPPAGE_PRESETS_BPS.map((p) => {
                    const active = bps === p
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setBps(p)}
                        className={`rounded-xl px-3 py-2 text-xs font-medium tabular-nums transition ${
                          active
                            ? 'bg-eon-blue/20 text-eon-blue ring-1 ring-eon-blue/35'
                            : 'border border-white/[0.08] bg-white/[0.04] text-slate-300 hover:border-white/[0.12] hover:bg-white/[0.07]'
                        }`}
                      >
                        {formatSlippagePercent(p)}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-4">
                  <label
                    htmlFor="slippage-custom"
                    className="text-[10px] font-medium uppercase tracking-wider text-slate-500"
                  >
                    Custom (%)
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      id="slippage-custom"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={customStr}
                      onChange={(e) => setCustomStr(e.target.value)}
                      onBlur={applyCustom}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          applyCustom()
                          setOpen(false)
                        }
                      }}
                      className="min-w-0 flex-1 rounded-xl border border-white/[0.1] bg-black/30 px-3 py-2 text-sm text-white outline-none ring-eon-blue/40 placeholder:text-slate-600 focus:ring-2"
                      placeholder="e.g. 0.5"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        applyCustom()
                        setOpen(false)
                      }}
                      className="shrink-0 rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/[0.12]"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {bps >= 300 && (
                  <p className="mt-3 text-[11px] leading-relaxed text-amber-400/95">
                    High slippage can worsen execution and MEV exposure. Use only
                    if you understand the trade-off.
                  </p>
                )}
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
