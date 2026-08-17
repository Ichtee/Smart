'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { API_URL } from '@/utils/api';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/verify'
];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(true);

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

      try {
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_URL}/api/users/profile`, {
          headers,
          credentials: 'include',
          cache: 'no-store'
        });

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
      } catch (e) { }

      // Unauthorized or server error -> clear local session and redirect
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }

      if (!isCancelled) {
        setAuthorized(false);
        setChecking(false);
        router.push('/login');
      }
    };

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
            <p className="text-xs text-slate-400 font-semibold">Chưa đăng nhập. Đang tự động chuyển hướng về trang Đăng nhập...</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
