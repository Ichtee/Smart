'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

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
    const checkAuth = () => {
      // Check if current route is public or dynamic public like /reset-password/...
      const isPublic = PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/reset-password');

      if (isPublic) {
        setAuthorized(true);
        setChecking(false);
        return;
      }

      // Route is protected, check token in localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      if (!token) {
        setAuthorized(false);
        setChecking(false);
        router.push('/login');
        return;
      }

      // Check admin subroutes
      if (pathname.startsWith('/dashboard/admin')) {
        try {
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            if (user.role !== 'admin') {
              setAuthorized(false);
              setChecking(false);
              router.push('/dashboard');
              return;
            }
          }
        } catch (e) {
          setAuthorized(false);
          setChecking(false);
          router.push('/login');
          return;
        }
      }

      setAuthorized(true);
      setChecking(false);
    };

    checkAuth();
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
