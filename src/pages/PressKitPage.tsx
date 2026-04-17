import { motion } from 'framer-motion'
import { BadgeCheck, Check, CircleDot, ImageIcon, Mail, Megaphone, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { roleEmail } from '../lib/site'
import { FaDiscord, FaGithub, FaMedium, FaTelegram, FaXTwitter } from 'react-icons/fa6'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: 'easeOut' as const },
  }),
}

export function PressKitPage() {
  const pressEmail = roleEmail('press')

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

  return (
    <section className="relative min-h-screen overflow-hidden border-t border-uni-border">
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

      <div className="relative mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        {/* Hero Section */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          className="mb-12 text-center"
        >
          <motion.div custom={0} variants={fadeUp} className="mb-6 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-uni-pink/30 bg-uni-pink/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-uni-pink">
              <Megaphone className="h-3.5 w-3.5" aria-hidden />
              Media resources
            </span>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl"
          >
            Press <span className="text-uni-pink">kit</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-4 max-w-2xl text-neutral-400 md:text-lg"
          >
            Brand references and media coordination guidance for ecosystem partners,
            researchers, and publication teams.
          </motion.p>

          <motion.div custom={3} variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`mailto:${pressEmail}`}
              className="inline-flex items-center gap-2 rounded-xl border border-uni-border bg-uni-surface-2 px-5 py-2.5 text-sm font-medium text-white transition hover:border-uni-pink/30 hover:bg-uni-surface-3"
            >
              <Mail className="h-4 w-4 text-uni-pink" aria-hidden />
              Press contact
            </a>
          </motion.div>
        </motion.div>

        {/* Info Cards */}
        <div className="grid gap-5 lg:grid-cols-3">
          {[
            {
              icon: BadgeCheck,
              title: 'Brand usage',
              text: 'Use EonSwap name and logo without distortion, recoloring, or unapproved derivative marks. Keep clear visual spacing.',
            },
            {
              icon: Megaphone,
              title: 'Media inquiries',
              text: 'For interviews, announcements, and partnerships, send publication context and expected timeline.',
            },
            {
              icon: ImageIcon,
              title: 'Asset package',
              text: 'Logo marks, screenshots, and short product descriptors are available on request while public package is being finalized.',
            },
          ].map((card, i) => (
            <motion.article
              key={card.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
              className="group relative flex flex-col items-center overflow-hidden rounded-3xl border border-uni-border bg-uni-surface p-6 text-center transition duration-300 hover:border-uni-pink/30"
            >
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-uni-pink/[0.03] via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100"
                aria-hidden
              />
              <div className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-uni-pink/10 text-uni-pink ring-1 ring-uni-pink/20">
                  <card.icon className="h-6 w-6" aria-hidden />
                </div>
                <h2 className="text-lg font-semibold text-white">{card.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">{card.text}</p>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Request Checklist Section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mt-8"
        >
          <div className="relative overflow-hidden rounded-3xl border border-uni-border bg-uni-surface p-6 md:p-8">
            <div
              className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-uni-pink/[0.06] blur-3xl"
              aria-hidden
            />
            <div className="relative">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5">
                <CircleDot className="h-3 w-3 text-amber-400" aria-hidden />
                <span className="text-xs font-medium text-amber-400">Asset pack: by request</span>
              </div>
              <h3 className="text-lg font-semibold text-white">Press request checklist</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  'Publication / organization name',
                  'Request type (interview, statement, asset)',
                  'Deadline and timezone',
                  'Distribution channel and audience',
                ].map((item, idx) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-xl border border-uni-border bg-uni-surface-2 px-4 py-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-uni-pink/10 text-xs font-bold text-uni-pink">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-neutral-400">{item}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-neutral-500">
                Typical media response time is 2-3 business days.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Brand Guidelines Section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-8"
        >
          <div className="relative overflow-hidden rounded-3xl border border-uni-border bg-uni-surface p-6 md:p-8">
            <div
              className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-emerald-500/[0.04] blur-3xl"
              aria-hidden
            />
            <div className="relative">
              <h3 className="text-lg font-semibold text-white">Brand guidelines</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {[
                  {
                    title: 'Do',
                    text: 'Use official logo files and keep clear spacing around marks.',
                    color: 'emerald',
                    Icon: Check,
                  },
                  {
                    title: "Don't",
                    text: 'Recolor, stretch, or modify logo geometry without approval.',
                    color: 'red',
                    Icon: X,
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-4 ${
                      item.color === 'emerald'
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : 'border-red-500/20 bg-red-500/5'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        item.color === 'emerald'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      <item.Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          item.color === 'emerald' ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm text-neutral-400">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Social Links Section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="mt-8"
        >
          <div className="relative overflow-hidden rounded-3xl border border-uni-border bg-uni-surface p-6 md:p-8">
            <div className="relative">
              <h3 className="text-lg font-semibold text-white">Official channels</h3>
              <div className="mt-4 flex flex-wrap gap-3">
                {[
                  { label: '@eonswapus', href: 'https://x.com/eonswapus', Icon: FaXTwitter },
                  { label: 'Telegram', href: 'https://t.me/eonswap', Icon: FaTelegram },
                  { label: 'Medium', href: 'https://medium.com/@eonswap', Icon: FaMedium },
                  { label: 'Discord', href: 'https://discord.gg/AAEq22Sqng', Icon: FaDiscord },
                  { label: 'GitHub', href: 'https://github.com/EonswapAggregator/eonswap', Icon: FaGithub },
                ].map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-uni-border bg-uni-surface-2 px-4 py-2.5 text-sm font-medium text-white transition hover:border-uni-pink/30 hover:bg-uni-surface-3"
                  >
                    <link.Icon className="h-4 w-4 text-uni-pink" aria-hidden />
                    {link.label}
                  </a>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-uni-border pt-6">
                <p className="text-sm text-neutral-400">
                  Media requests:{' '}
                  <a
                    href={`mailto:${pressEmail}`}
                    className="font-medium text-uni-pink transition hover:text-uni-pink-light"
                  >
                    {pressEmail}
                  </a>
                </p>
                <Link
                  to="/contact-support"
                  className="inline-flex items-center gap-2 rounded-xl border border-uni-border bg-uni-surface-2 px-4 py-2 text-sm font-medium text-white transition hover:border-uni-pink/30 hover:bg-uni-surface-3"
                >
                  Company contact
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
