/** The signed-in user's name as cached in localStorage by the login flow, or `fallback` when there is none. */
export function readStoredUserName(fallback: string): string {
  try {
    const raw = localStorage.getItem('user');
    const name = raw ? JSON.parse(raw)?.name : null;
    return typeof name === 'string' && name ? name : fallback;
  } catch {
    return fallback; // storage unavailable or the cached text is not JSON
  }
}
