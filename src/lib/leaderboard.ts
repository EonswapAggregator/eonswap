/**
 * Leaderboard-only UI tokens and formatting.
 * Table shell classes are aliased from the shared explorer-style table tokens
 * (`activityTxTable`) so the leaderboard page does not import `activity*` by name.
 */
export {
  activityCardShellClass as leaderboardCardShellClass,
  activityTableClass as leaderboardTableClass,
  activityTableScrollClass as leaderboardTableScrollClass,
  activityTableToolbarClass as leaderboardTableToolbarClass,
  activityTdClass as leaderboardTdClass,
  activityThClass as leaderboardThClass,
  activityTheadRowClass as leaderboardTheadRowClass,
  activityToolbarMetaClass as leaderboardToolbarMetaClass,
  activityToolbarTitleClass as leaderboardToolbarTitleClass,
  activityTrClass as leaderboardTrClass,
} from './activityTxTable'

/** Skeleton row count while relay data is loading. */
export const LEADERBOARD_SKELETON_ROWS = 6

export function formatLeaderboardAddressShort(addr: string): string {
  const a = addr.trim()
  if (a.length < 12) return a
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

export function formatLeaderboardRelativeTime(ts: number): string {
  if (!ts) return '—'
  const sec = Math.floor((Date.now() - ts) / 1000)
  if (sec < 60) return 'Just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 48) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}
