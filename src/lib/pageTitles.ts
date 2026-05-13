/** Browser tab titles per route (`document.title`). */
const TITLES: Record<string, string> = {
  '/': 'EonSwap - Base execution desk.',
  '/swap': 'EonSwap - Swap',
  '/tokens': 'EonSwap - Token Details',
  '/liquidity': 'EonSwap - Liquidity',
  '/pools': 'EonSwap - Pool Details',
  '/pool': 'EonSwap - Liquidity',
  '/earn': 'EonSwap - Liquidity',
  '/farm': 'EonSwap - Farm',
  '/stake': 'EonSwap - Stake',
  '/referral': 'EonSwap - Referral',
  '/airdrop': 'EonSwap - Airdrop',
  '/activity': 'EonSwap - Activity',
  '/leaderboard': 'EonSwap - Leaderboard',
  '/docs': 'EonSwap - Docs',
  '/faq': 'EonSwap - FAQ',
  '/status': 'EonSwap - Status',
  '/contact-support': 'EonSwap - Contact Support',
  '/about': 'EonSwap - About',
  '/careers': 'EonSwap - Careers',
  '/press-kit': 'EonSwap - Press Kit',
  '/terms': 'EonSwap - Terms of Use',
  '/privacy': 'EonSwap - Privacy Policy',
  '/risk-disclosure': 'EonSwap - Risk Disclosure',
  '/disclaimer': 'EonSwap - Disclaimer',
  '/aml-policy': 'EonSwap - AML Policy',
  '/admin': 'EonSwap - Admin',
}

const NOT_FOUND_TITLE = 'EonSwap - Page not found'
const DEFAULT_DESCRIPTION =
  'EonSwap is a non-custodial swap interface on Base that helps you find efficient routes and execute trades directly from your wallet.'

const DESCRIPTIONS: Record<string, string> = {
  '/': DEFAULT_DESCRIPTION,
  '/swap': 'Swap crypto assets across supported chains with smart route discovery and wallet-first execution.',
  '/tokens': 'View token metadata, contract details, supply, and wallet balance on Base.',
  '/liquidity': 'Explore liquidity and yield opportunities across supported ecosystems.',
  '/pools': 'View Eon AMM pool reserves, LP supply, token pair details, and wallet position on Base.',
  '/pool': 'Explore liquidity and yield opportunities across supported ecosystems.',
  '/earn': 'Explore liquidity and yield opportunities across supported ecosystems.',
  '/farm':
    'Discover incentive farms and staking programs on supported chains as they become available through EonSwap.',
  '/stake': 'Stake ESTF and participate in protocol incentives when staking goes live on EonSwap.',
  '/referral': 'Learn about the EonSwap referral program, invites, and reward mechanics.',
  '/airdrop': 'Official EonSwap airdrop information, eligibility, and safe claim guidance.',
  '/activity': 'Track your recent swap activity in one timeline.',
  '/leaderboard': 'See how wallets rank on EonSwap by completed swaps.',
  '/docs': 'Read EonSwap documentation, feature guides, safety notes, and user onboarding pages.',
  '/faq': 'Find quick answers to common EonSwap questions and troubleshooting steps.',
  '/status':
    'View provider health, latency, and monitoring signals for EonSwap service dependencies.',
  '/contact-support': 'Contact the EonSwap team for product support and issue reporting.',
  '/about': 'Learn about EonSwap mission, product direction, and core principles.',
  '/careers': 'Discover open roles and opportunities to build with the EonSwap team.',
  '/press-kit': 'Access official EonSwap brand and media resources.',
  '/terms': 'Review the Terms of Use for accessing EonSwap services.',
  '/privacy': 'Read the EonSwap Privacy Policy.',
  '/risk-disclosure': 'Understand key risks of on-chain trading activity.',
  '/disclaimer': 'Review legal disclaimers and usage limitations for EonSwap.',
  '/aml-policy': 'Read EonSwap AML policy and compliance statements.',
}

export function titleForPathname(pathname: string): string {
  const key = pathname.replace(/\/+$/, '') || '/'
  if (key.startsWith('/tokens/')) return TITLES['/tokens'] ?? NOT_FOUND_TITLE
  if (key.startsWith('/pools/')) return TITLES['/pools'] ?? NOT_FOUND_TITLE
  return TITLES[key] ?? NOT_FOUND_TITLE
}

export function descriptionForPathname(pathname: string): string {
  const key = pathname.replace(/\/+$/, '') || '/'
  if (key.startsWith('/tokens/')) return DESCRIPTIONS['/tokens'] ?? DEFAULT_DESCRIPTION
  if (key.startsWith('/pools/')) return DESCRIPTIONS['/pools'] ?? DEFAULT_DESCRIPTION
  return DESCRIPTIONS[key] ?? DEFAULT_DESCRIPTION
}

export function robotsForPathname(pathname: string): string {
  const key = pathname.replace(/\/+$/, '') || '/'
  if (key === '/admin') return 'noindex, nofollow, noarchive'
  return 'index, follow'
}
