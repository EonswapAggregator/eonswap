import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const relayTarget =
    env.VITE_MONITOR_RELAY_URL?.trim().replace(/\/$/u, "") ?? "";
  const alchemyKey = env.VITE_ALCHEMY_API_KEY?.trim() ?? "";
  const baseRpcTarget =
    env.VITE_BASE_RPC_URL?.trim().replace(/\/$/u, "") ||
    (alchemyKey
      ? `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`
      : "https://mainnet.base.org");
  const relayDevProxy =
    mode === "development" && /^https?:\/\//i.test(relayTarget)
      ? relayTarget
      : "";

  return {
    plugins: [react()],
    build: {
      sourcemap: false, // Disable source maps to avoid corrupted map files
    },
    sourcemap: false, // Disable source maps for dev server too
    server: {
      proxy: {
        // Dev: same-origin /__eonswap-relay/* → remote relay (no browser CORS)
        ...(relayDevProxy
          ? {
              "/__eonswap-relay": {
                target: relayDevProxy,
                changeOrigin: true,
                secure: true,
                rewrite: (path) =>
                  path.replace(/^\/__eonswap-relay/, "") || "/",
              },
            }
          : {}),
        "/__base-rpc": {
          target: baseRpcTarget,
          changeOrigin: true,
          secure: true,
          rewrite: () => "/",
        },
        // Browser → Etherscan V2 (avoids CORS during local dev)
        "/api/etherscan": {
          target: "https://api.etherscan.io",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/etherscan/, ""),
        },
        // Browser → CoinGecko (avoids CORS during local dev)
        "/api/coingecko": {
          target: "https://api.coingecko.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/coingecko/, ""),
          headers: {
            Accept: "application/json",
            "User-Agent": "EonSwap/1.0",
          },
        },
      },
    },
  };
});
