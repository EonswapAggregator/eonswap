import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import {
  fetchAirdropConfig,
  fetchMerkleTree,
  getChainAirdropConfig,
  type AirdropConfig,
  type AirdropChainConfig,
  type MerkleTreeData,
} from "../lib/airdropContract";

const CONFIG_POLL_INTERVAL = 60 * 1000; // Poll every minute

export type AirdropConfigState = {
  isLoading: boolean;
  config: AirdropConfig | null;
  chainConfig: AirdropChainConfig | null;
  merkleTree: MerkleTreeData | null;
  error: string | null;
  refetch: () => Promise<void>;
};

/**
 * Hook to fetch and auto-refresh airdrop configuration
 * Automatically detects when airdrop contract is deployed
 */
export function useAirdropConfig(): AirdropConfigState {
  const { chain } = useAccount();
  const chainId = chain?.id ?? 8453;

  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<AirdropConfig | null>(null);
  const [chainConfig, setChainConfig] = useState<AirdropChainConfig | null>(
    null,
  );
  const [merkleTree, setMerkleTree] = useState<MerkleTreeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setError(null);

      // Fetch main config
      const airdropConfig = await fetchAirdropConfig();
      setConfig(airdropConfig);

      // Get chain-specific config
      const chainSpecificConfig = getChainAirdropConfig(airdropConfig, chainId);
      setChainConfig(chainSpecificConfig);

      // If airdrop is live and has merkle tree URL, fetch it
      if (
        chainSpecificConfig?.status === "live" &&
        chainSpecificConfig?.merkleTreeUrl
      ) {
        const tree = await fetchMerkleTree(chainSpecificConfig.merkleTreeUrl);
        setMerkleTree(tree);
      } else {
        setMerkleTree(null);
      }
    } catch (err) {
      console.error("Failed to fetch airdrop config:", err);
      setError(err instanceof Error ? err.message : "Failed to load config");
    } finally {
      setIsLoading(false);
    }
  }, [chainId]);

  // Initial fetch
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Poll for updates (detect deployment)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConfig();
    }, CONFIG_POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchConfig]);

  // Refetch when chain changes
  useEffect(() => {
    setIsLoading(true);
    fetchConfig();
  }, [chainId, fetchConfig]);

  return {
    isLoading,
    config,
    chainConfig,
    merkleTree,
    error,
    refetch: fetchConfig,
  };
}
