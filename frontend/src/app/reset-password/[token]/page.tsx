'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/utils/api';

export default function ResetPassword({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

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
      const res = await fetch(`${API_URL}/api/users/reset-password/${params.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Something went wrong');
      setStatus('success');
      setMessage(data.message);
      // Redirect to login after 2 seconds
      setTimeout(() => router.push('/login'), 2500);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message);
    }
  };

  return (
    <div suppressHydrationWarning className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-white px-4 relative overflow-hidden font-sans">
      {/* Background glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#00E5FF]/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-[#00FF87]/10 blur-[140px] pointer-events-none" />

      <div className="bg-[#131B2E]/90 backdrop-blur-2xl p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md border border-slate-800/80 relative z-10">

        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00E5FF] to-[#00FF87] p-0.5 mx-auto mb-3 shadow-lg shadow-[#00E5FF]/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#0B0F19] rounded-[14px] flex items-center justify-center">
              <span className="text-xl font-black text-[#00E5FF]">🔒</span>
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Đặt lại mật khẩu</h1>
          <p className="text-xs text-slate-400 font-semibold mt-1">Nhập mật khẩu mới cho tài khoản của bạn</p>
        </div>

        {status === 'success' ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#00FF87]/10 border border-[#00FF87]/30 flex items-center justify-center mx-auto">
              <span className="text-3xl">✅</span>
            </div>
            <p className="text-sm text-[#00FF87] font-bold">Đặt lại mật khẩu thành công!</p>
            <p className="text-xs text-slate-400">Đang chuyển hướng về trang đăng nhập...</p>
            <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden mt-2">
              <div className="h-full bg-[#00E5FF] rounded-full animate-[shrink_2.5s_linear_forwards]" style={{ width: '100%', animation: 'width 2.5s linear forwards' }} />
            </div>
          </div>
        ) : (
          <>
            {status === 'error' && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3.5 rounded-2xl mb-6 text-xs font-bold">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Mật khẩu mới
                </label>
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
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Xác nhận mật khẩu
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={`w-full px-4 py-3 bg-[#0B101D] border rounded-xl focus:outline-none transition text-sm text-white font-medium placeholder:text-slate-600 ${
                    confirm && confirm !== password
                      ? 'border-rose-500/60 focus:border-rose-400'
                      : 'border-slate-800 focus:border-[#00E5FF]'
                  }`}
                  placeholder="Nhập lại mật khẩu..."
                  required
                />
                {confirm && confirm !== password && (
                  <p className="text-rose-400 text-xs mt-1 font-medium">Mật khẩu không khớp</p>
                )}
              </div>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-3.5 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-sm transition-all shadow-lg shadow-[#00E5FF]/20 mt-2"
              >
                {status === 'loading' ? 'Đang lưu...' : 'Đặt lại mật khẩu'}
              </button>
            </form>

            <p className="mt-6 text-center text-slate-400 text-xs font-medium">
              <Link href="/login" className="text-[#00E5FF] font-bold hover:underline">
                ← Quay lại đăng nhập
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
