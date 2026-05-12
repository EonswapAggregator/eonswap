import { Network } from 'lucide-react'
import { useEffect, useState } from 'react'
import { switchNetworkLogoCandidates } from '../lib/tokenLogos'

type Props = {
  chainId: number
  /** Shown when all URLs fail (parent should still expose the chain name). */
  name: string
  className?: string
}

export function NetworkIconImg({ chainId, name, className = '' }: Props) {
  const candidates = switchNetworkLogoCandidates(chainId)
  const [idx, setIdx] = useState(0)
  const url = candidates[idx] ?? null

  useEffect(() => {
    setIdx(0)
  }, [chainId])

  if (!url || idx >= candidates.length) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-white/[0.06] ring-1 ring-white/15 ${className}`}
        title={name}
        aria-hidden
      >
        <Network className="h-[55%] w-[55%] text-slate-400" />
      </span>
    )
  }

  return (
    <img
      key={url}
      src={url}
      alt=""
      referrerPolicy="no-referrer"
      decoding="async"
      loading="lazy"
      className={className}
      onError={() => setIdx((i) => i + 1)}
    />
  )
}
