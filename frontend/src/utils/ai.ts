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

/** A photo as a JPEG data URL whose longer side is at most `maxSide` px (phone photos are far too big to upload as is). */
export async function resizeImage(file: File, maxSide = 1024): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.8);
}
