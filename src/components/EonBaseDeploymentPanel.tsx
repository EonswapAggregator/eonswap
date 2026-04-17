import { ExternalLink } from 'lucide-react'
import { EON_BASE_MAINNET } from '../lib/eonBaseMainnet'

const BASESCAN = 'https://basescan.org/address/'

function AddrLink({ path, label }: { path: string; label: string }) {
  const href = `${BASESCAN}${path}`
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-left text-xs text-slate-200 transition hover:border-emerald-500/25 hover:bg-emerald-500/[0.04]"
    >
      <span className="font-medium text-white">{label}</span>
      <span className="font-mono text-[10px] text-slate-500 group-hover:text-slate-400">
        {path.slice(0, 6)}…{path.slice(-4)}
      </span>
      <ExternalLink className="h-3 w-3 shrink-0 text-slate-500 group-hover:text-emerald-300" aria-hidden />
    </a>
  )
}

/** On-chain addresses for Eon on Base (8453); mirrors `eon-protocol/deployments/base-mainnet.json`. */
export function EonBaseDeploymentPanel() {
  const d = EON_BASE_MAINNET
  return (
    <div className="mt-10 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 md:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Base mainnet</p>
      <h2 className="mt-1 text-sm font-semibold text-white">Eon contracts (explorers)</h2>
      <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
        Same addresses as the protocol deployment record. Swap on Base uses Eon AMM when{' '}
        <code className="rounded bg-black/30 px-1 py-0.5 text-[10px] text-emerald-200/90">
          VITE_EON_AMM_USE_ON_BASE
        </code>{' '}
        and your routing API are enabled.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <AddrLink path={d.token.address} label="ESTF" />
        <AddrLink path={d.extraRewardToken.address} label="ESR" />
        <AddrLink path={d.amm.router} label="AMM router" />
        <AddrLink path={d.amm.factory} label="AMM factory" />
        <AddrLink path={d.amm.pairEstfWeth} label="Pair ESTF/WETH" />
        <AddrLink path={d.amm.pairEsrWeth} label="Pair ESR/WETH" />
        <AddrLink path={d.farm.masterChef} label="MasterChef" />
        <AddrLink path={d.farm.rewarder} label="Rewarder" />
        <AddrLink path={d.ops.feeTreasury} label="Fee treasury" />
      </div>
    </div>
  )
}
