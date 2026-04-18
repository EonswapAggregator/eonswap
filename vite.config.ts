import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const relayTarget =
    env.VITE_MONITOR_RELAY_URL?.trim().replace(/\/$/u, "") ?? "";
  const relayDevProxy =
    mode === "development" && /^https?:\/\//i.test(relayTarget)
      ? relayTarget
      : "";

  return {
    plugins: [react()],
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
