import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { arbitrum, base, bsc, mainnet, optimism, polygon } from 'wagmi/chains'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY

const alchemy = (subdomain: string) =>
  alchemyKey ? `https://${subdomain}.g.alchemy.com/v2/${alchemyKey}` : undefined

export const wagmiConfig = getDefaultConfig({
  appName: 'EonSwap',
  projectId: projectId || '00000000000000000000000000000000',
  chains: [mainnet, arbitrum, base, optimism, polygon, bsc],
  ssr: false,
  transports: {
    [mainnet.id]: http(alchemy('eth-mainnet')),
    [arbitrum.id]: http(alchemy('arb-mainnet')),
    [base.id]: http(alchemy('base-mainnet')),
    [optimism.id]: http(alchemy('opt-mainnet')),
    [polygon.id]: http(alchemy('polygon-mainnet')),
    [bsc.id]: http(),
  },
})
