import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { sendActivityLogToRelay } from '../lib/activityRelay'
import { DEFAULT_SLIPPAGE_BPS, clampSlippageBps } from '../lib/slippage'
import { MAINNET_TOKENS, type Token } from '../lib/tokens'

export type TxStatus = 'pending' | 'success' | 'failed'

export type ActivityItem = {
  id: string
  status: TxStatus
  createdAt: number
  summary: string
  txHash?: `0x${string}`
  chainId: number
  /** Wallet that signed the swap */
  from?: `0x${string}`
  /** Set when a receipt is available */
  blockNumber?: number
}

type QuoteSlice = {
  receiveFormatted: string
  routeSources: string[]
  quoteError: string | null
  quoteLoading: boolean
  lastZid: string | null
  /** Kyber route USD notionals + raw out (wei) for min. received */
  quoteAmountInUsd: string
  quoteAmountOutUsd: string
  quoteGasUsd: string
  quoteL1FeeUsd: string
  quoteAmountOutWei: string
}

type EonSwapState = {
  sellToken: Token
  buyToken: Token
  sellAmountInput: string
  /** Max price movement (basis points). Kyber: 100 = 1%. */
  slippageToleranceBps: number
} & QuoteSlice & {
    setSellToken: (t: Token) => void
    setBuyToken: (t: Token) => void
    setSellAmountInput: (v: string) => void
    setQuoteLoading: (v: boolean) => void
    setQuoteResult: (p: {
      receiveFormatted: string
      routeSources: string[]
      error: string | null
      zid: string | null
      amountInUsd?: string
      amountOutUsd?: string
      gasUsd?: string
      l1FeeUsd?: string
      amountOutWei?: string
    }) => void
    flipTokens: () => void
    history: ActivityItem[]
    addActivity: (item: Omit<ActivityItem, 'id' | 'createdAt'> & { id?: string }) => void
    patchActivity: (
      id: string,
      patch: Partial<
        Pick<
          ActivityItem,
          'status' | 'txHash' | 'summary' | 'blockNumber' | 'from'
        >
      >,
    ) => void
    setSlippageToleranceBps: (bps: number) => void
  }

const defaultSell = MAINNET_TOKENS[0]!
const defaultBuy = MAINNET_TOKENS[2]!

export const useEonSwapStore = create<EonSwapState>()(
  persist(
    (set, get) => ({
      sellToken: defaultSell,
      buyToken: defaultBuy,
      sellAmountInput: '',
      slippageToleranceBps: DEFAULT_SLIPPAGE_BPS,
      receiveFormatted: '',
      routeSources: [],
      quoteError: null,
      quoteLoading: false,
      lastZid: null,
      quoteAmountInUsd: '',
      quoteAmountOutUsd: '',
      quoteGasUsd: '',
      quoteL1FeeUsd: '',
      quoteAmountOutWei: '',
      history: [],

      setSellToken: (t) => set({ sellToken: t }),
      setBuyToken: (t) => set({ buyToken: t }),
      setSellAmountInput: (v) => set({ sellAmountInput: v }),
      setQuoteLoading: (v) => set({ quoteLoading: v }),

      setQuoteResult: ({
        receiveFormatted,
        routeSources,
        error,
        zid,
        amountInUsd,
        amountOutUsd,
        gasUsd,
        l1FeeUsd,
        amountOutWei,
      }) =>
        set({
          receiveFormatted,
          routeSources,
          quoteError: error,
          lastZid: zid,
          quoteAmountInUsd: amountInUsd ?? '',
          quoteAmountOutUsd: amountOutUsd ?? '',
          quoteGasUsd: gasUsd ?? '',
          quoteL1FeeUsd: l1FeeUsd ?? '',
          quoteAmountOutWei: amountOutWei ?? '',
        }),

      flipTokens: () => {
        const { sellToken, buyToken } = get()
        set({
          sellToken: buyToken,
          buyToken: sellToken,
          receiveFormatted: '',
          routeSources: [],
          quoteError: null,
          lastZid: null,
          quoteAmountInUsd: '',
          quoteAmountOutUsd: '',
          quoteGasUsd: '',
          quoteL1FeeUsd: '',
          quoteAmountOutWei: '',
        })
      },

      addActivity: (item) => {
        const id = item.id ?? crypto.randomUUID()
        const row: ActivityItem = {
          id,
          createdAt: Date.now(),
          status: item.status,
          summary: item.summary,
          txHash: item.txHash,
          chainId: item.chainId,
          from: item.from,
          blockNumber: item.blockNumber,
        }
        set((s) => ({
          history: [row, ...s.history].slice(0, 5000),
        }))
        sendActivityLogToRelay(row)
      },

      patchActivity: (id, patch) => {
        set((s) => ({
          history: s.history.map((h) =>
            h.id === id ? { ...h, ...patch } : h,
          ),
        }))
        const next = get().history.find((h) => h.id === id)
        if (next) sendActivityLogToRelay(next)
      },

      setSlippageToleranceBps: (bps) =>
        set({ slippageToleranceBps: clampSlippageBps(bps) }),
    }),
    {
      name: 'eonswap-session',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        history: s.history,
        sellToken: s.sellToken,
        buyToken: s.buyToken,
        slippageToleranceBps: s.slippageToleranceBps,
      }),
    },
  ),
)
