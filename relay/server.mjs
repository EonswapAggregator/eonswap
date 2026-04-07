import { createServer } from 'node:http'
import { URL } from 'node:url'

const PORT = Number(process.env.RELAY_PORT || 8787)
const CHECK_TIMEOUT_MS = 12_000
const POLL_MS = 60_000
const ALERT_WEBHOOK_URL = process.env.RELAY_ALERT_WEBHOOK_URL?.trim() || ''
const ALERT_COOLDOWN_MS = Number(process.env.RELAY_ALERT_COOLDOWN_MS || 180_000)
const TELEGRAM_BOT_TOKEN = process.env.RELAY_TELEGRAM_BOT_TOKEN?.trim() || ''
const TELEGRAM_CHAT_ID = process.env.RELAY_TELEGRAM_CHAT_ID?.trim() || ''
const ALLOWED_ORIGIN = process.env.RELAY_ALLOWED_ORIGIN?.trim() || '*'
const EVENT_RATE_LIMIT_PER_MIN = Number(process.env.RELAY_EVENTS_RATE_LIMIT_PER_MIN || 60)
const WARN_LATENCY_MS = {
  kyber: Number(process.env.RELAY_WARN_KYBER_MS || 2500),
  lifi: Number(process.env.RELAY_WARN_LIFI_MS || 3500),
  coingecko: Number(process.env.RELAY_WARN_COINGECKO_MS || 2500),
  etherscan: Number(process.env.RELAY_WARN_ETHERSCAN_MS || 3000),
}

const windows = {
  h1: 60 * 60 * 1000,
  h24: 24 * 60 * 60 * 1000,
}

const samples = {
  kyber: [],
  lifi: [],
  coingecko: [],
  etherscan: [],
}

const status = {
  checkedAt: null,
  providers: {
    kyber: { ok: false, detail: 'not checked', latencyMs: null, h1: 100, h24: 100 },
    lifi: { ok: false, detail: 'not checked', latencyMs: null, h1: 100, h24: 100 },
    coingecko: { ok: false, detail: 'not checked', latencyMs: null, h1: 100, h24: 100 },
    etherscan: { ok: false, detail: 'not checked', latencyMs: null, h1: 100, h24: 100 },
  },
}
let lastAlertAt = 0
const eventRateMap = new Map()
const recentTxEvents = new Map()

function classifyError(error) {
  const msg = String(error?.message || error || '')
  if (/abort|timeout/i.test(msg)) return 'Timeout'
  if (/429|rate/i.test(msg)) return 'Rate limited (429)'
  if (/cors/i.test(msg)) return 'CORS blocked'
  return msg.slice(0, 120) || 'Unknown error'
}

async function fetchJson(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), CHECK_TIMEOUT_MS)
  const started = Date.now()
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } })
    const json = await res.json().catch(() => null)
    return { res, json, latencyMs: Date.now() - started }
  } finally {
    clearTimeout(timer)
  }
}

async function fetchJsonWithFallback(urls) {
  let lastErr = null
  for (const url of urls) {
    try {
      return await fetchJson(url)
    } catch (error) {
      lastErr = error
    }
  }
  throw lastErr ?? new Error('All fallback endpoints failed')
}

function updateSla(provider, ok) {
  const now = Date.now()
  samples[provider].push({ at: now, ok })
  samples[provider] = samples[provider].filter((s) => now - s.at <= windows.h24)
  const h1s = samples[provider].filter((s) => now - s.at <= windows.h1)
  const h24s = samples[provider]
  const h1 = h1s.length ? Math.round((h1s.filter((s) => s.ok).length / h1s.length) * 100) : 100
  const h24 = h24s.length ? Math.round((h24s.filter((s) => s.ok).length / h24s.length) * 100) : 100
  status.providers[provider].h1 = h1
  status.providers[provider].h24 = h24
}

function getClientIp(req) {
  const xff = String(req.headers['x-forwarded-for'] || '')
  return xff.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
}

