/** Browser tab titles per route (`document.title`). */
const TITLES: Record<string, string> = {
  '/': 'EonSwap — Infinite Liquidity.',
  '/swap': 'EonSwap — Swap',
  '/bridge': 'EonSwap — Bridge',
  '/pool': 'EonSwap — Pool / Earn',
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
const DEFAULT_DESCRIPTION =
  'EonSwap is a non-custodial multi-chain swap interface that helps you find efficient routes and execute trades directly from your wallet.'
const DESCRIPTIONS: Record<string, string> = {
  '/': DEFAULT_DESCRIPTION,
  '/swap': 'Swap crypto assets across supported chains with smart route discovery and wallet-first execution.',
  '/bridge':
    'Bridge assets across supported networks using non-custodial routes surfaced through EonSwap integrations.',
  '/pool': 'Explore liquidity and yield opportunities across supported ecosystems.',
  '/earn': 'Explore liquidity and yield opportunities across supported ecosystems.',
  '/activity': 'Track your recent swap and bridge activity in one timeline.',
  '/docs': 'Read EonSwap documentation, feature guides, safety notes, and user onboarding pages.',
  '/faq': 'Find quick answers to common EonSwap questions and troubleshooting steps.',
  '/status':
    'View provider health, latency, and monitoring signals for EonSwap service dependencies.',
  '/contact-support': 'Contact the EonSwap team for product support and issue reporting.',
  '/about': 'Learn about EonSwap mission, product direction, and core principles.',
  '/careers': 'Discover open roles and opportunities to build with the EonSwap team.',
  '/press-kit': 'Access official EonSwap brand and media resources.',
  '/contact': 'Reach the EonSwap team for partnerships and general inquiries.',
  '/terms': 'Review the Terms of Use for accessing EonSwap services.',
  '/privacy': 'Read the EonSwap Privacy Policy.',
  '/risk-disclosure': 'Understand key risks of on-chain trading and cross-chain activity.',
  '/disclaimer': 'Review legal disclaimers and usage limitations for EonSwap.',
  '/aml-policy': 'Read EonSwap AML policy and compliance statements.',
}

export function titleForPathname(pathname: string): string {
  const key = pathname.replace(/\/+$/, '') || '/'
  return TITLES[key] ?? NOT_FOUND_TITLE
}

export function descriptionForPathname(pathname: string): string {
  const key = pathname.replace(/\/+$/, '') || '/'
  return DESCRIPTIONS[key] ?? DEFAULT_DESCRIPTION
}

export function robotsForPathname(pathname: string): string {
  const key = pathname.replace(/\/+$/, '') || '/'
  if (key === '/admin') return 'noindex, nofollow, noarchive'
  return 'index, follow'
}
