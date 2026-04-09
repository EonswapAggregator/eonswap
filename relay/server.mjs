import { appendFile, mkdir, readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { URL, fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ACTIVITY_LOG_PATH =
  process.env.RELAY_ACTIVITY_LOG_PATH?.trim() || join(__dirname, 'data', 'activities.jsonl')
const RELAY_ADMIN_SECRET = process.env.RELAY_ADMIN_SECRET?.trim() || ''

const PORT = Number(process.env.PORT || process.env.RELAY_PORT || 8787)
/** Railway/Render/Fly expect HTTP on $PORT and often require binding all interfaces. */
const LISTEN_HOST = process.env.HOST?.trim() || '0.0.0.0'
const CHECK_TIMEOUT_MS = 12_000
const POLL_MS = 300_000
const ALERT_WEBHOOK_URL = process.env.RELAY_ALERT_WEBHOOK_URL?.trim() || ''
const ALERT_COOLDOWN_MS = Number(process.env.RELAY_ALERT_COOLDOWN_MS || 180_000)
const TELEGRAM_BOT_TOKEN = process.env.RELAY_TELEGRAM_BOT_TOKEN?.trim() || ''
const TELEGRAM_CHAT_ID = process.env.RELAY_TELEGRAM_CHAT_ID?.trim() || ''
const TELEGRAM_BANNER_URL = process.env.RELAY_TELEGRAM_BANNER_URL?.trim() || ''
const TELEGRAM_BANNER_LOCAL_PATH =
  process.env.RELAY_TELEGRAM_BANNER_LOCAL_PATH?.trim() ||
  join(__dirname, '..', 'public', 'hero-banner.png')
/** Comma-separated list, or `*` when unset / empty (dev). Entries match after trimming trailing `/`. */
const RELAY_CORS_RAW = process.env.RELAY_ALLOWED_ORIGIN?.trim() || '*'
const CORS_ALLOW_ALL = RELAY_CORS_RAW === '*'
function normalizeCorsOrigin(s) {
  return String(s).trim().replace(/\/+$/u, '')
}
const CORS_ALLOWED_NORMALIZED = CORS_ALLOW_ALL
  ? new Set()
  : new Set(
      RELAY_CORS_RAW.split(',')
        .map((s) => normalizeCorsOrigin(s))
        .filter(Boolean),
    )

function corsOriginHeader(req) {
  if (CORS_ALLOW_ALL) return '*'
  const o = String(req.headers.origin ?? '').trim()
  if (!o) return null
  if (CORS_ALLOWED_NORMALIZED.has(normalizeCorsOrigin(o))) return o
  return null
}
const EVENT_RATE_LIMIT_PER_MIN = Number(process.env.RELAY_EVENTS_RATE_LIMIT_PER_MIN || 60)
const EXPLORER_RATE_LIMIT_PER_MIN = Number(process.env.RELAY_EXPLORER_RATE_LIMIT_PER_MIN || 20)
const EVENT_MAX_BODY_BYTES = Number(process.env.RELAY_EVENTS_MAX_BODY_BYTES || 262_144)
const EXPLORER_ACCESS_TOKEN = process.env.RELAY_EXPLORER_ACCESS_TOKEN?.trim() || ''
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
const explorerRateMap = new Map()
const recentTxEvents = new Map()

function classifyError(error) {
  const msg = String(error?.message || error || '')
  if (/abort|timeout/i.test(msg)) return 'Timeout'
  if (/429|rate/i.test(msg)) return 'Rate limited (429)'
  if (/cors/i.test(msg)) return 'CORS blocked'
  return msg.slice(0, 120) || 'Unknown error'
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function explorerTxUrl(chainId, txHash) {
  const prefixByChain = {
    1: 'https://etherscan.io/tx/',
    10: 'https://optimistic.etherscan.io/tx/',
    56: 'https://bscscan.com/tx/',
    137: 'https://polygonscan.com/tx/',
    8453: 'https://basescan.org/tx/',
    42161: 'https://arbiscan.io/tx/',
  }
  const prefix = prefixByChain[Number(chainId)] || 'https://etherscan.io/tx/'
  return `${prefix}${txHash}`
}

function explorerAddressUrl(chainId, wallet) {
  const prefixByChain = {
    1: 'https://etherscan.io/address/',
    10: 'https://optimistic.etherscan.io/address/',
    56: 'https://bscscan.com/address/',
    137: 'https://polygonscan.com/address/',
    8453: 'https://basescan.org/address/',
    42161: 'https://arbiscan.io/address/',
  }
  const prefix = prefixByChain[Number(chainId)]
  if (!prefix) return null
  return `${prefix}${wallet}`
}

function chainLabel(chainId) {
  const labels = {
    1: 'Ethereum',
    10: 'Optimism',
    56: 'BNB Smart Chain',
    137: 'Polygon',
    8453: 'Base',
    42161: 'Arbitrum',
  }
  const id = Number(chainId)
  const name = labels[id]
  return name ? `${name} (${id})` : `Unknown (${id || 'n/a'})`
}

function shortHex(value, start = 8, end = 6) {
  const v = String(value || '')
  return v.length > start + end + 3 ? `${v.slice(0, start)}...${v.slice(-end)}` : v
}

function parsePriceSnapshot(summary) {
  const s = String(summary || '').trim()
  const arrow = s.includes('→') ? '→' : s.includes('->') ? '->' : null
  if (!arrow) return null
  const [leftRaw, rightRaw] = s.split(arrow)
  const left = leftRaw
    ?.replace(/^\s*(Swap|Bridge)\s+/iu, '')
    .trim()
  const right = rightRaw
    ?.replace(/\((done|failed|rejected)\)\s*$/iu, '')
    .trim()
  if (!left && !right) return null
  return {
    from: left || '',
    to: right || '',
  }
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

function isExplorerRateLimited(req) {
  const now = Date.now()
  const key = getClientIp(req)
  const entry = explorerRateMap.get(key) || { count: 0, resetAt: now + 60_000 }
  if (now > entry.resetAt) {
    entry.count = 0
    entry.resetAt = now + 60_000
  }
  entry.count += 1
  explorerRateMap.set(key, entry)
  return entry.count > EXPLORER_RATE_LIMIT_PER_MIN
}

async function readJsonBody(req, maxBytes = EVENT_MAX_BODY_BYTES) {
  let body = ''
  let size = 0
  await new Promise((resolve, reject) => {
    req.on('data', (chunk) => {
      const text = String(chunk)
      size += Buffer.byteLength(text, 'utf8')
      if (size > maxBytes) {
        reject(new Error('Payload too large'))
        req.destroy()
        return
      }
      body += text
    })
    req.on('end', resolve)
    req.on('error', reject)
  })
  return JSON.parse(body || '{}')
}

function validateActivityPayload(payload) {
  const id = String(payload?.id || '')
  if (id.length < 4 || id.length > 128) return { error: 'Invalid id' }
  const kind =
    payload?.kind === 'bridge'
      ? 'bridge'
      : payload?.kind === 'swap'
        ? 'swap'
        : String(payload?.summary ?? '').toLowerCase().startsWith('bridge ')
          ? 'bridge'
          : 'swap'
  const status = payload?.status
  if (!['pending', 'success', 'failed'].includes(status)) return { error: 'Invalid status' }
  const createdAt = Number(payload?.createdAt)
  if (!Number.isFinite(createdAt) || createdAt < 0) return { error: 'Invalid createdAt' }
  const summary = String(payload?.summary ?? '')
  if (summary.length > 4000) return { error: 'Summary too long' }
  const chainId = Number(payload?.chainId)
  if (!Number.isInteger(chainId) || chainId < 1 || chainId > 99_999_999) {
    return { error: 'Invalid chainId' }
  }
  const out = { id, kind, status, createdAt, summary, chainId }
  if (payload?.txHash) {
    const h = String(payload.txHash)
    if (!/^0x[a-fA-F0-9]{64}$/.test(h)) return { error: 'Invalid txHash' }
    out.txHash = h
  }
  if (payload?.from) {
    const f = String(payload.from)
    if (!/^0x[a-fA-F0-9]{40}$/.test(f)) return { error: 'Invalid from' }
    out.from = f
  }
  if (payload?.blockNumber != null && payload.blockNumber !== '') {
    const b = Number(payload.blockNumber)
    if (!Number.isFinite(b)) return { error: 'Invalid blockNumber' }
    out.blockNumber = Math.floor(b)
  }
  return { record: out }
}

function normalizeActivityFromLine(obj) {
  if (!obj || typeof obj.id !== 'string') return null
  if (!['pending', 'success', 'failed'].includes(obj.status)) return null
  const createdAt = Number(obj.createdAt)
  if (!Number.isFinite(createdAt)) return null
  const kind = obj.kind === 'bridge' ? 'bridge' : obj.kind === 'swap' ? 'swap' : 'swap'
  const row = {
    id: obj.id,
    kind,
    status: obj.status,
    createdAt,
    summary: String(obj.summary ?? ''),
    chainId: Number(obj.chainId) || 0,
  }
  if (obj.txHash) row.txHash = String(obj.txHash)
  if (obj.from) row.from = String(obj.from)
  if (obj.blockNumber != null) row.blockNumber = Number(obj.blockNumber)
  return row
}

async function fetchEtherscanTxListForRelay({ chainId, address, offset = 35 }) {
  const apiKey = etherscanApiKeyForRelay()
  if (!apiKey) {
    throw new Error(
      'Missing API key: set ETHERSCAN_API_KEY or RELAY_ETHERSCAN_API_KEY on the relay',
    )
  }
  const q = new URLSearchParams({
    chainid: String(chainId),
    module: 'account',
    action: 'txlist',
    address,
    startblock: '0',
    endblock: '99999999',
    page: '1',
    offset: String(offset),
    sort: 'desc',
    apikey: apiKey,
  })
  const { res, json } = await fetchJson(`https://api.etherscan.io/v2/api?${q}`)
  if (!res.ok) throw new Error(`Explorer HTTP ${res.status}`)
  if (Array.isArray(json?.result)) return json.result
  const msg = String(json?.result || json?.message || '')
  if (/no transactions found|no records found/i.test(msg)) return []
  throw new Error(msg || 'Explorer API error')
}

async function appendActivityRecord(record) {
  await mkdir(dirname(ACTIVITY_LOG_PATH), { recursive: true })
  await appendFile(ACTIVITY_LOG_PATH, `${JSON.stringify(record)}\n`, 'utf8')
}

async function readActivitiesMerged(maxLines = 20_000) {
  let raw = ''
  try {
    raw = await readFile(ACTIVITY_LOG_PATH, 'utf8')
  } catch {
    return []
  }
  const lines = raw.split('\n').filter((l) => l.trim())
  const slice = lines.length > maxLines ? lines.slice(-maxLines) : lines
  const byId = new Map()
  for (const line of slice) {
    try {
      const obj = JSON.parse(line)
      const row = normalizeActivityFromLine(obj)
      if (row) byId.set(row.id, row)
    } catch {
      // skip corrupt line
    }
  }
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt)
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
    if (TELEGRAM_BANNER_URL) {
      const photoRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          photo: TELEGRAM_BANNER_URL,
          caption: message.slice(0, 1024),
          parse_mode: 'HTML',
          disable_notification: false,
        }),
      })
      if (photoRes.ok) return
    }
    try {
      const bytes = await readFile(TELEGRAM_BANNER_LOCAL_PATH)
      const form = new FormData()
      form.set('chat_id', TELEGRAM_CHAT_ID)
      form.set('parse_mode', 'HTML')
      form.set('caption', message.slice(0, 1024))
      form.set(
        'photo',
        new Blob([bytes], { type: 'image/png' }),
        TELEGRAM_BANNER_LOCAL_PATH.split('/').pop() || 'hero-banner.png',
      )
      const localPhotoRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: form,
      })
      if (localPhotoRes.ok) return
    } catch {
      // local banner fallback is best-effort
    }
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })
  } catch {
    // non-blocking
  }
}

