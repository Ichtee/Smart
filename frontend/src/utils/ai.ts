import { apiFetch } from './api';

/**
 * POST JSON to an /api/ai endpoint. No retries: every call spends Gemini quota.
 * Throws an Error carrying the server's message; a 401 also sends the visitor to /login.
 */
export async function postAi<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(
    path,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    0,
  );
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login'; // eslint-disable-line @next/next/no-location-assign-relative-destination -- hook has no router; a full load also drops stale state
    }
    throw new Error(data?.message ?? `HTTP ${res.status}`);
  }
  return data as T;
}
