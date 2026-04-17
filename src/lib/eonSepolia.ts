/**
 * Sepolia testnet Eon deployment addresses.
 * Keep in sync with `eon-protocol/deployments/eth-sepolia.json` (chainId 11155111).
 */
export const EON_SEPOLIA = {
  chainId: 11155111 as const,
  token: {
    name: 'EONSWAP TOKEN',
    symbol: 'ESTF',
    address: '0xbA0812f6cCBbec3701412799253a4c377267b64a' as const,
  },
  extraRewardToken: {
    name: 'EONSWAP REWARD',
    symbol: 'ESR',
    address: '0x531418363447c3b1179C5bA2489fc86148a44076' as const,
  },
  testAssets: {
    lpToken: {
      name: 'EONSWAP LP',
      symbol: 'EON-LP',
      address: '0x6ed510fb6B820F576623745085323A5a2e8b8A17' as const,
    },
  },
  amm: {
    factory: '0x4fE33C57b0e6D03EEf9779153102B0143540F6D3' as const,
    router: '0x6F3FDf1A8eBca55c8a8a46D010c5ebd7056e3b64' as const,
    weth: '0xD642c6bB2Afb2dBd638D33d243750A26Fcb35067' as const,
    pairEstfWeth: '0x523662715554E23556C13bDA05cf32ef84743E6f' as const,
    pairEsrWeth: '0x44b1DDd6146b581B7Cd5149D79786926FF5956b7' as const,
    integrationManager: '0x4f28b4a135c744A4f623d77e29558Be7AFc8442c' as const,
    twapGuard: '0xe01E89e17611c521DAd5A6dc9D5c05aAcac35F05' as const,
  },
  farm: {
    masterChef: '0x732F5fb22b5D84146716bBDAF15b0D2F1a32fbEE' as const,
    rewarder: '0xB8f1fF247e9aAd05b4e7d7932604ED6d69303dC8' as const,
    // Pool 0 uses ESTF/WETH LP token
    pool0LpToken: '0x523662715554E23556C13bDA05cf32ef84743E6f' as const,
  },
  ops: {
    feeTreasury: '0x729b8E923cB9ae62Ab70E6d0BB338C76311732C3' as const,
    vestingVault: '0x69C374a5697F56F7a5B30a2d093Ca735d79Bced4' as const,
    emissionGovernor: '0x8340F0cE7CF48fc4AcB58674903995e42941B854' as const,
  },
  timelock: '0x6Beefff2F0588b448962F0e3874a81d321752Ae0' as const,
} as const
