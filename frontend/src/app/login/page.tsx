'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/utils/api';

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
    <div suppressHydrationWarning className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-white px-4 relative overflow-hidden font-sans">
      {/* FitPulse Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#00E5FF]/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-[#00FF87]/10 blur-[140px] pointer-events-none" />

      <div className="bg-[#131B2E]/90 backdrop-blur-2xl p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md border border-slate-800/80 relative z-10">

        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00E5FF] to-[#00FF87] p-0.5 mx-auto mb-3 shadow-lg shadow-[#00E5FF]/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#0B0F19] rounded-[14px] flex items-center justify-center">
              <span className="text-xl font-black text-[#00E5FF]">⚡</span>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Smart
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-1">Đăng nhập tài khoản hệ thống</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3.5 rounded-2xl mb-6 text-xs font-bold">
            {error}
          </div>
        )}

        {isUnverified && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-4 rounded-2xl mb-6 text-xs space-y-3">
            <p className="font-semibold leading-relaxed">
              Tài khoản này chưa được kích hoạt qua email. Nếu quá 10 phút chưa xác thực, tài khoản sẽ bị tự động xóa.
            </p>
            {resendStatus === 'success' ? (
              <p className="text-[#00FF87] font-bold">{resendMessage}</p>
            ) : (
              <div className="flex flex-col space-y-2">
                {resendStatus === 'error' && <p className="text-rose-400 font-bold">{resendMessage}</p>}
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendStatus === 'loading'}
                  className="px-3 py-2 bg-[#00E5FF]/10 text-[#00E5FF] hover:bg-[#00E5FF]/20 disabled:opacity-50 transition font-bold rounded-lg self-start"
                >
                  {resendStatus === 'loading' ? 'Đang gửi lại...' : 'Gửi lại email xác thực'}
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tên đăng nhập / Email</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-[#0B101D] border border-slate-800 rounded-xl focus:outline-none focus:border-[#00E5FF] transition text-sm text-white font-medium placeholder:text-slate-600"
              placeholder="Nhập username hoặc email..."
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Mật khẩu</label>
              <Link href="/forgot-password" className="text-xs text-[#00E5FF] font-semibold hover:underline">
                Quên mật khẩu?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#0B101D] border border-slate-800 rounded-xl focus:outline-none focus:border-[#00E5FF] transition text-sm text-white font-medium placeholder:text-slate-600"
              placeholder="Nhập mật khẩu..."
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 text-slate-950 font-black text-sm transition-all shadow-lg shadow-[#00E5FF]/20 mt-2"
          >
            Đăng nhập
          </button>
        </form>

        <p className="mt-8 text-center text-slate-400 text-xs font-medium">
          Chưa có tài khoản? <Link href="/register" className="text-[#00E5FF] font-bold hover:underline">Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  );
}
