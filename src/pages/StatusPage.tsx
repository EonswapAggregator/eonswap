import { motion } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  Loader2,
  Search,
  Server,
  TriangleAlert,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createPublicClient, http } from 'viem'
import { eonChains, explorerTxUrl, getEonChain } from '../lib/chains'
import { fetchLifiBridgeStatus, type LifiStatus } from '../lib/bridgeLifi'
import { fetchEvmTxStatus, type EvmTxStatus } from '../lib/txStatus'
import { truncateAddress } from '../lib/format'
import { trustWalletTokenLogoUrl } from '../lib/tokenLogos'
import { NATIVE_AGGREGATOR } from '../lib/tokens'
import { toUserFacingErrorMessage } from '../lib/errors'
import { getMonitorRelayBaseUrl } from '../lib/monitorRelayUrl'

type Mode = 'bridge' | 'swap'

type SelectorOption = {
  value: string
  label: string
  logo: string | null
}

type HealthStatus = 'checking' | 'ok' | 'degraded'
type ApiHealth = {
  id: 'kyber' | 'lifi' | 'coingecko' | 'etherscan'
  label: string
  status: HealthStatus
  detail: string
  latencyMs?: number
}
type ApiSla = Record<ApiHealth['id'], { h1: number; h24: number }>
type HealthSample = { at: number; ok: boolean }
type FeeDashboard = {
  checkedAt: number
  totals: {
    txCount: number
    quoteFeeUsd: number
    realizedFeeUsd: number
    deltaUsd: number
    realizedCoveragePct: number
  }
  perChain: Array<{ chainId: number; txCount: number; quoteFeeUsd: number; realizedFeeUsd: number }>
  perDay: Array<{ day: string; txCount: number; quoteFeeUsd: number; realizedFeeUsd: number }>
}

const HEALTH_REFRESH_MS = 300_000
const HEALTH_RETRY_DELAYS_MS = [400, 900, 1800]
const HEALTH_ALERT_COOLDOWN_MS = 120_000
const parseLatencyThreshold = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}
const HEALTH_LATENCY_WARN_MS: Record<ApiHealth['id'], number> = {
  kyber: parseLatencyThreshold(import.meta.env.VITE_HEALTH_WARN_KYBER_MS, 2500),
  lifi: parseLatencyThreshold(import.meta.env.VITE_HEALTH_WARN_LIFI_MS, 3500),
  coingecko: parseLatencyThreshold(import.meta.env.VITE_HEALTH_WARN_COINGECKO_MS, 2500),
  etherscan: parseLatencyThreshold(import.meta.env.VITE_HEALTH_WARN_ETHERSCAN_MS, 3000),
}
const HEALTH_RELAY_ONLY = String(import.meta.env.VITE_STATUS_HEALTH_RELAY_ONLY ?? '1') === '1'

function LogoBadge({ src, alt }: { src: string | null; alt: string }) {
  return src ? (
    <img
      src={src}
      alt={alt}
      className="h-4 w-4 rounded-full object-cover ring-1 ring-white/15"
      loading="lazy"
    />
  ) : (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-[9px] text-slate-300 ring-1 ring-white/15">
      {alt.slice(0, 1)}
    </span>
  )
}

