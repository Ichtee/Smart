// Centralized API URL helper
// In production (Vercel), NEXT_PUBLIC_API_URL = https://smart-vw9p.onrender.com
// In development (local), falls back to localhost:5000
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Remembers (in memory, per tab) when the session was last confirmed by the server,
// so page navigation does not re-verify the token on every route change.
let authVerifiedAt = 0;
export const markAuthVerified = () => { authVerifiedAt = Date.now(); };
export const resetAuthVerified = () => { authVerifiedAt = 0; };
export const isAuthRecentlyVerified = (maxAgeMs: number) => Date.now() - authVerifiedAt < maxAgeMs;

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Authenticated fetch against the backend.
 * - Adds the Bearer token + credentials automatically.
 * - Retries on network errors, 429 and 502/503/504 (Render cold start / rate limit) with backoff.
 * - Never clears the session by itself: callers should use `isUnauthorized(res)` to decide
 *   whether to log out (only a real 401 means the session is invalid).
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {},
  retries = 2
): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = new Headers(options.headers);
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(1000 * attempt);
    try {
      const res = await fetch(`${API_URL}${path}`, { credentials: 'include', ...options, headers });
      if (RETRYABLE_STATUS.has(res.status) && attempt < retries) continue;
      return res;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Network error');
}

/** True only when the server says the session/token is invalid. */
export const isUnauthorized = (res: Response) => res.status === 401;
