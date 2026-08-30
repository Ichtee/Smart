'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/smart/logo';
import { API_URL } from '@/utils/api';
import { ArrowLeft, CheckCircle2, AlertCircle, Send } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('idle');
    setMessage('');

    const trimmedEmail = email.trim();
    if (/\s/.test(trimmedEmail) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setStatus('error');
      setMessage('Email không được chứa dấu cách và phải đúng định dạng (VD: user@example.com).');
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch(`${API_URL}/api/users/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail.toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Something went wrong');
      setStatus('success');
      setMessage(data.message);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message);
    }
  };

  return (
    <div suppressHydrationWarning className="min-h-screen flex items-center justify-center bg-background text-foreground px-4 relative overflow-hidden font-sans">
      {/* Smart Glow */}
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" />

      <div className="bg-card border border-border p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md relative z-10">

        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/">
            <Logo size="lg" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-foreground mt-4">Quên mật khẩu?</h1>
          <p className="text-xs text-muted-foreground font-medium mt-1">Nhập email và chúng tôi sẽ gửi link đặt lại mật khẩu</p>
        </div>

        {status === 'success' ? (
          <div className="text-center space-y-4">
            <div className="size-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto text-primary">
              <CheckCircle2 className="size-8" />
            </div>
            <p className="text-sm text-foreground font-medium leading-relaxed">
              Nếu email <span className="text-primary font-semibold">{email}</span> tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút.
            </p>
            <p className="text-xs text-muted-foreground">Kiểm tra cả hộp thư Spam nếu không thấy.</p>
            <Link href="/login" className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-secondary hover:bg-surface-elevated text-foreground font-semibold text-sm transition text-center mt-4 border border-border">
              <ArrowLeft className="size-4" /> Quay lại đăng nhập
            </Link>
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
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Địa chỉ Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 bg-background border border-input rounded-2xl focus:outline-none focus:border-primary transition text-sm text-foreground placeholder:text-muted-foreground"
                  placeholder="Nhập email của bạn..."
                  required
                />
              </div>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="group w-full py-3.5 rounded-full bg-primary hover:brightness-110 disabled:opacity-50 text-primary-foreground font-semibold text-sm transition-all shadow-lg glow-primary flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {status === 'loading' ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
                {status !== 'loading' && <Send className="size-4 transition-transform group-hover:translate-x-0.5" />}
              </button>
            </form>

            <p className="mt-6 text-center text-muted-foreground text-xs font-medium">
              Nhớ mật khẩu rồi?{' '}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Đăng nhập
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
