<p align="center">
  <img src="./public/favicon.png" alt="EonSwap Logo" width="96" />
</p>

<h1 align="center">EonSwap</h1>

<p align="center">
  <a href="https://eonswap.us/">https://eonswap.us/</a>
</p>

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
cp .env.example .env.local
```

Then set your values in `.env.local`.
Never commit `.env.local` or real credentials to public repositories.

3. Start app:

```bash
npm run dev
```

4. Build:

```bash
npm run build
```

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
- Keep server-only credentials in relay/runtime env, not in frontend source
