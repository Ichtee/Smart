'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/smart/logo';
import { API_URL, describeError } from '@/utils/api';
import { normalizeName, validateName, validateUsername, validateEmail } from '@/utils/validation';
import { ArrowRight, AlertCircle, MailCheck, AlertTriangle } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = normalizeName(name);
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    const problem = validateName(name) ?? validateUsername(username) ?? validateEmail(email);
    if (problem) {
      setError(problem);
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');

      setIsSuccess(true);
    } catch (err) {
      setError(describeError(err, 'Registration failed'));
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
                Chúng tôi đã gửi một liên kết đến email <span className="text-primary font-semibold">{email}</span>. Mở liên kết đó để <strong className="text-foreground">đặt mật khẩu</strong> và kích hoạt tài khoản.
              </p>
            </div>
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-2xl text-xs font-medium leading-relaxed text-left">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <span>Liên kết có hiệu lực trong 10 phút. Sau thời gian này, tài khoản chưa kích hoạt sẽ tự động bị xóa.</span>
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
              <p className="text-xs text-muted-foreground font-medium mt-3">Tạo tài khoản Smart Fitness mới. Bạn sẽ đặt mật khẩu sau khi xác nhận email.</p>
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
