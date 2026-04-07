import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const CONSENT_KEY = 'eonswap_cookie_consent_v1'
const OPEN_CONSENT_EVENT = 'eonswap:open-cookie-consent'

type ConsentValue = 'accepted' | 'rejected'

type GtagFn = (...args: unknown[]) => void

function updateGoogleConsent(value: ConsentValue) {
  const gtag = (window as Window & { gtag?: GtagFn }).gtag
  if (!gtag) return

  const granted = value === 'accepted' ? 'granted' : 'denied'
  gtag('consent', 'update', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: granted,
  })
}

export function GdprConsentBanner() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const onOpenBanner = () => setIsVisible(true)
    window.addEventListener(OPEN_CONSENT_EVENT, onOpenBanner)

    const saved = localStorage.getItem(CONSENT_KEY) as ConsentValue | null
    if (!saved) {
      setIsVisible(true)
    } else {
      updateGoogleConsent(saved)
    }

    return () => window.removeEventListener(OPEN_CONSENT_EVENT, onOpenBanner)
  }, [])

  const saveChoice = (value: ConsentValue) => {
    localStorage.setItem(CONSENT_KEY, value)
    updateGoogleConsent(value)
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-x-3 bottom-3 z-[140] md:inset-x-auto md:bottom-5 md:left-5 md:w-[520px]">
      <div className="rounded-2xl border border-white/[0.12] bg-[#0b1026]/94 p-4 shadow-[0_24px_54px_-28px_rgba(0,0,0,0.82)] backdrop-blur-xl">
        <p className="inline-flex items-center rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
          Privacy controls
        </p>
        <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
          We use analytics cookies to improve performance and user experience. You can accept or
          decline optional tracking.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Learn more in our{' '}
          <Link to="/privacy" className="font-medium text-cyan-200 transition hover:text-cyan-100">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="mt-3.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => saveChoice('accepted')}
            className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-gradient-to-r from-cyan-400 via-cyan-500 to-eon-blue px-3.5 text-sm font-semibold text-[#05060f] shadow-[0_0_24px_-12px_rgba(34,211,238,0.55)]"
          >
            Accept analytics
          </button>
          <button
            type="button"
            onClick={() => saveChoice('rejected')}
            className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-white/[0.16] bg-white/[0.03] px-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07]"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}
