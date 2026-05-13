import { base } from 'viem/chains'

export function baseRpcUrls(): string[] {
  const alchemyKey = String(import.meta.env.VITE_ALCHEMY_API_KEY ?? '').trim()
  const envBaseRpcUrl = String(import.meta.env.VITE_BASE_RPC_URL ?? '').trim()
  const urls = import.meta.env.DEV
    ? ['/__base-rpc']
    : [
        envBaseRpcUrl,
        alchemyKey ? `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}` : '',
        ...base.rpcUrls.default.http,
      ]

  return [...new Set(urls.map((url) => url.trim()).filter(Boolean))]
}
