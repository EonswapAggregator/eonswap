/**
 * Base mainnet Eon deployment addresses.
 * Keep in sync with `eon-protocol/deployments/base-mainnet.json` (chainId 8453).
 */
export const EON_BASE_MAINNET = {
  chainId: 8453 as const,
  token: {
    name: "EONSWAP TOKEN",
    symbol: "ESTF",
    address: "0x295685df8e07a6d529a849AE7688c524494fD010" as const,
  },
  extraRewardToken: {
    name: "EONSWAP REWARD",
    symbol: "ESR",
    address: "0xd48463DB303dA9818Ef565e84aCa266234B38f08" as const,
  },
  amm: {
    factory: "0x24FF44E8B0839660Dfc381466be1fF8d946cE5C8" as const,
    router: "0xEbEe6F5518482c2de9EcF5483916d7591bf0d474" as const,
    weth: "0x4200000000000000000000000000000000000006" as const,
    pairEstfWeth: "0x539e2da338ca3ae9b5fedc6d102978a741b641cf" as const,
    pairEsrWeth: "" as const, // Not created yet
    integrationManager: "0x89887F8C700586EA8321CD65309D001e935b299d" as const,
    twapGuard: "0x9B7b5B6DC78c4996A77a1eC5F6Be37b4AE18869D" as const,
  },
  farm: {
    masterChef: "0xbdD705BF5D4844db3d62ee8B6A8f7865CAd731A1" as const,
    rewarder: "0xA8F9569C1d2D01Aeb09E6407Dd34adbBbBf9d468" as const,
    // Pool 0 uses ESTF/WETH LP token
    pool0LpToken: "0x539e2da338ca3ae9b5fedc6d102978a741b641cf" as const,
  },
  ops: {
    feeTreasury: "0x35312a53E99a08df9b3747Ec786079C85675f8e4" as const,
    vestingVault: "0xDDfa6d58762E8841B6aCFDbbfde0Fb22CbeE88E3" as const,
    emissionGovernor: "0x281dB692B726b88f546Fe776e52B4216378b3644" as const,
  },
  timelock: "0x3e43C8894fa3e89d952E73bd72E46FFdaB95F986" as const,
} as const;
