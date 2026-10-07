'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './smart/logo';
import { LayoutGrid, Activity, Utensils, User, LogOut } from 'lucide-react';
import { API_URL } from '@/utils/api';
import { clearApiCache } from '@/hooks/useApi';
import { useRouter } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
    { label: 'Activity', href: '/workouts', icon: Activity },
    { label: 'Nutrition', href: '/nutrition', icon: Utensils },
    { label: 'Profile', href: '/profile', icon: User },
  ];

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

  return (
    <>
      {/* Invisible layout spacer to reserve sidebar width in flex containers */}
      <div className="hidden md:block w-64 lg:w-72 shrink-0 h-screen" />

      {/* Desktop Left Vertical Sidebar (Fixed to Viewport) */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 border-r border-border bg-card/60 backdrop-blur-2xl p-6 fixed top-0 bottom-0 left-0 h-screen z-40 select-none">
        {/* Brand Logo */}
        <div className="mb-10 pt-2 px-2">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Logo size="lg" />
          </Link>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 space-y-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-4 rounded-2xl text-base font-bold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-primary/15 text-primary border border-primary/30 shadow-lg glow-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-elevated'
                }`}
              >
                <Icon className={`size-6 transition-transform ${isActive ? 'scale-110 text-primary' : ''}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout at bottom */}
        <div className="pt-6 border-t border-border mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-4 py-4 rounded-2xl text-base font-bold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <LogOut className="size-6" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Mobile Fixed Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border px-2 py-2 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 p-1 rounded-xl text-[10px] font-bold transition-colors ${
                isActive ? 'text-primary font-extrabold' : 'text-muted-foreground'
              }`}
            >
              <Icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 p-1 rounded-xl text-[10px] font-bold text-destructive hover:text-destructive/80 transition-colors cursor-pointer"
        >
          <LogOut className="size-5" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </>
  );
}
