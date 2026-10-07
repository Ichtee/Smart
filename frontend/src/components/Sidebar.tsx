'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from './smart/logo';
import ThemeToggle from './ThemeToggle';
import { LayoutGrid, Dumbbell, Utensils, Scale, User, LogOut, Trophy, CalendarDays, BarChart3, Menu, X } from 'lucide-react';
import { API_URL } from '@/utils/api';
import { clearApiCache } from '@/hooks/useApi';

const GROUPS = [
  { title: null, items: [{ label: 'Tổng quan', href: '/dashboard', icon: LayoutGrid }] },
  {
    title: 'Tập luyện',
    items: [
      { label: 'Tập luyện', href: '/workouts', icon: Dumbbell },
      { label: 'Lịch tập', href: '/routines', icon: CalendarDays },
      { label: 'Kỷ lục', href: '/records', icon: Trophy },
      { label: 'Khối lượng', href: '/volume', icon: BarChart3 },
    ],
  },
  {
    title: 'Sức khỏe',
    items: [
      { label: 'Dinh dưỡng', href: '/nutrition', icon: Utensils },
      { label: 'Cơ thể', href: '/body', icon: Scale },
    ],
  },
  { title: null, items: [{ label: 'Hồ sơ', href: '/profile', icon: User }] },
];

// The four most used pages sit in the mobile bottom bar; everything else is under "Thêm".
const MOBILE_MAIN = ['/dashboard', '/workouts', '/nutrition', '/body'];
const ALL_ITEMS = GROUPS.flatMap(g => g.items);
const MOBILE_ITEMS = MOBILE_MAIN.map(h => ALL_ITEMS.find(i => i.href === h)!);
const MORE_ITEMS = ALL_ITEMS.filter(i => !MOBILE_MAIN.includes(i.href));

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => { setMoreOpen(false); }, [pathname]);
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMoreOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/users/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {}
    localStorage.clear();
    clearApiCache();
    router.push('/');
  };

  const moreActive = MORE_ITEMS.some(i => i.href === pathname);

  return (
    <>
      {/* Invisible layout spacer to reserve sidebar width in flex containers */}
      <div className="hidden md:block w-64 lg:w-72 shrink-0 h-screen" />

      {/* Desktop Left Vertical Sidebar (Fixed to Viewport) */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 border-r border-border bg-card/60 backdrop-blur-2xl p-5 fixed top-0 bottom-0 left-0 h-screen z-40 select-none overflow-y-auto">
        <div className="mb-6 pt-2 px-2">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Logo size="lg" />
          </Link>
        </div>

        <nav className="flex-1 space-y-4" aria-label="Điều hướng chính">
          {GROUPS.map((group, gi) => (
            <div key={gi} className="space-y-1.5">
              {group.title && (
                <p className="px-4 pt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground/80">{group.title}</p>
              )}
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-base font-bold transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-primary/15 text-primary border border-primary/30 shadow-lg glow-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-surface-elevated border border-transparent'
                    }`}
                  >
                    <Icon className="size-5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="pt-4 border-t border-border mt-4 flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl text-base font-bold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <LogOut className="size-5" />
            <span>Đăng xuất</span>
          </button>
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile: bottom bar with the 4 main pages + "Thêm" */}
      <nav aria-label="Điều hướng nhanh" className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-stretch justify-around">
        {MOBILE_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-14 flex-1 min-w-0 rounded-xl text-xs font-bold transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="size-6" />
              <span className="truncate max-w-full">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(o => !o)}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
          className={`flex flex-col items-center justify-center gap-0.5 min-h-14 flex-1 min-w-0 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            moreActive || moreOpen ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Menu className="size-6" />
          <span>Thêm</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <button type="button" aria-label="Đóng" className="absolute inset-0 bg-black/60" onClick={() => setMoreOpen(false)} />
          <div role="dialog" aria-modal="true" aria-label="Menu" className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-lg font-display font-bold">Menu</p>
              <button type="button" aria-label="Đóng menu" onClick={() => setMoreOpen(false)} className="inline-flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-elevated cursor-pointer">
                <X className="size-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MORE_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-base font-bold ${
                      isActive ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-surface-elevated text-foreground'
                    }`}
                  >
                    <Icon className="size-5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
              <button type="button" onClick={handleLogout} className="flex flex-1 items-center gap-3 rounded-2xl px-4 py-3 text-base font-bold text-destructive hover:bg-destructive/10 cursor-pointer">
                <LogOut className="size-5" />
                <span>Đăng xuất</span>
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
