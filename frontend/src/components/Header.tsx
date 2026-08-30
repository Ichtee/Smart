'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GoogleTranslate from './GoogleTranslate';
import { Logo } from './smart/logo';
import { API_URL } from '@/utils/api';
import { Dumbbell, Utensils, TrendingUp, User, LogOut, ChevronDown } from 'lucide-react';

export default function Header() {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userName, setUserName] = useState('Người dùng');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.name) setUserName(user.name);
      }
    } catch (e) {}
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/users/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {}
    localStorage.clear();
    router.push('/login');
  };

  return (
    <header className="relative mb-8 pb-4 border-b border-border space-y-3 md:space-y-0">
      <div className="flex flex-wrap md:flex-nowrap justify-between items-center gap-4">
        
        {/* Brand */}
        <div className="flex items-center gap-6 sm:gap-10">
          <Link href="/dashboard" className="cursor-pointer shrink-0">
            <Logo size="md" />
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Link href="/workouts" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <Dumbbell className="size-4 text-primary" /> Lịch tập luyện
            </Link>
            <Link href="/nutrition" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <Utensils className="size-4 text-primary" /> Nhật ký ăn uống
            </Link>
            <Link href="/progress" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <TrendingUp className="size-4 text-primary" /> Báo cáo tiến độ
            </Link>
          </nav>
        </div>

        {/* Desktop & Mobile Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Google Translate */}
          <GoogleTranslate />

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2.5 px-3.5 py-2 bg-card hover:bg-surface-elevated rounded-full text-xs font-semibold transition border border-border cursor-pointer"
            >
              <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase border border-primary/20 shrink-0">
                {userName.charAt(0)}
              </div>
              <span className="text-foreground text-xs hidden sm:inline">Chào, <strong className="text-primary font-semibold">{userName}</strong></span>
              <ChevronDown className={`size-3.5 text-muted-foreground transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-card border border-border rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <Link 
                  href="/profile" 
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-foreground hover:bg-surface-elevated hover:text-primary transition"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <User className="size-4" /> Hồ sơ cá nhân
                </Link>
                <Link 
                  href="/progress" 
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-foreground hover:bg-surface-elevated hover:text-primary transition"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <TrendingUp className="size-4" /> Báo cáo tiến độ
                </Link>
                <div className="h-px bg-border my-1" />
                <button 
                  onClick={() => {
                    setIsDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-xs font-semibold text-destructive hover:bg-destructive/10 transition cursor-pointer"
                >
                  <LogOut className="size-4" /> Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Mobile Horizontal Navigation Links */}
      <div className="flex md:hidden items-center gap-2 overflow-x-auto custom-scrollbar pb-1 pt-2 text-[11px] font-medium tracking-wide text-muted-foreground border-t border-border whitespace-nowrap">
        <Link href="/workouts" className="px-3.5 py-1.5 rounded-full bg-secondary hover:bg-surface-elevated border border-border text-foreground transition flex items-center gap-1.5 shrink-0">
          <Dumbbell className="size-3.5 text-primary" /> Lịch tập
        </Link>
        <Link href="/nutrition" className="px-3.5 py-1.5 rounded-full bg-secondary hover:bg-surface-elevated border border-border text-foreground transition flex items-center gap-1.5 shrink-0">
          <Utensils className="size-3.5 text-primary" /> Nhật ký ăn uống
        </Link>
        <Link href="/progress" className="px-3.5 py-1.5 rounded-full bg-secondary hover:bg-surface-elevated border border-border text-foreground transition flex items-center gap-1.5 shrink-0">
          <TrendingUp className="size-3.5 text-primary" /> Tiến độ
        </Link>
        <Link href="/profile" className="px-3.5 py-1.5 rounded-full bg-secondary hover:bg-surface-elevated border border-border text-foreground transition flex items-center gap-1.5 shrink-0">
          <User className="size-3.5 text-primary" /> Hồ sơ
        </Link>
        <button 
          onClick={handleLogout}
          className="px-3.5 py-1.5 rounded-full bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 text-destructive font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <LogOut className="size-3.5" /> Đăng xuất
        </button>
      </div>
    </header>
  );
}
