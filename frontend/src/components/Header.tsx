'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GoogleTranslate from './GoogleTranslate';

export default function Header() {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState('Người dùng');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.startsWith('smart_sel_') ||
            key.startsWith('smart_comp_') ||
            key.startsWith('smart_saved_') ||
            key.startsWith('smart_det_') ||
            key.startsWith('smart_meals_') ||
            key.startsWith('smart_water_') ||
            key.startsWith('smart_daily_cal_') ||
            key === 'smart_workout_logs' ||
            key === 'smart_streak_history'
          )) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      }

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

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  return (
    <header className="relative mb-6 pb-4 border-b border-slate-800/80 space-y-3 md:space-y-0">
      <div className="flex flex-wrap md:flex-nowrap justify-between items-center gap-3">
        
        {/* Brand */}
        <div className="flex items-center gap-4 sm:gap-8">
          <Link href="/dashboard" className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2 cursor-pointer shrink-0">
            <span className="text-[#00E5FF]">Smart</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 text-xs text-slate-400 font-bold uppercase tracking-wider">
            <Link href="/workouts" className="hover:text-[#00E5FF] transition">Lịch tập luyện</Link>
            <Link href="/nutrition" className="hover:text-[#00E5FF] transition">Nhật ký ăn uống</Link>
            <Link href="/progress" className="hover:text-[#00E5FF] transition flex items-center gap-1">
              <span className="text-[#00FF87]">📈</span> Báo cáo tiến độ
            </Link>
          </nav>
        </div>

        {/* Desktop & Mobile Top Controls */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Google Translate Auto Translator */}
          <GoogleTranslate />

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#131B2E] hover:bg-[#18233C] rounded-xl text-xs font-bold transition border border-slate-800"
            >
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-[#00E5FF] flex items-center justify-center font-black text-xs uppercase border border-cyan-500/30 shrink-0">
                {userName.charAt(0)}
              </div>
              <span className="text-slate-300 text-xs hidden sm:inline">Chào, <strong className="text-[#00E5FF] font-bold">{userName}</strong></span>
              <svg className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#131B2E] border border-slate-800 rounded-xl shadow-2xl py-2 z-50">
                <Link 
                  href="/profile" 
                  className="block px-4 py-2 text-xs font-bold text-slate-300 hover:bg-[#18233C] hover:text-[#00E5FF] transition"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  Hồ sơ cá nhân
                </Link>
                <Link 
                  href="/progress" 
                  className="block px-4 py-2 text-xs font-bold text-slate-300 hover:bg-[#18233C] hover:text-[#00FF87] transition"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  📈 Báo cáo tiến độ
                </Link>
                <div className="h-px bg-slate-800 my-1" />
                <button 
                  onClick={() => {
                    setIsDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition"
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Mobile Horizontal Navigation Links (Desktop layout for mobile) */}
      <div className="flex md:hidden items-center gap-2 overflow-x-auto custom-scrollbar pb-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-t border-slate-800/60 whitespace-nowrap">
        <Link href="/workouts" className="px-3 py-1.5 rounded-lg bg-[#131B2E] hover:bg-[#18233C] border border-slate-800 text-slate-200 hover:text-[#00E5FF] transition flex items-center gap-1.5 shrink-0">
          <span>🏋️</span> Lịch tập
        </Link>
        <Link href="/nutrition" className="px-3 py-1.5 rounded-lg bg-[#131B2E] hover:bg-[#18233C] border border-slate-800 text-slate-200 hover:text-[#00E5FF] transition flex items-center gap-1.5 shrink-0">
          <span>🥗</span> Nhật ký ăn uống
        </Link>
        <Link href="/progress" className="px-3 py-1.5 rounded-lg bg-[#131B2E] hover:bg-[#18233C] border border-slate-800 text-slate-200 hover:text-[#00FF87] transition flex items-center gap-1.5 shrink-0">
          <span>📈</span> Báo cáo tiến độ
        </Link>
        <Link href="/profile" className="px-3 py-1.5 rounded-lg bg-[#131B2E] hover:bg-[#18233C] border border-slate-800 text-slate-200 hover:text-[#00E5FF] transition flex items-center gap-1.5 shrink-0">
          <span>👤</span> Hồ sơ
        </Link>
      </div>
    </header>
  );
}
