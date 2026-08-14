'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { API_URL } from '@/utils/api';

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const hasFetched = React.useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Không tìm thấy mã xác thực (token) trong liên kết URL.');
      return;
    }

    if (hasFetched.current) return;
    hasFetched.current = true;

    const verify = async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/verify/${token}`);
        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Tài khoản của bạn đã được kích hoạt thành công!');
        } else {
          setStatus('error');
          setMessage(data.message || 'Xác thực tài khoản thất bại.');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage('Lỗi kết nối mạng. Vui lòng thử lại sau.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="bg-[#131B2E]/90 backdrop-blur-2xl p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md border border-slate-800/80 text-center relative z-10">
      {status === 'loading' && (
        <div className="space-y-4">
          <div className="w-12 h-12 border-4 border-[#00E5FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-2xl font-extrabold text-white">Đang xác thực...</h1>
          <p className="text-slate-400 text-sm">Vui lòng chờ trong giây lát để hệ thống kiểm tra tài khoản của bạn.</p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-6">
          <div className="w-16 h-16 bg-[#00FF87]/10 border border-[#00FF87]/30 text-[#00FF87] rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            ✓
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#00FF87] mb-2">Thành công!</h1>
            <p className="text-slate-300 text-sm leading-relaxed">{message}</p>
          </div>
          <Link href="/login" className="block w-full py-3.5 rounded-xl bg-[#00E5FF] hover:bg-cyan-300 text-slate-950 font-black text-sm transition-all shadow-lg shadow-[#00E5FF]/20">
            Tiếp tục đăng nhập
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-6">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            ✗
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-rose-400 mb-2">Xác thực thất bại</h1>
            <p className="text-slate-300 text-sm leading-relaxed">{message}</p>
          </div>
          <Link href="/login" className="block w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-all">
            Quay lại trang đăng nhập
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmail() {
  return (
    <div suppressHydrationWarning className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-white px-4 relative overflow-hidden font-sans">
      {/* FitPulse Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#00E5FF]/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-[#00FF87]/10 blur-[140px] pointer-events-none" />

      <Suspense fallback={<div className="text-slate-400 text-sm">Đang tải...</div>}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
