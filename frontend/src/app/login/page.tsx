'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      
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
            FitPulse
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-1">Đăng nhập tài khoản hệ thống</p>
        </div>

        {error && <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3.5 rounded-2xl mb-6 text-xs font-bold">{error}</div>}
        
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
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mật khẩu</label>
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
