import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http, fallback } from "wagmi";
import { base } from "viem/chains";
import { baseRpcUrls } from "./lib/rpcUrls";
import { EON_BASE_MAINNET } from "./lib/eonBaseMainnet";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

function blockWalletConnectAnalytics() {
  if (typeof window === "undefined") {
    return;
  }

  const fetchWithAnalyticsGuard = window.fetch as typeof window.fetch & {
    __eonWalletConnectAnalyticsBlocked?: true;
  };

  if (fetchWithAnalyticsGuard.__eonWalletConnectAnalyticsBlocked) {
    return;
  }

  const originalFetch = fetchWithAnalyticsGuard.bind(window);

  window.fetch = ((input, init) => {
    const url = typeof input === "string" || input instanceof URL ? input.toString() : input.url;

    try {
      const parsedUrl = new URL(url);

      if (parsedUrl.hostname === "pulse.walletconnect.org" && parsedUrl.pathname === "/e") {
        return Promise.resolve(new Response(null, { status: 204, statusText: "No Content" }));
      }
    } catch {
      // Let fetch handle malformed or relative URLs exactly as it normally would.
    }

    return originalFetch(input, init);
  }) as typeof window.fetch;

  (window.fetch as typeof window.fetch & {
    __eonWalletConnectAnalyticsBlocked?: true;
  }).__eonWalletConnectAnalyticsBlocked = true;
}

blockWalletConnectAnalytics();

const rpcUrls = baseRpcUrls();

const baseChain = {
  ...base,
  name: "Base",
  shortName: "Base",
  contracts: {
    ...(base.contracts ?? {}),
    multicall3: {
      address: EON_BASE_MAINNET.ops.multicall,
      blockCreated: 30_168_079,
    },
  },
  rpcUrls: {
    ...base.rpcUrls,
    default: { http: rpcUrls },
    public: { http: rpcUrls },
  },
};

export const wagmiConfig = getDefaultConfig({
  appName: "EonSwap",
  projectId: projectId || "00000000000000000000000000000000",
  chains: [baseChain],
  ssr: false,
  walletConnectParameters: {
    telemetryEnabled: false,
  },
  transports: {
    [base.id]: fallback(
      rpcUrls.map((url) => http(url, {
        timeout: 10_000, // 10s timeout per RPC call
        fetchOptions: {
          headers: {
            'User-Agent': 'EonSwap/1.0',
          },
        },
      })),
      {
        rank: true, // Auto-prioritize by health/speed
        retryCount: 3,
        retryDelay: 100,
      },
    ),
  },
});
