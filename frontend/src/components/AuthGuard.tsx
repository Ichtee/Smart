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
const FETCH_TIMEOUT_MS = 12000; // 12s timeout per attempt — handles Render cold start

/** Fetch with AbortController timeout */
const fetchWithTimeout = (url: string, options: RequestInit, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
};

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(true);
  const [statusMsg, setStatusMsg] = useState<string>('Đang kết nối đến máy chủ...');
  const retryCountRef = useRef(0);

  useEffect(() => {
    let isCancelled = false;

    const checkAuth = async () => {
      // Check if current route is public or dynamic public like /reset-password/...
      const isPublic = PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/reset-password');

      if (isPublic) {
        if (!isCancelled) {
          setAuthorized(true);
          setChecking(false);
        }
        return;
      }

      // Check auth via Cookie / Token with backend profile API
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      // If no token at all, skip API call and redirect immediately
      if (!token) {
        if (!isCancelled) {
          setAuthorized(false);
          setChecking(false);
          router.push('/login');
        }
        return;
      }

      // Retry loop to handle backend cold start
      let lastError: unknown = null;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (isCancelled) return;

        if (attempt > 0) {
          setStatusMsg(`Máy chủ đang khởi động... thử lại lần ${attempt}/${MAX_RETRIES}`);
          // Brief pause before retry
          await new Promise(r => setTimeout(r, 1500));
        } else {
          setStatusMsg('Đang kết nối đến máy chủ...');
        }

        try {
          const headers: Record<string, string> = {
            'Authorization': `Bearer ${token}`
          };

          const res = await fetchWithTimeout(
            `${API_URL}/api/users/profile`,
            { headers, credentials: 'include', cache: 'no-store' },
            FETCH_TIMEOUT_MS
          );

          if (res.ok) {
            const user = await res.json();

            // Check admin subroutes
            if (pathname.startsWith('/dashboard/admin') && user.role !== 'admin') {
              if (!isCancelled) {
                setAuthorized(false);
                setChecking(false);
                router.push('/dashboard');
              }
              return;
            }

            if (!isCancelled) {
              setAuthorized(true);
              setChecking(false);
            }
            return;
          }

          // Got a response but not ok (401/403) — no point retrying, auth is invalid
          break;
        } catch (e) {
          lastError = e;
          // Network error or timeout — retry
          continue;
        }
      }

      // All retries exhausted or got non-ok response — clear session and redirect
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }

      if (!isCancelled) {
        setStatusMsg('Phiên đăng nhập hết hạn. Đang chuyển hướng...');
        setAuthorized(false);
        setChecking(false);
        router.push('/login');
      }
    };

    // Reset state for new pathname
    retryCountRef.current = 0;
    setChecking(true);
    setAuthorized(false);
    checkAuth();

    return () => {
      isCancelled = true;
    };
  }, [pathname, router]);

  // If on a protected route and checking auth or unauthorized, render loading state
  const isPublic = PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/reset-password');

  if (!isPublic && (checking || !authorized)) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center p-4 font-sans relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#00E5FF]/10 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-[#00FF87]/10 blur-[140px] pointer-events-none" />
        
        <div className="flex flex-col items-center space-y-4 relative z-10 text-center">
          <div className="w-12 h-12 border-4 border-[#00E5FF] border-t-transparent rounded-full animate-spin"></div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Xác thực quyền truy cập</h3>
            <p className="text-xs text-slate-400 font-semibold">{statusMsg}</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
