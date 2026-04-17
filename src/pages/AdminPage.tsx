import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { fetchRelayActivities } from '../lib/activityRelay'
import { getMonitorRelayBaseUrl } from '../lib/monitorRelayUrl'
import { eonChains } from '../lib/chains'
import { truncateAddress } from '../lib/format'
import {
  type ActivityItem,
  type TxStatus,
  useEonSwapStore,
} from '../store/useEonSwapStore'

const ADMIN_WALLET = '0x114629C43Fa2528E5295b2982765733Acf3aCadA'.toLowerCase()
const RELAY_SECRET_KEY = 'eonswap_relay_admin_secret'

function parseRelayActivities(raw: unknown[]): ActivityItem[] {
  const out: ActivityItem[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const id = String(o.id ?? '')
    const status = o.status
    if (status !== 'pending' && status !== 'success' && status !== 'failed') continue
    const kind = 'swap'
    const createdAt = Number(o.createdAt)
    if (!Number.isFinite(createdAt)) continue
    out.push({
      id,
      kind,
      status,
      createdAt,
      summary: String(o.summary ?? ''),
      chainId: Number(o.chainId) || 0,
      txHash:
        typeof o.txHash === 'string' && /^0x[a-fA-F0-9]{64}$/.test(o.txHash)
          ? (o.txHash as `0x${string}`)
          : undefined,
      from:
        typeof o.from === 'string' && /^0x[a-fA-F0-9]{40}$/.test(o.from)
          ? (o.from as `0x${string}`)
          : undefined,
      blockNumber:
        o.blockNumber != null && Number.isFinite(Number(o.blockNumber))
          ? Number(o.blockNumber)
          : undefined,
    })
  }
  return out
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString()
}

function chainName(chainId: number): string {
  return eonChains.find((c) => c.id === chainId)?.name ?? `Chain ${chainId}`
}

function parseAmountAndToken(summary: string, prefix: 'Swap') {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = summary.match(new RegExp(`^${escaped}\\s+([\\d.,]+)\\s+([A-Za-z0-9._-]+)`))
  if (!match) return null
  const amount = Number.parseFloat(match[1].replace(/,/g, ''))
  const token = match[2]
  if (!Number.isFinite(amount) || amount <= 0) return null
  return { amount, token }
}

function formatTokenFeeMap(entries: Map<string, number>): string {
  if (!entries.size) return '—'
  return [...entries.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([token, amount]) => `${amount.toFixed(6)} ${token}`)
    .join(' • ')
}

type MonthlyRow = {
  month: string
  total: number
  success: number
  failed: number
  swapFee: number
}

