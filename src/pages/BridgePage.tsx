import { motion } from 'framer-motion'
import {
  ArrowDownUp,
  ArrowRight,
  ChevronDown,
  CircleHelp,
  Clock3,
  Link2,
  Shield,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { erc20Abi, formatUnits, parseUnits } from 'viem'
import {
  useAccount,
  useBalance,
  useChainId,
  useEstimateFeesPerGas,
  useReadContract,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import { eonChains, isSupportedChain } from '../lib/chains'
import {
  fetchLifiBridgeQuote,
  fetchLifiBridgeStatus,
  type LifiQuote,
  type LifiStatus,
} from '../lib/bridgeLifi'
import { formatTokenAmountUi } from '../lib/format'
import { toUserFacingErrorMessage } from '../lib/errors'
import { isNativeToken, tokensForChain } from '../lib/tokens'
import { trustWalletTokenLogoUrl } from '../lib/tokenLogos'
import { useEonSwapStore } from '../store/useEonSwapStore'
import { sendTxEventToRelay } from '../lib/txEvents'

const BRIDGE_PENDING_STORAGE_KEY = 'eonswap.bridge.pending.v1'
const BRIDGE_RECOVERY_TTL_MS = 24 * 60 * 60 * 1000
const BRIDGE_GAS_LIMIT_ESTIMATE = 450_000n
const DEFAULT_RESERVE_WEI = 1_500_000_000_000_000n // 0.0015

function nativeReserveFloorWei(chainId?: number): bigint {
  switch (chainId) {
    case 56: // BSC
    case 137: // Polygon
      return 300_000_000_000_000n // 0.0003
    case 8453: // Base
    case 42161: // Arbitrum
    case 10: // Optimism
      return 500_000_000_000_000n // 0.0005
    case 1: // Ethereum
    default:
      return DEFAULT_RESERVE_WEI
  }
}

type PersistedBridgePending = {
  txHash: string
  fromChainId: number
  toChainId: number
  bridge?: string
  savedAt: number
}

function LogoBadge({
  src,
  alt,
  fallback,
}: {
  src: string | null
  alt: string
  fallback: string
}) {
  return src ? (
    <img
      src={src}
      alt={alt}
      className="h-5 w-5 rounded-full object-cover ring-1 ring-white/15"
      loading="lazy"
    />
  ) : (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-slate-200 ring-1 ring-white/15">
      {fallback}
    </span>
  )
}

type SelectorOption = {
  value: string
  label: string
  logo: string | null
  fallback: string
}

function SelectorField({
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
  const selected = options.find((opt) => opt.value === value) ?? options[0]

  useEffect(() => {
    const onDocClick = (ev: MouseEvent) => {
      if (!rootRef.current) return
      if (rootRef.current.contains(ev.target as Node)) return
      setOpen(false)
    }
    const onEsc = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [])

  if (!selected) return null

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        className="flex h-9 w-full items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] px-2 transition hover:border-white/[0.2]"
      >
        <LogoBadge src={selected.logo} alt={selected.label} fallback={selected.fallback} />
        <span className="min-w-0 truncate text-xs font-medium text-slate-200">
          {selected.label}
        </span>
        <ChevronDown
          className={`ml-auto h-3.5 w-3.5 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-56 overflow-y-auto rounded-lg border border-white/[0.14] bg-[#0c1027] p-1.5 shadow-[0_20px_48px_-28px_rgba(0,0,0,0.9)]">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition ${
                value === opt.value
                  ? 'bg-cyan-400/15 text-cyan-100'
                  : 'text-slate-200 hover:bg-white/[0.06]'
              }`}
            >
              <LogoBadge src={opt.logo} alt={opt.label} fallback={opt.fallback} />
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function BridgePage() {
  const { address, isConnected } = useAccount()
  const walletChainId = useChainId()
  const { sendTransactionAsync, isPending: txPending } = useSendTransaction()
  const { writeContractAsync, isPending: approvePending } = useWriteContract()

  const [fromChainId, setFromChainId] = useState<number>(1)
  const [toChainId, setToChainId] = useState<number>(42161)
  const fromTokens = useMemo(() => tokensForChain(fromChainId), [fromChainId])
  const toTokens = useMemo(() => tokensForChain(toChainId), [toChainId])
  const [fromTokenAddr, setFromTokenAddr] = useState<string>(fromTokens[0]!.address)
  const [toTokenAddr, setToTokenAddr] = useState<string>(toTokens[0]!.address)
  const [amountInput, setAmountInput] = useState<string>('0.01')

  const [quote, setQuote] = useState<LifiQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [quoteFetchedAt, setQuoteFetchedAt] = useState<number>(0)
  const [nowMs, setNowMs] = useState<number>(() => Date.now())
  const [bridgeTxHash, setBridgeTxHash] = useState<`0x${string}` | null>(null)
  const [bridgeStatus, setBridgeStatus] = useState<LifiStatus | null>(null)
  const [bridgeStatusError, setBridgeStatusError] = useState<string | null>(null)
  const [bridgeSource, setBridgeSource] = useState<{
    txHash: string
    fromChainId: number
    toChainId: number
    bridge?: string
  } | null>(null)
  const [bridgeActivityId, setBridgeActivityId] = useState<string | null>(null)
  const bridgeReportedRef = useRef<string | null>(null)
  const addActivity = useEonSwapStore((s) => s.addActivity)
  const patchActivity = useEonSwapStore((s) => s.patchActivity)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(BRIDGE_PENDING_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as PersistedBridgePending
      if (
        !parsed?.txHash ||
        !parsed?.fromChainId ||
        !parsed?.toChainId ||
        !parsed?.savedAt
      ) {
        window.localStorage.removeItem(BRIDGE_PENDING_STORAGE_KEY)
        return
      }
      if (Date.now() - parsed.savedAt > BRIDGE_RECOVERY_TTL_MS) {
        window.localStorage.removeItem(BRIDGE_PENDING_STORAGE_KEY)
        return
      }
      setFromChainId(parsed.fromChainId)
      setToChainId(parsed.toChainId)
      setBridgeSource({
        txHash: parsed.txHash,
        fromChainId: parsed.fromChainId,
        toChainId: parsed.toChainId,
        bridge: parsed.bridge,
      })
      setBridgeStatus({ status: 'PENDING', substatus: 'WAIT_SOURCE_CONFIRMATION' })
      setBridgeStatusError(null)
    } catch {
      window.localStorage.removeItem(BRIDGE_PENDING_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    if (toChainId === fromChainId) {
      const next = eonChains.find((c) => c.id !== fromChainId)
      if (next) setToChainId(next.id)
    }
  }, [fromChainId, toChainId])

  useEffect(() => {
    if (!fromTokens.some((t) => t.address === fromTokenAddr)) {
      setFromTokenAddr(fromTokens[0]!.address)
    }
  }, [fromTokenAddr, fromTokens])

  useEffect(() => {
    if (!toTokens.some((t) => t.address === toTokenAddr)) {
      setToTokenAddr(toTokens[0]!.address)
    }
  }, [toTokenAddr, toTokens])

  const fromToken = fromTokens.find((t) => t.address === fromTokenAddr) ?? fromTokens[0]!
  const toToken = toTokens.find((t) => t.address === toTokenAddr) ?? toTokens[0]!
  const fromChain = eonChains.find((c) => c.id === fromChainId) ?? eonChains[0]
  const toChain = eonChains.find((c) => c.id === toChainId) ?? eonChains[1]
  const fromChainLogo = trustWalletTokenLogoUrl(fromChainId, fromTokens[0]!.address)
  const toChainLogo = trustWalletTokenLogoUrl(toChainId, toTokens[0]!.address)
  const fromTokenLogo = trustWalletTokenLogoUrl(fromChainId, fromToken.address)
  const toTokenLogo = trustWalletTokenLogoUrl(toChainId, toToken.address)
  const fromChainOptions = useMemo<SelectorOption[]>(
    () =>
      eonChains.map((c) => ({
        value: String(c.id),
        label: c.name,
        logo: trustWalletTokenLogoUrl(c.id, tokensForChain(c.id)[0]!.address),
        fallback: c.name.slice(0, 2).toUpperCase(),
      })),
    [],
  )
  const toChainOptions = useMemo<SelectorOption[]>(
    () =>
      eonChains
        .filter((c) => c.id !== fromChainId)
        .map((c) => ({
          value: String(c.id),
          label: c.name,
          logo: trustWalletTokenLogoUrl(c.id, tokensForChain(c.id)[0]!.address),
          fallback: c.name.slice(0, 2).toUpperCase(),
        })),
    [fromChainId],
  )
  const fromTokenOptions = useMemo<SelectorOption[]>(
    () =>
      fromTokens.map((t) => ({
        value: t.address,
        label: t.symbol,
        logo: trustWalletTokenLogoUrl(fromChainId, t.address),
        fallback: t.symbol.slice(0, 2).toUpperCase(),
      })),
    [fromChainId, fromTokens],
  )
  const toTokenOptions = useMemo<SelectorOption[]>(
    () =>
      toTokens.map((t) => ({
        value: t.address,
        label: t.symbol,
        logo: trustWalletTokenLogoUrl(toChainId, t.address),
        fallback: t.symbol.slice(0, 2).toUpperCase(),
      })),
    [toChainId, toTokens],
  )
  const isFromNative = isNativeToken(fromToken.address)
  const staleQuote = quoteFetchedAt > 0 && nowMs - quoteFetchedAt > 60_000

  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const fromAmountWei = useMemo(() => {
    const raw = amountInput.trim()
    if (!raw || Number.parseFloat(raw) <= 0) return null
    try {
      return parseUnits(raw, fromToken.decimals)
    } catch {
      return null
    }
  }, [amountInput, fromToken.decimals])

  const { data: nativeBalance } = useBalance({
    address,
    chainId: fromChainId,
    query: { enabled: Boolean(address && isConnected) },
  })
  const { data: fromTokenBalance } = useBalance({
    address,
    chainId: fromChainId,
    token: isFromNative ? undefined : (fromToken.address as `0x${string}`),
    query: { enabled: Boolean(address && isConnected && !isFromNative) },
  })
  const { data: feeData } = useEstimateFeesPerGas({
    chainId: fromChainId,
    query: { enabled: Boolean(isConnected && address) },
  })

  const allowanceSpender = quote?.estimate.approvalAddress
  const { data: allowanceValue, refetch: refetchAllowance } = useReadContract({
    abi: erc20Abi,
    address: isFromNative ? undefined : (fromToken.address as `0x${string}`),
    functionName: 'allowance',
    args:
      !isFromNative && address && allowanceSpender
        ? [address, allowanceSpender]
        : undefined,
    chainId: fromChainId,
    query: {
      enabled: Boolean(!isFromNative && address && allowanceSpender && isConnected),
    },
  })

  useEffect(() => {
    if (!isConnected || !address) {
      setQuote(null)
      setQuoteFetchedAt(0)
      setQuoteError('Connect wallet to request bridge quote.')
      return
    }
    if (!fromAmountWei || fromAmountWei <= 0n) {
      setQuote(null)
      setQuoteFetchedAt(0)
      setQuoteError('Enter an amount.')
      return
    }

    let cancelled = false
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          setQuoteLoading(true)
          setQuoteError(null)
          const q = await fetchLifiBridgeQuote({
            fromChainId,
            toChainId,
            fromToken: fromToken.address,
            toToken: toToken.address,
            fromAmount: fromAmountWei.toString(),
            fromAddress: address,
            slippage: 0.005,
          })
          if (!cancelled) {
            setQuote(q)
            setQuoteFetchedAt(Date.now())
          }
        } catch (e) {
          if (!cancelled) {
            setQuote(null)
            setQuoteFetchedAt(0)
            setQuoteError(toUserFacingErrorMessage(e, 'Failed to get quote.'))
          }
        } finally {
          if (!cancelled) setQuoteLoading(false)
        }
      })()
    }, 350)

    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [address, fromAmountWei, fromChainId, fromToken.address, isConnected, toChainId, toToken.address])

  const feeUsd = useMemo(
    () =>
      (quote?.estimate.feeCosts ?? []).reduce(
        (sum, f) => sum + Number.parseFloat(f.amountUSD || '0'),
        0,
      ),
    [quote],
  )
  const gasUsd = useMemo(
    () =>
      (quote?.estimate.gasCosts ?? []).reduce(
        (sum, g) => sum + Number.parseFloat(g.amountUSD || '0'),
        0,
      ),
    [quote],
  )
  const receiveLabel =
    quote != null
      ? `${formatTokenAmountUi(BigInt(quote.estimate.toAmount), toToken.decimals, 6)} ${toToken.symbol}`
      : '—'
  const etaLabel =
    quote?.estimate.executionDuration != null
      ? `${quote.estimate.executionDuration} min`
      : '—'

  const wrongNetwork =
    !isSupportedChain(walletChainId) || walletChainId !== fromChainId

  const neededNativeWei = useMemo(() => {
    const floor = nativeReserveFloorWei(fromChainId)
    const feePerGas = feeData?.maxFeePerGas ?? feeData?.gasPrice ?? 0n
    if (feePerGas <= 0n) return floor
    const estimated = (feePerGas * BRIDGE_GAS_LIMIT_ESTIMATE * 12n) / 10n // +20% buffer
    return estimated > floor ? estimated : floor
  }, [feeData?.gasPrice, feeData?.maxFeePerGas, fromChainId])
  const nativeWei = nativeBalance?.value ?? 0n
  const nativeGasSymbol = nativeBalance?.symbol ?? fromChain.nativeCurrency.symbol
  const tokenWei = isFromNative ? nativeWei : (fromTokenBalance?.value ?? 0n)
  const effectiveNativeReserveWei = neededNativeWei
  const maxSendableWei = isFromNative
    ? tokenWei > effectiveNativeReserveWei
      ? tokenWei - effectiveNativeReserveWei
      : 0n
    : tokenWei
  const maxDisabled = !isConnected || wrongNetwork || maxSendableWei <= 0n
  const balanceLabel = `${formatTokenAmountUi(tokenWei, fromToken.decimals, 6)} ${fromToken.symbol}`

  const applyMaxAmount = () => {
    if (maxDisabled) return
    const exact = formatUnits(maxSendableWei, fromToken.decimals)
    const cleaned = exact
      .replace(/(\.\d*?[1-9])0+$/u, '$1')
      .replace(/\.0+$/u, '')
    setAmountInput(cleaned || '0')
  }

  const missingAmount = fromAmountWei == null || fromAmountWei <= 0n
  const insufficientTokenBalance =
    !missingAmount && fromAmountWei != null && tokenWei < fromAmountWei
  const insufficientNativeGas = nativeWei < neededNativeWei
  const staleOrMissingQuote = !quote || staleQuote
  const amountTooSmall =
    !!quote &&
    (BigInt(quote.estimate.toAmount) <= 0n || BigInt(quote.estimate.toAmountMin) <= 0n)
  const needsApproval =
    !isFromNative &&
    !!quote &&
    !!fromAmountWei &&
    !!allowanceSpender &&
    ((allowanceValue as bigint | undefined) ?? 0n) < fromAmountWei

  const preflightError = !isConnected
    ? 'Connect wallet'
    : wrongNetwork
      ? 'Switch source chain in wallet'
      : missingAmount
        ? 'Enter valid amount'
        : insufficientTokenBalance
          ? `Insufficient ${fromToken.symbol} balance`
          : insufficientNativeGas
            ? `Insufficient ${nativeGasSymbol} for gas`
            : staleOrMissingQuote
              ? 'Refresh quote before bridging'
              : amountTooSmall
                ? 'Quote amount too small'
                : null

  const canBridge =
    !preflightError &&
    !needsApproval &&
    !quoteLoading &&
    !txPending &&
    !approvePending

  const executeBridge = async () => {
    if (!quote?.transactionRequest.to) return
    const req = quote.transactionRequest
    const hash = await sendTransactionAsync({
      to: req.to,
      data: req.data,
      chainId: req.chainId ?? fromChainId,
      value: req.value ? BigInt(req.value) : undefined,
      gas: req.gasLimit ? BigInt(req.gasLimit) : undefined,
      gasPrice: req.gasPrice ? BigInt(req.gasPrice) : undefined,
      account: address,
    })
    setBridgeTxHash(hash)
    setBridgeSource({
      txHash: hash,
      fromChainId,
      toChainId,
      bridge: quote.tool,
    })
    setBridgeStatus({ status: 'PENDING', substatus: 'WAIT_SOURCE_CONFIRMATION' })
    setBridgeStatusError(null)
    const activityId = crypto.randomUUID()
    setBridgeActivityId(activityId)
    addActivity({
      id: activityId,
      kind: 'bridge',
      status: 'pending',
      summary: `Bridge ${amountInput.trim() || '0'} ${fromToken.symbol} → ~${receiveLabel}`,
      txHash: hash,
      chainId: fromChainId,
      from: address,
    })
  }

  const approveToken = async () => {
    if (!address || !allowanceSpender || !fromAmountWei || isFromNative) return
    const hash = await writeContractAsync({
      abi: erc20Abi,
      address: fromToken.address as `0x${string}`,
      functionName: 'approve',
      args: [allowanceSpender, fromAmountWei],
      chainId: fromChainId,
      account: address,
    })
    setBridgeTxHash(hash)
  }

  const { isLoading: waitingTxConfirmation } = useWaitForTransactionReceipt({
    hash: bridgeTxHash ?? undefined,
    query: { enabled: Boolean(bridgeTxHash) },
  })

  useEffect(() => {
    if (!bridgeTxHash || !needsApproval) return
    if (!waitingTxConfirmation) {
      void refetchAllowance()
      setBridgeTxHash(null)
    }
  }, [bridgeTxHash, needsApproval, refetchAllowance, waitingTxConfirmation])

  useEffect(() => {
    if (!bridgeSource) return
    let cancelled = false
    const poll = async () => {
      try {
        const status = await fetchLifiBridgeStatus({
          txHash: bridgeSource.txHash,
          fromChainId: bridgeSource.fromChainId,
          toChainId: bridgeSource.toChainId,
          bridge: bridgeSource.bridge,
        })
        if (cancelled) return
        setBridgeStatus(status)
        setBridgeStatusError(null)
        if (status.status === 'DONE' || status.status === 'FAILED') return
      } catch (e) {
        if (!cancelled) {
          setBridgeStatusError(
            toUserFacingErrorMessage(e, 'Failed to fetch bridge status'),
          )
        }
      }
      if (!cancelled) window.setTimeout(poll, 8000)
    }
    void poll()
    return () => {
      cancelled = true
    }
  }, [bridgeSource])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!bridgeSource) {
      window.localStorage.removeItem(BRIDGE_PENDING_STORAGE_KEY)
      return
    }
    const payload: PersistedBridgePending = {
      txHash: bridgeSource.txHash,
      fromChainId: bridgeSource.fromChainId,
      toChainId: bridgeSource.toChainId,
      bridge: bridgeSource.bridge,
      savedAt: Date.now(),
    }
    window.localStorage.setItem(BRIDGE_PENDING_STORAGE_KEY, JSON.stringify(payload))
  }, [bridgeSource])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (bridgeStatus?.status === 'DONE' || bridgeStatus?.status === 'FAILED') {
      window.localStorage.removeItem(BRIDGE_PENDING_STORAGE_KEY)
    }
  }, [bridgeStatus?.status])

  useEffect(() => {
    if (!bridgeActivityId) return
    if (bridgeStatus?.status === 'DONE') {
      patchActivity(bridgeActivityId, {
        status: 'success',
        summary: `Bridge ${amountInput.trim() || '0'} ${fromToken.symbol} → ~${receiveLabel} (done)`,
      })
      if (bridgeSource?.txHash && bridgeReportedRef.current !== bridgeSource.txHash) {
        bridgeReportedRef.current = bridgeSource.txHash
        void sendTxEventToRelay({
          kind: 'bridge',
          status: 'success',
          txHash: bridgeSource.txHash,
          chainId: fromChainId,
          wallet: address,
          summary: `Bridge ${amountInput.trim() || '0'} ${fromToken.symbol} → ~${receiveLabel}`,
          at: Date.now(),
        })
      }
    } else if (bridgeStatus?.status === 'FAILED') {
      patchActivity(bridgeActivityId, {
        status: 'failed',
        summary: `Bridge ${amountInput.trim() || '0'} ${fromToken.symbol} → ~${receiveLabel} (failed)`,
      })
    }
  }, [
    bridgeActivityId,
    bridgeStatus?.status,
    bridgeSource?.txHash,
    fromChainId,
    address,
    amountInput,
    fromToken.symbol,
    receiveLabel,
    patchActivity,
  ])

  return (
    <section className="relative scroll-mt-24 overflow-hidden border-t border-white/[0.08] py-16 md:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_10%_0%,rgba(34,211,238,0.08),transparent_60%),radial-gradient(60%_40%_at_90%_10%,rgba(59,130,246,0.08),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-28 top-20 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 bottom-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"
      />
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
                Cross-chain transfer
              </span>
            </div>
            <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Bridge
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Bridge execution desk
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-[15px]">
              Get live cross-chain quotes via LI.FI, compare route details and
              fees, then execute directly from your wallet with a non-custodial
              flow.
            </p>
          </div>
          <Link
            to="/swap"
            className="inline-flex h-10 w-fit shrink-0 items-center justify-center rounded-xl border border-white/[0.14] bg-white/[0.04] px-4 text-sm font-medium text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-white/[0.2] hover:bg-white/[0.07] hover:text-white"
          >
            Back to swap
          </Link>
        </motion.div>

        <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,392px)_minmax(0,1fr)] lg:gap-6 xl:gap-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="order-1 flex min-w-0 self-start justify-start"
          >
            <div className="relative w-full overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-b from-[#141736] via-[#0d1026] to-[#090a1a] shadow-[0_26px_70px_-24px_rgba(0,0,0,0.9),0_0_0_1px_rgba(0,210,255,0.08)]">
              <div className="relative flex items-center justify-between gap-3 border-b border-white/[0.06] px-3.5 py-2">
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold tracking-tight text-white">
                    Bridge
                  </h2>
                  <p className="truncate text-[11px] leading-tight text-slate-500">
                    Live quote
                  </p>
                </div>
                <ArrowDownUp
                  className="h-4 w-4 text-eon-blue/80"
                  strokeWidth={1.8}
                  aria-hidden
                />
              </div>

              <div className="flex flex-col gap-2 px-3.5 pb-3 pt-2">
                <div className="rounded-xl border border-white/[0.1] bg-[#070818]/95 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                      From
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[11px] text-slate-500" title={balanceLabel}>
                        Balance {balanceLabel}
                      </span>
                      <button
                        type="button"
                        disabled={maxDisabled}
                        onClick={applyMaxAmount}
                        className="rounded-md border border-cyan-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-300 transition hover:border-cyan-400/50 hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:border-white/[0.06] disabled:bg-transparent disabled:text-slate-600 disabled:hover:border-white/[0.06] disabled:hover:bg-transparent disabled:hover:text-slate-600"
                      >
                        Max
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <SelectorField
                      value={String(fromChainId)}
                      options={fromChainOptions}
                      onChange={(next) => setFromChainId(Number(next))}
                      ariaLabel="From chain"
                    />
                    <SelectorField
                      value={fromTokenAddr}
                      options={fromTokenOptions}
                      onChange={setFromTokenAddr}
                      ariaLabel="From token"
                    />
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="0.0"
                    className="mt-1.5 w-full rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 font-mono text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/45"
                  />
                </div>

                <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.03]">
                  <ArrowDownUp className="h-4 w-4 text-slate-400" aria-hidden />
                </div>

                <div className="rounded-xl border border-white/[0.1] bg-[#070818]/95 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                    To
                  </span>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <SelectorField
                      value={String(toChainId)}
                      options={toChainOptions}
                      onChange={(next) => setToChainId(Number(next))}
                      ariaLabel="To chain"
                    />
                    <SelectorField
                      value={toTokenAddr}
                      options={toTokenOptions}
                      onChange={setToTokenAddr}
                      ariaLabel="To token"
                    />
                  </div>
                  <p className="mt-2 flex items-center gap-2 font-mono text-sm text-slate-300">
                    <span>Est. receive:</span>
                    <LogoBadge
                      src={toTokenLogo}
                      alt={toToken.symbol}
                      fallback={toToken.symbol.slice(0, 2).toUpperCase()}
                    />
                    <span className="text-eon-blue">{receiveLabel}</span>
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    (needsApproval && (approvePending || waitingTxConfirmation || !!preflightError)) ||
                    (!needsApproval && !canBridge)
                  }
                  onClick={() => {
                    if (needsApproval) {
                      void approveToken()
                      return
                    }
                    void executeBridge()
                  }}
                  className="mt-0.5 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-eon-blue py-2 text-sm font-semibold text-[#05060f] disabled:opacity-60"
                >
                  {preflightError
                    ? preflightError
                    : needsApproval
                      ? approvePending || waitingTxConfirmation
                        ? `Approving ${fromToken.symbol}...`
                        : `Approve ${fromToken.symbol}`
                      : txPending
                        ? 'Sending bridge tx...'
                        : 'Bridge now'}
                </button>
                <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-2">
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1">
                    <p className="text-[10px] uppercase tracking-[0.08em] text-slate-500">ETA</p>
                    <p className="mt-1 text-xs font-semibold text-slate-200">{etaLabel}</p>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1">
                    <p className="text-[10px] uppercase tracking-[0.08em] text-slate-500">Fee</p>
                    <p className="mt-1 text-xs font-semibold text-slate-200">
                      ${(feeUsd + gasUsd).toFixed(3)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1">
                    <p className="text-[10px] uppercase tracking-[0.08em] text-slate-500">Route</p>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-200">
                      {quote?.toolDetails?.name || quote?.tool || '—'}
                    </p>
                  </div>
                </div>
                {quoteError ? (
                  <p className="text-xs text-amber-300/90">{quoteError}</p>
                ) : null}
                {staleQuote ? (
                  <p className="text-xs text-amber-300/90">
                    Quote is older than 60s. Update amount or token to refresh.
                  </p>
                ) : null}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.06 }}
            className="order-2 flex min-h-0 min-w-0 w-full max-w-full self-start flex-col gap-2.5"
          >
            <div className="rounded-3xl border border-white/[0.1] bg-gradient-to-br from-[#12142e]/90 via-[#0c0e22]/90 to-[#080914]/90 p-4 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.45)]">
              <h3 className="text-base font-semibold text-white">Bridge details</h3>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">From</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-100">
                    <LogoBadge
                      src={fromChainLogo}
                      alt={fromChain.name}
                      fallback={fromChain.name.slice(0, 2).toUpperCase()}
                    />
                    {fromChain.name}
                    <span className="text-slate-500">/</span>
                    <LogoBadge
                      src={fromTokenLogo}
                      alt={fromToken.symbol}
                      fallback={fromToken.symbol.slice(0, 2).toUpperCase()}
                    />
                    {fromToken.symbol}
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">To</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-100">
                    <LogoBadge
                      src={toChainLogo}
                      alt={toChain.name}
                      fallback={toChain.name.slice(0, 2).toUpperCase()}
                    />
                    {toChain.name}
                    <span className="text-slate-500">/</span>
                    <LogoBadge
                      src={toTokenLogo}
                      alt={toToken.symbol}
                      fallback={toToken.symbol.slice(0, 2).toUpperCase()}
                    />
                    {toToken.symbol}
                  </p>
                </div>
              </div>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <Clock3 className="h-4 w-4 text-eon-blue" aria-hidden />
                  <p className="mt-2 text-xs text-slate-500">Estimated time</p>
                  <p className="text-sm font-semibold text-slate-100">{etaLabel}</p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <Link2 className="h-4 w-4 text-eon-blue" aria-hidden />
                  <p className="mt-2 text-xs text-slate-500">Route type</p>
                  <p className="text-sm font-semibold text-slate-100">
                    {quote?.toolDetails?.name || quote?.tool || '—'}
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <Shield className="h-4 w-4 text-eon-blue" aria-hidden />
                  <p className="mt-2 text-xs text-slate-500">Fees (USD est.)</p>
                  <p className="text-sm font-semibold text-slate-100">
                    ${(feeUsd + gasUsd).toFixed(4)}
                  </p>
                </div>
              </div>
              <div className="mt-2">
                <div className="group relative inline-flex">
                  <button
                    type="button"
                    aria-label="Bridge quote info"
                    className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] text-slate-400 transition hover:border-white/[0.18] hover:text-slate-200"
                  >
                    <CircleHelp className="h-3.5 w-3.5" aria-hidden />
                    Quote details
                  </button>
                  <div className="pointer-events-none absolute left-0 top-[calc(100%+8px)] z-20 w-64 rounded-lg border border-white/[0.1] bg-[#0d1128] p-2.5 text-xs leading-relaxed text-slate-300 opacity-0 shadow-[0_16px_36px_-20px_rgba(0,0,0,0.9)] transition group-hover:opacity-100 group-focus-within:opacity-100">
                    Live LI.FI quote with integrated fee breakdown. Values can
                    update with route and network conditions.
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/[0.1] bg-gradient-to-br from-[#12142e]/90 via-[#0c0e22]/90 to-[#080914]/90 p-4 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-white">Fee breakdown</h3>
                <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-xs text-slate-400">
                  USD estimate
                </span>
              </div>
              <div className="mt-2 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
                <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="truncate text-slate-300">Protocol / bridge fees</span>
                  <span className="font-mono text-slate-200">
                    {quote && !quoteLoading ? `$${feeUsd.toFixed(4)}` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-3 py-2 text-sm">
                  <span className="truncate text-slate-300">Network gas</span>
                  <span className="font-mono text-slate-200">
                    {quote && !quoteLoading ? `$${gasUsd.toFixed(4)}` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-white/[0.08] bg-white/[0.03] px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                    Total
                  </span>
                  <span className="font-mono text-sm font-semibold text-white">
                    {quote && !quoteLoading ? `$${(feeUsd + gasUsd).toFixed(4)}` : '—'}
                  </span>
                </div>
                {quoteLoading ? (
                  <p className="border-t border-white/[0.06] px-3 py-2 text-xs text-slate-500">
                    Fetching quote fees...
                  </p>
                ) : null}
              </div>
              <Link
                to={`/status?mode=bridge&fromChain=${fromChainId}&toChain=${toChainId}${bridgeSource?.txHash ? `&txHash=${encodeURIComponent(bridgeSource.txHash)}` : ''}`}
                className="mt-2.5 inline-flex items-center gap-2 text-sm font-medium text-eon-blue transition hover:text-cyan-300"
              >
                View status
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              {(bridgeStatus || bridgeStatusError || bridgeSource) && (
                <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    Bridge tracking
                  </p>
                  <p className="mt-1 text-sm text-slate-200">
                    Status: {bridgeStatus?.status ?? 'PENDING'}
                    {bridgeStatus?.substatus ? ` (${bridgeStatus.substatus})` : ''}
                  </p>
                  {bridgeSource?.txHash ? (
                    <p className="mt-1 truncate font-mono text-xs text-slate-400">
                      Source tx: {bridgeSource.txHash}
                    </p>
                  ) : null}
                  {bridgeStatus?.receiving?.txHash ? (
                    <p className="mt-1 truncate font-mono text-xs text-slate-400">
                      Destination tx: {bridgeStatus.receiving.txHash}
                    </p>
                  ) : null}
                  {bridgeStatusError ? (
                    <p className="mt-1 text-xs text-amber-300/90">{bridgeStatusError}</p>
                  ) : null}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
