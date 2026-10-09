'use client';
import { useState } from 'react';
import { readStoredUserName } from '@/utils/storedUser';
import Link from 'next/link';
import { BarChart3, CalendarDays, Dumbbell, Salad, Users, ArrowLeft } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { API_URL } from '@/utils/api';
import { clearApiCache } from '@/hooks/useApi';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  // AuthGuard shows this layout only after the client has verified the admin, so localStorage is readable here
  const [userName] = useState(() => readStoredUserName('Admin'));

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/users/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch {}
    localStorage.clear();
    clearApiCache();
    router.push('/');
  };

  const navItems = [
    { name: 'Tổng quan', href: '/dashboard/admin', icon: BarChart3 },
    { name: 'Quản lý lịch tập', href: '/dashboard/admin/routines', icon: CalendarDays },
    { name: 'Quản lý bài tập', href: '/dashboard/admin/exercises', icon: Dumbbell },
    { name: 'Quản lý món ăn', href: '/dashboard/admin/foods', icon: Salad },
    { name: 'Quản lý người dùng', href: '/dashboard/admin/users', icon: Users }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row font-sans">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-slate-800/80">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard/admin" className="text-xl font-black tracking-tight text-primary">Smart <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Admin</span></Link>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-xs font-bold text-primary hover:bg-surface-elevated"><ArrowLeft className="h-4 w-4" aria-hidden />Ứng dụng</Link>
            <button onClick={handleLogout} className="min-h-11 rounded-xl border border-destructive/30 bg-destructive/10 px-3 text-xs font-bold text-destructive">Thoát</button>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-4 pb-3" aria-label="Quản trị">
          {navItems.map(item => (
            <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}
              className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-bold ${pathname === item.href ? 'bg-primary text-slate-950' : 'bg-surface-elevated text-slate-300'}`}>
              <item.icon className="h-4 w-4" aria-hidden />{item.name}
            </Link>
          ))}
        </nav>
      </header>

      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 h-screen sticky top-0 bg-card border-r border-slate-800/80 flex-col">
        <div className="p-6 border-b border-slate-800/80">
          <Link href="/dashboard/admin" className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span className="text-primary">Smart</span>
          </Link>
          <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">Admin Control Center</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-xs uppercase tracking-wider ${
                  isActive 
                    ? 'bg-primary text-slate-950 shadow-lg shadow-primary/20 font-black' 
                    : 'text-slate-400 hover:bg-surface-elevated hover:text-white'
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/80">
          <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 mb-3 rounded-xl text-xs font-bold text-primary hover:bg-surface-elevated transition-colors"><ArrowLeft className="h-4 w-4" aria-hidden />Về ứng dụng</Link>
          <div className="flex items-center gap-3 px-4 py-3 bg-inset rounded-2xl border border-slate-800/80 mb-4">
            <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-extrabold text-sm uppercase border border-primary/30">
              {userName.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{userName}</p>
              <p className="text-xs text-slate-500 font-semibold uppercase">Administrator</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
              className="flex-1 py-2 bg-surface-elevated hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors text-slate-300"
            >
              {lang === 'vi' ? '🇻🇳 VI' : '🇺🇸 EN'}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/30 rounded-xl text-xs font-bold transition-colors"
            >
              Thoát
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 min-h-screen bg-background relative overflow-x-clip">
        {/* FitPulse Glow */}
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-success/10 blur-[140px] pointer-events-none" />
        
        <div className="relative z-10 p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
