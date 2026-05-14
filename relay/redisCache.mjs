const UPSTASH_REDIS_REST_URL =
  process.env.UPSTASH_REDIS_REST_URL?.trim().replace(/\/+$/u, "") || "";
const UPSTASH_REDIS_REST_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || "";

let hasLoggedRedisWarning = false;

function isRedisEnabled() {
  return Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);
}

function logRedisWarning(message, error) {
  if (hasLoggedRedisWarning) return;
  hasLoggedRedisWarning = true;
  console.warn(message, error);
}

async function runRedisCommand(parts) {
  if (!isRedisEnabled()) return null;

  try {
    const url =
      `${UPSTASH_REDIS_REST_URL}/` +
      parts.map((part) => encodeURIComponent(String(part))).join("/");
    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
        accept: "application/json",
      },
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      logRedisWarning(
        `[relay] Redis REST command failed with status ${response.status}`,
      );
      return null;
    }

    const payload = await response.json().catch(() => null);
    if (payload?.error) {
      logRedisWarning(
        `[relay] Redis REST command returned an error: ${payload.error}`,
      );
      return null;
    }

    return payload?.result ?? null;
  } catch (error) {
    logRedisWarning(
      "[relay] Redis REST command failed; falling back to in-memory cache.",
      error,
    );
    return null;
  }
}

export async function getRedisJson(key) {
  const raw = await runRedisCommand(["GET", key]);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    logRedisWarning(
      `[relay] Failed to parse Redis JSON for key ${key}.`,
      error,
    );
    return null;
  }
}

export async function setRedisJson(key, value, ttlSeconds) {
  if (!isRedisEnabled()) return;
  await runRedisCommand(["SETEX", key, ttlSeconds, JSON.stringify(value)]);
}

export function isRedisCacheConfigured() {
  return isRedisEnabled();
}
