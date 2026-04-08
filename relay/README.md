# EonSwap Monitoring Relay

Minimal backend relay for provider health checks and uptime windows.

## Run (local)

```bash
npm run monitor:relay
```

Listen port: **`PORT`** (Render/Railway/Fly) if set, else **`RELAY_PORT`**, else `8787`.

## Production (outline)

1. Deploy this repo (or only the `relay/` folder + `package.json` if you split) as a **Node web service**.
2. **Start command** (from repo root): `node relay/server.mjs`  
   (Ensure Node 20+; use the same `package.json` `type: "module"` context, or run from project root.)
3. **Health check URL:** `GET /healthz`
4. Set **environment variables** on the host (not on Netlify): `RELAY_ALLOWED_ORIGIN`, `RELAY_ADMIN_SECRET`, `ETHERSCAN_API_KEY` / `VITE_ETHERSCAN_API_KEY`, Telegram vars if used, etc.
5. Point the frontend **`VITE_MONITOR_RELAY_URL`** to the public **HTTPS** URL of this service (no trailing slash).
6. **Activity log file** defaults to `relay/data/activities.jsonl`. On ephemeral disks (free tiers), logs can reset on redeploy — use a **persistent disk** / volume mounted at `relay/data` if you need retention.

Optional env:

- `RELAY_PORT` (default `8787`)
- `RELAY_ALERT_WEBHOOK_URL` (optional; Slack/Discord/Telegram-compatible webhook)
- `RELAY_ALERT_COOLDOWN_MS` (default `180000`)
- `RELAY_WARN_KYBER_MS` (default `2500`)
- `RELAY_WARN_LIFI_MS` (default `3500`)
- `RELAY_WARN_COINGECKO_MS` (default `2500`)
- `RELAY_WARN_ETHERSCAN_MS` (default `3000`)
- `RELAY_TELEGRAM_BOT_TOKEN` (optional; bot token for tx success alerts)
- `RELAY_TELEGRAM_CHAT_ID` (optional; target chat/channel id)
- `RELAY_ALLOWED_ORIGIN` (default `*`; in production set your frontend origin(s), **comma-separated** if you use Admin from prod and from `http://localhost:5173` / Netlify previews — must match the browser `Origin` header exactly)
- `RELAY_EVENTS_RATE_LIMIT_PER_MIN` (default `60`)
- `RELAY_ADMIN_SECRET` (optional; required for `GET /admin/activities`)
- `RELAY_ACTIVITY_LOG_PATH` (optional; default `relay/data/activities.jsonl`)

## Endpoints

- `GET /healthz` – relay process health
- `GET /monitor/status` – latest provider status + latency + SLA windows
- `GET /monitor/check-now` – trigger immediate checks
- `POST /events/tx` – receive tx success event and forward to Telegram (if configured)
- `POST /events/activity` – append one activity row (swap/bridge lifecycle) for aggregated admin reporting (rate-limited per IP)
- `GET /admin/activities` – return merged activity rows (latest row per `id`); header `Authorization: Bearer <RELAY_ADMIN_SECRET>`

`/events/tx` includes basic hardening:
- request rate limiting per IP
- tx hash validation
- duplicate tx alert suppression (15-minute window)

## Frontend integration

Set the app env:

```bash
VITE_MONITOR_RELAY_URL=http://127.0.0.1:8787
```

When configured, `Status` page health panel prefers relay data for Kyber/LI.FI/CoinGecko/Etherscan.

Activity rows are written when users trigger `addActivity` / `patchActivity` in the app (if `VITE_MONITOR_RELAY_URL` is set). On the **Admin** page, use **Refresh from relay** with the same secret as `RELAY_ADMIN_SECRET` to load all logged activity.

## Added reliability hardening

- Fallback probes for Kyber and LI.FI checks when primary probe fails.
- Webhook alerts with cooldown for critical degraded providers and high latency.
- Response security headers enabled on relay endpoints.
