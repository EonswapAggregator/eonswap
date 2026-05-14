const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/+$/, '')
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

let hasLoggedRedisConfigWarning = false

function isRedisEnabled(): boolean {
  return Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN)
}

function logRedisWarning(message: string, error?: unknown): void {
  if (hasLoggedRedisConfigWarning) return
  hasLoggedRedisConfigWarning = true
  console.warn(message, error)
}

async function runRedisCommand<T>(parts: Array<string | number>): Promise<T | null> {
  if (!isRedisEnabled()) return null

  try {
    const url = `${UPSTASH_REDIS_REST_URL}/${parts.map((part) => encodeURIComponent(String(part))).join('/')}`
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      logRedisWarning(`[Redis] REST command failed with status ${response.status}`)
      return null
    }

    const payload = (await response.json()) as { result?: T; error?: string }
    if (payload.error) {
      logRedisWarning(`[Redis] REST command returned an error: ${payload.error}`)
      return null
    }

    return payload.result ?? null
  } catch (error) {
    logRedisWarning('[Redis] REST command failed; falling back to in-memory cache.', error)
    return null
  }
}

export async function getRedisJson<T>(key: string): Promise<T | null> {
  const raw = await runRedisCommand<string | null>(['GET', key])
  if (!raw) return null

  try {
    return JSON.parse(raw) as T
  } catch (error) {
    logRedisWarning(`[Redis] Failed to parse cached JSON for key ${key}.`, error)
    return null
  }
}

export async function setRedisJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!isRedisEnabled()) return
  await runRedisCommand(['SETEX', key, ttlSeconds, JSON.stringify(value)])
}

export function isRedisCacheConfigured(): boolean {
  return isRedisEnabled()
}
