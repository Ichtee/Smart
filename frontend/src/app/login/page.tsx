'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/smart/logo';
import { API_URL } from '@/utils/api';
import { ArrowRight, AlertCircle, Mail, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isUnverified, setIsUnverified] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsUnverified(false);
    setResendStatus('idle');
    setResendMessage('');

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Vui lòng nhập Tên đăng nhập hoặc Email.');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập Mật khẩu.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username: trimmedUsername, password }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 403 && data.notVerified) {
          setIsUnverified(true);
          setUnverifiedEmail(data.email || '');
        }
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        id: data._id,
        name: data.name,
        email: data.email,
        username: data.username
      }));

      if (data.role === 'admin') {
        router.push('/dashboard/admin');
      } else if (!data.height || !data.weight || !data.age) {
        router.push('/onboarding');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResendVerification = async () => {
    setResendStatus('loading');
    setResendMessage('');
    const emailToSend = unverifiedEmail || username;
    try {
      const res = await fetch(`${API_URL}/api/users/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailToSend }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to resend email');
      setResendStatus('success');
      setResendMessage(data.message || 'Đã gửi lại link xác thực thành công!');
    } catch (err: any) {
      setResendStatus('error');
      setResendMessage(err.message);
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
          <p className="text-xs text-muted-foreground font-medium mt-3">Đăng nhập hệ thống Smart Fitness</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 text-destructive p-3.5 rounded-2xl mb-6 text-xs font-semibold">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isUnverified && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-4 rounded-2xl mb-6 text-xs space-y-3">
            <p className="font-semibold leading-relaxed">
              Tài khoản này chưa được kích hoạt qua email. Nếu quá 10 phút chưa xác thực, tài khoản sẽ bị tự động xóa.
            </p>
            {resendStatus === 'success' ? (
              <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="size-4" /> {resendMessage}
              </p>
            ) : (
              <div className="flex flex-col space-y-2">
                {resendStatus === 'error' && <p className="text-destructive font-bold">{resendMessage}</p>}
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendStatus === 'loading'}
                  className="px-3.5 py-2 bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 transition font-semibold rounded-full self-start cursor-pointer flex items-center gap-1.5"
                >
                  <Mail className="size-3.5" />
                  {resendStatus === 'loading' ? 'Đang gửi lại...' : 'Gửi lại email xác thực'}
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tên đăng nhập / Email</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3.5 bg-background border border-input rounded-2xl focus:outline-none focus:border-primary transition text-sm text-foreground placeholder:text-muted-foreground"
              placeholder="Nhập username hoặc email..."
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mật khẩu</label>
              <Link href="/forgot-password" className="text-xs text-primary font-medium hover:underline">
                Quên mật khẩu?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 bg-background border border-input rounded-2xl focus:outline-none focus:border-primary transition text-sm text-foreground placeholder:text-muted-foreground"
              placeholder="Nhập mật khẩu..."
              required
            />
          </div>
          <button
            type="submit"
            className="group w-full py-3.5 rounded-full bg-primary hover:brightness-110 text-primary-foreground font-semibold text-sm transition-all shadow-lg glow-primary flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            Đăng nhập
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </form>

        <p className="mt-8 text-center text-muted-foreground text-xs font-medium">
          Chưa có tài khoản? <Link href="/register" className="text-primary font-semibold hover:underline">Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  );
}
