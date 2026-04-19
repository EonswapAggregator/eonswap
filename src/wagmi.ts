import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http, fallback } from "wagmi";
import { base } from "wagmi/chains";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY;

// Build RPC URL with Alchemy primary and public fallbacks
const rpcUrls = [
  alchemyKey && `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`,
  "https://mainnet.base.org",
  "https://base.publicrpc.com",
  "https://base.meowrpc.com",
].filter((url): url is string => Boolean(url));

const baseChain = { ...base, name: "Base", shortName: "Base" };

export const wagmiConfig = getDefaultConfig({
  appName: "EonSwap",
  projectId: projectId || "00000000000000000000000000000000",
  chains: [baseChain],
  ssr: false,
  transports: {
    [base.id]: fallback(
      rpcUrls.map((url) => http(url)),
      {
        rank: true,
      },
    ),
  },
});
