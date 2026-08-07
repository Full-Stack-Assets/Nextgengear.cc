/**
 * Shared HTTP helper for the generation pipeline.
 *
 * Every source and integration talks to a flaky third-party API on a free tier,
 * so a single request can hang, rate-limit, or 5xx transiently. `fetchWithRetry`
 * wraps `fetch` with two guarantees the raw call doesn't give us:
 *
 *   1. A hard timeout (via AbortController) so one stalled host can't eat the
 *      Action's 15-minute budget.
 *   2. Bounded exponential-backoff retries on the errors that are actually worth
 *      retrying — network failures, request timeouts, HTTP 429, and 5xx — while
 *      returning 4xx immediately (a 404/401 won't fix itself on retry).
 *
 * It deliberately does NOT swallow errors: callers keep their own fail-soft
 * `.catch(() => [])`, so the pipeline's "a flaky source returns [] instead of
 * killing the run" philosophy is preserved. This helper just makes the transient
 * cases succeed more often before that fallback ever triggers.
 */

export interface RetryOptions extends RequestInit {
  /** Per-attempt timeout in ms (AbortController). Default 10s. */
  timeoutMs?: number;
  /** Number of retries *after* the first attempt. Default 2 (3 tries total). */
  retries?: number;
  /** Base backoff in ms; doubled each retry, capped at 30s. Default 500ms. */
  backoffMs?: number;
}

/** Retriable HTTP status codes: rate limiting + transient server errors. */
function isRetriableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

/** Sleep helper; separated so tests can stub timers. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * `fetch` with a timeout and bounded retries on transient failures.
 *
 * Resolves with the `Response` as soon as one is obtained that is either
 * successful or a non-retriable status (e.g. 404) — the caller inspects
 * `res.ok`. Rejects only when every attempt fails (network error, timeout, or a
 * retriable status on the final attempt), so a caller's `.catch()` still runs
 * exactly once, at the end.
 */
export async function fetchWithRetry(
  input: string | URL,
  { timeoutMs = 10_000, retries = 2, backoffMs = 500, ...init }: RetryOptions = {}
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(input, { ...init, signal: controller.signal });

      // Retriable status with attempts left → back off and try again.
      if (isRetriableStatus(res.status) && attempt < retries) {
        lastError = new Error(`HTTP ${res.status}`);
        await sleep(Math.min(30_000, backoffMs * 2 ** attempt));
        continue;
      }
      return res;
    } catch (err) {
      // Network failure or abort/timeout.
      lastError = err;
      if (attempt < retries) {
        await sleep(Math.min(30_000, backoffMs * 2 ** attempt));
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`fetchWithRetry failed for ${String(input)}`);
}

/**
 * Convenience wrapper that returns parsed JSON, throwing on a non-OK response.
 * Useful for the many sources that just want `res.json()` with retry semantics.
 */
export async function fetchJson<T = unknown>(
  input: string | URL,
  opts: RetryOptions = {}
): Promise<T> {
  const res = await fetchWithRetry(input, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${String(input)}`);
  return (await res.json()) as T;
}
