import { defineConfig } from 'vitepress'

const nav = [
  { text: 'Home', link: '/' },
  { text: 'How It Works', link: '/how-it-works' },
  { text: 'Features', link: '/features' },
  { text: 'Tokenomics', link: '/tokenomics' },
  { text: 'API', link: '/api' },
  { text: 'EonSwap', link: 'https://eonswap.us' },
]

const sidebar = [
  {
    text: 'Start',
    items: [
      { text: 'Introduction', link: '/' },
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'Supported Networks', link: '/supported-networks' },
    ],
  },
  {
    text: 'Product',
    items: [
      { text: 'How It Works', link: '/how-it-works' },
      { text: 'Features', link: '/features' },
      { text: 'Advantages', link: '/advantages' },
      { text: 'Fees', link: '/fees-execution' },
      { text: 'Tokenomics', link: '/tokenomics' },
      { text: 'Roadmap', link: '/roadmap' },
    ],
  },
  {
    text: 'Developers',
    items: [
      { text: 'API & Contracts', link: '/api' },
      { text: 'Integration Guide', link: '/guides/integration' },
    ],
  },
  {
    text: 'Safety',
    items: [
      { text: 'Risk Disclosure', link: '/risk-disclosure' },
      { text: 'Security Best Practices', link: '/guides/security' },
      { text: 'User Flows', link: '/guides/user-flows' },
    ],
  },
  {
    text: 'Legal',
    items: [
      { text: 'Privacy Policy', link: '/privacy' },
      { text: 'Terms of Service', link: '/terms' },
    ],
  },
  {
    text: 'Support',
    items: [
      { text: 'Troubleshooting', link: '/guides/troubleshooting' },
      { text: 'Wallet Setup', link: '/guides/wallet-setup' },
      { text: 'Status Codes', link: '/guides/status-codes' },
      { text: 'FAQ', link: '/guides/faq' },
      { text: 'Contact support', link: 'https://eonswap.us/contact-support' },
      { text: 'System Status', link: 'https://eonswap.us/status' },
    ],
  },
]

export default defineConfig({
  title: 'EonSwap Docs',
  description: 'Official documentation for EonSwap — the decentralized exchange on Base. Learn about swaps, liquidity, farming, staking, and more.',
  base: '/docs/',
  lastUpdated: true,
  cleanUrls: true,
  appearance: 'dark',
  head: [
    ['link', { rel: 'icon', href: 'https://eonswap.us/favicon.png' }],
    ['meta', { name: 'theme-color', content: '#ff007a' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:title', content: 'EonSwap Documentation' }],
    ['meta', { name: 'og:description', content: 'The official documentation for EonSwap DEX on Base' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ],
  themeConfig: {
    siteTitle: 'EonSwap',
    logo: 'https://eonswap.us/favicon.png',
    nav,
    sidebar,
    outline: {
      level: [2, 3],
      label: 'On this page',
    },
    editLink: {
      pattern: 'https://github.com/EonswapAggregator/EonSwap/edit/main/documentation/docs/:path',
      text: 'Edit this page on GitHub',
    },
    search: {
      provider: 'local',
      options: {
        detailedView: true,
      },
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/EonswapAggregator' },
      { icon: 'x', link: 'https://x.com/eonswapus', ariaLabel: 'EonSwap on X' },
      { icon: 'telegram', link: 'https://t.me/eonswap', ariaLabel: 'EonSwap on Telegram' },
      { icon: 'discord', link: 'https://discord.gg/AAEq22Sqng', ariaLabel: 'EonSwap on Discord' },
    ],
    footer: {
      message: 'Built with ❤️ on Base',
      copyright: `© ${new Date().getFullYear()} EonSwap. All rights reserved.`,
    },
  },
})
