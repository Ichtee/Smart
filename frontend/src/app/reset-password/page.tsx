'use client';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/smart/logo';
import { API_URL } from '@/utils/api';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromQuery = searchParams.get('token') || '';

  const [tokenInput, setTokenInput] = useState(tokenFromQuery);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const activeToken = tokenFromQuery || tokenInput;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!activeToken) {
      setStatus('error');
      setMessage('Mã xác thực (Reset Token) không khả dụng. Vui lòng kiểm tra lại đường link từ Email.');
      return;
    }
    if (password !== confirm) {
      setStatus('error');
      setMessage('Mật khẩu xác nhận không khớp');
      return;
    }
    if (password.length < 8) {
      setStatus('error');
      setMessage('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch(`${API_URL}/api/users/reset-password/${activeToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, token: activeToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi khi đặt lại mật khẩu');
      setStatus('success');
      setMessage(data.message || 'Đặt lại mật khẩu thành công!');
      setTimeout(() => router.push('/login'), 2500);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message);
    }
  };

  return (
    <div className="bg-card border border-border p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md relative z-10">
      <div className="flex flex-col items-center text-center mb-8">
        <Link href="/">
          <Logo size="lg" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-foreground mt-4">Đặt lại mật khẩu</h1>
        <p className="text-xs text-muted-foreground font-medium mt-1">Nhập mật khẩu mới cho tài khoản của bạn</p>
      </div>

      {status === 'success' ? (
        <div className="text-center space-y-4">
          <div className="size-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto text-primary">
            <CheckCircle2 className="size-8" />
          </div>
          <p className="text-sm text-primary font-semibold">Đặt lại mật khẩu thành công!</p>
          <p className="text-xs text-muted-foreground">Đang chuyển hướng về trang đăng nhập...</p>
          <div className="w-full bg-secondary rounded-full h-1 overflow-hidden mt-2">
            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '100%' }} />
          </div>
        </div>
      ) : (
        <>
          {status === 'error' && (
            <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 text-destructive p-3.5 rounded-2xl mb-6 text-xs font-semibold">
              <AlertCircle className="size-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!tokenFromQuery && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Mã Token đặt lại mật khẩu
                </label>
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="w-full px-4 py-3.5 bg-background border border-input rounded-2xl focus:outline-none focus:border-primary transition text-sm text-foreground font-mono placeholder:text-muted-foreground"
                  placeholder="Dán mã Token từ Email vào đây..."
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Mật khẩu mới
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 bg-background border border-input rounded-2xl focus:outline-none focus:border-primary transition text-sm text-foreground font-medium placeholder:text-muted-foreground"
                placeholder="Tối thiểu 8 ký tự..."
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Xác nhận mật khẩu
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={`w-full px-4 py-3.5 bg-background border rounded-2xl focus:outline-none transition text-sm text-foreground font-medium placeholder:text-muted-foreground ${
                  confirm && confirm !== password
                    ? 'border-destructive focus:border-destructive'
                    : 'border-input focus:border-primary'
                }`}
                placeholder="Nhập lại mật khẩu..."
                required
              />
              {confirm && confirm !== password && (
                <p className="text-destructive text-xs mt-1 font-medium">Mật khẩu không khớp</p>
              )}
            </div>
            <button
              type="submit"
              disabled={status === 'loading'}
              className="group w-full py-3.5 rounded-full bg-primary hover:brightness-110 disabled:opacity-50 text-primary-foreground font-semibold text-sm transition-all shadow-lg glow-primary flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {status === 'loading' ? 'Đang lưu...' : 'Đặt lại mật khẩu'}
              {status !== 'loading' && <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />}
            </button>
          </form>

          <p className="mt-6 text-center text-muted-foreground text-xs font-medium">
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Quay lại đăng nhập
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div suppressHydrationWarning className="min-h-screen flex items-center justify-center bg-background text-foreground px-4 relative overflow-hidden font-sans">
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" />

      <Suspense fallback={<div className="text-center text-foreground font-sans">Đang tải...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
