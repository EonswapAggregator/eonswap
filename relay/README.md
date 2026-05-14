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
4. Set **environment variables** on the host (not on Netlify): `RELAY_ALLOWED_ORIGIN`, `RELAY_ADMIN_SECRET`, **`ETHERSCAN_API_KEY`** or **`RELAY_ETHERSCAN_API_KEY`** (required for Etherscan in `/monitor/status`; Netlify’s `VITE_ETHERSCAN_API_KEY` is **not** available to the relay unless you duplicate it here), Telegram vars if used, etc.
5. Point the frontend **`VITE_MONITOR_RELAY_URL`** to the public **HTTPS** URL of this service (no trailing slash).
6. **Activity log file** defaults to `relay/data/activities.jsonl`. On ephemeral disks (free tiers), logs can reset on redeploy — use a **persistent disk** / volume mounted at `relay/data` if you need retention.

Optional env:

- `RELAY_PORT` (default `8787`)
- `RELAY_ALERT_WEBHOOK_URL` (optional; Slack/Discord/Telegram-compatible webhook)
- `RELAY_ALERT_COOLDOWN_MS` (default `180000`)
- `RELAY_WARN_EONSWAP_MS` (default `2500`)
- `RELAY_WARN_COINGECKO_MS` (default `2500`)
- `RELAY_WARN_ETHERSCAN_MS` (default `3000`)
- `RELAY_TELEGRAM_BOT_TOKEN` (optional; bot token for tx success alerts)
- `RELAY_TELEGRAM_CHAT_ID` (optional; target chat/channel id)
- `RELAY_ALLOWED_ORIGIN` (default `*`; in production set your frontend origin(s), **comma-separated** if you use Admin from prod and from `http://localhost:5173` / Netlify previews — must match the browser `Origin` header exactly)
- `RELAY_EVENTS_RATE_LIMIT_PER_MIN` (default `60`)
- `RELAY_EXPLORER_RATE_LIMIT_PER_MIN` (default `20`, for `GET /explorer/txlist`)
- `RELAY_EXPLORER_ACCESS_TOKEN` (optional; when set, `/explorer/txlist` requires header `x-relay-explorer-token` from your trusted caller/proxy)
- `RELAY_EVENTS_MAX_BODY_BYTES` (default `262144`)
- `RELAY_ADMIN_SECRET` (optional; required for `GET /admin/activities`)
- `RELAY_ACTIVITY_LOG_PATH` (optional; default `relay/data/activities.jsonl`)
- `UPSTASH_REDIS_REST_URL` (optional; enables shared Redis cache for relay subgraph queries)
- `UPSTASH_REDIS_REST_TOKEN` (optional; Upstash REST token paired with the URL above)
- `THE_GRAPH_API_KEY` (optional but recommended; server-side The Graph Gateway API key)
- `THE_GRAPH_SUBGRAPH_ID` (default `FoKBv95x7Z8uMuBZsBTkHKyHFGE9DTVVicwHp3U3eT5s`)
- `THE_GRAPH_SUBGRAPH_URL` (optional; endpoint without API key, used with `Authorization: Bearer <THE_GRAPH_API_KEY>`)
- `THE_GRAPH_CACHE_MS` (default `30000`; relay cache for repeated activity/leaderboard queries)

## Endpoints

- `GET /healthz` – relay process health
- `GET /monitor/status` – latest provider status + latency + SLA windows
- `GET /monitor/check-now` – trigger immediate checks (**requires** `Authorization: Bearer <RELAY_ADMIN_SECRET>` when admin secret is configured)
- `POST /events/tx` – receive tx success event and forward to Telegram (if configured)
- `POST /events/activity` – append one activity row (swap lifecycle) for admin reporting (rate-limited per IP)
- `GET /admin/activities` – return merged activity rows (latest row per `id`); header `Authorization: Bearer <RELAY_ADMIN_SECRET>`
- `GET /explorer/txlist?chainId=<id>&address=<0x...>&offset=<n>` – proxy Etherscan V2 txlist using relay API key (keeps key out of frontend). Optional token auth via `x-relay-explorer-token` (recommended when called via your own trusted proxy/server path).

- `GET /api/activity?limit=100&wallet=0x...` - returns indexed swap activity. Prefers The Graph Gateway when configured, then falls back to the local AMM indexer.
- `GET /public/leaderboard?limit=50` - returns wallet activity ranking with points, tier, volume, and activity breakdown. Prefers the subgraph and uses relay caching/rate limiting.

`/events/tx` includes basic hardening:

- request rate limiting per IP
- tx hash validation
- duplicate tx alert suppression (15-minute window)

## Frontend integration

Set the app env:

