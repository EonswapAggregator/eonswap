import { useEffect, useState } from 'react'
import { getMonitorRelayBaseUrl } from '../lib/monitorRelayUrl'

type Probe = 'pending' | 'up' | 'down'

export function FooterMonitorStatus() {
  const [probe, setProbe] = useState<Probe>('pending')
  const base = getMonitorRelayBaseUrl()

  useEffect(() => {
    if (!base) return
    let cancelled = false
    const url = `${base.replace(/\/$/u, '')}/healthz`

    void fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
    })
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as { ok?: boolean } | null
        if (cancelled) return
        if (res.ok && json?.ok === true) setProbe('up')
        else setProbe('down')
      })
      .catch(() => {
        if (!cancelled) setProbe('down')
      })

    return () => {
      cancelled = true
    }
  }, [base])

  if (!base) return null

  return (
    <div
      className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1"
      aria-live="polite"
    >
      <span
        className={`eon-footer-status-dot inline-flex h-2 w-2 shrink-0 rounded-full motion-reduce:animate-none ${
          probe === 'pending'
            ? 'bg-slate-300 animate-[eon-footer-status-pending_0.42s_ease-in-out_infinite]'
            : probe === 'up'
              ? 'bg-emerald-200 animate-[eon-footer-status-live_0.42s_ease-in-out_infinite]'
              : 'bg-amber-300 animate-[eon-footer-status-warn_0.42s_ease-in-out_infinite]'
        }`}
        aria-hidden
      />
      <span className="text-[11px] text-slate-500">
        {probe === 'pending'
          ? 'Checking service…'
          : probe === 'up'
            ? 'Service active'
            : 'Service unreachable'}
      </span>
    </div>
  )
}
