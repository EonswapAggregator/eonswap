/// <reference types="vite/client" />

/**
 * Optional token logos: env key `VITE_TOKEN_LOGO_` + lowercase `0x` + 40 hex (same as `logoFileKeyForAddress`).
 * Native uses `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`. Values: `https://…` or a path. See `src/lib/tokenLogos.ts`.
 */

interface ImportMetaEnv {
  readonly VITE_WALLETCONNECT_PROJECT_ID: string
  readonly VITE_ALCHEMY_API_KEY?: string
  readonly VITE_BASE_RPC_URL?: string
  readonly VITE_SITE_DOMAIN?: string
  readonly VITE_MONITOR_RELAY_URL?: string
  /** Base URL for Eon AMM routing (GET /v1/quote, POST /v1/route/build). 
  readonly VITE_EON_AMM_API_BASE_URL?: string
  readonly VITE_EON_AMM_API_KEY?: string
  /** Optional frontend display fee basis points (e.g. 25 = 0.25%). */
  readonly VITE_SWAP_FEE_BPS?: string
  /** Etherscan API V2 key — multichain tx history on Activity */
  readonly VITE_ETHERSCAN_API_KEY?: string
  /** Health panel latency warning thresholds (ms) */
  readonly VITE_HEALTH_WARN_COINGECKO_MS?: string
  readonly VITE_HEALTH_WARN_ETHERSCAN_MS?: string
  /** Optional native reserve (wei) for Swap Max button. Chain-specific key wins: `VITE_SWAP_NATIVE_RESERVE_WEI_<chainId>`. */
  readonly VITE_SWAP_NATIVE_RESERVE_WEI?: string
  readonly VITE_SWAP_NATIVE_RESERVE_WEI_1?: string
  readonly VITE_SWAP_NATIVE_RESERVE_WEI_10?: string
  readonly VITE_SWAP_NATIVE_RESERVE_WEI_56?: string
  readonly VITE_SWAP_NATIVE_RESERVE_WEI_137?: string
  readonly VITE_SWAP_NATIVE_RESERVE_WEI_42161?: string
  readonly VITE_SWAP_NATIVE_RESERVE_WEI_8453?: string
  /** Optional gas buffer for max reserve in bps (default 11000 = 110%). */
  readonly VITE_SWAP_GAS_BUFFER_BPS?: string
  readonly VITE_E2E_ADMIN_BYPASS?: string
  /** Header chip: ESTF (USD) fallback when Base ESTF/WETH pool is unavailable. */
  readonly VITE_ESTF_COINGECKO_ID?: string
  /** Optional hardcoded ESTF/USD used before pool pricing is available. */
  readonly VITE_ESTF_HARDCODED_USD?: string
  readonly VITE_ESTF_SYMBOL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
