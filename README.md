# EonSwap

EonSwap is a modern swap and bridge interface built with React + Vite.

It includes:
- Swap routing via Kyber API
- Bridge routing via LI.FI API
- Transaction status tracking (swap + bridge)
- API health panel with SLA and latency warnings
- Optional backend monitoring relay

## Tech Stack

- React 19 + TypeScript
- Vite + Tailwind CSS
- wagmi + RainbowKit
- viem
- Playwright (E2E)

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Configure env:

```bash
cp .env.local .env.local
```

Then set your values in `.env.local`.

3. Start app:

```bash
npm run dev
```

4. Build:

```bash
npm run build
```

## Environment Variables

Frontend (`VITE_*`):
- `VITE_WALLETCONNECT_PROJECT_ID`
- `VITE_ALCHEMY_API_KEY`
- `VITE_KYBER_CLIENT_ID`
- `VITE_KYBER_FEE_RECEIVER`
- `VITE_KYBER_FEE_BPS`
- `VITE_LIFI_API_KEY`
- `VITE_LIFI_INTEGRATOR`
- `VITE_LIFI_FEE_PERCENT`
- `VITE_ETHERSCAN_API_KEY`
- `VITE_SITE_DOMAIN`
- `VITE_MONITOR_RELAY_URL` (optional, leave empty if no relay)
- `VITE_HEALTH_WARN_KYBER_MS`
- `VITE_HEALTH_WARN_LIFI_MS`
- `VITE_HEALTH_WARN_COINGECKO_MS`
- `VITE_HEALTH_WARN_ETHERSCAN_MS`

Relay (optional backend monitor):
- `RELAY_PORT`
- `ETHERSCAN_API_KEY` (or `VITE_ETHERSCAN_API_KEY`)
- `RELAY_ALERT_WEBHOOK_URL`
- `RELAY_ALERT_COOLDOWN_MS`
- `RELAY_WARN_KYBER_MS`
- `RELAY_WARN_LIFI_MS`
- `RELAY_WARN_COINGECKO_MS`
- `RELAY_WARN_ETHERSCAN_MS`

## Monitoring Relay

Run relay locally:

```bash
npm run monitor:relay
```

Endpoints:
- `/healthz`
- `/monitor/status`
- `/monitor/check-now`

## Testing

Lint:

```bash
npm run lint
```

E2E:

```bash
npm run test:e2e
```

## Deployment Notes

- Frontend deploy target: Netlify / Cloudflare Pages
- Build command: `npm run build`
- Publish directory: `dist`
- For SPA routing on Netlify, use `_redirects` with:

```txt
/* /index.html 200
```

## Security

- `robots.txt`, `sitemap.xml`, and `.well-known/security.txt` are included
- Do not commit private secrets
- Treat all `VITE_*` values as client-visible
