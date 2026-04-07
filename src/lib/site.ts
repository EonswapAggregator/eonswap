function detectRuntimeDomain(): string {
  if (typeof window === 'undefined') return 'eonswap.app'
  const host = window.location.hostname.toLowerCase().replace(/^www\./u, '').trim()
  if (!host || host === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/u.test(host)) {
    return 'eonswap.app'
  }
  return host
}

export function siteDomain(): string {
  const configured = import.meta.env.VITE_SITE_DOMAIN?.trim().toLowerCase()
  if (configured) return configured.replace(/^www\./u, '')
  return detectRuntimeDomain()
}

export function roleEmail(localPart: string): string {
  return `${localPart}@${siteDomain()}`
}
