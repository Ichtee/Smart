'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { API_URL } from '@/utils/api';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/verify'
];

const MAX_RETRIES = 2;
const FETCH_TIMEOUT_MS = 15000; // 15s timeout per attempt — handles Render cold start

/** Fetch with AbortController timeout */
const fetchWithTimeout = (url: string, options: RequestInit, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
};

/**
 * Optimistic AuthGuard:
 * - Public routes → render immediately, no check.
 * - No token → show loading briefly, redirect to /login.
 * - Has token → render children IMMEDIATELY (optimistic), verify in background.
 *   - If verification fails (401/403) → clear token, redirect to /login.
 *   - If network error → keep children visible (don't log out on cold start).
 *   - Admin routes → redirect non-admin users after verification.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // Start with 'unknown' — we quickly resolve from localStorage
  const [authState, setAuthState] = useState<'unknown' | 'public' | 'no-token' | 'optimistic' | 'verified' | 'failed'>('unknown');
  const [statusMsg, setStatusMsg] = useState<string>('');
  const verifyRunRef = useRef<string>('');

  useEffect(() => {
    const isPublic = PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/reset-password');

    if (isPublic) {
      setAuthState('public');
      return;
    }

    // Quick synchronous check for token
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (!token) {
      setAuthState('no-token');
      router.push('/login');
      return;
    }

    // Token exists → optimistically show content immediately
    setAuthState('optimistic');

    // Background verification
    const runId = `${pathname}_${Date.now()}`;
    verifyRunRef.current = runId;

    const verifyInBackground = async () => {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (verifyRunRef.current !== runId) return; // stale

        if (attempt > 0) {
          await new Promise(r => setTimeout(r, 2000));
        }

        try {
          const res = await fetchWithTimeout(
            `${API_URL}/api/users/profile`,
            {
              headers: { 'Authorization': `Bearer ${token}` },
              credentials: 'include',
              cache: 'no-store'
            },
            FETCH_TIMEOUT_MS
          );

          if (verifyRunRef.current !== runId) return;

          if (res.ok) {
            const user = await res.json();

            // Store user data for other components
            try {
              localStorage.setItem('user', JSON.stringify({
                id: user._id || user.id,
                name: user.name,
                username: user.username,
                role: user.role
              }));
            } catch (e) {}

            // Admin route check
            if (pathname.startsWith('/dashboard/admin') && user.role !== 'admin') {
              setAuthState('failed');
              router.push('/dashboard');
              return;
            }

            setAuthState('verified');
            return;
          }

          // 401/403 — token is invalid, don't retry
          if (res.status === 401 || res.status === 403) {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            }
            setAuthState('failed');
            router.push('/login');
            return;
          }

          // Other HTTP errors (500 etc.) — retry
          continue;
        } catch (e) {
          // Network error / timeout — retry (backend cold start)
          continue;
        }
      }

      // All retries exhausted due to network errors — stay on page
      // Don't log out the user just because the backend is slow
      // The page is already rendering with cached/localStorage data
      if (verifyRunRef.current === runId) {
        setAuthState('optimistic'); // keep showing content
      }
    };

    verifyInBackground();

    return () => {
      verifyRunRef.current = ''; // cancel
    };
  }, [pathname, router]);

  // Public routes → always render
  if (authState === 'public') {
    return <>{children}</>;
  }

  // No token → brief loading then redirect
  if (authState === 'no-token' || authState === 'failed') {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center p-4 font-sans relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#00E5FF]/10 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-[#00FF87]/10 blur-[140px] pointer-events-none" />
        
        <div className="flex flex-col items-center space-y-4 relative z-10 text-center">
          <div className="w-12 h-12 border-4 border-[#00E5FF] border-t-transparent rounded-full animate-spin"></div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Đang chuyển hướng...</h3>
            <p className="text-xs text-slate-400 font-semibold">{statusMsg || 'Vui lòng đăng nhập để tiếp tục'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Unknown (initial render before useEffect runs) — show brief skeleton
  if (authState === 'unknown') {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center p-4 font-sans">
        <div className="w-10 h-10 border-4 border-[#00E5FF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Optimistic or Verified → render children immediately
  return <>{children}</>;
}

