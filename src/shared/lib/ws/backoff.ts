export interface BackoffOptions {
  /** First delay, ms. */
  baseMs: number
  /** Upper limit, ms. */
  maxMs: number
  /** Returns 0..1; injectable for tests. */
  random?: () => number
}

/**
 * Exponential backoff with jitter: base * 2^attempt, capped at max, then
 * randomized to 50–100% so many clients do not reconnect at the same moment.
 */
export function backoffDelay(
  attempt: number,
  { baseMs, maxMs, random = Math.random }: BackoffOptions,
) {
  const exp = Math.min(maxMs, baseMs * 2 ** attempt)
  return Math.round(exp * (0.5 + random() * 0.5))
}
