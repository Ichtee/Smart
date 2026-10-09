'use client';
import { useEffect } from 'react';

/**
 * Keeps the screen from auto-locking while `active` (a phone that locks pauses embedded players).
 * The browser drops the lock when the tab is hidden, so it is requested again on return.
 * Silently does nothing without support (older browsers, iOS home-screen apps) or when the request is refused.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      if (sentinel && !sentinel.released) return;
      try {
        const granted = await navigator.wakeLock.request('screen');
        if (cancelled) {
          granted.release().catch(() => {});
          return;
        }
        sentinel = granted;
      } catch {
        // refused (low battery, not allowed): nothing to do
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') request();
    };

    request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      sentinel?.release().catch(() => {});
    };
  }, [active]);
}
