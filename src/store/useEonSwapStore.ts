import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { sendActivityLogToRelay } from "../lib/activityRelay";
import {
  DEFAULT_SLIPPAGE_BPS,
  DEFAULT_DEADLINE_MINUTES,
  DEFAULT_PRICE_IMPACT_WARN_PCT,
  clampSlippageBps,
  clampDeadlineMinutes,
  clampPriceImpactWarnPct,
} from "../lib/slippage";
import { MAINNET_TOKENS, type Token } from "../lib/tokens";

export type TxStatus = "pending" | "success" | "failed";
export type ActivityKind =
  | "swap"
  | "farm_deposit"
  | "farm_withdraw"
  | "farm_harvest"
  | "lp_add"
  | "lp_remove"
  | "referral_claim"
  | "airdrop_claim";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  status: TxStatus;
  createdAt: number;
  summary: string;
  txHash?: `0x${string}`;
  chainId: number;
  /** Wallet that signed the swap */
  from?: `0x${string}`;
  /** Set when a receipt is available */
  blockNumber?: number;
};

type QuoteSlice = {
  receiveFormatted: string;
  routeSources: string[];
  quoteError: string | null;
  quoteLoading: boolean;
  lastZid: string | null;
  quoteRouterAddress: string;
  /** Route USD notionals + raw out (wei) for min. received */
  quoteAmountInUsd: string;
  quoteAmountOutUsd: string;
  quoteGasUsd: string;
  quoteL1FeeUsd: string;
  quoteAmountOutWei: string;
  /** Price impact from router (calculated from reserves) */
  quotePriceImpact: string;
};

type EonSwapState = {
  sellToken: Token;
  buyToken: Token;
  chartToken: Token;
  sellAmountInput: string;
  /** Max price movement (basis points): 100 = 1%. */
  slippageToleranceBps: number;
  /** Transaction deadline in minutes. */
  deadlineMinutes: number;
  /** Price impact warning threshold (percentage). */
  priceImpactWarnPct: number;
} & QuoteSlice & {
    setSellToken: (t: Token) => void;
    setBuyToken: (t: Token) => void;
    setChartToken: (t: Token) => void;
    setSellAmountInput: (v: string) => void;
    setQuoteLoading: (v: boolean) => void;
    setQuoteResult: (p: {
      receiveFormatted: string;
      routeSources: string[];
      error: string | null;
      zid: string | null;
      routerAddress?: string;
      amountInUsd?: string;
      amountOutUsd?: string;
      gasUsd?: string;
      l1FeeUsd?: string;
      amountOutWei?: string;
      priceImpact?: string;
    }) => void;
    flipTokens: () => void;
    history: ActivityItem[];
    addActivity: (
      item: Omit<ActivityItem, "id" | "createdAt"> & { id?: string },
    ) => void;
    patchActivity: (
      id: string,
      patch: Partial<
        Pick<
          ActivityItem,
          "status" | "txHash" | "summary" | "blockNumber" | "from"
        >
      >,
    ) => void;
    clearHistory: () => void;
    setSlippageToleranceBps: (bps: number) => void;
    setDeadlineMinutes: (minutes: number) => void;
    setPriceImpactWarnPct: (pct: number) => void;
  };

const defaultSell = MAINNET_TOKENS[0]!;
const defaultBuy = MAINNET_TOKENS[2]!;

export const useEonSwapStore = create<EonSwapState>()(
  persist(
    (set, get) => ({
      sellToken: defaultSell,
      buyToken: defaultBuy,
      chartToken: defaultSell,
      sellAmountInput: "",
      slippageToleranceBps: DEFAULT_SLIPPAGE_BPS,
      deadlineMinutes: DEFAULT_DEADLINE_MINUTES,
      priceImpactWarnPct: DEFAULT_PRICE_IMPACT_WARN_PCT,
      receiveFormatted: "",
      routeSources: [],
      quoteError: null,
      quoteLoading: false,
      lastZid: null,
      quoteRouterAddress: "",
      quoteAmountInUsd: "",
      quoteAmountOutUsd: "",
      quoteGasUsd: "",
      quoteL1FeeUsd: "",
      quoteAmountOutWei: "",
      quotePriceImpact: "",
      history: [],

      setSellToken: (t) => set({ sellToken: t, chartToken: t }),
      setBuyToken: (t) => set({ buyToken: t, chartToken: t }),
      setChartToken: (t) => set({ chartToken: t }),
      setSellAmountInput: (v) => set({ sellAmountInput: v }),
      setQuoteLoading: (v) => set({ quoteLoading: v }),

      setQuoteResult: ({
        receiveFormatted,
        routeSources,
        error,
        zid,
        routerAddress,
        amountInUsd,
        amountOutUsd,
        gasUsd,
        l1FeeUsd,
        amountOutWei,
        priceImpact,
      }) =>
        set({
          receiveFormatted,
          routeSources,
          quoteError: error,
          lastZid: zid,
          quoteRouterAddress: routerAddress ?? "",
          quoteAmountInUsd: amountInUsd ?? "",
          quoteAmountOutUsd: amountOutUsd ?? "",
          quoteGasUsd: gasUsd ?? "",
          quoteL1FeeUsd: l1FeeUsd ?? "",
          quoteAmountOutWei: amountOutWei ?? "",
          quotePriceImpact: priceImpact ?? "",
        }),

      flipTokens: () => {
        const { sellToken, buyToken } = get();
        set({
          sellToken: buyToken,
          buyToken: sellToken,
          chartToken: buyToken,
          receiveFormatted: "",
          routeSources: [],
          quoteError: null,
          lastZid: null,
          quoteRouterAddress: "",
          quoteAmountInUsd: "",
          quoteAmountOutUsd: "",
          quoteGasUsd: "",
          quoteL1FeeUsd: "",
          quoteAmountOutWei: "",
          quotePriceImpact: "",
        });
      },

      addActivity: (item) => {
        const id = item.id ?? crypto.randomUUID();
        const row: ActivityItem = {
          id,
          kind: item.kind,
          createdAt: Date.now(),
          status: item.status,
          summary: item.summary,
          txHash: item.txHash,
          chainId: item.chainId,
          from: item.from,
          blockNumber: item.blockNumber,
        };
        set((s) => ({
          history: [row, ...s.history].slice(0, 5000),
        }));
        sendActivityLogToRelay(row);
      },

      patchActivity: (id, patch) => {
        set((s) => ({
          history: s.history.map((h) => (h.id === id ? { ...h, ...patch } : h)),
        }));
        const next = get().history.find((h) => h.id === id);
        if (next) sendActivityLogToRelay(next);
      },

      clearHistory: () => set({ history: [] }),

      setSlippageToleranceBps: (bps) =>
        set({ slippageToleranceBps: clampSlippageBps(bps) }),
      setDeadlineMinutes: (minutes) =>
        set({ deadlineMinutes: clampDeadlineMinutes(minutes) }),
      setPriceImpactWarnPct: (pct) =>
        set({ priceImpactWarnPct: clampPriceImpactWarnPct(pct) }),
    }),
    {
      name: "eonswap-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        history: s.history,
        sellToken: s.sellToken,
        buyToken: s.buyToken,
        chartToken: s.chartToken,
        slippageToleranceBps: s.slippageToleranceBps,
        deadlineMinutes: s.deadlineMinutes,
        priceImpactWarnPct: s.priceImpactWarnPct,
      }),
    },
  ),
);
