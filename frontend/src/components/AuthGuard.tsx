'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { API_URL, markAuthVerified, isAuthRecentlyVerified } from '@/utils/api';
import { clearApiCache, seedProfileCache } from '@/hooks/useApi';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/verify'
];

/** Pages anyone can open (no sign-in). */
export const isPublicPath = (pathname: string) => PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/reset-password');

const REVERIFY_MS = 5 * 60 * 1000; // skip re-verifying the token on every navigation
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
 * - No token → redirect to /login.
 * - Admin routes (/dashboard/admin/*) → BLOCK rendering until role is verified (no optimistic).
 * - Regular protected routes → render IMMEDIATELY (optimistic), verify in background.
 *   - If verification fails (401/403) → clear token, redirect to /login.
 *   - If network error → keep children visible (don't log out on cold start).
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authState, setAuthState] = useState<
    'unknown' | 'public' | 'no-token' | 'optimistic' | 'verified' | 'failed' | 'admin-checking'
  >('unknown');
  const [statusMsg, setStatusMsg] = useState<string>('');
  const verifyRunRef = useRef<string>('');

  useEffect(() => {
    const isPublic = isPublicPath(pathname);
    const isAdminRoute = pathname.startsWith('/dashboard/admin');

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

    // Verified recently: no need to hit /profile again on every route change (admin routes always re-check the role)
    if (!isAdminRoute && isAuthRecentlyVerified(REVERIFY_MS)) {
      setAuthState('verified');
      return;
    }

    // For admin routes: BLOCK rendering, show spinner until role is verified
    // For regular routes: optimistically render children immediately
    if (isAdminRoute) {
      setAuthState('admin-checking');
      setStatusMsg('Đang xác thực quyền quản trị...');
    } else {
      setAuthState('optimistic');
    }

    // Background verification
    const runId = `${pathname}_${Date.now()}`;
    verifyRunRef.current = runId;

    const verifyInBackground = async () => {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (verifyRunRef.current !== runId) return; // stale

        if (attempt > 0) {
          if (isAdminRoute) {
            setStatusMsg(`Máy chủ đang khởi động... thử lại lần ${attempt}/${MAX_RETRIES}`);
          }
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
            markAuthVerified();
            seedProfileCache(user);

            // Store user data for other components
            try {
              localStorage.setItem('user', JSON.stringify({
                id: user._id || user.id,
                name: user.name,
                username: user.username,
                role: user.role
              }));
            } catch (e) {}

            // Admin route — non-admin user → redirect with clear message
            if (isAdminRoute && user.role !== 'admin') {
              setStatusMsg('Bạn không có quyền truy cập trang quản trị.');
              setAuthState('failed');
              // Brief delay so user sees the message
              setTimeout(() => {
                if (verifyRunRef.current === runId) {
                  router.push('/dashboard');
                }
              }, 1500);
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
              clearApiCache();
            }
            setAuthState('failed');
            setStatusMsg('Phiên đăng nhập hết hạn.');
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

      // All retries exhausted due to network errors
      if (verifyRunRef.current === runId) {
        if (isAdminRoute) {
          // For admin routes: don't allow access without verification
          setStatusMsg('Không thể kết nối để xác thực quyền quản trị. Vui lòng thử lại.');
          setAuthState('failed');
          setTimeout(() => {
            if (verifyRunRef.current === runId) {
              router.push('/dashboard');
            }
          }, 2000);
        } else {
          // For regular routes: keep showing content (don't log out on cold start)
          setAuthState('optimistic');
        }
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

  // No token, failed, or admin-checking → show loading/redirect state
  if (authState === 'no-token' || authState === 'failed' || authState === 'admin-checking') {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center p-4 font-sans relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-success/10 blur-[140px] pointer-events-none" />
        
        <div className="flex flex-col items-center space-y-4 relative z-10 text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {authState === 'admin-checking' ? 'Xác thực quyền quản trị' : 'Đang chuyển hướng...'}
            </h3>
            <p className="text-xs text-slate-400 font-semibold">{statusMsg || 'Vui lòng đăng nhập để tiếp tục'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Unknown (initial render before useEffect runs) — show brief skeleton
  if (authState === 'unknown') {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center p-4 font-sans">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Optimistic or Verified → render children immediately
  return <>{children}</>;
}

