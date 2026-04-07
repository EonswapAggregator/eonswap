/** Browser tab titles per route (`document.title`). */
const TITLES: Record<string, string> = {
  '/': 'EonSwap — Infinite Liquidity.',
  '/swap': 'EonSwap — Swap',
  '/bridge': 'EonSwap — Bridge',
  '/earn': 'EonSwap — Pool / Earn',
  '/activity': 'EonSwap — Activity',
  '/docs': 'EonSwap — Docs',
  '/faq': 'EonSwap — FAQ',
  '/status': 'EonSwap — Status',
  '/contact-support': 'EonSwap — Contact Support',
  '/about': 'EonSwap — About',
  '/careers': 'EonSwap — Careers',
  '/press-kit': 'EonSwap — Press Kit',
  '/contact': 'EonSwap — Contact',
  '/terms': 'EonSwap — Terms of Use',
  '/privacy': 'EonSwap — Privacy Policy',
  '/risk-disclosure': 'EonSwap — Risk Disclosure',
  '/disclaimer': 'EonSwap — Disclaimer',
  '/aml-policy': 'EonSwap — AML Policy',
  '/admin': 'EonSwap — Admin',
}

const NOT_FOUND_TITLE = 'EonSwap — Page not found'

export function titleForPathname(pathname: string): string {
  const key = pathname.replace(/\/+$/, '') || '/'
  return TITLES[key] ?? NOT_FOUND_TITLE
}
