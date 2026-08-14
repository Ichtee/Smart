'use client';
import { useState } from 'react';
import Link from 'next/link';
import { API_URL } from '@/utils/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/users/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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
    <div suppressHydrationWarning className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-white px-4 relative overflow-hidden font-sans">
      {/* Background glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#00E5FF]/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-[#00FF87]/10 blur-[140px] pointer-events-none" />

      <div className="bg-[#131B2E]/90 backdrop-blur-2xl p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md border border-slate-800/80 relative z-10">

        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00E5FF] to-[#00FF87] p-0.5 mx-auto mb-3 shadow-lg shadow-[#00E5FF]/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#0B0F19] rounded-[14px] flex items-center justify-center">
              <span className="text-xl font-black text-[#00E5FF]">🔑</span>
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Quên mật khẩu?</h1>
          <p className="text-xs text-slate-400 font-semibold mt-1">Nhập email và chúng tôi sẽ gửi link đặt lại mật khẩu</p>
        </div>

        {status === 'success' ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#00FF87]/10 border border-[#00FF87]/30 flex items-center justify-center mx-auto">
              <span className="text-3xl">✅</span>
            </div>
            <p className="text-sm text-slate-300 font-medium leading-relaxed">
              Nếu email <span className="text-[#00E5FF] font-bold">{email}</span> tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút.
            </p>
            <p className="text-xs text-slate-500">Kiểm tra cả hộp thư Spam nếu không thấy.</p>
            <Link href="/login" className="block w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition text-center mt-4">
              ← Quay lại đăng nhập
            </Link>
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
                  Địa chỉ Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0B101D] border border-slate-800 rounded-xl focus:outline-none focus:border-[#00E5FF] transition text-sm text-white font-medium placeholder:text-slate-600"
                  placeholder="Nhập email của bạn..."
                  required
                />
              </div>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-3.5 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-sm transition-all shadow-lg shadow-[#00E5FF]/20 mt-2"
              >
                {status === 'loading' ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
              </button>
            </form>

            <p className="mt-6 text-center text-slate-400 text-xs font-medium">
              Nhớ mật khẩu rồi?{' '}
              <Link href="/login" className="text-[#00E5FF] font-bold hover:underline">
                Đăng nhập
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
