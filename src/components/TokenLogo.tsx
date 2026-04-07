import { useEffect, useState } from 'react'
import { trustWalletTokenLogoUrl } from '../lib/tokenLogos'
import type { Token } from '../lib/tokens'

const sizeStyles = {
  sm: 'h-7 w-7 min-h-7 min-w-7 text-[10px]',
  md: 'h-10 w-10 min-h-10 min-w-10 text-sm',
  lg: 'h-12 w-12 min-h-12 min-w-12 text-base',
} as const

type Props = {
  chainId: number
  token: Token
  size?: keyof typeof sizeStyles
  className?: string
}

export function TokenLogo({ chainId, token, size = 'md', className = '' }: Props) {
  const [failed, setFailed] = useState(false)
  const url = trustWalletTokenLogoUrl(chainId, token.address)
  const dim = sizeStyles[size]

  useEffect(() => {
    setFailed(false)
  }, [chainId, token.address])

  if (!url || failed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-eon-blue/30 to-cyan-500/20 font-bold text-eon-blue ring-1 ring-white/10 ${dim} ${className}`}
        aria-hidden
      >
        {token.symbol.slice(0, 2).toUpperCase()}
      </div>
    )
  }

  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={`shrink-0 rounded-full object-cover ring-1 ring-white/10 ${dim} ${className}`}
      onError={() => setFailed(true)}
    />
  )
}
