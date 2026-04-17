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
    <div className="min-w-0 w-full max-w-full rounded-3xl border border-uni-border bg-uni-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
        Before you swap
      </p>
      <ul className="mt-3 space-y-3">
        {items.map(({ icon: Icon, title, body, href, hrefLabel }) => (
          <li key={title} className="flex gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-uni-pink/10 text-uni-pink ring-1 ring-uni-pink/20">
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <div className="min-w-0 text-[12px] leading-snug">
              <p className="font-medium text-neutral-200">{title}</p>
              <p className="mt-0.5 text-neutral-500">
                {body}
                {href && hrefLabel ? (
                  <>
                    <Link
                      to={href}
                      className="text-uni-pink underline-offset-2 hover:text-uni-pink-light hover:underline"
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
      <p className="mt-3 border-t border-uni-border pt-3 text-[10px] leading-relaxed text-neutral-600">
        Indicative USD prices (e.g. on the chart) come from public feeds — not a
        trading signal. You pay network gas; final amounts depend on the route
        at execution time.
      </p>
    </div>
  )
}
