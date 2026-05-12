import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Mail, Send, CheckCircle2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAccount } from "wagmi";

type NotifyChannel = "email" | "telegram";

type SubscriptionStatus = "idle" | "subscribing" | "success" | "error";

const RELAY_BASE_URL = import.meta.env.VITE_RELAY_URL || "/api";

type NotifySubscriptionProps = {
  className?: string;
  compact?: boolean;
};

export function NotifySubscription({
  className = "",
  compact = false,
}: NotifySubscriptionProps) {
  const { address, isConnected } = useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [channel, setChannel] = useState<NotifyChannel>("email");
  const [contactValue, setContactValue] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus>("idle");

  const handleSubscribe = useCallback(async () => {
    if (!contactValue.trim() || !address) return;

    // Basic validation
    if (channel === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactValue)) {
        toast.error("Invalid email address");
        return;
      }
    } else if (channel === "telegram") {
      // Telegram usernames start with @ or are numeric IDs
      if (!contactValue.startsWith("@") && !/^\d+$/.test(contactValue)) {
        toast.error("Enter your Telegram username (starting with @) or ID");
        return;
      }
    }

    setStatus("subscribing");

    try {
      const response = await fetch(`${RELAY_BASE_URL}/notify/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          channel,
          contact: contactValue,
          type: "airdrop",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to subscribe");
      }

      setStatus("success");
      toast.success("Subscribed!", {
        description: `You'll be notified when the airdrop goes live`,
      });

      // Reset after success
      setTimeout(() => {
        setIsOpen(false);
        setStatus("idle");
        setContactValue("");
      }, 2000);
    } catch (_error) {
      setStatus("error");
      toast.error("Failed to subscribe", {
        description: "Please try again later",
      });
      setTimeout(() => setStatus("idle"), 2000);
    }
  }, [contactValue, channel, address]);

  if (!isConnected) {
    return null;
  }

  // Compact mode - just button
  if (compact && !isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 rounded-full border border-uni-border bg-uni-surface px-4 py-2 text-sm font-medium text-neutral-300 transition hover:border-uni-pink/30 hover:text-white ${className}`}
      >
        <Bell className="h-4 w-4" />
        Get Notified
      </button>
    );
  }

  return (
    <div className={className}>
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="rounded-2xl border border-uni-border bg-uni-surface p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-medium text-white">Get Notified</h4>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {status === "success" ? (
              <div className="flex flex-col items-center py-4 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="mb-2 rounded-full bg-emerald-500/20 p-2"
                >
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </motion.div>
                <p className="text-sm text-emerald-400">
                  Subscribed successfully!
                </p>
              </div>
            ) : (
              <>
                {/* Channel selector */}
                <div className="mb-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setChannel("email")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                      channel === "email"
                        ? "bg-uni-pink/20 text-uni-pink"
                        : "bg-white/5 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannel("telegram")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                      channel === "telegram"
                        ? "bg-uni-pink/20 text-uni-pink"
                        : "bg-white/5 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <Send className="h-4 w-4" />
                    Telegram
                  </button>
                </div>

                {/* Input */}
                <div className="mb-3">
                  <input
                    type={channel === "email" ? "email" : "text"}
                    value={contactValue}
                    onChange={(e) => setContactValue(e.target.value)}
                    placeholder={
                      channel === "email" ? "your@email.com" : "@username or ID"
                    }
                    className="w-full rounded-xl border border-uni-border bg-uni-bg px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-uni-pink/50"
                    disabled={status === "subscribing"}
                  />
                </div>

                {/* Subscribe button */}
                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={!contactValue.trim() || status === "subscribing"}
                  className="w-full rounded-xl bg-uni-pink py-2.5 text-sm font-semibold text-white transition hover:bg-uni-pink-light disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === "subscribing" ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Subscribing...
                    </span>
                  ) : (
                    "Subscribe"
                  )}
                </button>

                <p className="mt-2 text-center text-[10px] text-neutral-500">
                  We'll notify you when the airdrop is live. No spam.
                </p>
              </>
            )}
          </motion.div>
        ) : (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-uni-border bg-uni-surface py-3 text-sm font-medium text-neutral-300 transition hover:border-uni-pink/30 hover:text-white"
          >
            <Bell className="h-4 w-4" />
            Get Notified When Live
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
