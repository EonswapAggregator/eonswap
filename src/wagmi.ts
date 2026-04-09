import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { arbitrum, base, bsc, mainnet, optimism, polygon } from 'wagmi/chains'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY

const alchemy = (subdomain: string) =>
  alchemyKey ? `https://${subdomain}.g.alchemy.com/v2/${alchemyKey}` : undefined

const ethereumChain = { ...mainnet, name: 'Ethereum', shortName: 'Ethereum' }
const bnbSmartChain = { ...bsc, name: 'BNB Smart Chain', shortName: 'BNB Smart Chain' }
const arbitrumOne = { ...arbitrum, name: 'Arbitrum One', shortName: 'Arbitrum One' }
const baseChain = { ...base, name: 'Base', shortName: 'Base' }
const polygonPos = { ...polygon, name: 'Polygon PoS', shortName: 'Polygon PoS' }
const opMainnet = { ...optimism, name: 'OP Mainnet', shortName: 'OP Mainnet' }

export const wagmiConfig = getDefaultConfig({
  appName: 'EonSwap',
  projectId: projectId || '00000000000000000000000000000000',
  chains: [
    ethereumChain,
    bnbSmartChain,
    arbitrumOne,
    baseChain,
    polygonPos,
    opMainnet,
  ],
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
