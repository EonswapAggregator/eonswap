import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  Copy,
  Gift,
  Share2,
  Trophy,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatUnits } from 'viem'
import {
  buildReferralLink,
  generateReferralCode,
  getTierInfo,
  getTierRewardPct,
  loadReferralStats,
  truncateAddress,
  formatRelativeTime,
  parseReferralFromUrl,
  storeReferredBy,
  registerReferral,
  type ReferralStats,
} from '../lib/referral'
import {
  EON_REFERRAL_ABI,
  getEonReferralAddress,
  getTierName,
  Tier,
} from '../lib/referralContract'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.06 * i,
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
}

const features = [
  {
    icon: Share2,
    title: 'Share Your Link',
    description: 'Get a unique referral link to share with friends and your community.',
  },
  {
    icon: Wallet,
    title: 'Earn Rewards',
    description: 'Receive a portion of trading fees from every swap your referrals make.',
  },
  {
    icon: Gift,
    title: 'Bonus Tiers',
    description: 'Unlock higher reward rates as you bring in more active traders.',
  },
] as const

export function ReferralPage() {
  const prefersReducedMotion = useReducedMotion()
  const { address, isConnected, chain } = useAccount()
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState<ReferralStats | null>(null)

  // Get contract address for current chain
  const contractAddress = chain?.id ? getEonReferralAddress(chain.id) : undefined

  // Read contract data
  const { data: contractStats, refetch: refetchStats } = useReadContract({
    address: contractAddress,
    abi: EON_REFERRAL_ABI,
    functionName: 'getReferrerStats',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address && contractAddress),
    },
  })

  // Claim rewards contract interaction
  const { writeContract, data: claimHash, isPending: isClaiming } = useWriteContract()
  const { isLoading: isWaitingClaim, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
    hash: claimHash,
  })

  // Load referral stats (try contract first, fallback to API)
  useEffect(() => {
    async function loadStats() {
      if (!address) {
        setStats(null)
        return
      }

      // Try contract first
      if (contractStats) {
        const [totalReferrals, totalEarnings, pendingRewards, _claimedRewards, tier] = contractStats
        setStats({
          totalReferrals: Number(totalReferrals),
          activeReferrals: Number(totalReferrals), // Simplified
          totalEarnings: Number(formatUnits(totalEarnings, 18)),
          pendingRewards: Number(formatUnits(pendingRewards, 18)),
          tier: getTierName(tier as Tier),
          referredAddresses: [],
        })
      } else {
        // Fallback to API
        const apiStats = await loadReferralStats(address)
        setStats(apiStats)
      }
    }

    void loadStats()
  }, [address, contractStats])

  // Refetch stats after successful claim
  useEffect(() => {
    if (isClaimSuccess) {
      void refetchStats()
    }
  }, [isClaimSuccess, refetchStats])

  // Handle incoming referral code from URL
  useEffect(() => {
    const refCode = parseReferralFromUrl()
    if (refCode) {
      storeReferredBy(refCode)
      // If connected, register this referral
      if (address) {
        const myCode = generateReferralCode(address)
        // Don't self-refer
        if (refCode !== myCode) {
          void registerReferral(refCode, address)
        }
      }
    }
  }, [address])

  const referralLink = address ? buildReferralLink(address) : ''
  const referralCode = address ? generateReferralCode(address) : ''
  const tierInfo = stats ? getTierInfo(stats.tier) : null
  const rewardPct = stats ? getTierRewardPct(stats.tier) : 5

  const copyLink = useCallback(() => {
    if (!referralLink) return
    void navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [referralLink])

  const handleClaimRewards = useCallback(() => {
    if (!contractAddress || !stats || stats.pendingRewards <= 0) return
    writeContract({
      address: contractAddress,
      abi: EON_REFERRAL_ABI,
      functionName: 'claimRewards',
    })
  }, [contractAddress, stats, writeContract])

  const canClaim = stats && stats.pendingRewards > 0
  const isProcessingClaim = isClaiming || isWaitingClaim

  const statCards = [
    {
      icon: Users,
      label: 'Total Referrals',
      value: stats?.totalReferrals ?? 0,
      sub: `${stats?.activeReferrals ?? 0} active`,
      color: 'text-uni-pink',
      showClaim: false,
    },
    {
      icon: TrendingUp,
      label: 'Total Earned',
      value: `$${(stats?.totalEarnings ?? 0).toFixed(2)}`,
      sub: `$${(stats?.pendingRewards ?? 0).toFixed(2)} pending`,
      color: 'text-emerald-400',
      showClaim: true,
    },
    {
      icon: Trophy,
      label: 'Your Tier',
      value: tierInfo?.name ?? 'Bronze',
      sub: `${rewardPct}% rewards`,
      color: tierInfo?.color ?? 'text-amber-600',
      showClaim: false,
    },
  ] as const

  return (
    <div className="relative min-w-0 max-w-full overflow-hidden">
      {/* Gradient backdrop */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,0,122,0.12),transparent)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-uni-bg" />
        <div
          className="absolute -left-32 top-[-10%] h-[min(420px,45vw)] w-[min(420px,45vw)] rounded-full bg-uni-pink/10 blur-[100px]"
          style={{
            animation: prefersReducedMotion ? 'none' : 'eon-gradient-drift 22s ease-in-out infinite',
          }}
        />
        <div
          className="absolute -right-24 top-[30%] h-[min(360px,40vw)] w-[min(360px,40vw)] rounded-full bg-uni-purple/[0.08] blur-[90px]"
          style={{
            animation: prefersReducedMotion ? 'none' : 'eon-gradient-drift 28s ease-in-out infinite reverse',
          }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-4 pb-8 pt-10 md:px-6 md:pb-12 md:pt-14">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            show: { transition: { staggerChildren: 0.08 } },
          }}
          className="text-center"
        >
          <motion.div
            custom={0}
            variants={fadeUp}
            className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-uni-border bg-uni-surface px-4 py-2 text-xs font-medium uppercase tracking-widest text-neutral-400">
              <Users className="h-3.5 w-3.5 text-uni-pink" />
              Referral Program
            </span>
            {isConnected && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Connected
              </span>
            )}
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            className="text-balance text-[clamp(1.75rem,8vw,2.75rem)] font-semibold leading-[1.15] tracking-tight text-white"
          >
            <span className="block">Invite friends,</span>
            <span className="mt-1 block text-uni-pink">earn together.</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-neutral-400 md:text-lg"
          >
            Share your unique referral link and earn a percentage of trading fees 
            from every swap your friends make on EonSwap.
          </motion.p>

          {/* Referral Link Box */}
          {isConnected ? (
            <motion.div
              custom={3}
              variants={fadeUp}
              className="mx-auto mt-8 max-w-lg"
            >
              <div className="relative">
                <div
                  className="absolute -inset-px rounded-2xl bg-gradient-to-r from-uni-pink/30 via-uni-pink/10 to-uni-pink/30 opacity-50 blur-sm"
                  aria-hidden
                />
                <div className="relative rounded-2xl border border-uni-border bg-uni-surface p-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-widest text-neutral-500">
                    Your Referral Link
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-uni-border bg-uni-bg px-4 py-3">
                      <p className="truncate font-mono text-sm text-white">
                        {referralLink}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={copyLink}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-uni-border bg-uni-pink text-white transition hover:bg-uni-pink-light"
                      aria-label="Copy referral link"
                    >
                      {copied ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-neutral-500">
                    Code: <span className="font-mono text-neutral-300">{referralCode}</span>
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              custom={3}
              variants={fadeUp}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Link
                to="/swap"
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-uni-pink px-6 py-3 text-sm font-semibold text-white shadow-glow transition duration-300 hover:bg-uni-pink-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uni-pink/70 focus-visible:ring-offset-2 focus-visible:ring-offset-uni-bg"
              >
                <span className="relative flex items-center gap-2">
                  Connect Wallet to Get Link
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* Stats Section - Only show when connected */}
      {isConnected && stats && (
        <section className="relative mx-auto max-w-4xl px-4 pb-10 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="relative"
          >
            <div
              className="absolute -inset-px rounded-[1.25rem] bg-gradient-to-b from-white/[0.06] via-uni-pink/10 to-transparent opacity-45 blur-sm"
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-3xl border border-uni-border bg-uni-surface shadow-uni-card">
              <div className="grid divide-y divide-uni-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {statCards.map((stat) => (
                  <div
                    key={stat.label}
                    className="group px-6 py-6 text-center transition duration-200 hover:bg-uni-surface-2"
                  >
                    <div className="mb-3 flex items-center justify-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-uni-pink/[0.1] ring-1 ring-uni-pink/20">
                        <stat.icon className={`h-5 w-5 ${stat.color}`} aria-hidden />
                      </div>
                    </div>
                    <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
                      {stat.value}
                    </p>
                    <p className="mt-0.5 text-[11px] text-neutral-600">{stat.sub}</p>
                    
                    {/* Claim Button - only show for Total Earned card */}
                    {stat.showClaim && canClaim && (
                      <button
                        onClick={handleClaimRewards}
                        disabled={isProcessingClaim}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-uni-pink px-3 py-1.5 text-xs font-medium text-white transition hover:bg-uni-pink-light disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isProcessingClaim ? (
                          <>
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Claiming...
                          </>
                        ) : (
                          <>
                            <Wallet className="h-3 w-3" />
                            Claim Rewards
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {/* Referred Users Table - Only show when has referrals */}
      {isConnected && stats && stats.referredAddresses.length > 0 && (
        <section className="relative mx-auto max-w-4xl px-4 pb-10 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <h2 className="mb-4 text-lg font-semibold text-white">Your Referrals</h2>
            <div className="overflow-hidden rounded-2xl border border-uni-border bg-uni-surface">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px]">
                  <thead>
                    <tr className="border-b border-uni-border bg-uni-surface-2">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                        Address
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">
                        Swaps
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">
                        Volume
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">
                        Earned
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">
                        Joined
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-uni-border">
                    {stats.referredAddresses.map((user) => (
                      <tr
                        key={user.address}
                        className="transition hover:bg-uni-surface-2"
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-neutral-200">
                            {truncateAddress(user.address, 6)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-neutral-300">
                          {user.swapCount}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-neutral-300">
                          ${user.volumeUsd.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-uni-pink">
                          ${user.rewardEarned.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-neutral-500">
                          {formatRelativeTime(user.joinedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {/* Features Section */}
      <section className="relative mx-auto max-w-4xl px-4 pb-16 pt-8 md:px-6 md:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="mb-8 text-center">
            <h2 className="text-xl font-semibold text-white">How It Works</h2>
            <p className="mt-2 text-sm text-neutral-500">
              Simple steps to start earning with referrals
            </p>
          </div>

          <div className="relative">
            <div
              className="absolute -inset-px rounded-[1.25rem] bg-gradient-to-b from-white/[0.06] via-uni-pink/10 to-transparent opacity-45 blur-sm"
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-3xl border border-uni-border bg-uni-surface shadow-uni-card">
              <div className="grid divide-y divide-uni-border md:grid-cols-3 md:divide-x md:divide-y-0">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
                    className="group px-6 py-8 text-center transition duration-200 hover:bg-uni-surface-2"
                  >
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-uni-pink/[0.1] ring-1 ring-uni-pink/20">
                      <feature.icon className="h-6 w-6 text-uni-pink" aria-hidden />
                    </div>
                    <h3 className="text-base font-semibold text-white">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                      {feature.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Tier Progress */}
          {isConnected && stats && tierInfo && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="mt-10 rounded-2xl border border-uni-border bg-uni-surface/50 p-6"
            >
              <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                <div>
                  <div className="flex items-center gap-2">
                    <Trophy className={`h-5 w-5 ${tierInfo.color}`} />
                    <h3 className="text-lg font-semibold text-white">
                      {tierInfo.name} Tier
                    </h3>
                  </div>
                  <p className="mt-1 text-sm text-neutral-500">
                    You earn {rewardPct}% of trading fees from your referrals
                  </p>
                </div>
                {tierInfo.nextTier && (
                  <div className="text-center sm:text-right">
                    <p className="text-sm text-neutral-500">
                      Next tier at {tierInfo.nextTierAt} referrals
                    </p>
                    <div className="mt-2 h-2 w-48 overflow-hidden rounded-full bg-uni-surface-2">
                      <div
                        className="h-full rounded-full bg-uni-pink transition-all"
                        style={{
                          width: `${Math.min(100, (stats.totalReferrals / tierInfo.nextTierAt) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-neutral-600">
                      {stats.totalReferrals} / {tierInfo.nextTierAt}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      </section>
    </div>
  )
}
