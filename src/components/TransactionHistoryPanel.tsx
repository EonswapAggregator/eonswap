import { motion } from 'framer-motion'
import {
  ArrowLeftRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  XCircle,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
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
import { explorerTxUrl, getEonChain } from '../lib/chains'
import { truncateAddress } from '../lib/format'
import { useLiveClock } from '../hooks/useLiveClock'
import {
  useEonSwapStore,
  type ActivityItem,
  type TxStatus,
} from '../store/useEonSwapStore'

function badgeClass(status: TxStatus) {
  switch (status) {
    case 'success':
      return 'bg-emerald-500/12 text-emerald-200 ring-emerald-500/20'
    case 'pending':
      return 'bg-eon-blue/12 text-eon-blue ring-eon-blue/25'
    case 'failed':
      return 'bg-red-500/12 text-red-200 ring-red-500/20'
    default:
      return 'bg-slate-500/15 text-slate-300'
  }
}

function StatusIcon({ status }: { status: TxStatus }) {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
    case 'pending':
      return (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-eon-blue" aria-hidden />
      )
    case 'failed':
      return <XCircle className="h-3.5 w-3.5 text-red-400" aria-hidden />
    default:
      return null
  }
}

function txExplorerHref(item: ActivityItem) {
  if (!item.txHash) return null
  return explorerTxUrl(item.chainId, item.txHash)
}

function sessionMethodLabel(item: ActivityItem): 'Swap' | 'Bridge' {
  if (item.kind === 'bridge') return 'Bridge'
  return 'Swap'
}

type PanelVariant = 'sidebar' | 'page'

type Props = {
  variant?: PanelVariant
  statusFilter?: 'all' | TxStatus
}

