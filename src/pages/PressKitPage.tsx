import { motion } from 'framer-motion'
import { BadgeCheck, ImageIcon, Megaphone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { roleEmail } from '../lib/site'

export function PressKitPage() {
  const pressEmail = roleEmail('press')

  return (
    <section className="scroll-mt-24 border-t border-white/[0.08] py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-gradient-to-r from-white/[0.03] via-white/[0.015] to-transparent p-4 sm:flex-row sm:items-center sm:justify-between md:mb-7 md:p-5"
        >
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
                Media resources
              </span>
            </div>
            <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Company
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Press kit
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-[15px]">
              Brand references and media coordination guidance for ecosystem partners,
              researchers, and publication teams.
            </p>
          </div>
          <a
            href={`mailto:${pressEmail}`}
            className="inline-flex h-10 w-fit shrink-0 items-center justify-center rounded-xl border border-white/[0.14] bg-white/[0.04] px-4 text-sm font-medium text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-white/[0.2] hover:bg-white/[0.07] hover:text-white"
          >
            Press contact
          </a>
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-3">
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4"
            >
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.03]">
                <card.icon className="h-4 w-4 text-eon-blue" aria-hidden />
              </div>
              <h2 className="mt-3 text-base font-semibold text-white">{card.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{card.text}</p>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="mt-4 rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4"
        >
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-300">
            Press request checklist
          </h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              'Publication / organization name',
              'Request type (interview, statement, asset)',
              'Deadline and timezone',
              'Distribution channel and audience',
            ].map((item) => (
              <div
                key={item}
                className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs text-slate-400"
              >
                {item}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Official updates:{' '}
            <a
              href="https://x.com/eonswapus"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-slate-300 underline decoration-white/20 underline-offset-2 transition hover:text-white hover:decoration-white/40"
            >
              @eonswapus on X
            </a>
            {' · '}
            <a
              href="https://t.me/eonswap"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-slate-300 underline decoration-white/20 underline-offset-2 transition hover:text-white hover:decoration-white/40"
            >
              Telegram
            </a>
            . Contact <span className="font-medium text-slate-300">{pressEmail}</span> for media
            requests.
          </p>
          <Link
            to="/contact"
            className="mt-3 inline-flex h-9 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.03] px-3 text-xs font-semibold text-slate-200 transition hover:border-white/[0.2] hover:bg-white/[0.06]"
          >
            Company contact
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
