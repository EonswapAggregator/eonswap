import { motion } from 'framer-motion'
import { FileText } from 'lucide-react'
import { Link } from 'react-router-dom'

type LegalSection = {
  title: string
  paragraphs: string[]
}

type LegalPageTemplateProps = {
  eyebrow: string
  title: string
  intro: string
  updatedAt: string
  sections: LegalSection[]
}

export function LegalPageTemplate({
  eyebrow,
  title,
  intro,
  updatedAt,
  sections,
}: LegalPageTemplateProps) {
  return (
    <section className="min-w-0 border-t border-white/[0.08] py-14 md:py-20">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-gradient-to-br from-[#12142e]/95 via-[#0c0e22]/95 to-[#080914] p-6 shadow-[0_24px_64px_-28px_rgba(0,0,0,0.75)] sm:p-8"
        >
          <div
            className="pointer-events-none absolute -right-24 -top-20 h-60 w-60 rounded-full bg-cyan-500/[0.1] blur-3xl"
            aria-hidden
          />
          <div
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-eon-blue/30 to-transparent"
            aria-hidden
          />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1">
              <FileText className="h-3.5 w-3.5 text-eon-blue" aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {eyebrow}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-400 md:text-base">
              {intro}
            </p>
            <p className="mt-4 text-xs text-slate-500">Last updated: {updatedAt}</p>
          </div>
        </motion.div>

        <div className="mt-8 space-y-4">
          {sections.map((section) => (
            <motion.article
              key={section.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6"
            >
              <h2 className="text-base font-semibold text-slate-100">
                {section.title}
              </h2>
              <div className="mt-2 space-y-2">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-relaxed text-slate-400">
                    {paragraph}
                  </p>
                ))}
              </div>
            </motion.article>
          ))}
        </div>

        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-sm text-slate-300 transition hover:border-eon-blue/35 hover:text-white"
          >
            Back to home
          </Link>
        </div>
      </div>
    </section>
  )
}