```bash
VITE_MONITOR_RELAY_URL=http://127.0.0.1:8787
```

When configured, `Status` page health panel prefers relay data for EonSwap/CoinGecko/Etherscan.

Activity rows are written when users trigger `addActivity` / `patchActivity` in the app (if `VITE_MONITOR_RELAY_URL` is set). On the **Admin** page, use **Refresh from relay** with the same secret as `RELAY_ADMIN_SECRET` to load all logged activity.

For The Graph production queries, keep the gateway key on this relay:

```bash
THE_GRAPH_API_KEY=...
THE_GRAPH_SUBGRAPH_ID=FoKBv95x7Z8uMuBZsBTkHKyHFGE9DTVVicwHp3U3eT5s
THE_GRAPH_SUBGRAPH_URL=https://gateway.thegraph.com/api/subgraphs/id/FoKBv95x7Z8uMuBZsBTkHKyHFGE9DTVVicwHp3U3eT5s
THE_GRAPH_CACHE_MS=30000
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

Do not put the Graph API key in frontend `VITE_*` variables. The frontend should keep using `VITE_MONITOR_RELAY_URL`, and the relay will proxy/cache subgraph reads.

## Added reliability hardening

- Health probes for EonSwap, CoinGecko, and Etherscan.
- Webhook alerts with cooldown for critical degraded providers and high latency.
- Response security headers enabled on relay endpoints.
- Durable Telegram notification queue with retry/backoff and dead-letter storage.
- Optional AMM indexer with RPC fallback, websocket listener, HTTP backfill, block confirmations, pair auto-discovery, and JSONL event storage.

## Referral Tracker (On-chain)

The relay includes an on-chain referral tracker that monitors swap events and calls `EonReferral.trackSwap()` automatically. This allows referral tracking **without modifying the router contract**.

### How it works

```
User Swap → EonAmmRouter → EonPair (emit Swap event)
                                    ↓
                          Relay Server (tracker)
                                    ↓
                          EonReferral.trackSwap()
```

### Configuration

Set these environment variables to enable the tracker:

```bash
# Required - Base Mainnet
TRACKER_RPC_URL=https://mainnet.base.org
TRACKER_FALLBACK_RPC_URLS=https://base-mainnet.g.alchemy.com/v2/...,https://your-secondary-rpc.example
EON_REFERRAL_ADDRESS=0xD878c03e94Dc9a42AB79C78Af7b06fAf341CAd55
EON_FACTORY_ADDRESS=0x24FF44E8B0839660Dfc381466be1fF8d946cE5C8

# Required for on-chain tracking
TRACKER_PRIVATE_KEY=0x...                        # Tracker wallet private key
TRACKER_CHAIN_ID=8453                            # Chain ID (default: 8453 = Base)

# Optional
SWAP_FEE_BPS=30                                  # Swap fee basis points (default: 30 = 0.3%)
```

## AMM Indexer

Enable the indexer in the same relay process:

```bash
INDEXER_ENABLED=1
INDEXER_CHAIN_ID=8453
INDEXER_FACTORY_ADDRESS=0x24FF44E8B0839660Dfc381466be1fF8d946cE5C8
INDEXER_START_BLOCK=0
INDEXER_DATA_DIR=./relay/data/indexer
INDEXER_RPC_URL=https://base-mainnet.g.alchemy.com/v2/...
INDEXER_FALLBACK_RPC_URLS=https://mainnet.base.org,https://your-secondary-rpc.example
INDEXER_WS_RPC_URL=wss://base-mainnet.g.alchemy.com/v2/...
INDEXER_CONFIRMATIONS=8
INDEXER_BATCH_BLOCKS=500
```

Data is persisted under `relay/data/indexer/` by default. `INDEXER_START_BLOCK=0` indexes from genesis, which can take a while on public RPCs; set it to the AMM factory deployment block when known for faster first sync. The relay exposes indexed swaps at `GET /api/activity?limit=100` and `GET /api/activity?wallet=0x...&limit=100`. The frontend uses `VITE_MONITOR_RELAY_URL` to read that endpoint and falls back to short browser scanning when the relay indexer is unavailable.

For high traffic, replace this JSONL store with Postgres while keeping the same cursor, confirmation, and dedupe semantics.

### Setup Steps

1. **Deploy EonReferral** with `tracker` role support (modified contract)
2. **Fund tracker wallet** with ETH for gas
3. **Call `setTracker(trackerAddress)`** on EonReferral as owner
4. **Set env vars** and restart relay

### Read-only Mode

If `TRACKER_PRIVATE_KEY` is not set, the tracker runs in read-only mode (logs swaps but doesn't call contract).
