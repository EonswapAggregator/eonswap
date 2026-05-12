import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAccount } from 'wagmi'
import { base } from 'wagmi/chains'
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Wallet,
} from 'lucide-react'
import { eonChains, explorerTxUrl, getEonChain } from '../lib/chains'
import {
  activityCardShellClass,
  activityTableClass,
  activityTableScrollClass,
  activityTdClass,
  activityThClass,
  activityTheadRowClass,
  activityToolbarMetaClass,
  activityToolbarTitleClass,
  activityTableToolbarClass,
  activityTrClass,
  formatActivityAge,
  methodPillClass,
  networkPillClass,
  shortTxHash,
} from '../lib/activityTxTable'
import { truncateAddress } from '../lib/format'
import {
  formatTxValueEth,
  txSuccess,
  type ExplorerNormalTx,
} from '../lib/explorerTxHistory'
import { nativeChainDisplayLogoUrl } from '../lib/tokenLogos'
import {
  hasEtherscanApiKey,
  useWalletTxHistory,
} from '../hooks/useWalletTxHistory'
import { useLiveClock } from '../hooks/useLiveClock'

function rowKey(tx: ExplorerNormalTx, i: number) {
  return `${tx.hash}-${tx.blockNumber}-${i}`
}

function walletMethodLabel(tx: ExplorerNormalTx): string {
  try {
    if (BigInt(tx.value || '0') > 0n) return 'Transfer'
  } catch {
    /* ignore */
  }
  return 'Contract'
}

