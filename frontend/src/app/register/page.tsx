'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/smart/logo';
import { API_URL } from '@/utils/api';
import { ArrowRight, AlertCircle, MailCheck, AlertTriangle } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim().replace(/\s+/g, ' ');
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      setError('Họ và tên không được chứa toàn khoảng trắng, độ dài từ 2 đến 50 ký tự.');
      return;
    }

    const trimmedUsername = username.trim();
    if (/\s/.test(trimmedUsername) || trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      setError('Tên đăng nhập không được chứa khoảng trắng, độ dài từ 3 đến 30 ký tự.');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
      setError('Tên đăng nhập chỉ được chứa chữ cái, chữ số, gạch dưới (_) và gạch nối (-).');
      return;
    }

    const trimmedEmail = email.trim();
    if (/\s/.test(trimmedEmail) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Email không được chứa dấu cách và phải đúng định dạng (VD: user@example.com).');
      return;
    }

    if (password !== password.trim()) {
      setError('Mật khẩu không được chứa khoảng trắng ở đầu hoặc cuối.');
      return;
    }

    if (password.length < 8 || password.length > 100) {
      setError('Mật khẩu phải từ 8 đến 100 ký tự.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          username: trimmedUsername,
          email: trimmedEmail.toLowerCase(),
          password
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div suppressHydrationWarning className="min-h-screen flex items-center justify-center bg-background text-foreground px-4 py-8 relative overflow-hidden font-sans">
      {/* Smart Glow */}
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" />

      <div className="bg-card border border-border p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md relative z-10">
        
        {isSuccess ? (
          <div className="text-center space-y-6">
            <div className="size-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto text-primary">
              <MailCheck className="size-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Xác minh Email</h1>
              <p className="text-sm text-muted-foreground font-medium">
                Một liên kết xác thực đã được gửi đến email <span className="text-primary font-semibold">{email}</span>.
              </p>
            </div>
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-2xl text-xs font-medium leading-relaxed text-left">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <span>Vui lòng kích hoạt tài khoản trong vòng 10 phút. Sau thời gian này, tài khoản chưa xác thực sẽ tự động bị xóa.</span>
            </div>
            <Link href="/login" className="block w-full py-3.5 rounded-full bg-primary hover:brightness-110 text-primary-foreground font-semibold text-sm transition-all shadow-lg glow-primary text-center">
              Quay lại đăng nhập
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center text-center mb-8">
              <Link href="/">
                <Logo size="lg" />
              </Link>
              <p className="text-xs text-muted-foreground font-medium mt-3">Tạo tài khoản Smart Fitness mới</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 text-destructive p-3.5 rounded-2xl mb-6 text-xs font-semibold">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Họ và Tên</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-input rounded-2xl focus:outline-none focus:border-primary transition text-sm text-foreground placeholder:text-muted-foreground"
                  placeholder="Nhập họ và tên..."
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tên đăng nhập</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-input rounded-2xl focus:outline-none focus:border-primary transition text-sm text-foreground placeholder:text-muted-foreground"
                  placeholder="Chọn username..."
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Địa chỉ Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-input rounded-2xl focus:outline-none focus:border-primary transition text-sm text-foreground placeholder:text-muted-foreground"
                  placeholder="name@example.com..."
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Mật khẩu</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-input rounded-2xl focus:outline-none focus:border-primary transition text-sm text-foreground placeholder:text-muted-foreground"
                  placeholder="Tối thiểu 8 ký tự..."
                  required
                  minLength={8}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="group w-full py-3.5 rounded-full bg-primary hover:brightness-110 disabled:opacity-50 text-primary-foreground font-semibold text-sm transition-all shadow-lg glow-primary flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isLoading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
                {!isLoading && <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />}
              </button>
            </form>

            <p className="mt-8 text-center text-muted-foreground text-xs font-medium">
              Đã có tài khoản? <Link href="/login" className="text-primary font-semibold hover:underline">Đăng nhập</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
