/**
 * Simple in-memory rate limiter.
 * Works per-process. For PM2 cluster mode, each worker has its own counter
 * which still gives meaningful protection against bots hitting one worker.
 */

const store = new Map();
const CLEANUP_THRESHOLD = 5000;

function cleanup(windowStart) {
  if (store.size < CLEANUP_THRESHOLD) return;
  for (const [key, timestamps] of store.entries()) {
    const fresh = timestamps.filter((t) => t > windowStart);
    if (fresh.length === 0) {
      store.delete(key);
    } else {
      store.set(key, fresh);
    }
  }
}

/**
 * Returns true if the request should be blocked (limit exceeded).
 * @param {string} key       - client IP or any unique identifier
 * @param {number} limit     - max requests allowed in the window
 * @param {number} windowMs  - rolling window in milliseconds
 */
export function isRateLimited(key, limit = 60, windowMs = 60_000) {
  const now = Date.now();
  const windowStart = now - windowMs;

  cleanup(windowStart);

  const timestamps = (store.get(key) || []).filter((t) => t > windowStart);
  timestamps.push(now);
  store.set(key, timestamps);

  return timestamps.length > limit;
}
