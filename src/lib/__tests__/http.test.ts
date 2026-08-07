import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchWithRetry, fetchJson } from '../http';

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const FAST = { retries: 2, backoffMs: 1, timeoutMs: 1000 };

describe('fetchWithRetry', () => {
  it('retries on a 500 then returns the eventual 200', async () => {
    const mock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValueOnce(jsonResponse({ ok: true }, 200));
    globalThis.fetch = mock as unknown as typeof fetch;

    const res = await fetchWithRetry('https://x.test', FAST);
    expect(res.status).toBe(200);
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a non-retriable 404', async () => {
    const mock = vi.fn().mockResolvedValue(jsonResponse({}, 404));
    globalThis.fetch = mock as unknown as typeof fetch;

    const res = await fetchWithRetry('https://x.test', FAST);
    expect(res.status).toBe(404);
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('returns the last response after exhausting retries on persistent 5xx', async () => {
    const mock = vi.fn().mockResolvedValue(jsonResponse({}, 503));
    globalThis.fetch = mock as unknown as typeof fetch;

    const res = await fetchWithRetry('https://x.test', FAST);
    expect(res.status).toBe(503);
    expect(mock).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('retries a network error then succeeds', async () => {
    const mock = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce(jsonResponse({ ok: true }, 200));
    globalThis.fetch = mock as unknown as typeof fetch;

    const res = await fetchWithRetry('https://x.test', FAST);
    expect(res.ok).toBe(true);
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries on persistent network errors', async () => {
    const mock = vi.fn().mockRejectedValue(new Error('ETIMEDOUT'));
    globalThis.fetch = mock as unknown as typeof fetch;

    await expect(fetchWithRetry('https://x.test', FAST)).rejects.toThrow('ETIMEDOUT');
    expect(mock).toHaveBeenCalledTimes(3);
  });

  it('passes an AbortSignal to the underlying fetch', async () => {
    const mock = vi.fn().mockResolvedValue(jsonResponse({}, 200));
    globalThis.fetch = mock as unknown as typeof fetch;

    await fetchWithRetry('https://x.test', FAST);
    const init = mock.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});

describe('fetchJson', () => {
  it('parses and returns the JSON body on success', async () => {
    const mock = vi.fn().mockResolvedValue(jsonResponse({ hello: 'world' }, 200));
    globalThis.fetch = mock as unknown as typeof fetch;

    const body = await fetchJson<{ hello: string }>('https://x.test', FAST);
    expect(body).toEqual({ hello: 'world' });
  });

  it('throws on a non-OK response', async () => {
    const mock = vi.fn().mockResolvedValue(jsonResponse({}, 500));
    globalThis.fetch = mock as unknown as typeof fetch;

    await expect(fetchJson('https://x.test', FAST)).rejects.toThrow('HTTP 500');
  });
});