export function AdminPage() {
  const [searchParams] = useSearchParams()
  const { address, isConnected } = useAccount()
  const history = useEonSwapStore((s) => s.history)
  const [dataSource, setDataSource] = useState<'local' | 'relay'>('local')
  const [relayRows, setRelayRows] = useState<ActivityItem[]>([])
  const [relayStatus, setRelayStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [relayMessage, setRelayMessage] = useState('')
  const [adminSecretDraft, setAdminSecretDraft] = useState(() =>
    typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem(RELAY_SECRET_KEY) ?? ''
      : '',
  )
  const [statusFilter, setStatusFilter] = useState<'all' | TxStatus>('all')
  const [periodFilter, setPeriodFilter] = useState<'all' | 'custom'>('custom')
  const [periodMonth, setPeriodMonth] = useState<number>(() => new Date().getMonth() + 1)
  const [periodYear, setPeriodYear] = useState<number>(() => new Date().getFullYear())
  const [monthlyYearFilter, setMonthlyYearFilter] = useState<string>('all')
  const [query, setQuery] = useState('')
  const e2eBypassEnabled = import.meta.env.VITE_E2E_ADMIN_BYPASS === '1' || import.meta.env.DEV
  const e2eBypass = e2eBypassEnabled && searchParams.get('e2eAdmin') === '1'
  const authorized =
    e2eBypass ||
    isConnected && typeof address === 'string' && address.toLowerCase() === ADMIN_WALLET

  const reportHistory = dataSource === 'relay' ? relayRows : history

  const saveRelaySecret = () => {
    sessionStorage.setItem(RELAY_SECRET_KEY, adminSecretDraft.trim())
    setRelayMessage('Admin key saved for this browser.')
  }

  const loadFromRelay = async () => {
    const relay = getMonitorRelayBaseUrl()
    if (!relay) {
      setRelayStatus('error')
      setRelayMessage('Set VITE_MONITOR_RELAY_URL in the app environment.')
      return
    }
    const secret =
      sessionStorage.getItem(RELAY_SECRET_KEY)?.trim() || adminSecretDraft.trim()
    if (!secret) {
      setRelayStatus('error')
      setRelayMessage('Enter the relay admin secret.')
      return
    }
    setRelayStatus('loading')
    setRelayMessage('')
    const result = await fetchRelayActivities(relay, secret)
    if (!result.ok) {
      setRelayStatus('error')
      setRelayMessage(result.error)
      return
    }
    const rows = parseRelayActivities(result.activities)
    setRelayRows(rows)
    setDataSource('relay')
    setRelayStatus('idle')
    setRelayMessage(`Loaded ${rows.length} activity rows from relay.`)
  }

  const metrics = useMemo(() => {
    const total = reportHistory.length
    const pending = reportHistory.filter((h) => h.status === 'pending').length
    const success = reportHistory.filter((h) => h.status === 'success').length
    const failed = reportHistory.filter((h) => h.status === 'failed').length
    const successRate = total ? Math.round((success / total) * 100) : 0
    const swapFeeRate = Number(import.meta.env.VITE_SWAP_FEE_BPS ?? '0') / 10_000
    const swapFeeByToken = new Map<string, number>()

    for (const item of reportHistory) {
      if (item.status !== 'success') continue
      const swapParsed = parseAmountAndToken(item.summary, 'Swap')
      if (swapParsed && swapFeeRate > 0) {
        const next = (swapFeeByToken.get(swapParsed.token) ?? 0) + swapParsed.amount * swapFeeRate
        swapFeeByToken.set(swapParsed.token, next)
      }
    }

    const swapFeeTotal = [...swapFeeByToken.values()].reduce((a, b) => a + b, 0)
    return {
      total,
      pending,
      success,
      failed,
      successRate,
      swapFeeRate,
      swapFeeTotal,
      swapFeeByToken,
    }
  }, [reportHistory])

  const monthlyRows = useMemo<MonthlyRow[]>(() => {
    const swapFeeRate = Number(import.meta.env.VITE_SWAP_FEE_BPS ?? '0') / 10_000
    const rows = new Map<string, MonthlyRow>()

    for (const item of reportHistory) {
      const d = new Date(item.createdAt)
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const row = rows.get(month) ?? {
        month,
        total: 0,
        success: 0,
        failed: 0,
        swapFee: 0,
      }
      row.total += 1
      if (item.status === 'success') row.success += 1
      if (item.status === 'failed') row.failed += 1

      if (item.status === 'success') {
        const swapParsed = parseAmountAndToken(item.summary, 'Swap')
        if (swapParsed && swapFeeRate > 0) row.swapFee += swapParsed.amount * swapFeeRate
      }

      rows.set(month, row)
    }

    return [...rows.values()].sort((a, b) => b.month.localeCompare(a.month))
  }, [reportHistory])

  const availableYears = useMemo(() => {
    const years = new Set(
      reportHistory.map((item) => String(new Date(item.createdAt).getFullYear())),
    )
    years.add(String(new Date().getFullYear()))
    return [...years].sort((a, b) => b.localeCompare(a))
  }, [reportHistory])

  const monthOptions = useMemo(
    () => [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    [],
  )

  const yearOptions = useMemo(() => {
    const startYear = 2026
    const current = new Date().getFullYear()
    const out: number[] = []
    for (let y = current; y >= startYear; y--) out.push(y)
    return out
  }, [])

  const monthlyRowsFiltered = useMemo(() => {
    const rows =
      monthlyYearFilter === 'all'
        ? monthlyRows
        : monthlyRows.filter((row) => row.month.startsWith(`${monthlyYearFilter}-`))
    return rows.slice(0, 12)
  }, [monthlyRows, monthlyYearFilter])

  const monthlyTotals = useMemo(() => {
    const totalTx = monthlyRowsFiltered.reduce((acc, row) => acc + row.total, 0)
    const totalSuccess = monthlyRowsFiltered.reduce((acc, row) => acc + row.success, 0)
    const totalFailed = monthlyRowsFiltered.reduce((acc, row) => acc + row.failed, 0)
    const totalSwapFee = monthlyRowsFiltered.reduce((acc, row) => acc + row.swapFee, 0)
    return { totalTx, totalSuccess, totalFailed, totalSwapFee }
  }, [monthlyRowsFiltered])

  const filteredHistory = useMemo(() => {
    const q = query.trim().toLowerCase()
    return reportHistory
      .filter((item) => (statusFilter === 'all' ? true : item.status === statusFilter))
      .filter((item) => {
        if (periodFilter === 'all') return true
        const d = new Date(item.createdAt)
        return d.getMonth() + 1 === periodMonth && d.getFullYear() === periodYear
      })
      .filter((item) => {
        if (!q) return true
        return (
          item.summary.toLowerCase().includes(q) ||
          String(item.chainId).includes(q) ||
          (item.txHash ?? '').toLowerCase().includes(q) ||
          (item.from ?? '').toLowerCase().includes(q)
        )
      })
  }, [reportHistory, periodFilter, periodMonth, periodYear, query, statusFilter])

  const exportCsv = () => {
    const header = ['createdAt', 'kind', 'status', 'chainId', 'summary', 'txHash', 'from', 'blockNumber']
    const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`
    const rows = filteredHistory.map((item) =>
      [
        new Date(item.createdAt).toISOString(),
        item.kind,
        item.status,
        String(item.chainId),
        item.summary,
        item.txHash ?? '',
        item.from ?? '',
        item.blockNumber != null ? String(item.blockNumber) : '',
      ]
        .map(escapeCell)
        .join(','),
    )
    const csv = `${header.join(',')}\n${rows.join('\n')}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eonswap-admin-${dataSource}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!authorized) return <Navigate to="/swap" replace />

  return (
    <section className="border-t border-white/[0.08] py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-6 rounded-2xl border border-white/[0.1] bg-white/[0.02] p-5"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-cyan-200">Admin workspace</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Transaction dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Local view uses this browser&apos;s saved activity. Relay view combines events from all
            users when the monitoring relay logs them (configure an admin access key on the relay,
            then refresh below).
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-4 rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Data source
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-white/[0.1] bg-white/[0.02] p-1">
              <button
                type="button"
                onClick={() => setDataSource('local')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  dataSource === 'local'
                    ? 'bg-white/[0.14] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                This device
              </button>
              <button
                type="button"
                onClick={() => {
                  setDataSource('relay')
                  if (relayRows.length === 0 && relayStatus !== 'loading') {
                    void loadFromRelay()
                  }
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  dataSource === 'relay'
                    ? 'bg-white/[0.14] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Relay (all users)
              </button>
            </div>
            <input
              type="password"
              autoComplete="off"
              placeholder="Relay admin secret"
              value={adminSecretDraft}
              onChange={(e) => setAdminSecretDraft(e.target.value)}
              className="h-9 min-w-[180px] flex-1 rounded-lg border border-white/[0.12] bg-[#0c1027] px-3 text-sm text-slate-100 placeholder:text-slate-500 md:max-w-xs"
            />
            <button
              type="button"
              onClick={saveRelaySecret}
              className="h-9 rounded-lg border border-white/[0.14] bg-white/[0.04] px-3 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08]"
            >
              Save key
            </button>
            <button
              type="button"
              disabled={relayStatus === 'loading'}
              onClick={() => void loadFromRelay()}
              className="h-9 rounded-lg bg-gradient-to-r from-cyan-400 via-cyan-500 to-eon-blue px-3 text-xs font-semibold text-[#05060f] disabled:opacity-50"
            >
              {relayStatus === 'loading' ? 'Loading…' : 'Refresh from relay'}
            </button>
          </div>
          {relayMessage ? (
            <p
              className={`mt-2 text-xs ${relayStatus === 'error' ? 'text-amber-200/90' : 'text-slate-400'}`}
            >
              {relayMessage}
            </p>
          ) : null}
        </motion.div>

        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.02] p-3 md:flex-nowrap">
          <div className="inline-flex rounded-lg border border-white/[0.1] bg-white/[0.02] p-1">
            {(['all', 'pending', 'success', 'failed'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] transition ${
                  statusFilter === s
                    ? 'bg-white/[0.14] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPeriodFilter((p) => (p === 'all' ? 'custom' : 'all'))}
            className={`h-9 rounded-lg border px-3 text-xs font-semibold uppercase tracking-[0.08em] transition ${
              periodFilter === 'all'
                ? 'border-cyan-400/35 bg-cyan-400/12 text-cyan-200'
                : 'border-white/[0.12] bg-white/[0.03] text-slate-300'
            }`}
          >
            All time
          </button>
          <select
            value={periodMonth}
            onChange={(e) => {
              setPeriodFilter('custom')
              setPeriodMonth(Number(e.target.value))
            }}
            className="h-9 rounded-lg border border-white/[0.12] bg-white/[0.03] px-2 text-xs text-slate-200 outline-none"
          >
            {monthOptions.map((m, idx) => (
              <option key={m} value={idx + 1} className="bg-[#0c1027] text-slate-100">
                {m}
              </option>
            ))}
          </select>
          <select
            value={periodYear}
            onChange={(e) => {
              setPeriodFilter('custom')
              setPeriodYear(Number(e.target.value))
            }}
            className="h-9 rounded-lg border border-white/[0.12] bg-white/[0.03] px-2 text-xs text-slate-200 outline-none"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y} className="bg-[#0c1027] text-slate-100">
                {y}
              </option>
            ))}
          </select>
          <p className="shrink-0 text-xs text-slate-400">Rows: {filteredHistory.length}</p>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search hash, wallet, summary, chain..."
            className="h-9 min-w-[220px] flex-1 rounded-lg border border-white/[0.1] bg-white/[0.02] px-3 text-sm text-slate-200 outline-none"
          />
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.03] px-3 text-xs font-semibold text-slate-200 transition hover:border-white/[0.2] hover:bg-white/[0.06]"
          >
            Export CSV
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {[
            { label: 'Total tx', value: String(metrics.total) },
            { label: 'Pending', value: String(metrics.pending) },
            { label: 'Success', value: String(metrics.success) },
            { label: 'Failed', value: String(metrics.failed) },
            { label: 'Success rate', value: `${metrics.successRate}%` },
            {
              label: 'Swap fee (est.)',
              value: metrics.swapFeeTotal.toFixed(6),
              note: `${(metrics.swapFeeRate * 100).toFixed(2)}%`,
              sub: formatTokenFeeMap(metrics.swapFeeByToken),
            },
            {
              label: 'Data source',
              value: dataSource === 'relay' ? 'Relay' : 'Local',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3"
            >
              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
              <p className="mt-1 text-xl font-semibold text-white">{item.value}</p>
              {'note' in item && item.note ? (
                <p className="mt-1 text-[11px] text-cyan-200/90">Rate: {item.note}</p>
              ) : null}
              {'sub' in item && item.sub ? (
                <p className="mt-1 line-clamp-2 text-[10px] text-slate-400">{item.sub}</p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.02]">
          <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.03] px-4 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Transaction report
            </p>
            <p className="text-[11px] text-slate-500">
              Scope:{' '}
              {periodFilter === 'all' ? 'All time' : `${monthOptions[periodMonth - 1]} ${periodYear}`}
            </p>
          </div>
          <div className="grid grid-cols-12 border-b border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            <p className="col-span-3">Time</p>
            <p className="col-span-2">Status</p>
            <p className="col-span-2">Chain</p>
            <p className="col-span-3">Summary</p>
            <p className="col-span-2">Wallet</p>
          </div>
          {filteredHistory.length ? (
            filteredHistory.slice(0, 50).map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-12 border-b border-white/[0.06] px-4 py-2 text-xs text-slate-300 last:border-b-0"
              >
                <p className="col-span-3 truncate">{fmtTime(item.createdAt)}</p>
                <p
                  className={`col-span-2 font-semibold ${
                    item.status === 'success'
                      ? 'text-emerald-300'
                      : item.status === 'failed'
                        ? 'text-rose-300'
                        : 'text-amber-300'
                  }`}
                >
                  {item.status}
                </p>
                <p className="col-span-2 truncate">{chainName(item.chainId)}</p>
                <p className="col-span-3 truncate">{item.summary}</p>
                <p className="col-span-2 truncate">{item.from ? truncateAddress(item.from, 6, 4) : '—'}</p>
              </div>
            ))
          ) : (
            <p className="px-4 py-5 text-sm text-slate-400">No matching activity data.</p>
          )}
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.02]">
          <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.03] px-4 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Monthly report (last 12 months)
              </p>
              <p className="truncate text-[11px] text-slate-500">
                Tx {monthlyTotals.totalTx} • Success {monthlyTotals.totalSuccess} • Failed {monthlyTotals.totalFailed}{' '}
                • Swap fee {monthlyTotals.totalSwapFee.toFixed(6)}
              </p>
            </div>
            <div className="inline-flex shrink-0 items-center gap-2">
              <span className="text-[11px] text-slate-500">Year</span>
              <select
                value={monthlyYearFilter}
                onChange={(e) => setMonthlyYearFilter(e.target.value)}
                className="h-8 rounded-lg border border-white/[0.12] bg-white/[0.03] px-2 text-xs text-slate-200 outline-none"
              >
                <option value="all" className="bg-[#0c1027] text-slate-100">All</option>
                {availableYears.map((y) => (
                  <option key={y} value={y} className="bg-[#0c1027] text-slate-100">
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-12 border-b border-white/[0.08] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            <p className="col-span-2">Month</p>
            <p className="col-span-2">Total</p>
            <p className="col-span-2">Success</p>
            <p className="col-span-2">Failed</p>
            <p className="col-span-4">Swap fee est.</p>
          </div>
          {monthlyRowsFiltered.length ? (
            monthlyRowsFiltered.map((row) => (
              <div
                key={row.month}
                className="grid grid-cols-12 border-b border-white/[0.06] px-4 py-2 text-xs text-slate-300 last:border-b-0"
              >
                <p className="col-span-2">{row.month}</p>
                <p className="col-span-2">{row.total}</p>
                <p className="col-span-2 text-emerald-300">{row.success}</p>
                <p className="col-span-2 text-rose-300">{row.failed}</p>
                <p className="col-span-4">{row.swapFee.toFixed(6)}</p>
              </div>
            ))
          ) : (
            <p className="px-4 py-5 text-sm text-slate-400">No monthly data yet.</p>
          )}
        </div>
      </div>
    </section>
  )
}