function ChainSelector({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string
  options: SelectorOption[]
  onChange: (next: string) => void
  ariaLabel: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const selected = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    const onClick = (ev: MouseEvent) => {
      if (!rootRef.current?.contains(ev.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (!selected) return null

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setOpen((s) => !s)}
        className="flex h-10 w-full items-center rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 text-sm text-slate-200"
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <LogoBadge src={selected.logo} alt={selected.label} />
          <span className="truncate">{selected.label}</span>
        </span>
        <ChevronDown
          className={`ml-auto h-3.5 w-3.5 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-56 overflow-y-auto rounded-lg border border-white/[0.14] bg-[#0c1027] p-1.5 shadow-[0_20px_48px_-28px_rgba(0,0,0,0.9)]">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
                value === opt.value
                  ? 'bg-cyan-400/15 text-cyan-100'
                  : 'text-slate-200 hover:bg-white/[0.06]'
              }`}
            >
              <LogoBadge src={opt.logo} alt={opt.label} />
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function statusTone(status?: string): string {
  if (!status) return 'text-slate-400'
  if (status === 'DONE' || status === 'SUCCESS') return 'text-emerald-300'
  if (status === 'FAILED' || status === 'NOT_FOUND') return 'text-rose-300'
  return 'text-amber-300'
}

function healthStatusMeta(status: HealthStatus) {
  if (status === 'ok') {
    return {
      label: 'ok',
      className: 'bg-emerald-400/12 text-emerald-300',
      Icon: CheckCircle2,
    }
  }
  if (status === 'checking') {
    return {
      label: 'checking',
      className: 'bg-amber-400/12 text-amber-300',
      Icon: Loader2,
    }
  }
  return {
    label: 'degraded',
    className: 'bg-rose-400/12 text-rose-300',
    Icon: TriangleAlert,
  }
}

export function StatusPage() {
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<Mode>('bridge')
  const [fromChainId, setFromChainId] = useState<number>(1)
  const [toChainId, setToChainId] = useState<number>(42161)
  const [txHash, setTxHash] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bridgeStatus, setBridgeStatus] = useState<LifiStatus | null>(null)
  const [swapStatus, setSwapStatus] = useState<EvmTxStatus | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [prefilled, setPrefilled] = useState(false)
  const [healthLoading, setHealthLoading] = useState(false)
  const [healthAutoRefresh, setHealthAutoRefresh] = useState(true)
  const [healthCheckedAt, setHealthCheckedAt] = useState<number | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [apiSla, setApiSla] = useState<ApiSla>({
    kyber: { h1: 100, h24: 100 },
    lifi: { h1: 100, h24: 100 },
    coingecko: { h1: 100, h24: 100 },
    etherscan: { h1: 100, h24: 100 },
  })
  const [apiHealth, setApiHealth] = useState<ApiHealth[]>([
    { id: 'kyber', label: 'Kyber', status: 'checking', detail: 'Waiting check...' },
    { id: 'lifi', label: 'LI.FI', status: 'checking', detail: 'Waiting check...' },
    { id: 'coingecko', label: 'CoinGecko', status: 'checking', detail: 'Waiting check...' },
    { id: 'etherscan', label: 'Etherscan', status: 'checking', detail: 'Waiting check...' },
  ])
  const healthSamplesRef = useRef<Record<ApiHealth['id'], HealthSample[]>>({
    kyber: [],
    lifi: [],
    coingecko: [],
    etherscan: [],
  })
  const lastCriticalAlertAtRef = useRef(0)
  const healthDebounceTimerRef = useRef<number | null>(null)
  const checkStatusRef = useRef<() => Promise<void>>(async () => {})
  const [feeDashboard, setFeeDashboard] = useState<FeeDashboard | null>(null)

  const canCheck = useMemo(
    () => /^0x[a-fA-F0-9]{64}$/.test(txHash.trim()),
    [txHash],
  )

  const checkStatus = useCallback(async () => {
    if (!canCheck) {
      setError('Enter a valid transaction hash.')
      return
    }
    setLoading(true)
    setError(null)
    setBridgeStatus(null)
    setSwapStatus(null)
    try {
      if (mode === 'bridge') {
        const s = await fetchLifiBridgeStatus({
          txHash: txHash.trim(),
          fromChainId,
          toChainId,
        })
        setBridgeStatus(s)
      } else {
        const s = await fetchEvmTxStatus({
          txHash: txHash.trim(),
          chainId: fromChainId,
        })
        setSwapStatus(s)
      }
      setLastCheckedAt(Date.now())
    } catch (e) {
      setError(toUserFacingErrorMessage(e, 'Failed to check status'))
    } finally {
      setLoading(false)
    }
  }, [canCheck, fromChainId, mode, toChainId, txHash])
  useEffect(() => {
    checkStatusRef.current = checkStatus
  }, [checkStatus])

  const fromChain = eonChains.find((c) => c.id === fromChainId)
  const toChain = eonChains.find((c) => c.id === toChainId)
  const chainOptions = useMemo<SelectorOption[]>(
    () =>
      eonChains.map((c) => ({
        value: String(c.id),
        label: c.name,
        logo: trustWalletTokenLogoUrl(c.id, NATIVE_AGGREGATOR),
      })),
    [],
  )
  const currentStatus = mode === 'bridge' ? bridgeStatus?.status : swapStatus?.status
  const isPending = currentStatus === 'PENDING'
  const shortHash =
    txHash.trim().length > 14 ? `${txHash.trim().slice(0, 10)}...${txHash.trim().slice(-6)}` : txHash.trim()
  const sourceExplorer = txHash.trim() ? explorerTxUrl(fromChainId, txHash.trim()) : null
  const destinationExplorer =
    mode === 'bridge' && bridgeStatus?.receiving?.txHash
      ? explorerTxUrl(toChainId, bridgeStatus.receiving.txHash)
      : null

  useEffect(() => {
    if (prefilled) return
    const modeParam = searchParams.get('mode')
    const txHashParam = searchParams.get('txHash')
    const fromParam = searchParams.get('fromChain')
    const toParam = searchParams.get('toChain')
    if (modeParam === 'bridge' || modeParam === 'swap') setMode(modeParam)
    if (fromParam && /^\d+$/.test(fromParam)) setFromChainId(Number(fromParam))
    if (toParam && /^\d+$/.test(toParam)) setToChainId(Number(toParam))
    if (txHashParam) setTxHash(txHashParam)
    setPrefilled(true)
  }, [prefilled, searchParams])

  useEffect(() => {
    if (!prefilled || !canCheck) return
    void checkStatus()
  }, [prefilled, canCheck, checkStatus])

  useEffect(() => {
    if (!autoRefresh || !isPending || !canCheck || loading) return
    const timer = window.setTimeout(() => {
      void checkStatus()
    }, 10000)
    return () => window.clearTimeout(timer)
  }, [autoRefresh, canCheck, isPending, loading, checkStatus])

  useEffect(() => {
    if (mode !== 'swap' || !isPending || !canCheck) return
    const chain = getEonChain(fromChainId)
    const rpcUrl = chain?.rpcUrls.default.http[0]
    if (!chain || !rpcUrl) return

    const client = createPublicClient({
      chain,
      transport: http(rpcUrl),
    })
    let running = false
    const unwatch = client.watchBlockNumber({
      poll: true,
      pollingInterval: 4000,
      onBlockNumber: () => {
        if (running) return
        running = true
        void checkStatusRef
          .current()
          .finally(() => {
            running = false
          })
      },
    })
    return () => {
      unwatch()
    }
  }, [mode, isPending, canCheck, fromChainId])

  const classifyHealthError = useCallback((error: unknown): string => {
    if (error instanceof DOMException && error.name === 'AbortError') return 'Timeout'
    const msg = String(error instanceof Error ? error.message : error ?? '').toLowerCase()
    if (msg.includes('429') || msg.includes('rate')) return 'Rate limited (429)'
    if (msg.includes('cors')) return 'CORS blocked'
    if (msg.includes('failed to fetch') || msg.includes('networkerror')) return 'Network/CORS error'
    return toUserFacingErrorMessage(error, 'Check failed')
  }, [])

  const executeHealthChecks = useCallback(async () => {
    const applyLatencyPolicy = (item: ApiHealth): ApiHealth => {
      const threshold = HEALTH_LATENCY_WARN_MS[item.id]
      if (item.status !== 'ok' || item.latencyMs == null || item.latencyMs <= threshold) return item
      return {
        ...item,
        status: 'degraded',
        detail: `Latency high (${item.latencyMs} ms > ${threshold} ms)`,
      }
    }

    const withTimeout = async (url: string, timeoutMs = 12000) => {
      const ctrl = new AbortController()
      const timer = window.setTimeout(() => ctrl.abort(), timeoutMs)
      try {
        const started = performance.now()
        const res = await fetch(url, {
          signal: ctrl.signal,
          headers: { Accept: 'application/json' },
        })
        const latencyMs = Math.round(performance.now() - started)
        let json: unknown = null
        try {
          json = await res.json()
        } catch {
          json = null
        }
        return { res, json, latencyMs }
      } finally {
        window.clearTimeout(timer)
      }
    }

    setHealthLoading(true)
    setApiHealth((prev) =>
      prev.map((item) => ({ ...item, status: 'checking', detail: 'Checking...', latencyMs: undefined })),
    )
    try {
      const relayUrl = getMonitorRelayBaseUrl()
      let usedRelay = false
      if (relayUrl) {
        try {
          const res = await fetch(`${relayUrl}/monitor/status`, {
            headers: { Accept: 'application/json' },
          })
          const relayJson = (await res.json()) as {
            checkedAt?: number
            providers?: Record<
              'kyber' | 'lifi' | 'coingecko' | 'etherscan',
              { ok: boolean; detail?: string; latencyMs?: number; h1?: number; h24?: number }
            >
          }
          if (res.ok && relayJson?.providers) {
            const providers = relayJson.providers
            const nextHealthRaw: ApiHealth[] = [
              {
                id: 'kyber',
                label: 'Kyber',
                status: providers.kyber.ok ? 'ok' : 'degraded',
                detail: providers.kyber.detail || 'Relay check',
                latencyMs: providers.kyber.latencyMs,
              },
              {
                id: 'lifi',
                label: 'LI.FI',
                status: providers.lifi.ok ? 'ok' : 'degraded',
                detail: providers.lifi.detail || 'Relay check',
                latencyMs: providers.lifi.latencyMs,
              },
              {
                id: 'coingecko',
                label: 'CoinGecko',
                status: providers.coingecko.ok ? 'ok' : 'degraded',
                detail: providers.coingecko.detail || 'Relay check',
                latencyMs: providers.coingecko.latencyMs,
              },
              {
                id: 'etherscan',
                label: 'Etherscan',
                status: providers.etherscan.ok ? 'ok' : 'degraded',
                detail: providers.etherscan.detail || 'Relay check',
                latencyMs: providers.etherscan.latencyMs,
              },
            ]
            const nextHealth = nextHealthRaw.map(applyLatencyPolicy)
            setApiHealth(nextHealth)
            setHealthCheckedAt(relayJson.checkedAt ?? Date.now())
            setApiSla((prev) => ({
              ...prev,
              kyber: {
                h1: providers.kyber.h1 ?? prev.kyber.h1,
                h24: providers.kyber.h24 ?? prev.kyber.h24,
              },
              lifi: {
                h1: providers.lifi.h1 ?? prev.lifi.h1,
                h24: providers.lifi.h24 ?? prev.lifi.h24,
              },
              coingecko: {
                h1: providers.coingecko.h1 ?? prev.coingecko.h1,
                h24: providers.coingecko.h24 ?? prev.coingecko.h24,
              },
              etherscan: {
                h1: providers.etherscan.h1 ?? prev.etherscan.h1,
                h24: providers.etherscan.h24 ?? prev.etherscan.h24,
              },
            }))
            usedRelay = true
            try {
              const feeRes = await fetch(`${relayUrl}/monitor/fees`, {
                headers: { Accept: 'application/json' },
              })
              const feeJson = (await feeRes.json()) as FeeDashboard
              if (feeRes.ok && feeJson?.totals) setFeeDashboard(feeJson)
            } catch {
              // keep previous fee snapshot
            }
          }
        } catch {
          // fallback to client-side checks below
        }
      }
      if (usedRelay) return
      if (HEALTH_RELAY_ONLY) {
        const relayMissingDetail = relayUrl
          ? 'Relay health endpoint unavailable'
          : 'Relay URL not configured'
        setApiHealth((prev) =>
          prev.map((item) => ({
            ...item,
            status: 'degraded',
            detail: relayMissingDetail,
            latencyMs: undefined,
          })),
        )
        setHealthCheckedAt(Date.now())
        return
      }

      const etherscanKey = import.meta.env.VITE_ETHERSCAN_API_KEY?.trim()

      const checkWithRetry = async (fn: () => Promise<ApiHealth>): Promise<ApiHealth> => {
        let last: ApiHealth | null = null
        for (let i = 0; i <= HEALTH_RETRY_DELAYS_MS.length; i++) {
          const current = await fn()
          last = current
          if (current.status === 'ok' || i === HEALTH_RETRY_DELAYS_MS.length) return current
          await new Promise((resolve) => window.setTimeout(resolve, HEALTH_RETRY_DELAYS_MS[i]))
        }
        return last ?? { id: 'kyber', label: 'Unknown', status: 'degraded', detail: 'Unknown error' }
      }

      const [kyber, lifi, gecko, etherscan] = await Promise.all([
        checkWithRetry(async (): Promise<ApiHealth> => {
          try {
            const q = new URLSearchParams({
              tokenIn: NATIVE_AGGREGATOR,
              tokenOut: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              amountIn: '1000000000000000',
            })
            const { res, json, latencyMs } = await withTimeout(
              `https://aggregator-api.kyberswap.com/ethereum/api/v1/routes?${q}`,
            )
            const ok =
              res.ok &&
              typeof json === 'object' &&
              json !== null &&
              (json as { code?: number }).code === 0
            return {
              id: 'kyber',
              label: 'Kyber',
              status: ok ? 'ok' : 'degraded',
              detail: ok ? 'Routes endpoint healthy' : `Routes failed (${res.status})`,
              latencyMs,
            }
          } catch (e) {
            return {
              id: 'kyber',
              label: 'Kyber',
              status: 'degraded',
              detail: classifyHealthError(e),
            }
          }
        }),
        checkWithRetry(async (): Promise<ApiHealth> => {
          try {
            const q = new URLSearchParams({
              fromChain: '1',
              toChain: '42161',
              fromToken: NATIVE_AGGREGATOR,
              toToken: NATIVE_AGGREGATOR,
              fromAmount: '1000000000000000',
              fromAddress: '0x0000000000000000000000000000000000000001',
            })
            const { res, json, latencyMs } = await withTimeout(`https://li.quest/v1/quote?${q}`)
            const hasEstimate =
              typeof json === 'object' && json !== null && 'estimate' in (json as Record<string, unknown>)
            const ok = res.ok && hasEstimate
            return {
              id: 'lifi',
              label: 'LI.FI',
              status: ok ? 'ok' : 'degraded',
              detail: ok ? 'Quote endpoint healthy' : `Quote failed (${res.status})`,
              latencyMs,
            }
          } catch (e) {
            return {
              id: 'lifi',
              label: 'LI.FI',
              status: 'degraded',
              detail: classifyHealthError(e),
            }
          }
        }),
        checkWithRetry(async (): Promise<ApiHealth> => {
          try {
            const q = new URLSearchParams({
              vs_currency: 'usd',
              days: '1',
              interval: 'daily',
            })
            const { res, json, latencyMs } = await withTimeout(
              `https://api.coingecko.com/api/v3/coins/ethereum/market_chart?${q}`,
            )
            const hasPrices =
              typeof json === 'object' &&
              json !== null &&
              Array.isArray((json as { prices?: unknown[] }).prices)
            const ok = res.ok && hasPrices
            return {
              id: 'coingecko',
              label: 'CoinGecko',
              status: ok ? 'ok' : 'degraded',
              detail: ok ? 'Market chart endpoint healthy' : `Market chart failed (${res.status})`,
              latencyMs,
            }
          } catch (e) {
            return {
              id: 'coingecko',
              label: 'CoinGecko',
              status: 'degraded',
              detail: classifyHealthError(e),
            }
          }
        }),
        checkWithRetry(async (): Promise<ApiHealth> => {
          if (!etherscanKey) {
            return {
              id: 'etherscan',
              label: 'Etherscan',
              status: 'degraded',
              detail: 'Missing API key in environment',
            }
          }
          try {
            const q = new URLSearchParams({
              chainid: '1',
              module: 'account',
              action: 'txlist',
              address: '0x0000000000000000000000000000000000000000',
              startblock: '0',
              endblock: 'latest',
              page: '1',
              offset: '1',
              sort: 'desc',
              apikey: etherscanKey,
            })
            const { res, json, latencyMs } = await withTimeout(`https://api.etherscan.io/v2/api?${q}`)
            const hasStatus =
              typeof json === 'object' && json !== null && 'status' in (json as Record<string, unknown>)
            const ok = res.ok && hasStatus
            return {
              id: 'etherscan',
              label: 'Etherscan',
              status: ok ? 'ok' : 'degraded',
              detail: ok ? 'Explorer endpoint reachable' : `Explorer failed (${res.status})`,
              latencyMs,
            }
          } catch (e) {
            return {
              id: 'etherscan',
              label: 'Etherscan',
              status: 'degraded',
              detail: classifyHealthError(e),
            }
          }
        }),
      ])

      const nextHealth = [kyber, lifi, gecko, etherscan].map(applyLatencyPolicy)
      setApiHealth(nextHealth)
      setHealthCheckedAt(Date.now())

      const now = Date.now()
      const windows = { h1: 60 * 60 * 1000, h24: 24 * 60 * 60 * 1000 }
      setApiSla((prev) => {
        const nextSla = { ...prev }
        for (const h of nextHealth) {
          const sampleList = healthSamplesRef.current[h.id]
          sampleList.push({ at: now, ok: h.status === 'ok' })
          healthSamplesRef.current[h.id] = sampleList.filter((s) => now - s.at <= windows.h24)
          const withinH1 = healthSamplesRef.current[h.id].filter((s) => now - s.at <= windows.h1)
          const withinH24 = healthSamplesRef.current[h.id]
          const h1 = withinH1.length
            ? Math.round((withinH1.filter((s) => s.ok).length / withinH1.length) * 100)
            : 100
          const h24 = withinH24.length
            ? Math.round((withinH24.filter((s) => s.ok).length / withinH24.length) * 100)
            : 100
          nextSla[h.id] = { h1, h24 }
        }
        return nextSla
      })

      const criticalDown = nextHealth.filter(
        (h) => (h.id === 'kyber' || h.id === 'lifi') && h.status === 'degraded',
      )
      if (criticalDown.length && now - lastCriticalAlertAtRef.current > HEALTH_ALERT_COOLDOWN_MS) {
        setToastMessage(`Critical API degraded: ${criticalDown.map((x) => x.label).join(', ')}`)
        lastCriticalAlertAtRef.current = now
      }
    } finally {
      setHealthLoading(false)
    }
  }, [classifyHealthError])

  const runHealthChecks = useCallback(() => {
    if (healthDebounceTimerRef.current) {
      window.clearTimeout(healthDebounceTimerRef.current)
    }
    healthDebounceTimerRef.current = window.setTimeout(() => {
      void executeHealthChecks()
    }, 250)
  }, [executeHealthChecks])

  useEffect(() => {
    runHealthChecks()
  }, [runHealthChecks])

  useEffect(() => {
    if (!healthAutoRefresh) return
    const timer = window.setInterval(() => runHealthChecks(), HEALTH_REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [healthAutoRefresh, runHealthChecks])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') runHealthChecks()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [runHealthChecks])

  useEffect(() => {
    if (!toastMessage) return
    const timer = window.setTimeout(() => setToastMessage(null), 4500)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

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
                Transaction diagnostics
              </span>
            </div>
            <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Tracker
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Status command center
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-[15px]">
              Validate bridge or swap transaction hashes in real time with
              explorer links and execution details.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void checkStatus()}
            disabled={!canCheck || loading}
            className="inline-flex h-10 w-fit shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.04] px-4 text-sm font-medium text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-white/[0.2] hover:bg-white/[0.07] hover:text-white disabled:opacity-60"
          >
            {loading ? 'Checking...' : 'Quick check'}
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.03 }}
          className="mb-6 rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                API health
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Last checked:{' '}
                {healthCheckedAt ? new Date(healthCheckedAt).toLocaleTimeString() : '—'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHealthAutoRefresh((v) => !v)}
                className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition ${
                  healthAutoRefresh
                    ? 'border-cyan-400/35 bg-cyan-400/10 text-cyan-200'
                    : 'border-white/[0.12] bg-white/[0.03] text-slate-300'
                }`}
              >
                Auto {healthAutoRefresh ? 'on' : 'off'}
              </button>
              <button
                type="button"
                onClick={() => runHealthChecks()}
                disabled={healthLoading}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.03] px-3 text-xs font-semibold text-slate-200 transition hover:border-white/[0.2] hover:bg-white/[0.06] disabled:opacity-60"
              >
                {healthLoading ? 'Checking...' : 'Refresh health'}
              </button>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {apiHealth.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <Server size={12} className="text-slate-400" />
                    {item.label}
                  </p>
                  {(() => {
                    const meta = healthStatusMeta(item.status)
                    const Icon = meta.Icon
                    return (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${meta.className}`}
                      >
                        <Icon
                          size={10}
                          className={item.status === 'checking' ? 'animate-spin' : undefined}
                        />
                        {meta.label}
                      </span>
                    )
                  })()}
                </div>
                <p className="mt-1 truncate text-[11px] text-slate-400" title={item.detail}>
                  {item.detail}
                </p>
                <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                  <Clock3 size={10} className="text-slate-500/90" />
                  {item.latencyMs != null ? `${item.latencyMs} ms` : '—'}
                </p>
                <p
                  className={`mt-1 flex items-center gap-1 text-[10px] ${
                    item.status === 'ok' ? 'text-emerald-300/85' : 'text-cyan-300/80'
                  }`}
                >
                  <AlertTriangle
                    size={11}
                    className={`shrink-0 ${item.status === 'ok' ? 'text-emerald-300/90' : 'text-cyan-300/85'}`}
                  />
                  Warn {HEALTH_LATENCY_WARN_MS[item.id]} ms
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  SLA: 1h {apiSla[item.id].h1}% · 24h {apiSla[item.id].h24}%
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Status includes latency thresholds; high latency is marked degraded for early warning.
          </p>
        </motion.div>
        {feeDashboard ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.04 }}
            className="mb-6 rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Fee observability
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Last snapshot: {new Date(feeDashboard.checkedAt).toLocaleTimeString()}
                </p>
              </div>
              <p className="text-xs text-slate-400">
                Coverage realized fee: {feeDashboard.totals.realizedCoveragePct}%
              </p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.08em] text-slate-500">Tx</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">{feeDashboard.totals.txCount}</p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.08em] text-slate-500">Quote fee</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  ${feeDashboard.totals.quoteFeeUsd.toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.08em] text-slate-500">Realized fee</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  ${feeDashboard.totals.realizedFeeUsd.toFixed(2)}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.08em] text-slate-500">Delta</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  ${feeDashboard.totals.deltaUsd.toFixed(2)}
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-white/[0.1] bg-gradient-to-br from-[#12142e]/95 via-[#0c0e22]/95 to-[#080914] p-5 shadow-[0_24px_64px_-28px_rgba(0,0,0,0.75)] sm:p-6"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Status workspace
          </p>

          <div className="mt-3 inline-flex rounded-xl border border-white/[0.1] bg-[#090b1f] p-1">
            {(['bridge', 'swap'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition ${
                  mode === m
                    ? 'bg-white/[0.12] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-1">
              Last checked: {lastCheckedAt ? new Date(lastCheckedAt).toLocaleTimeString() : '—'}
            </span>
            <button
              type="button"
              onClick={() => setAutoRefresh((v) => !v)}
              className={`rounded-md border px-2 py-1 transition ${
                autoRefresh
                  ? 'border-cyan-400/35 bg-cyan-400/10 text-cyan-200'
                  : 'border-white/[0.08] bg-white/[0.02] text-slate-400'
              }`}
            >
              Auto refresh {autoRefresh ? 'on' : 'off'}
            </button>
            {isPending ? <span className="text-amber-300">Polling every 10s...</span> : null}
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-3">
            <ChainSelector
              value={String(fromChainId)}
              options={chainOptions}
              onChange={(next) => setFromChainId(Number(next))}
              ariaLabel="Source chain"
            />
            {mode === 'bridge' ? (
              <ChainSelector
                value={String(toChainId)}
                options={chainOptions}
                onChange={(next) => setToChainId(Number(next))}
                ariaLabel="Destination chain"
              />
            ) : (
              <div className="h-10 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 text-sm text-slate-500 grid items-center">
                Swap mode uses source chain only
              </div>
            )}
            <button
              type="button"
              onClick={() => void checkStatus()}
              disabled={!canCheck || loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-400 via-cyan-500 to-eon-blue px-4 text-sm font-semibold text-[#05060f] disabled:opacity-60"
            >
              <Search className="h-4 w-4" aria-hidden />
              {loading ? 'Checking...' : 'Check status'}
            </button>
          </div>

          <input
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="0x... transaction hash"
            className="mt-2 h-10 w-full rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 font-mono text-sm text-slate-200 outline-none"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="truncate font-mono text-xs text-slate-500">{shortHash || 'No tx hash'}</p>
            <button
              type="button"
              disabled={!canCheck}
              onClick={() => {
                void navigator.clipboard.writeText(txHash.trim())
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1200)
              }}
              className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-1 text-xs text-slate-400 transition hover:text-slate-200 disabled:opacity-50"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}

          <div className="mt-4 rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4">
            {mode === 'bridge' ? (
              <>
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <LogoBadge
                      src={trustWalletTokenLogoUrl(fromChainId, NATIVE_AGGREGATOR)}
                      alt={fromChain?.name ?? 'Source'}
                    />
                    {fromChain?.name}
                    <span className="text-slate-500">to</span>
                    <LogoBadge
                      src={trustWalletTokenLogoUrl(toChainId, NATIVE_AGGREGATOR)}
                      alt={toChain?.name ?? 'Destination'}
                    />
                    {toChain?.name}
                  </span>
                </p>
                <p className={`mt-1 text-lg font-semibold ${statusTone(bridgeStatus?.status)}`}>
                  {bridgeStatus?.status ?? '—'}
                </p>
                <p className="text-sm text-slate-400">
                  {bridgeStatus?.substatus || 'No status yet'}
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-[0.08em] text-slate-500">Route</p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-300">
                      <LogoBadge
                        src={trustWalletTokenLogoUrl(fromChainId, NATIVE_AGGREGATOR)}
                        alt={fromChain?.name ?? 'Source'}
                      />
                      {fromChain?.name}
                      <span className="text-slate-500">to</span>
                      <LogoBadge
                        src={trustWalletTokenLogoUrl(toChainId, NATIVE_AGGREGATOR)}
                        alt={toChain?.name ?? 'Destination'}
                      />
                      {toChain?.name}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-[0.08em] text-slate-500">Mode</p>
                    <p className="mt-1 text-xs text-slate-300">Bridge tracking</p>
                  </div>
                </div>
                {bridgeStatus?.sending?.txHash ? (
                  <p className="mt-2 truncate font-mono text-xs text-slate-500">
                    Source: {bridgeStatus.sending.txHash}
                  </p>
                ) : null}
                {bridgeStatus?.receiving?.txHash ? (
                  <p className="mt-1 truncate font-mono text-xs text-slate-500">
                    Destination: {bridgeStatus.receiving.txHash}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  {sourceExplorer ? (
                    <a
                      href={sourceExplorer}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-eon-blue transition hover:text-cyan-300"
                    >
                      View source on explorer
                    </a>
                  ) : null}
                  {destinationExplorer ? (
                    <a
                      href={destinationExplorer}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-eon-blue transition hover:text-cyan-300"
                    >
                      View destination on explorer
                    </a>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <LogoBadge
                      src={trustWalletTokenLogoUrl(fromChainId, NATIVE_AGGREGATOR)}
                      alt={fromChain?.name ?? 'Network'}
                    />
                    {fromChain?.name}
                  </span>
                </p>
                <p className={`mt-1 text-lg font-semibold ${statusTone(swapStatus?.status)}`}>
                  {swapStatus?.status ?? '—'}
                </p>
                {swapStatus?.blockNumber ? (
                  <p className="text-sm text-slate-400">
                    Confirmed at block {swapStatus.blockNumber.toString()}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400">No status yet</p>
                )}
                <div className="mt-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-2">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-slate-500">Network</p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-300">
                    <LogoBadge
                      src={trustWalletTokenLogoUrl(fromChainId, NATIVE_AGGREGATOR)}
                      alt={fromChain?.name ?? 'Network'}
                    />
                    {fromChain?.name}
                  </p>
                </div>
                {sourceExplorer ? (
                  <a
                    href={sourceExplorer}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-xs text-eon-blue transition hover:text-cyan-300"
                  >
                    View on explorer
                  </a>
                ) : null}
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="relative rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-[0.08em] text-slate-500">
                      Sender
                    </p>
                    <p className="mt-1 truncate pr-20 font-mono text-xs text-slate-300">
                      {swapStatus?.from ? truncateAddress(swapStatus.from) : '—'}
                    </p>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <button
                        type="button"
                        disabled={!swapStatus?.from}
                        onClick={() => {
                          if (!swapStatus?.from) return
                          void navigator.clipboard.writeText(swapStatus.from)
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-1 text-[10px] text-slate-400 transition hover:text-slate-200 disabled:opacity-40"
                      >
                        <Copy className="h-3 w-3" aria-hidden />
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="relative rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-[0.08em] text-slate-500">
                      Receiver
                    </p>
                    <p className="mt-1 truncate pr-20 font-mono text-xs text-slate-300">
                      {swapStatus?.to ? truncateAddress(swapStatus.to) : '—'}
                    </p>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <button
                        type="button"
                        disabled={!swapStatus?.to}
                        onClick={() => {
                          if (!swapStatus?.to) return
                          void navigator.clipboard.writeText(swapStatus.to)
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-1 text-[10px] text-slate-400 transition hover:text-slate-200 disabled:opacity-40"
                      >
                        <Copy className="h-3 w-3" aria-hidden />
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
      {toastMessage ? (
        <div className="fixed bottom-4 right-4 z-[160] max-w-sm rounded-xl border border-rose-300/35 bg-rose-500/15 px-3 py-2 text-xs text-rose-100 shadow-[0_20px_40px_-24px_rgba(251,113,133,0.55)] backdrop-blur">
          {toastMessage}
        </div>
      ) : null}
    </section>
  )
}
