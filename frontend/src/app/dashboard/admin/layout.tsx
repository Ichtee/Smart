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
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.name) setUserName(user.name);
      }
    } catch (e) {}
  }, []);

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
    <div className="min-h-screen bg-zinc-950 text-white flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900 border-r border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <Link href="/dashboard/admin" className="text-2xl font-bold bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent block">
            MyFitness
          </Link>
          <p className="text-xs text-zinc-500 font-semibold mt-1 uppercase tracking-widest">Admin Panel</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${isActive ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'}`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-4 py-3 bg-zinc-950 rounded-xl border border-white/5 mb-4">
            <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-sm uppercase">
              {userName.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{userName}</p>
              <p className="text-xs text-zinc-500">Administrator</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
              className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-semibold transition-colors"
            >
              {lang === 'vi' ? '🇻🇳 Tiếng Việt' : '🇺🇸 English'}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-lg text-xs font-bold transition-colors"
            >
              Thoát
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto bg-zinc-950 relative">
        {/* Decorative elements */}
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-rose-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-orange-500/5 blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 p-8 h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
