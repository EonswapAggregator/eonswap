import { useEffect, useState } from 'react'

/** Re-render periodically so “age” labels stay fresh (wallet-style). */
export function useLiveClock(intervalMs = 5000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(t)
  }, [intervalMs])
  return now
}
