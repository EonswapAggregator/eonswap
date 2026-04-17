/**
 * Base mainnet Eon deployment addresses.
 * Keep in sync with `eon-protocol/deployments/base-mainnet.json` (chainId 8453).
 */
export const EON_BASE_MAINNET = {
  chainId: 8453 as const,
  token: {
    name: 'EONSWAP TOKEN',
    symbol: 'ESTF',
    address: '0x7bd09674b3c721e35973993d5b6a79cda7da9c7f' as const,
  },
  extraRewardToken: {
    name: 'EONSWAP REWARD',
    symbol: 'ESR',
    address: '0xbc11e3093afdbeb88d32ef893027202fc2b84f9d' as const,
  },
  amm: {
    factory: '0xd7b56729dcaa67aa2fa4a72795e3ed94ac03071b' as const,
    router: '0xccc8b61b06544c942446846b6715f86c1c2823ce' as const,
    weth: '0x4200000000000000000000000000000000000006' as const,
    pairEstfWeth: '0x79680a4500df8e0599e9916c52b3b1983bd6ee04' as const,
    pairEsrWeth: '0x1a46207d6c02b95c159ab2f4b8b521b061b49173' as const,
    integrationManager: '0x0589ee6bf6635cbb5bad92fa638b96c6f506f302' as const,
    twapGuard: '0x3f98649e3844bf06ecf8ee303469c35dfb4d3f5f' as const,
  },
  farm: {
    masterChef: '0x1ffbe00f3810e97a8306961d8dc4054abd4f4a2c' as const,
    rewarder: '0x769142cd599cd46fd8f833a3bf5bc1147129e887' as const,
    // Pool 0 uses ESTF/WETH LP token
    pool0LpToken: '0x79680a4500df8e0599e9916c52b3b1983bd6ee04' as const,
  },
  ops: {
    feeTreasury: '0x7f10d2bb44eafa46669e0befc23fd54808046d77' as const,
    vestingVault: '0x5871de9b49198f8016932ffe6599a6199079c6b4' as const,
    emissionGovernor: '0x87fa28cf1e03cade52eaa26e24c4aecb00389944' as const,
  },
  timelock: '0x95c5b1c146dc2a3da953a99435395d311f6089ae' as const,
} as const