export function WalletOnChainTable() {
  const { address, isConnected } = useAccount()
  const [viewChain, setViewChain] = useState<number>(base.id)
  const [copiedHash, setCopiedHash] = useState<string | null>(null)
  const [chainOpen, setChainOpen] = useState(false)
  const chainRootRef = useRef<HTMLDivElement | null>(null)
  const nowMs = useLiveClock(4000)

  const { data, isLoading, isError, error, refetch, isFetching } =
    useWalletTxHistory(viewChain)

  const rows = useMemo(() => data ?? [], [data])

  const chainLabel = getEonChain(viewChain)?.name ?? `Chain ${viewChain}`
  const chainLogo = nativeChainDisplayLogoUrl(viewChain)

  useEffect(() => {
    if (!chainOpen) return
    const onDocClick = (ev: MouseEvent) => {
      if (!chainRootRef.current) return
      if (chainRootRef.current.contains(ev.target as Node)) return
      setChainOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [chainOpen])

  const copyHash = useCallback(async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash)
      setCopiedHash(hash)
      window.setTimeout(() => setCopiedHash(null), 2000)
    } catch {
      /* ignore */
    }
  }, [])

  if (!hasEtherscanApiKey()) {
    return (
      <div className="rounded-3xl border border-amber-500/20 bg-amber-500/[0.06] px-5 py-6 text-sm text-amber-100/90 md:px-6">
        <p className="font-medium text-amber-200">
          Wallet history is not enabled on this deployment
        </p>
        <p className="mt-2 leading-relaxed text-amber-100/80">
          Full address activity needs a block-explorer API key configured by
          whoever hosts this app. In this client-side mode, the key is used by
          the app runtime and should be treated as public. For strict secret
          handling, route explorer requests through your own backend relay.
          Self-hosters can obtain a free multichain key from{' '}
          <a
            href="https://etherscan.io/apis"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-eon-blue underline-offset-2 hover:underline"
          >
            etherscan.io/apis
          </a>
          .
        </p>
      </div>
    )
  }

  if (!isConnected || !address) {
    return (
      <div className="flex items-center gap-3 rounded-3xl border border-white/[0.1] bg-[#070818]/80 px-5 py-8 text-slate-500 md:px-6">
        <Wallet className="h-8 w-8 shrink-0 opacity-50" aria-hidden />
        <p className="text-sm leading-relaxed">
          Connect your wallet to load normal transactions for your address from
          the block explorer.
        </p>
      </div>
    )
  }

  return (
    <div className={activityCardShellClass}>
      <div className={activityTableToolbarClass}>
        <div className="min-w-0 flex-1">
          <p className={activityToolbarTitleClass}>On-chain history</p>
          <p
            className={`mt-0.5 truncate ${activityToolbarMetaClass}`}
            title={address}
          >
            {truncateAddress(address, 8, 6)} · explorer API
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div ref={chainRootRef} className="relative">
            <button
              type="button"
              aria-label="Network"
              onClick={() => setChainOpen((s) => !s)}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/[0.12] bg-[#0a0b1c] px-3 text-xs font-medium text-slate-200 outline-none ring-cyan-500/30 transition hover:border-white/[0.2] focus:ring-2"
            >
              <img
                src={chainLogo ?? undefined}
                alt={chainLabel}
                className="h-3.5 w-3.5 rounded-full object-cover ring-1 ring-white/15"
                loading="lazy"
              />
              <span>{chainLabel}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" aria-hidden />
            </button>
            {chainOpen ? (
              <div className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[12rem] overflow-hidden rounded-lg border border-white/[0.14] bg-[#0c1027] p-1 shadow-[0_20px_48px_-28px_rgba(0,0,0,0.9)]">
                {eonChains.map((c) => {
                  const logo = nativeChainDisplayLogoUrl(c.id)
                  const active = c.id === viewChain
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setViewChain(c.id)
                        setChainOpen(false)
                      }}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
                        active ? 'bg-cyan-400/15 text-cyan-100' : 'text-slate-200 hover:bg-white/[0.06]'
                      }`}
                    >
                      <img
                        src={logo ?? undefined}
                        alt={c.name}
                        className="h-3.5 w-3.5 rounded-full object-cover ring-1 ring-white/15"
                        loading="lazy"
                      />
                      <span className="truncate">{c.name}</span>
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.12] bg-white/[0.05] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.08] disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {isError && (
        <div className="border-b border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-200/95 md:px-5">
          {error instanceof Error ? error.message : 'Failed to load history'}
        </div>
      )}

      <div className={`${activityTableScrollClass} min-w-0`}>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
            Loading explorer data…
          </div>
        ) : (
          <table className={activityTableClass}>
            <caption className="sr-only">
              Normal transactions for connected wallet on selected network
            </caption>
            <thead>
              <tr className={activityTheadRowClass}>
                <th scope="col" className={`${activityThClass} pl-4 md:pl-5`}>
                  Status
                </th>
                <th scope="col" className={activityThClass}>
                  Txn hash
                </th>
                <th
                  scope="col"
                  className={`hidden ${activityThClass} lg:table-cell`}
                >
                  Method
                </th>
                <th
                  scope="col"
                  className={`${activityThClass} text-right`}
                >
                  Block
                </th>
                <th scope="col" className={activityThClass}>
                  Age
                </th>
                <th
                  scope="col"
                  className={`hidden ${activityThClass} xl:table-cell`}
                >
                  From
                </th>
                <th scope="col" className={activityThClass}>
                  Network
                </th>
                <th
                  scope="col"
                  className={`${activityThClass} pr-4 text-right md:pr-5`}
                >
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    No normal transactions returned for this address on{' '}
                    {chainLabel}.
                  </td>
                </tr>
              )}
              {rows.map((tx, i) => {
                const ok = txSuccess(tx)
                const url = explorerTxUrl(viewChain, tx.hash)
                const ts = Number.parseInt(tx.timeStamp, 10)
                const eventMs = Number.isFinite(ts) ? ts * 1000 : 0
                const fromAddr =
                  tx.from.startsWith('0x') && tx.from.length > 2
                    ? truncateAddress(tx.from as `0x${string}`, 6, 4)
                    : '—'

                return (
                  <tr key={rowKey(tx, i)} className={activityTrClass}>
                    <td className={`${activityTdClass} pl-4 md:pl-5`}>
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${
                          ok
                            ? 'bg-emerald-500/12 text-emerald-200 ring-emerald-500/20'
                            : 'bg-red-500/12 text-red-200 ring-red-500/20'
                        }`}
                      >
                        {ok ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td className={`max-w-[200px] ${activityTdClass}`}>
                      {url ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[11px] text-eon-blue hover:underline"
                            title={tx.hash}
                          >
                            {shortTxHash(tx.hash)}
                          </a>
                          <button
                            type="button"
                            onClick={() => void copyHash(tx.hash)}
                            className="rounded-md p-1 text-slate-500 transition hover:bg-white/10 hover:text-slate-200"
                            title="Copy hash"
                          >
                            {copiedHash === tx.hash ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md p-1 text-slate-500 hover:bg-white/10 hover:text-eon-blue"
                            title="Open in explorer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      ) : (
                        <span className="font-mono text-[11px] text-slate-500">
                          {shortTxHash(tx.hash)}
                        </span>
                      )}
                    </td>
                    <td className={`hidden ${activityTdClass} lg:table-cell`}>
                      <span className={methodPillClass()}>
                        {walletMethodLabel(tx)}
                      </span>
                    </td>
                    <td
                      className={`${activityTdClass} text-right font-mono tabular-nums text-slate-300`}
                    >
                      {Number.parseInt(tx.blockNumber, 10).toLocaleString(
                        'en-US',
                      )}
                    </td>
                    <td className={`${activityTdClass} text-slate-400`}>
                      {Number.isFinite(ts) && eventMs > 0 ? (
                        <time
                          dateTime={new Date(eventMs).toISOString()}
                          className="whitespace-nowrap tabular-nums"
                        >
                          {formatActivityAge(eventMs, nowMs)}
                        </time>
                      ) : (
                        <span className="tabular-nums">—</span>
                      )}
                    </td>
                    <td
                      className={`hidden ${activityTdClass} xl:table-cell`}
                    >
                      <span
                        className="font-mono text-[11px] text-slate-500"
                        title={tx.from}
                      >
                        {fromAddr}
                      </span>
                    </td>
                    <td className={activityTdClass}>
                      <span className={`${networkPillClass()} inline-flex items-center gap-1.5`}>
                        <img
                          src={nativeChainDisplayLogoUrl(viewChain) ?? undefined}
                          alt={chainLabel}
                          className="h-3.5 w-3.5 rounded-full object-cover ring-1 ring-white/15"
                          loading="lazy"
                        />
                        {chainLabel}
                      </span>
                    </td>
                    <td
                      className={`${activityTdClass} pr-4 text-right font-mono tabular-nums text-slate-300 md:pr-5`}
                    >
                      {formatTxValueEth(tx.value)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
