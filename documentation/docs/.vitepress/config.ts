import { defineConfig } from 'vitepress'

const nav = [
  { text: 'Home', link: '/' },
  { text: 'How It Works', link: '/how-it-works' },
  { text: 'Features', link: '/features' },
  { text: 'Roadmap', link: '/roadmap' },
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
      { text: 'Fees & Execution', link: '/fees-execution' },
      { text: 'Roadmap', link: '/roadmap' },
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
  title: 'EonSwap Documentation',
  description: 'Official product documentation for EonSwap users.',
  base: '/docs/',
  lastUpdated: true,
  cleanUrls: true,
  head: [['link', { rel: 'icon', href: 'https://eonswap.us/favicon.png' }]],
  themeConfig: {
    siteTitle: 'EonSwap Docs',
    logo: 'https://eonswap.us/favicon.png',
    nav,
    sidebar,
    socialLinks: [
      { icon: 'github', link: 'https://github.com/EonswapAggregator' },
      { icon: 'x', link: 'https://x.com/eonswapus', ariaLabel: 'EonSwap on X' },
      { icon: 'telegram', link: 'https://t.me/eonswap', ariaLabel: 'EonSwap on Telegram' },
      { icon: 'discord', link: 'https://discord.gg/AAEq22Sqng', ariaLabel: 'EonSwap on Discord' },
    ],
  },
})
