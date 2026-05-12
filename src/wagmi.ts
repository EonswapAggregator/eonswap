import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http, fallback } from "wagmi";
import { base } from "wagmi/chains";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY?.trim();
const envBaseRpcUrl = import.meta.env.VITE_BASE_RPC_URL?.trim();
const devRpcProxyUrl = "/__base-rpc";

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

const productionRpcUrls = [
  envBaseRpcUrl,
  alchemyKey && `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`,
].filter((url): url is string => Boolean(url));

const rpcUrls = import.meta.env.DEV
  ? [devRpcProxyUrl]
  : productionRpcUrls.length > 0
    ? productionRpcUrls
    : base.rpcUrls.default.http;

const baseChain = {
  ...base,
  name: "Base",
  shortName: "Base",
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
      rpcUrls.map((url) => http(url)),
      {
        rank: true,
      },
    ),
  },
});
