'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/smart/logo';
import { API_URL, describeError } from '@/utils/api';
import { validateNewPassword } from '@/utils/validation';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

const REDIRECT_AFTER_MS = 2500;

type Status = 'idle' | 'loading' | 'success' | 'error';

/**
 * "Choose a new password" form behind the emailed link. Used by both /reset-password/<token> (the link we
 * send) and the older /reset-password?token=... URL, so the two can never disagree on the rules again.
 * Without a token in the URL it lets the user paste the token from the email.
 */
export default function ResetPasswordForm({ token: tokenFromUrl = '' }: { token?: string }) {
  const router = useRouter();
  const [tokenInput, setTokenInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const token = (tokenFromUrl || tokenInput).trim();

  // never navigate after the page is gone
  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'loading') return;
    setMessage('');

    if (!token) {
      setStatus('error');
      setMessage('Mã đặt lại mật khẩu (Token) bị thiếu hoặc không hợp lệ. Vui lòng kiểm tra lại đường link từ Email.');
      return;
    }

    const problem = validateNewPassword(password, confirm);
    if (problem) {
      setStatus('error');
      setMessage(problem);
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch(`${API_URL}/api/users/reset-password/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi khi đặt lại mật khẩu');
      setStatus('success');
      setMessage(data.message || 'Đặt lại mật khẩu thành công!');
      redirectTimer.current = setTimeout(() => router.push('/login'), REDIRECT_AFTER_MS);
    } catch (err) {
      setStatus('error');
      setMessage(describeError(err, 'Lỗi khi đặt lại mật khẩu'));
    }
  };

  const mismatch = confirm !== '' && confirm !== password;

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
          <p className="text-sm text-primary font-semibold">{message}</p>
          <p className="text-xs text-muted-foreground">Đang chuyển hướng về trang đăng nhập...</p>
          <div className="w-full bg-secondary rounded-full h-1 overflow-hidden mt-2">
            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '100%' }} />
          </div>
          <Link href="/login" className="block w-full py-3.5 rounded-full bg-primary hover:brightness-110 text-primary-foreground font-semibold text-sm transition-all">
            Đăng nhập ngay
          </Link>
        </div>
      ) : (
        <>
          {status === 'error' && (
            <div role="alert" className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 text-destructive p-3.5 rounded-2xl mb-6 text-xs font-semibold">
              <AlertCircle className="size-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {!tokenFromUrl && (
              <div>
                <label htmlFor="reset-token" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Mã Token đặt lại mật khẩu
                </label>
                <input
                  id="reset-token"
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="w-full px-4 py-3.5 bg-background border border-input rounded-2xl focus:outline-none focus:border-primary transition text-sm text-foreground font-mono placeholder:text-muted-foreground"
                  placeholder="Dán mã Token từ Email vào đây..."
                />
              </div>
            )}

            <div>
              <label htmlFor="reset-password" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Mật khẩu mới
              </label>
              <input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 bg-background border border-input rounded-2xl focus:outline-none focus:border-primary transition text-sm text-foreground font-medium placeholder:text-muted-foreground"
                placeholder="Tối thiểu 8 ký tự..."
              />
            </div>
            <div>
              <label htmlFor="reset-confirm" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Xác nhận mật khẩu
              </label>
              <input
                id="reset-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-invalid={mismatch}
                className={`w-full px-4 py-3.5 bg-background border rounded-2xl focus:outline-none transition text-sm text-foreground font-medium placeholder:text-muted-foreground ${
                  mismatch ? 'border-destructive focus:border-destructive' : 'border-input focus:border-primary'
                }`}
                placeholder="Nhập lại mật khẩu..."
              />
              {mismatch && <p className="text-destructive text-xs mt-1 font-medium">Mật khẩu không khớp</p>}
            </div>
            <button
              type="submit"
              disabled={status === 'loading'}
              className="group w-full py-3.5 rounded-full bg-primary hover:brightness-110 disabled:opacity-50 text-primary-foreground font-semibold text-sm transition-all shadow-lg glow-primary flex items-center justify-center gap-2 cursor-pointer"
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
