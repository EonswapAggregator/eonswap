# EonSwap Monitoring Relay

Minimal backend relay for provider health checks and uptime windows.

## Run

```bash
npm run monitor:relay
```

Optional env:

- `RELAY_PORT` (default `8787`)
- `RELAY_ALERT_WEBHOOK_URL` (optional; Slack/Discord/Telegram-compatible webhook)
- `RELAY_ALERT_COOLDOWN_MS` (default `180000`)
- `RELAY_WARN_KYBER_MS` (default `2500`)
- `RELAY_WARN_LIFI_MS` (default `3500`)
- `RELAY_WARN_COINGECKO_MS` (default `2500`)
- `RELAY_WARN_ETHERSCAN_MS` (default `3000`)

## Endpoints

- `GET /healthz` – relay process health
- `GET /monitor/status` – latest provider status + latency + SLA windows
- `GET /monitor/check-now` – trigger immediate checks

## Frontend integration

Set the app env:

```bash
VITE_MONITOR_RELAY_URL=http://127.0.0.1:8787
```

When configured, `Status` page health panel prefers relay data for Kyber/LI.FI/CoinGecko/Etherscan.

## Added reliability hardening

- Fallback probes for Kyber and LI.FI checks when primary probe fails.
- Webhook alerts with cooldown for critical degraded providers and high latency.
- Response security headers enabled on relay endpoints.
