'use client';
import { useState } from 'react';
import Link from 'next/link';
import { API_URL } from '@/utils/api';

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
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, email, password }),
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
    <div suppressHydrationWarning className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-white px-4 py-8 relative overflow-hidden font-sans">
      {/* FitPulse Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#00E5FF]/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-[#00FF87]/10 blur-[140px] pointer-events-none" />

      <div className="bg-[#131B2E]/90 backdrop-blur-2xl p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md border border-slate-800/80 relative z-10">
        
        {isSuccess ? (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-[#00FF87]/10 border border-[#00FF87]/30 flex items-center justify-center mx-auto">
              <span className="text-3xl">📧</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-white">Xác minh Email</h1>
              <p className="text-sm text-slate-300 font-medium">
                Một liên kết xác thực đã được gửi đến email <span className="text-[#00E5FF] font-bold">{email}</span>.
              </p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-2xl text-xs font-semibold leading-relaxed">
              ⚠️ Vui lòng kích hoạt tài khoản trong vòng 10 phút. Sau thời gian này, tài khoản chưa xác thực sẽ tự động bị xóa.
            </div>
            <Link href="/login" className="block w-full py-3.5 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 text-slate-950 font-black text-sm transition-all shadow-lg shadow-[#00E5FF]/20">
              Quay lại đăng nhập
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00E5FF] to-[#00FF87] p-0.5 mx-auto mb-3 shadow-lg shadow-[#00E5FF]/20 flex items-center justify-center">
                <div className="w-full h-full bg-[#0B0F19] rounded-[14px] flex items-center justify-center">
                  <span className="text-xl font-black text-[#00E5FF]">⚡</span>
                </div>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">
                Đăng ký
              </h1>
              <p className="text-xs text-slate-400 font-semibold mt-1">Tạo tài khoản Smart mới</p>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3.5 rounded-2xl mb-6 text-xs font-bold">
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Họ và Tên</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0B101D] border border-slate-800 rounded-xl focus:outline-none focus:border-[#00E5FF] transition text-sm text-white font-medium placeholder:text-slate-600"
                  placeholder="Nhập họ và tên..."
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tên đăng nhập</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0B101D] border border-slate-800 rounded-xl focus:outline-none focus:border-[#00E5FF] transition text-sm text-white font-medium placeholder:text-slate-600"
                  placeholder="Chọn username..."
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Địa chỉ Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0B101D] border border-slate-800 rounded-xl focus:outline-none focus:border-[#00E5FF] transition text-sm text-white font-medium placeholder:text-slate-600"
                  placeholder="name@example.com..."
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mật khẩu</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0B101D] border border-slate-800 rounded-xl focus:outline-none focus:border-[#00E5FF] transition text-sm text-white font-medium placeholder:text-slate-600"
                  placeholder="Tối thiểu 8 ký tự..."
                  required
                  minLength={8}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 disabled:opacity-50 text-slate-950 font-black text-sm transition-all shadow-lg shadow-[#00E5FF]/20 mt-2"
              >
                {isLoading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
              </button>
            </form>

            <p className="mt-8 text-center text-slate-400 text-xs font-medium">
              Đã có tài khoản? <Link href="/login" className="text-[#00E5FF] font-bold hover:underline">Đăng nhập</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
