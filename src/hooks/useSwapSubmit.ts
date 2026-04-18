import { useCallback, useState } from "react";
import { erc20Abi, parseUnits, UserRejectedRequestError } from "viem";
import { getPublicClient, getWalletClient } from "wagmi/actions";
import { useAccount, useSendTransaction } from "wagmi";
import { toast } from "sonner";
import { getEonChain, isEonAmmSwapChain, explorerTxUrl } from "../lib/chains";
import { buildEonAmmSwap, fetchEonAmmQuote } from "../lib/eonAmm";
import { formatTokenAmountUi } from "../lib/format";
import { isNativeToken } from "../lib/tokens";
import { toUserFacingErrorMessage } from "../lib/errors";
import { sendTxEventToRelay } from "../lib/txEvents";
import { trackReferralSwap } from "../lib/referral";
import { wagmiConfig } from "../wagmi";
import { useEonSwapStore } from "../store/useEonSwapStore";

export function useSwapSubmit() {
  const { address, chainId } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const [isWorking, setIsWorking] = useState(false);

  const sellToken = useEonSwapStore((s) => s.sellToken);
  const buyToken = useEonSwapStore((s) => s.buyToken);
  const sellAmountInput = useEonSwapStore((s) => s.sellAmountInput);
  const receiveFormatted = useEonSwapStore((s) => s.receiveFormatted);
  const slippageToleranceBps = useEonSwapStore((s) => s.slippageToleranceBps);
  const deadlineMinutes = useEonSwapStore((s) => s.deadlineMinutes);
  const quoteGasUsd = useEonSwapStore((s) => s.quoteGasUsd);
  const quoteL1FeeUsd = useEonSwapStore((s) => s.quoteL1FeeUsd);
  const addActivity = useEonSwapStore((s) => s.addActivity);
  const patchActivity = useEonSwapStore((s) => s.patchActivity);

  const submit = useCallback(async () => {
    if (!address || !chainId || !isEonAmmSwapChain(chainId)) {
      throw new Error("Connect your wallet on Base network swap.");
    }

    const chain = getEonChain(chainId);
    if (!chain) {
      throw new Error("Unsupported network.");
    }

    const publicClient = getPublicClient(wagmiConfig, { chainId: chain.id });
    if (!publicClient) {
      throw new Error("No RPC client for this network.");
    }

    const raw = sellAmountInput.trim();
    if (!raw || !receiveFormatted) {
      throw new Error("Enter an amount and wait for a quote.");
    }

    let amountInWei: bigint;
    try {
      amountInWei = parseUnits(raw, sellToken.decimals);
    } catch {
      throw new Error("Invalid sell amount");
    }

    setIsWorking(true);
    const activityId = crypto.randomUUID();
    const sellLabel = formatTokenAmountUi(amountInWei, sellToken.decimals);
    const summary = `Swap ${sellLabel} ${sellToken.symbol} → ~${receiveFormatted} ${buyToken.symbol}`;

    addActivity({
      id: activityId,
      kind: "swap",
      status: "pending",
      summary,
      chainId,
      from: address,
    });

    try {
      let quote = await fetchEonAmmQuote({
        chainId,
        tokenIn: sellToken.address,
        tokenOut: buyToken.address,
        amountIn: amountInWei.toString(),
        sender: address,
      });
      const eonAmmMode = String(quote.buildPayload?.mode ?? "").trim();
      const skipAllowanceForUnwrap = eonAmmMode === "unwrap-native";

      if (!isNativeToken(sellToken.address) && !skipAllowanceForUnwrap) {
        const allowance = await publicClient.readContract({
          address: sellToken.address as `0x${string}`,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, quote.routerAddress],
        });

        if (allowance < amountInWei) {
          const walletClient = await getWalletClient(wagmiConfig);
          if (!walletClient) throw new Error("Wallet not available");
          // ✅ SECURITY FIX (H-1): Always use exact approval (no unlimited)
          const approvalAmount = amountInWei;

          const approveHash = await walletClient.writeContract({
            chain,
            address: sellToken.address as `0x${string}`,
            abi: erc20Abi,
            functionName: "approve",
            args: [quote.routerAddress, approvalAmount],
          });

          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }

        quote = await fetchEonAmmQuote({
          chainId,
          tokenIn: sellToken.address,
          tokenOut: buyToken.address,
          amountIn: amountInWei.toString(),
          sender: address,
        });
      }

      const built = await buildEonAmmSwap({
        chainId,
        quote,
        sender: address,
        recipient: address,
        slippageToleranceBps,
        deadlineMinutes,
      });

      // Capture USD value for referral tracking
      const swapVolumeUsd = Number.parseFloat(quote.amountInUsd || "0") || 0;

      // Sanity-check server-provided gas against a client-side estimate.
      // Allow the server gas only if it's within a safe multiplier (1.2x) of the estimate.
      let gasToUse: bigint | undefined;
      try {
        const gasEstimate = await publicClient.estimateGas({
          account: address,
          to: built.routerAddress as `0x${string}`,
          data: built.data as `0x${string}`,
          value: BigInt(built.transactionValue),
        });
        const estimateBig = BigInt(gasEstimate);
        const providedGas = BigInt((built.gas ?? "0").toString() || "0");
        const maxAllowed = (estimateBig * 12n) / 10n; // 1.2x
        if (providedGas > 0n) {
          if (providedGas > maxAllowed) {
            throw new Error(
              "Server-provided gas exceeds safe estimate; aborting for safety.",
            );
          }
          gasToUse = providedGas;
        } else {
          // No gas provided by server; use estimated * 1.2 as a safe upper bound.
          gasToUse = maxAllowed;
        }
      } catch {
        // If estimate failed, fall back to server gas if present, otherwise abort.
        if (built.gas && built.gas !== "0") {
          gasToUse = BigInt(built.gas);
        } else {
          throw new Error(
            "Unable to estimate gas and no server gas provided; aborting.",
          );
        }
      }

      const hash = await sendTransactionAsync({
        chainId: chain.id,
        to: built.routerAddress,
        data: built.data,
        value: BigInt(built.transactionValue),
        gas: gasToUse,
      });

      patchActivity(activityId, { txHash: hash });

      // Show loading toast while waiting for confirmation
      const toastId = toast.loading("Swap pending...", {
        description: summary,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      patchActivity(activityId, {
        status: receipt.status === "success" ? "success" : "failed",
        blockNumber: Number(receipt.blockNumber),
      });
      if (receipt.status === "success") {
        const feeQuoteUsd =
          (Number.parseFloat(quoteGasUsd || "0") || 0) +
          (Number.parseFloat(quoteL1FeeUsd || "0") || 0);
        void sendTxEventToRelay({
          kind: "swap",
          status: "success",
          txHash: hash,
          chainId,
          wallet: address,
          summary,
          at: Date.now(),
          feeQuoteUsd: Number.isFinite(feeQuoteUsd) ? feeQuoteUsd : undefined,
        });
        // Track referral swap for rewards
        void trackReferralSwap(address, swapVolumeUsd, hash);
        // Toast notification
        const txExplorerUrl = explorerTxUrl(chainId, hash);
        toast.success(summary, {
          id: toastId,
          description: "Transaction confirmed",
          action: txExplorerUrl
            ? {
                label: "View on Explorer",
                onClick: () => window.open(txExplorerUrl, "_blank"),
              }
            : undefined,
        });
      } else {
        toast.error("Swap Failed", {
          id: toastId,
          description: "Transaction reverted on-chain",
        });
      }
    } catch (e) {
      if (e instanceof UserRejectedRequestError) {
        patchActivity(activityId, {
          status: "failed",
          summary: `${summary} (rejected)`,
        });
        toast.warning("Transaction Rejected", {
          description: "You rejected the transaction in your wallet",
        });
      } else {
        const msg = toUserFacingErrorMessage(e, "Swap failed");
        patchActivity(activityId, {
          status: "failed",
          summary: `${summary} — ${msg.slice(0, 120)}`,
        });
        toast.error("Swap Failed", {
          description: msg.slice(0, 100),
        });
      }
    } finally {
      setIsWorking(false);
    }
  }, [
    address,
    chainId,
    sellAmountInput,
    receiveFormatted,
    sellToken.address,
    sellToken.symbol,
    sellToken.decimals,
    buyToken.address,
    buyToken.symbol,
    addActivity,
    patchActivity,
    sendTransactionAsync,
    slippageToleranceBps,
    deadlineMinutes,
    quoteGasUsd,
    quoteL1FeeUsd,
  ]);

  return { submitSwap: submit, isWorking };
}
