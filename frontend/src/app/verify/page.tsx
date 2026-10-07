'use client';
import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/smart/logo';
import { API_URL } from '@/utils/api';
import { validateNewPassword } from '@/utils/validation';
import { CheckCircle2, XCircle, Loader2, AlertCircle, KeyRound } from 'lucide-react';

// Sign-up step 2. The emailed link lands here: we first check it (GET does not activate anything),
// then the person who owns the mailbox chooses the password, which also activates the account.
type Status = 'checking' | 'form' | 'success' | 'error';

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<Status>('checking');
  const [message, setMessage] = useState('');
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const hasChecked = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Không tìm thấy mã xác thực (token) trong liên kết URL.');
      return;
    }

    if (hasChecked.current) return;
    hasChecked.current = true;

    const check = async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/verify/${encodeURIComponent(token)}`);
        const data = await res.json();
        if (res.ok) {
          setAccount({ name: data.name, email: data.email });
          setStatus('form');
        } else {
          setStatus('error');
          setMessage(data.message || 'Liên kết xác thực không hợp lệ hoặc đã hết hạn.');
        }
      } catch {
        setStatus('error');
        setMessage('Lỗi kết nối mạng. Vui lòng thử lại sau.');
      }
    };

    check();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || submitting) return;

    const problem = validateNewPassword(password, confirm);
    if (problem) {
      setFormError(problem);
      return;
    }

    setFormError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/users/verify/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMessage(data.message || 'Tài khoản của bạn đã được kích hoạt thành công!');
      } else if (data.linkInvalid) {
        // the link itself died while the form was open (expired / already used)
        setStatus('error');
        setMessage(data.message);
      } else {
        setFormError(data.message || 'Không thể đặt mật khẩu. Vui lòng thử lại.');
      }
    } catch {
      setFormError('Lỗi kết nối mạng. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md text-center relative z-10">
      <div className="flex flex-col items-center text-center mb-6">
        <Link href="/">
          <Logo size="lg" />
        </Link>
      </div>

      {status === 'checking' && (
        <div className="space-y-4">
          <Loader2 className="size-12 text-primary animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground">Đang kiểm tra liên kết...</h1>
          <p className="text-muted-foreground text-sm">Vui lòng chờ trong giây lát.</p>
        </div>
      )}

      {status === 'form' && account && (
        <form onSubmit={handleSubmit} className="space-y-5 text-left" noValidate>
          <div className="text-center space-y-2">
            <div className="size-14 bg-primary/10 border border-primary/30 text-primary rounded-full flex items-center justify-center mx-auto">
              <KeyRound className="size-7" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Đặt mật khẩu</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Xin chào <span className="text-foreground font-semibold">{account.name}</span>! Chọn mật khẩu để kích hoạt tài khoản cho{' '}
              <span className="text-primary font-semibold">{account.email}</span>.
            </p>
          </div>

          {formError && (
            <div role="alert" className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 text-destructive p-3.5 rounded-2xl text-xs font-semibold">
              <AlertCircle className="size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label htmlFor="new-password" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Mật khẩu</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-input rounded-2xl focus:outline-none focus:border-primary transition text-sm text-foreground placeholder:text-muted-foreground"
              placeholder="Tối thiểu 8 ký tự..."
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Nhập lại mật khẩu</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-input rounded-2xl focus:outline-none focus:border-primary transition text-sm text-foreground placeholder:text-muted-foreground"
              placeholder="Nhập lại mật khẩu..."
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-full bg-primary hover:brightness-110 disabled:opacity-50 text-primary-foreground font-semibold text-sm transition-all shadow-lg glow-primary cursor-pointer"
          >
            {submitting ? 'Đang kích hoạt...' : 'Đặt mật khẩu & kích hoạt'}
          </button>
        </form>
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
