import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * GET /api/tokens
 * Get supported tokens list for EonSwap
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const tokens = [
    {
      chainId: 8453,
      address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
      native: true,
    },
    {
      chainId: 8453,
      address: '0x4200000000000000000000000000000000000006',
      name: 'Wrapped Ether',
      symbol: 'WETH',
      decimals: 18,
      logoURI: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
    },
    {
      chainId: 8453,
      address: '0x7bd09674b3c721e35973993d5b6a79cda7da9c7f',
      name: 'EonSwap Token',
      symbol: 'ESTF',
      decimals: 18,
      logoURI: 'https://eonswap.us/tokens/estf.png',
    },
    {
      chainId: 8453,
      address: '0xbc11e3093afdbeb88d32ef893027202fc2b84f9d',
      name: 'EonSwap Reward',
      symbol: 'ESR',
      decimals: 18,
      logoURI: 'https://eonswap.us/tokens/esr.png',
    },
    {
      chainId: 8453,
      address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      logoURI: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
    },
    {
      chainId: 8453,
      address: '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca',
      name: 'USD Base Coin',
      symbol: 'USDbC',
      decimals: 6,
      logoURI: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
    },
    {
      chainId: 8453,
      address: '0x50c5725949a6f0c72e6c4a641f24049a917db0cb',
      name: 'Dai Stablecoin',
      symbol: 'DAI',
      decimals: 18,
      logoURI: 'https://assets.coingecko.com/coins/images/9956/small/dai-multi-collateral-mcd.png',
    },
  ]

  return res.status(200).json({
    name: 'EonSwap Token List',
    timestamp: new Date().toISOString(),
    version: {
      major: 1,
      minor: 0,
      patch: 0,
    },
    tokens,
    logoURI: 'https://eonswap.us/favicon.png',
  })
}
