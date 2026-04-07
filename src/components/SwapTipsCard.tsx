import { Activity, Percent, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'

const items: Array<{
  icon: typeof Percent
  title: string
  body: string
  href?: string
  hrefLabel?: string
}> = [
  {
    icon: Percent,
    title: 'Slippage & min. received',
    body: 'Use the settings control on the swap card. Higher slippage can help in volatile pools but increases risk.',
  },
  {
    icon: ShieldAlert,
    title: 'Verify tokens',
    body: 'Always double-check contract addresses on a block explorer before large trades. Scam tokens can use similar symbols.',
  },
  {
    icon: Activity,
    title: 'Track fills',
    body: 'After swapping, review hashes and explorer links in ',
    href: '/activity',
    hrefLabel: 'Activity',
  },
]

export function SwapTipsCard() {
  return (
    <div className="min-w-0 w-full max-w-full rounded-2xl border border-white/[0.1] bg-[#0a0b1c]/90 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Before you swap
      </p>
      <ul className="mt-3 space-y-3">
        {items.map(({ icon: Icon, title, body, href, hrefLabel }) => (
          <li key={title} className="flex gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-cyan-400/90 ring-1 ring-white/[0.06]">
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div className="min-w-0 text-[12px] leading-snug">
              <p className="font-medium text-slate-200">{title}</p>
              <p className="mt-0.5 text-slate-500">
                {body}
                {href && hrefLabel ? (
                  <>
                    <Link
                      to={href}
                      className="text-cyan-400/90 underline-offset-2 hover:text-cyan-300 hover:underline"
                    >
                      {hrefLabel}
                    </Link>
                    .
                  </>
                ) : null}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-white/[0.06] pt-3 text-[10px] leading-relaxed text-slate-600">
        Indicative USD prices (e.g. on the chart) come from public feeds — not a
        trading signal. You pay network gas; final amounts depend on the route
        at execution time.
      </p>
    </div>
  )
}