export function TransactionHistoryPanel({
  variant = 'sidebar',
  statusFilter = 'all',
}: Props) {
  const history = useEonSwapStore((s) => s.history)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const nowMs = useLiveClock(4000)

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return history
    return history.filter((h) => h.status === statusFilter)
  }, [history, statusFilter])

  const copyHash = useCallback(async (id: string, hash: string) => {
    try {
      await navigator.clipboard.writeText(hash)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId(null), 2000)
    } catch {
      /* ignore */
    }
  }, [])

  const shell =
    variant === 'page'
      ? activityCardShellClass
      : 'h-fit max-h-none rounded-3xl border border-white/[0.1] bg-white/[0.05] shadow-xl backdrop-blur-2xl lg:sticky lg:top-24'

  const showPanelHeader = variant === 'sidebar'

  return (
    <motion.aside
      layout
      id="activity"
      className={`${shell} ${variant === 'page' ? 'p-0' : 'p-4'}`}
    >
      {showPanelHeader && (
        <>
          <h2 className="text-sm font-semibold text-white">Recent activity</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Session history with block explorer links.
          </p>
        </>
      )}

      {variant === 'page' && filtered.length > 0 && (
        <div className={activityTableToolbarClass}>
          <span className={activityToolbarTitleClass}>Session activity</span>
          <span
            className={`${activityToolbarMetaClass} min-w-0 max-w-full truncate`}
            title="Status · Txn hash · Method · Block · Age · From · Network · Details"
          >
            <span className="md:hidden">Swipe table →</span>
            <span className="hidden md:inline">
              Status · Hash · Method · Block · Age · From · Network · Details
            </span>
          </span>
        </div>
      )}

      {variant === 'page' ? (
        <div className={`${activityTableScrollClass} min-w-0`}>
          {history.length === 0 && (
            <div className="px-5 py-16 text-center md:px-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                <ArrowLeftRight
                  className="h-7 w-7 text-slate-600"
                  aria-hidden
                />
              </div>
              <p className="mt-5 text-base font-medium text-white">
                No transactions
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                Confirmed swaps appear in this table with hash, block, and live
                status updates.
              </p>
            </div>
          )}
          {history.length > 0 && filtered.length === 0 && (
            <div className="px-5 py-14 text-center text-sm text-slate-400">
              No rows match this filter.
            </div>
          )}
          {filtered.length > 0 && (
            <table className={activityTableClass}>
              <caption className="sr-only">
                Session activity transactions, newest first
              </caption>
              <thead>
                <tr className={activityTheadRowClass}>
                  <th
                    scope="col"
                    className={`${activityThClass} pl-4 md:pl-5`}
                  >
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
                    className={`min-w-[200px] ${activityThClass} pr-4 md:pr-5`}
                  >
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const url = txExplorerHref(item)
                  const chain = getEonChain(item.chainId)
                  const chainLabel = chain?.name ?? `Chain ${item.chainId}`
                  const fullDate = new Date(item.createdAt).toLocaleString(
                    'en-US',
                    {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    },
                  )

                  const blockCell = (() => {
                    if (item.blockNumber != null) {
                      return (
                        <span className="font-mono tabular-nums text-slate-300">
                          {item.blockNumber.toLocaleString('en-US')}
                        </span>
                      )
                    }
                    if (item.status === 'pending' && item.txHash) {
                      return (
                        <span className="inline-flex items-center gap-1.5 text-eon-blue">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span className="hidden sm:inline">pending</span>
                        </span>
                      )
                    }
                    return <span className="text-slate-600">—</span>
                  })()

                  return (
                    <tr key={item.id} className={activityTrClass}>
                      <td className={`${activityTdClass} pl-4 md:pl-5`}>
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${badgeClass(item.status)}`}
                        >
                          <StatusIcon status={item.status} />
                          {item.status}
                        </span>
                      </td>
                      <td className={`max-w-[200px] ${activityTdClass}`}>
                        {item.txHash ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {url ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-[11px] text-eon-blue hover:underline"
                                title={item.txHash}
                              >
                                {shortTxHash(item.txHash)}
                              </a>
                            ) : (
                              <span className="font-mono text-[11px] text-slate-400">
                                {shortTxHash(item.txHash)}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => copyHash(item.id, item.txHash!)}
                              className="rounded-md p-1 text-slate-500 transition hover:bg-white/10 hover:text-slate-200"
                              title="Copy hash"
                            >
                              {copiedId === item.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                            {url ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-md p-1 text-slate-500 hover:bg-white/10 hover:text-eon-blue"
                                title="Open in explorer"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className={`hidden ${activityTdClass} lg:table-cell`}>
                        <span className={methodPillClass()}>
                          {sessionMethodLabel(item)}
                        </span>
                      </td>
                      <td className={`${activityTdClass} text-right tabular-nums`}>
                        {blockCell}
                      </td>
                      <td className={`${activityTdClass} text-slate-400`}>
                        <time
                          dateTime={new Date(item.createdAt).toISOString()}
                          title={fullDate}
                          className="whitespace-nowrap tabular-nums"
                        >
                          {formatActivityAge(item.createdAt, nowMs)}
                        </time>
                      </td>
                      <td className={`hidden ${activityTdClass} xl:table-cell`}>
                        <span
                          className="font-mono text-[11px] text-slate-500"
                          title={item.from ?? undefined}
                        >
                          {item.from
                            ? truncateAddress(item.from, 6, 4)
                            : '—'}
                        </span>
                      </td>
                      <td className={activityTdClass}>
                        <span className={networkPillClass()}>
                          {chainLabel}
                        </span>
                      </td>
                      <td className={`max-w-[280px] ${activityTdClass} pr-4 md:max-w-[340px] md:pr-5`}>
                        <p
                          className="truncate text-[12px] leading-snug text-slate-300"
                          title={item.summary}
                        >
                          {item.summary}
                        </p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <ul className="mt-4 max-h-[min(60vh,480px)] space-y-3 overflow-y-auto pr-1">
          {history.length === 0 && (
            <li className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-slate-500">
              No activity yet. Execute a swap or bridge to see it here.
            </li>
          )}
          {history.length > 0 && filtered.length === 0 && (
            <li className="rounded-xl border border-white/[0.06] py-8 text-center text-sm text-slate-500">
              No rows match this filter.
            </li>
          )}
          {filtered.map((item) => {
            const url = txExplorerHref(item)
            const fullDate = new Date(item.createdAt).toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
            return (
              <li
                key={item.id}
                className="rounded-xl border border-white/[0.06] bg-black/20 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${badgeClass(item.status)}`}
                  >
                    <StatusIcon status={item.status} />
                    {item.status}
                  </span>
                  <time
                    className="text-[10px] text-slate-500"
                    dateTime={new Date(item.createdAt).toISOString()}
                    title={fullDate}
                  >
                    {formatActivityAge(item.createdAt, nowMs)}
                  </time>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  {item.summary}
                </p>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-eon-blue hover:underline"
                  >
                    Block explorer
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </motion.aside>
  )
}
