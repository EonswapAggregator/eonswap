/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WALLETCONNECT_PROJECT_ID: string
  readonly VITE_ALCHEMY_API_KEY?: string
  readonly VITE_SITE_DOMAIN?: string
  readonly VITE_MONITOR_RELAY_URL?: string
  readonly VITE_KYBER_CLIENT_ID?: string
  readonly VITE_KYBER_FEE_RECEIVER?: string
  readonly VITE_KYBER_FEE_BPS?: string
  readonly VITE_LIFI_INTEGRATOR?: string
  readonly VITE_LIFI_API_KEY?: string
  /** e.g. 0.01 means 1% integrator fee (requires LI.FI verification) */
  readonly VITE_LIFI_FEE_PERCENT?: string
  /** Etherscan API V2 key — multichain tx history on Activity */
  readonly VITE_ETHERSCAN_API_KEY?: string
  /** Health panel latency warning thresholds (ms) */
  readonly VITE_HEALTH_WARN_KYBER_MS?: string
  readonly VITE_HEALTH_WARN_LIFI_MS?: string
  readonly VITE_HEALTH_WARN_COINGECKO_MS?: string
  readonly VITE_HEALTH_WARN_ETHERSCAN_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
