import type { VercelRequest, VercelResponse } from "@vercel/node";
import { kv } from "@vercel/kv";

type SubscriptionData = {
  wallet: string;
  channel: "email" | "telegram";
  contact: string;
  type: "airdrop" | "announcements";
  createdAt: number;
};

/**
 * POST /api/notify/subscribe
 * Subscribe to airdrop notifications
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { wallet, channel, contact, type } =
      req.body as Partial<SubscriptionData>;

    // Validation
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({ error: "Invalid wallet address" });
    }

    if (!channel || !["email", "telegram"].includes(channel)) {
      return res.status(400).json({ error: "Invalid channel" });
    }

    if (!contact || contact.length < 3 || contact.length > 100) {
      return res.status(400).json({ error: "Invalid contact value" });
    }

    const subType = type || "airdrop";

    // Email validation
    if (channel === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contact)) {
        return res.status(400).json({ error: "Invalid email address" });
      }
    }

    // Telegram validation
    if (channel === "telegram") {
      if (!contact.startsWith("@") && !/^\d+$/.test(contact)) {
        return res
          .status(400)
          .json({ error: "Invalid Telegram username or ID" });
      }
    }

    const subscription: SubscriptionData = {
      wallet: wallet.toLowerCase(),
      channel,
      contact,
      type: subType as "airdrop" | "announcements",
      createdAt: Date.now(),
    };

    // Store in KV if available
    if (typeof kv !== "undefined" && kv.set) {
      const key = `notify:${subType}:${wallet.toLowerCase()}`;
      await kv.set(key, JSON.stringify(subscription), {
        ex: 60 * 60 * 24 * 365,
      }); // 1 year

      // Also add to set for easy listing
      await kv.sadd(`notify:${subType}:subscriptions`, wallet.toLowerCase());
    } else {
      // Fallback: log subscription (for local dev)
      console.log("[Notify] New subscription:", subscription);
    }

    return res.status(200).json({
      success: true,
      message: `Subscribed to ${subType} notifications`,
    });
  } catch (error) {
    console.error("[Notify] Subscribe error:", error);
    return res.status(500).json({ error: "Failed to subscribe" });
  }
}
