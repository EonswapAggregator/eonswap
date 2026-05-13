export function baseRpcUrls(): string[] {
  const alchemyKey = String(import.meta.env.VITE_ALCHEMY_API_KEY ?? '').trim()
  const envBaseRpcUrl = String(import.meta.env.VITE_BASE_RPC_URL ?? '').trim()
  
  // Reliable public RPC providers for Base (when env keys not available)
  const publicRpcProviders = [
    'https://rpc.ankr.com/base',
    'https://base.rpc.thirdweb.com',
    'https://base-rpc.publicnode.com',
  ]
  
  const urls = import.meta.env.DEV
    ? ['/__base-rpc']
    : [
        envBaseRpcUrl,
        alchemyKey ? `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}` : '',
        // Use reliable public providers instead of mainnet.base.org (often rate-limited)
        ...publicRpcProviders,
      ]

  return [...new Set(urls.map((url) => url.trim()).filter(Boolean))]
}
