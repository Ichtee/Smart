'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminHeader() {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [userName, setUserName] = useState('Admin');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const { lang, setLang, t } = useLanguage();

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
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <header className="flex justify-between items-center mb-10 pb-4 border-b border-white/10">
      <div className="flex items-center gap-8">
        <Link href="/dashboard/admin" className="text-2xl font-bold bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent cursor-pointer">
          MyFitness Admin
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400 font-medium">
          <Link href="/dashboard/admin" className="hover:text-rose-400 transition text-rose-400">Quản lý bài tập</Link>
          <a href="#" className="hover:text-orange-400 transition opacity-50 cursor-not-allowed">Quản lý người dùng</a>
          <a href="#" className="hover:text-yellow-400 transition opacity-50 cursor-not-allowed">Cài đặt hệ thống</a>
        </nav>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Language Switcher */}
        <div className="relative" ref={langDropdownRef}>
          <button 
            onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl text-sm transition border border-white/5 text-zinc-300 font-medium"
          >
            {lang === 'vi' ? '🇻🇳 VI' : '🇺🇸 EN'}
          </button>
          
          {isLangDropdownOpen && (
            <div className="absolute right-0 mt-2 w-32 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl py-2 z-50 overflow-hidden">
              <button 
                onClick={() => { setLang('vi'); setIsLangDropdownOpen(false); }}
                className={`w-full text-left px-4 py-2 text-sm transition ${lang === 'vi' ? 'bg-zinc-800 text-rose-400' : 'text-zinc-300 hover:bg-zinc-800 hover:text-rose-400'}`}
              >
                🇻🇳 Tiếng Việt
              </button>
              <button 
                onClick={() => { setLang('en'); setIsLangDropdownOpen(false); }}
                className={`w-full text-left px-4 py-2 text-sm transition ${lang === 'en' ? 'bg-zinc-800 text-rose-400' : 'text-zinc-300 hover:bg-zinc-800 hover:text-rose-400'}`}
              >
                🇺🇸 English
              </button>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl text-sm transition border border-white/5"
          >
            <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs uppercase">
              {userName.charAt(0)}
            </div>
            <span className="text-zinc-300">Admin, <strong className="text-rose-400 font-medium">{userName}</strong></span>
          <svg className={`w-4 h-4 text-zinc-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl py-2 z-50">
            <button 
              onClick={() => {
                setIsDropdownOpen(false);
                handleLogout();
              }}
              className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 transition"
            >
              Đăng xuất
            </button>
          </div>
        )}
        </div>
      </div>
    </header>
  );
}
