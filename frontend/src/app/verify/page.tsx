'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/smart/logo';
import { API_URL } from '@/utils/api';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const hasFetched = React.useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Không tìm thấy mã xác thực (token) trong liên kết URL.');
      return;
    }

    if (hasFetched.current) return;
    hasFetched.current = true;

    const verify = async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/verify/${token}`);
        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Tài khoản của bạn đã được kích hoạt thành công!');
        } else {
          setStatus('error');
          setMessage(data.message || 'Xác thực tài khoản thất bại.');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage('Lỗi kết nối mạng. Vui lòng thử lại sau.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="bg-card border border-border p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md text-center relative z-10">
      <div className="flex flex-col items-center text-center mb-6">
        <Link href="/">
          <Logo size="lg" />
        </Link>
      </div>

      {status === 'loading' && (
        <div className="space-y-4">
          <Loader2 className="size-12 text-primary animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground">Đang xác thực...</h1>
          <p className="text-muted-foreground text-sm">Vui lòng chờ trong giây lát để hệ thống kiểm tra tài khoản của bạn.</p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-6">
          <div className="size-16 bg-primary/10 border border-primary/30 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="size-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary mb-2">Thành công!</h1>
            <p className="text-foreground text-sm leading-relaxed">{message}</p>
          </div>
          <Link href="/login" className="block w-full py-3.5 rounded-full bg-primary hover:brightness-110 text-primary-foreground font-semibold text-sm transition-all shadow-lg glow-primary">
            Tiếp tục đăng nhập
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-6">
          <div className="size-16 bg-destructive/10 border border-destructive/30 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="size-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-destructive mb-2">Xác thực thất bại</h1>
            <p className="text-foreground text-sm leading-relaxed">{message}</p>
          </div>
          <Link href="/login" className="block w-full py-3.5 rounded-full bg-secondary hover:bg-surface-elevated text-foreground font-semibold text-sm transition-all border border-border">
            Quay lại trang đăng nhập
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmail() {
  return (
    <div suppressHydrationWarning className="min-h-screen flex items-center justify-center bg-background text-foreground px-4 relative overflow-hidden font-sans">
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" />

      <Suspense fallback={<div className="text-muted-foreground text-sm font-sans">Đang tải...</div>}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