function etherscanApiKeyForRelay() {
  const k =
    process.env.RELAY_ETHERSCAN_API_KEY?.trim() ||
    process.env.ETHERSCAN_API_KEY?.trim() ||
    process.env.VITE_ETHERSCAN_API_KEY?.trim()
  return k || ''
}

async function runChecks() {
  const etherscanKey = etherscanApiKeyForRelay()
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
          detail:
            'Missing API key: set ETHERSCAN_API_KEY or RELAY_ETHERSCAN_API_KEY on the relay (Railway)',
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

function json(req, res, code, payload) {
  const acao = corsOriginHeader(req)
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  }
  if (acao) headers['access-control-allow-origin'] = acao
  res.writeHead(code, headers)
  res.end(JSON.stringify(payload))
}

createServer(async (req, res) => {
  const u = new URL(req.url || '/', `http://${req.headers.host}`)
  if (req.method === 'OPTIONS') {
    const acao = corsOriginHeader(req)
    const h = {
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type,accept,authorization',
    }
    if (acao) h['access-control-allow-origin'] = acao
    res.writeHead(204, h)
    res.end()
    return
  }
  if (req.method === 'GET' && u.pathname === '/admin/activities') {
    if (!RELAY_ADMIN_SECRET) {
      return json(req, res, 503, { ok: false, error: 'Admin export not configured' })
    }
    const auth = String(req.headers.authorization || '')
    if (auth !== `Bearer ${RELAY_ADMIN_SECRET}`) {
      return json(req, res, 401, { ok: false, error: 'Unauthorized' })
    }
    const activities = await readActivitiesMerged()
    return json(req, res, 200, { ok: true, activities })
  }
  if (req.method === 'GET' && u.pathname === '/explorer/txlist') {
    if (isExplorerRateLimited(req)) return json(req, res, 429, { ok: false, error: 'Rate limited' })
    // Require browser Origin to match allowlist when allowlist is configured.
    if (!CORS_ALLOW_ALL && !corsOriginHeader(req)) {
      return json(req, res, 403, { ok: false, error: 'Forbidden origin' })
    }
    if (EXPLORER_ACCESS_TOKEN) {
      const token = String(req.headers['x-relay-explorer-token'] || '').trim()
      if (!token || token !== EXPLORER_ACCESS_TOKEN) {
        return json(req, res, 401, { ok: false, error: 'Unauthorized explorer token' })
      }
    }
    const chainId = Number(u.searchParams.get('chainId') || '0')
    const address = String(u.searchParams.get('address') || '').trim()
    const offsetRaw = Number(u.searchParams.get('offset') || '35')
    const offset = Number.isFinite(offsetRaw)
      ? Math.min(100, Math.max(1, Math.floor(offsetRaw)))
      : 35
    if (!Number.isInteger(chainId) || chainId < 1) {
      return json(req, res, 400, { ok: false, error: 'Invalid chainId' })
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return json(req, res, 400, { ok: false, error: 'Invalid address' })
    }
    try {
      const txs = await fetchEtherscanTxListForRelay({ chainId, address, offset })
      return json(req, res, 200, { ok: true, result: txs })
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e || 'Explorer proxy error')
      return json(req, res, 502, { ok: false, error: msg.slice(0, 200) })
    }
  }
  if (req.method === 'POST' && u.pathname === '/events/activity') {
    if (isRateLimited(req)) return json(req, res, 429, { ok: false, error: 'Rate limited' })
    try {
      const payload = await readJsonBody(req)
      const checked = validateActivityPayload(payload)
      if (checked.error) return json(req, res, 400, { ok: false, error: checked.error })
      await appendActivityRecord({ ...checked.record, serverAt: Date.now() })
      return json(req, res, 200, { ok: true })
    } catch (e) {
      if (String(e instanceof Error ? e.message : e).includes('Payload too large')) {
        return json(req, res, 413, { ok: false, error: 'Payload too large' })
      }
      return json(req, res, 400, { ok: false, error: 'Invalid payload' })
    }
  }
  if (req.method === 'POST' && u.pathname === '/events/tx') {
    if (isRateLimited(req)) return json(req, res, 429, { ok: false, error: 'Rate limited' })
    try {
      const payload = await readJsonBody(req)
      const kind = payload?.kind === 'bridge' ? 'Bridge' : 'Swap'
      const txHash = String(payload?.txHash || '')
      if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
        return json(req, res, 400, { ok: false, error: 'Invalid tx hash' })
      }
      if (alreadyProcessedTx(txHash)) return json(req, res, 200, { ok: true, dedup: true })
      const shortHash = shortHex(txHash, 10, 6) || 'unknown'
      const chainId = Number(payload?.chainId || 0)
      const wallet = String(payload?.wallet || '')
      const summary = String(payload?.summary || '')
      const timestampUtc = new Date().toISOString()
      const txUrl = explorerTxUrl(chainId, txHash)
      const walletUrl = /^0x[a-fA-F0-9]{40}$/.test(wallet) ? explorerAddressUrl(chainId, wallet) : null
      const shortWallet = wallet ? shortHex(wallet, 8, 6) : ''
      const price = parsePriceSnapshot(summary)
      const msg = [
        '✅ <b>EonSwap · Execution Confirmed</b>',
        '',
        '<b>Overview</b>',
        `• Product      : ${escapeHtml(kind)}`,
        '• Status       : Success',
        `• Network      : ${escapeHtml(chainLabel(chainId))}`,
        `• Tx Hash      : <code>${escapeHtml(shortHash)}</code>`,
        shortWallet
          ? walletUrl
            ? `• Wallet       : <a href="${escapeHtml(walletUrl)}"><code>${escapeHtml(shortWallet)}</code></a>`
            : `• Wallet       : <code>${escapeHtml(shortWallet)}</code>`
          : '',
        `• Timestamp    : ${escapeHtml(timestampUtc)}`,
        '',
        '<b>Price Snapshot</b>',
        price?.from ? `• You Send     : ${escapeHtml(price.from)}` : '',
        price?.to ? `• You Receive  : ${escapeHtml(price.to)}` : '',
        summary ? `• Route        : ${escapeHtml(summary)}` : '',
        '',
        `🔎 <a href="${escapeHtml(txUrl)}">Open transaction in explorer</a>`,
      ]
        .filter(Boolean)
        .join('\n')
      await sendTelegramMessage(msg)
      return json(req, res, 200, { ok: true })
    } catch (e) {
      if (String(e instanceof Error ? e.message : e).includes('Payload too large')) {
        return json(req, res, 413, { ok: false, error: 'Payload too large' })
      }
      return json(req, res, 400, { ok: false, error: 'Invalid payload' })
    }
  }
  if (u.pathname === '/healthz') {
    return json(req, res, 200, { ok: true, service: 'eonswap-monitor-relay' })
  }
  if (u.pathname === '/monitor/status') {
    return json(req, res, 200, status)
  }
  if (u.pathname === '/monitor/check-now') {
    if (RELAY_ADMIN_SECRET) {
      const auth = String(req.headers.authorization || '')
      if (auth !== `Bearer ${RELAY_ADMIN_SECRET}`) {
        return json(req, res, 401, { ok: false, error: 'Unauthorized' })
      }
    }
    await runChecks()
    return json(req, res, 200, status)
  }
  return json(req, res, 404, { error: 'Not found' })
}).listen(PORT, LISTEN_HOST, () => {
  console.log(
    `[relay] listening http://${LISTEN_HOST}:${PORT} (env PORT=${process.env.PORT ?? 'unset'} RELAY_PORT=${process.env.RELAY_PORT ?? 'unset'})`,
  )
  void runChecks()
  setInterval(() => void runChecks(), POLL_MS)
})
