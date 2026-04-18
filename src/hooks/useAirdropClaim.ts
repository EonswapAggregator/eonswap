import { useCallback, useEffect, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { toast } from "sonner";
import {
  EON_MERKLE_AIRDROP_ABI,
  findUserClaim,
  parseAirdropError,
  type MerkleTreeData,
  type AirdropClaim,
  type AirdropChainConfig,
} from "../lib/airdropContract";
import { useEonSwapStore } from "../store/useEonSwapStore";

export type AirdropStatus =
  | "not-deployed"
  | "loading"
  | "not-eligible"
  | "eligible"
  | "claimed"
  | "ended"
  | "paused";

export type UseAirdropClaimProps = {
  merkleTreeData: MerkleTreeData | null;
  chainConfig: AirdropChainConfig | null;
  isConfigLoading?: boolean;
};

export function useAirdropClaim({
  merkleTreeData,
  chainConfig,
  isConfigLoading = false,
}: UseAirdropClaimProps) {
  const { address, chain } = useAccount();
  const chainId = chain?.id ?? 8453;

  const [status, setStatus] = useState<AirdropStatus>("loading");
  const [userClaim, setUserClaim] = useState<AirdropClaim | null>(null);
  const [hasClaimed, setHasClaimed] = useState(false);

  const addActivity = useEonSwapStore((s) => s.addActivity);
  const patchActivity = useEonSwapStore((s) => s.patchActivity);

  // Get contract address from dynamic config
  const contractAddress = chainConfig?.contractAddress ?? undefined;
  const isDeployed = chainConfig?.status === "live" && Boolean(contractAddress);
  const configStatus = chainConfig?.status ?? "coming-soon";

  // Read contract state
  const { data: claimDeadline } = useReadContract({
    address: contractAddress,
    abi: EON_MERKLE_AIRDROP_ABI,
    functionName: "claimDeadline",
    query: { enabled: isDeployed },
  });

  const { data: emergencyMode } = useReadContract({
    address: contractAddress,
    abi: EON_MERKLE_AIRDROP_ABI,
    functionName: "emergencyMode",
    query: { enabled: isDeployed },
  });

  // Write contract
  const {
    writeContract,
    data: claimTxHash,
    isPending: isClaiming,
    error: claimError,
    reset: resetClaim,
  } = useWriteContract();

  const { isLoading: isWaitingConfirmation, isSuccess: isClaimSuccess } =
    useWaitForTransactionReceipt({
      hash: claimTxHash,
    });

  // Check user eligibility
  useEffect(() => {
    // Still loading config
    if (isConfigLoading) {
      setStatus("loading");
      return;
    }

    // Check config-based status first
    if (configStatus === "coming-soon" || !isDeployed) {
      setStatus("not-deployed");
      return;
    }

    if (configStatus === "ended") {
      setStatus("ended");
      return;
    }

    if (configStatus === "paused") {
      setStatus("paused");
      return;
    }

    if (!address || !merkleTreeData) {
      setStatus("loading");
      return;
    }

    const claim = findUserClaim(merkleTreeData, address);
    setUserClaim(claim ?? null);

    if (!claim) {
      setStatus("not-eligible");
      return;
    }

    // Check if campaign ended
    if (claimDeadline && Number(claimDeadline) < Date.now() / 1000) {
      setStatus("ended");
      return;
    }

    // Check if emergency mode
    if (emergencyMode) {
      setStatus("paused");
      return;
    }

    // Check if already claimed (would need to track this on-chain or via events)
    if (hasClaimed) {
      setStatus("claimed");
      return;
    }

    setStatus("eligible");
  }, [
    address,
    merkleTreeData,
    isDeployed,
    isConfigLoading,
    configStatus,
    claimDeadline,
    emergencyMode,
    hasClaimed,
  ]);

  // Handle claim success
  useEffect(() => {
    if (isClaimSuccess && userClaim) {
      setHasClaimed(true);
      setStatus("claimed");
      toast.success("Airdrop Claimed!", {
        description: `${userClaim.amountReadable} has been sent to your wallet`,
      });
    }
  }, [isClaimSuccess, userClaim]);

  // Handle claim error
  useEffect(() => {
    if (claimError) {
      const message = parseAirdropError(claimError);
      toast.error("Claim Failed", { description: message });

      // If already claimed, update status
      if (claimError.message?.includes("AlreadyClaimed")) {
        setHasClaimed(true);
        setStatus("claimed");
      }
    }
  }, [claimError]);

  const claim = useCallback(async () => {
    if (!contractAddress || !userClaim || !address) {
      return;
    }

    const activityId = crypto.randomUUID();
    const summary = `Claim ${userClaim.amountReadable} airdrop`;

    addActivity({
      id: activityId,
      kind: "airdrop_claim",
      status: "pending",
      summary,
      chainId,
      from: address,
    });

    const toastId = toast.loading("Claiming airdrop...", {
      description: userClaim.amountReadable,
    });

    try {
      writeContract({
        address: contractAddress,
        abi: EON_MERKLE_AIRDROP_ABI,
        functionName: "claim",
        args: [
          BigInt(userClaim.index),
          userClaim.address as `0x${string}`,
          BigInt(userClaim.amount),
          userClaim.proof as `0x${string}`[],
        ],
      });

      // Success handling is done in useEffect above
      toast.dismiss(toastId);
    } catch (error) {
      patchActivity(activityId, { status: "failed" });
      toast.dismiss(toastId);
      const message = parseAirdropError(error);
      toast.error("Claim Failed", { description: message });
    }
  }, [
    contractAddress,
    userClaim,
    address,
    chainId,
    writeContract,
    addActivity,
    patchActivity,
  ]);

  return {
    status,
    userClaim,
    claim,
    isClaiming: isClaiming || isWaitingConfirmation,
    isClaimSuccess,
    claimTxHash,
    resetClaim,
    contractAddress,
    claimDeadline: claimDeadline ? Number(claimDeadline) : undefined,
    isEmergencyMode: emergencyMode ?? false,
  };
}
