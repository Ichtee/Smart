'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const [userName, setUserName] = useState('Admin');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.name) setUserName(user.name);
        if (user.role !== 'admin') {
          router.push('/dashboard');
        }
      }
    } catch (e) {}
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const navItems = [
    { name: 'Tổng quan', href: '/dashboard/admin', icon: '📊' },
    { name: 'Quản lý lịch tập', href: '/dashboard/admin/routines', icon: '📅' },
    { name: 'Quản lý bài tập', href: '/dashboard/admin/exercises', icon: '🏋️' },
    { name: 'Quản lý người dùng', href: '/dashboard/admin/users', icon: '👥' }
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#131B2E] border-r border-slate-800/80 flex flex-col">
        <div className="p-6 border-b border-slate-800/80">
          <Link href="/dashboard/admin" className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span className="text-[#00E5FF]">Smart</span>
          </Link>
          <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">Admin Control Center</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-xs uppercase tracking-wider ${
                  isActive 
                    ? 'bg-[#00E5FF] text-slate-950 shadow-lg shadow-[#00E5FF]/20 font-black' 
                    : 'text-slate-400 hover:bg-[#18233C] hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/80">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#0B101D] rounded-2xl border border-slate-800/80 mb-4">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-[#00E5FF] flex items-center justify-center font-extrabold text-sm uppercase border border-cyan-500/30">
              {userName.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{userName}</p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Administrator</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
              className="flex-1 py-2 bg-[#18233C] hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors text-slate-300"
            >
              {lang === 'vi' ? '🇻🇳 VI' : '🇺🇸 EN'}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors"
            >
              Thoát
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto bg-[#0B0F19] relative">
        {/* FitPulse Glow */}
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#00E5FF]/10 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#00FF87]/10 blur-[140px] pointer-events-none" />
        
        <div className="relative z-10 p-8 h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
