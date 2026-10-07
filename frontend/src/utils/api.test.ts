import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  API_URL,
  apiFetch,
  isUnauthorized,
  markAuthVerified,
  resetAuthVerified,
  isAuthRecentlyVerified,
  describeError,
  NETWORK_ERROR_MESSAGE,
} from './api';

const res = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  resetAuthVerified();
});
afterEach(() => {
  vi.useRealTimers();
});

/** Start apiFetch and let all its backoff timers run. */
const run = async (...args: Parameters<typeof apiFetch>) => {
  const promise = apiFetch(...args);
  // avoid an "unhandled rejection" while timers advance if the promise ends up rejecting
  promise.catch(() => undefined);
  await vi.runAllTimersAsync();
  return promise;
};

describe('apiFetch: request shape', () => {
  test('prefixes API_URL and sends cookies', async () => {
    fetchMock.mockResolvedValue(res(200));
    await run('/api/health');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/api/health`);
    expect(options.credentials).toBe('include');
  });

  test('adds the Bearer token from localStorage', async () => {
    localStorage.setItem('token', 'abc123');
    fetchMock.mockResolvedValue(res(200));
    await run('/api/users/profile');
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer abc123');
  });

  test('sends no Authorization header when logged out', async () => {
    fetchMock.mockResolvedValue(res(200));
    await run('/api/foods');
    expect(new Headers(fetchMock.mock.calls[0][1].headers).has('Authorization')).toBe(false);
  });

  test('never overrides an explicit Authorization header', async () => {
    localStorage.setItem('token', 'abc123');
    fetchMock.mockResolvedValue(res(200));
    await run('/api/x', { headers: { Authorization: 'Bearer explicit' } });
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer explicit');
  });

  test('passes method, body and other headers through', async () => {
    fetchMock.mockResolvedValue(res(200));
    await run('/api/nutrition', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"a":1}' });
    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.body).toBe('{"a":1}');
    expect(new Headers(options.headers).get('Content-Type')).toBe('application/json');
  });

  test('a caller can override credentials', async () => {
    fetchMock.mockResolvedValue(res(200));
    await run('/api/x', { credentials: 'omit' });
    expect(fetchMock.mock.calls[0][1].credentials).toBe('omit');
  });

  test('returns the Response untouched on success', async () => {
    fetchMock.mockResolvedValue(res(200, { hello: 'world' }));
    const r = await run('/api/x');
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ hello: 'world' });
  });
});

describe('apiFetch: retries', () => {
  test.each([429, 502, 503, 504])('retries a %i and returns the later success', async (status) => {
    fetchMock.mockResolvedValueOnce(res(status)).mockResolvedValueOnce(res(200, { ok: true }));
    const r = await run('/api/x');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(r.status).toBe(200);
  });

  test.each([400, 401, 403, 404, 409, 500])('does not retry a %i (the answer will not change)', async (status) => {
    fetchMock.mockResolvedValue(res(status));
    const r = await run('/api/x');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(r.status).toBe(status);
  });

  test('gives up after retries+1 attempts and returns the last retryable response (does not throw)', async () => {
    fetchMock.mockResolvedValue(res(503));
    const r = await run('/api/x'); // default: 2 retries
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(r.status).toBe(503);
  });

  test('retries network errors, then succeeds', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(res(200));
    const r = await run('/api/x');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(r.status).toBe(200);
  });

  test('persistent network errors throw the last error after retries+1 attempts', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(run('/api/x')).rejects.toThrow('Failed to fetch');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test('a thrown non-Error becomes a generic "Network error"', async () => {
    fetchMock.mockRejectedValue('weird');
    await expect(run('/api/x', {}, 0)).rejects.toThrow('Network error');
  });

  test('retries = 0 means exactly one attempt (used for non-idempotent POSTs)', async () => {
    fetchMock.mockResolvedValue(res(429));
    const r = await run('/api/foods/custom', { method: 'POST' }, 0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(r.status).toBe(429);

    fetchMock.mockReset();
    fetchMock.mockRejectedValue(new TypeError('offline'));
    await expect(run('/api/foods/custom', { method: 'POST' }, 0)).rejects.toThrow('offline');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('a custom retry count is honoured', async () => {
    fetchMock.mockResolvedValue(res(503));
    await run('/api/x', {}, 4);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  test('backs off: 1s before the first retry, 2s before the second', async () => {
    fetchMock.mockResolvedValue(res(503));
    const promise = apiFetch('/api/x');
    promise.catch(() => undefined);

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await promise;
  });

  test('the token is captured once per call: logging in during the backoff does not change an in-flight request', async () => {
    fetchMock.mockResolvedValueOnce(res(503)).mockResolvedValueOnce(res(200));
    const promise = apiFetch('/api/x');
    await vi.advanceTimersByTimeAsync(0);
    expect(new Headers(fetchMock.mock.calls[0][1].headers).has('Authorization')).toBe(false);
    localStorage.setItem('token', 'late');
    await vi.runAllTimersAsync();
    await promise;
    expect(new Headers(fetchMock.mock.calls[1][1].headers).has('Authorization')).toBe(false);
  });
});

describe('isUnauthorized', () => {
  test('is true only for 401 (403/429/500 must not log the user out)', () => {
    expect(isUnauthorized(res(401))).toBe(true);
    for (const status of [200, 400, 403, 404, 429, 500, 503]) expect(isUnauthorized(res(status))).toBe(false);
  });
});

describe('auth verification timestamp', () => {
  test('is "not recent" until the session is marked verified', () => {
    expect(isAuthRecentlyVerified(60_000)).toBe(false);
  });

  test('is recent right after marking, and expires after maxAge', () => {
    markAuthVerified();
    expect(isAuthRecentlyVerified(5 * 60_000)).toBe(true);
    vi.advanceTimersByTime(5 * 60_000 - 1);
    expect(isAuthRecentlyVerified(5 * 60_000)).toBe(true);
    vi.advanceTimersByTime(1);
    expect(isAuthRecentlyVerified(5 * 60_000)).toBe(false);
  });

  test('reset forgets it immediately (logout / login as someone else)', () => {
    markAuthVerified();
    resetAuthVerified();
    expect(isAuthRecentlyVerified(60_000)).toBe(false);
  });
});

describe('describeError', () => {
  test('a TypeError (what fetch throws when unreachable) becomes the friendly network message', () => {
    expect(describeError(new TypeError('Failed to fetch'))).toBe(NETWORK_ERROR_MESSAGE);
    expect(describeError(new TypeError('Failed to fetch'))).not.toMatch(/Failed to fetch/);
  });

  test('an ordinary Error keeps its message (the server text we threw ourselves)', () => {
    expect(describeError(new Error('Invalid credentials'))).toBe('Invalid credentials');
  });

  test('an Error without a message and non-errors use the fallback', () => {
    expect(describeError(new Error(''), 'custom')).toBe('custom');
    expect(describeError('boom', 'custom')).toBe('custom');
    expect(describeError(undefined, 'custom')).toBe('custom');
    expect(describeError(null)).toBe('Đã có lỗi xảy ra. Vui lòng thử lại.');
  });
});
