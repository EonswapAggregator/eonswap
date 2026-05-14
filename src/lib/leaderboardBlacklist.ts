export const LEADERBOARD_BLACKLIST = new Set([
  '0x0000000000000000000000000000000000000001',
  '0x36e5182994c381b88d3761c9574f8867e135b280',
])

export function isBlacklistedLeaderboardAddress(address: string | undefined | null): boolean {
  return Boolean(address) && LEADERBOARD_BLACKLIST.has(String(address).toLowerCase())
}