function isRateLimited(req) {
  const now = Date.now()
  const key = getClientIp(req)
  const entry = eventRateMap.get(key) || { count: 0, resetAt: now + 60_000 }
  if (now > entry.resetAt) {
    entry.count = 0
    entry.resetAt = now + 60_000
  }
  entry.count += 1
  eventRateMap.set(key, entry)
  return entry.count > EVENT_RATE_LIMIT_PER_MIN
}

function alreadyProcessedTx(hash) {
  if (!hash) return false
  const now = Date.now()
  for (const [h, t] of recentTxEvents.entries()) {
    if (now - t > 15 * 60_000) recentTxEvents.delete(h)
  }
  if (recentTxEvents.has(hash)) return true
  recentTxEvents.set(hash, now)
  return false
}

async function sendAlert(message) {
  if (!ALERT_WEBHOOK_URL) return
  const now = Date.now()
  if (now - lastAlertAt < ALERT_COOLDOWN_MS) return
  lastAlertAt = now
  try {
    await fetch(ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: `[EonSwap Relay] ${message}`,
        at: new Date(now).toISOString(),
      }),
    })
  } catch {
    // swallow webhook errors to keep relay non-blocking
  }
}

async function sendTelegramMessage(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        disable_web_page_preview: true,
      }),
    })
  } catch {
    // non-blocking
  }
}

async function runChecks() {
  const etherscanKey = process.env.VITE_ETHERSCAN_API_KEY || process.env.ETHERSCAN_API_KEY
  const checks = await Promise.allSettled([
    (async () => {
      const q = new URLSearchParams({
        tokenIn: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        tokenOut: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        amountIn: '1000000000000000',
      })
      const { res, json, latencyMs } = await fetchJsonWithFallback([
        `https://aggregator-api.kyberswap.com/ethereum/api/v1/routes?${q}`,
        `https://aggregator-api.kyberswap.com/ethereum/api/v1/tokens`,
      ])
      const ok = res.ok && json?.code === 0
      status.providers.kyber = {
        ...status.providers.kyber,
        ok,
        latencyMs,
        detail: ok ? 'healthy' : `HTTP ${res.status}`,
      }
      updateSla('kyber', ok)
    })(),
    (async () => {
      const q = new URLSearchParams({
        fromChain: '1',
        toChain: '42161',
        fromToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        toToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        fromAmount: '1000000000000000',
        fromAddress: '0x0000000000000000000000000000000000000001',
      })
      const { res, json, latencyMs } = await fetchJsonWithFallback([
        `https://li.quest/v1/quote?${q}`,
        'https://li.quest/v1/chains',
      ])
      const ok = res.ok && (Boolean(json?.estimate) || Array.isArray(json?.chains))
      status.providers.lifi = {
        ...status.providers.lifi,
        ok,
        latencyMs,
        detail: ok ? 'healthy' : `HTTP ${res.status}`,
      }
      updateSla('lifi', ok)
    })(),
    (async () => {
      const q = new URLSearchParams({ vs_currency: 'usd', days: '1', interval: 'daily' })
      const { res, json, latencyMs } = await fetchJson(
        `https://api.coingecko.com/api/v3/coins/ethereum/market_chart?${q}`,
      )
      const ok = res.ok && Array.isArray(json?.prices)
      status.providers.coingecko = {
        ...status.providers.coingecko,
        ok,
        latencyMs,
        detail: ok ? 'healthy' : `HTTP ${res.status}`,
      }
      updateSla('coingecko', ok)
    })(),
    (async () => {
      if (!etherscanKey) {
        status.providers.etherscan = {
          ...status.providers.etherscan,
          ok: false,
          latencyMs: null,
          detail: 'Missing API key in relay env',
        }
        updateSla('etherscan', false)
        return
      }
      const q = new URLSearchParams({
        chainid: '1',
        module: 'account',
        action: 'txlist',
        address: '0x0000000000000000000000000000000000000000',
        startblock: '0',
        endblock: 'latest',
        page: '1',
        offset: '1',
        sort: 'desc',
        apikey: etherscanKey,
      })
      const { res, json, latencyMs } = await fetchJson(`https://api.etherscan.io/v2/api?${q}`)
      const ok = res.ok && typeof json?.status !== 'undefined'
      status.providers.etherscan = {
        ...status.providers.etherscan,
        ok,
        latencyMs,
        detail: ok ? 'healthy' : `HTTP ${res.status}`,
      }
      updateSla('etherscan', ok)
    })(),
  ])

  checks.forEach((result, idx) => {
    if (result.status === 'fulfilled') return
    const key = ['kyber', 'lifi', 'coingecko', 'etherscan'][idx]
    status.providers[key] = {
      ...status.providers[key],
      ok: false,
      detail: classifyError(result.reason),
      latencyMs: null,
    }
    updateSla(key, false)
  })

  status.checkedAt = Date.now()

  const degradedCore = ['kyber', 'lifi'].filter((id) => !status.providers[id].ok)
  const slowProviders = Object.entries(status.providers)
    .filter(([id, p]) => p.ok && typeof p.latencyMs === 'number' && p.latencyMs > WARN_LATENCY_MS[id])
    .map(([id, p]) => `${id}:${p.latencyMs}ms`)

  if (degradedCore.length) {
    await sendAlert(`Critical provider degraded: ${degradedCore.join(', ')}`)
  } else if (slowProviders.length) {
    await sendAlert(`High latency detected: ${slowProviders.join(', ')}`)
  }
}

