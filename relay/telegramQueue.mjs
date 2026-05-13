import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const DEFAULT_MAX_ATTEMPTS = 8;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempts) {
  return Math.min(15 * 60_000, 2 ** Math.max(0, attempts) * 1_000);
}

async function readJsonArray(path) {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await rename(tmp, path);
}

export class TelegramRetryQueue {
  constructor({ queuePath, deadLetterPath, sendNow, maxAttempts = DEFAULT_MAX_ATTEMPTS }) {
    this.queuePath = queuePath;
    this.deadLetterPath = deadLetterPath;
    this.sendNow = sendNow;
    this.maxAttempts = maxAttempts;
    this.running = false;
    this.timer = null;
  }

  async enqueue({ dedupeKey, message }) {
    if (!message) return;
    const queue = await readJsonArray(this.queuePath);
    if (dedupeKey && queue.some((item) => item.dedupeKey === dedupeKey)) return;
    queue.push({
      id: crypto.randomUUID(),
      dedupeKey: dedupeKey || "",
      message,
      attempts: 0,
      nextAttemptAt: Date.now(),
      createdAt: Date.now(),
      lastError: "",
    });
    await writeJsonAtomic(this.queuePath, queue);
    this.schedule(100);
  }

  start() {
    this.schedule(250);
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  schedule(delayMs = 5_000) {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.drain();
    }, delayMs);
  }

  async drain() {
    if (this.running) return;
    this.running = true;
    try {
      const now = Date.now();
      const queue = await readJsonArray(this.queuePath);
      const remaining = [];
      const dead = await readJsonArray(this.deadLetterPath);

      for (const item of queue) {
        if (Number(item.nextAttemptAt || 0) > now) {
          remaining.push(item);
          continue;
        }

        try {
          await this.sendNow(item.message);
          await sleep(250);
        } catch (error) {
          const attempts = Number(item.attempts || 0) + 1;
          const retryAfterMs = Number(error?.retryAfterMs || 0);
          const nextAttemptAt = Date.now() + (retryAfterMs > 0 ? retryAfterMs : backoffMs(attempts));
          const failed = {
            ...item,
            attempts,
            nextAttemptAt,
            lastError: error instanceof Error ? error.message : String(error),
          };
          if (attempts >= this.maxAttempts) dead.push({ ...failed, deadAt: Date.now() });
          else remaining.push(failed);
        }
      }

      await writeJsonAtomic(this.queuePath, remaining);
      await writeJsonAtomic(this.deadLetterPath, dead.slice(-1_000));
      if (remaining.length) this.schedule(5_000);
    } finally {
      this.running = false;
    }
  }
}
