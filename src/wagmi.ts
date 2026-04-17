import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { base } from 'wagmi/chains'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY

const baseRpcUrl = alchemyKey 
  ? `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`
  : 'https://mainnet.base.org'

const baseChain = { ...base, name: 'Base', shortName: 'Base' }

export const wagmiConfig = getDefaultConfig({
  appName: 'EonSwap',
  projectId: projectId || '00000000000000000000000000000000',
  chains: [baseChain],
  ssr: false,
  transports: {
    [base.id]: http(baseRpcUrl),
  },
})