function json(res, code, payload) {
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': ALLOWED_ORIGIN,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  })
  res.end(JSON.stringify(payload))
}

createServer(async (req, res) => {
  const u = new URL(req.url || '/', `http://${req.headers.host}`)
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': ALLOWED_ORIGIN,
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type,accept',
    })
    res.end()
    return
  }
  if (req.method === 'POST' && u.pathname === '/events/tx') {
    if (isRateLimited(req)) return json(res, 429, { ok: false, error: 'Rate limited' })
    let body = ''
    req.on('data', (chunk) => {
      body += String(chunk)
    })
    await new Promise((resolve) => req.on('end', resolve))
    try {
      const payload = JSON.parse(body || '{}')
      const kind = payload?.kind === 'bridge' ? 'Bridge' : 'Swap'
      const txHash = String(payload?.txHash || '')
      if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
        return json(res, 400, { ok: false, error: 'Invalid tx hash' })
      }
      if (alreadyProcessedTx(txHash)) return json(res, 200, { ok: true, dedup: true })
      const shortHash =
        txHash.length > 14 ? `${txHash.slice(0, 10)}...${txHash.slice(-6)}` : txHash || 'unknown'
      const chainId = Number(payload?.chainId || 0)
      const wallet = String(payload?.wallet || '')
      const summary = String(payload?.summary || '')
      const msg = [
        '✅ EonSwap transaction success',
        `Type: ${kind}`,
        `Chain: ${chainId || 'unknown'}`,
        `Tx: ${shortHash}`,
        wallet ? `Wallet: ${wallet}` : '',
        summary ? `Summary: ${summary}` : '',
      ]
        .filter(Boolean)
        .join('\n')
      await sendTelegramMessage(msg)
      return json(res, 200, { ok: true })
    } catch {
      return json(res, 400, { ok: false, error: 'Invalid payload' })
    }
  }
  if (u.pathname === '/healthz') {
    return json(res, 200, { ok: true, service: 'eonswap-monitor-relay' })
  }
  if (u.pathname === '/monitor/status') {
    return json(res, 200, status)
  }
  if (u.pathname === '/monitor/check-now') {
    await runChecks()
    return json(res, 200, status)
  }
  return json(res, 404, { error: 'Not found' })
}).listen(PORT, () => {
  console.log(`[relay] monitoring relay started on :${PORT}`)
  void runChecks()
  setInterval(() => void runChecks(), POLL_MS)
})
