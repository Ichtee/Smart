'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Header() {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [userName, setUserName] = useState('Người dùng');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const { lang, setLang, t } = useLanguage();

  useEffect(() => {
    // Attempt to get user name from local storage
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.name) setUserName(user.name);
      }
    } catch (e) {}
    
    // Close dropdown on click outside
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
    <header className="flex justify-between items-center mb-10 pb-4 border-b border-zinc-800">
      <div className="flex items-center gap-8">
        <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent cursor-pointer">
          MyFitness
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400 font-medium">
          <Link href="/nutrition" className="hover:text-emerald-400 transition">{t('header.nutrition')}</Link>
          <Link href="/workouts" className="hover:text-cyan-400 transition">{t('header.workouts')}</Link>
          <a href="#" className="hover:text-purple-400 transition">{t('header.progress')}</a>
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
                className={`w-full text-left px-4 py-2 text-sm transition ${lang === 'vi' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-300 hover:bg-zinc-800 hover:text-emerald-400'}`}
              >
                🇻🇳 Tiếng Việt
              </button>
              <button 
                onClick={() => { setLang('en'); setIsLangDropdownOpen(false); }}
                className={`w-full text-left px-4 py-2 text-sm transition ${lang === 'en' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-300 hover:bg-zinc-800 hover:text-emerald-400'}`}
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
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs uppercase">
              {userName.charAt(0)}
            </div>
            <span className="text-zinc-300">{t('header.hello')} <strong className="text-emerald-400 font-medium">{userName}</strong></span>
          <svg className={`w-4 h-4 text-zinc-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl py-2 z-50">
            <Link 
              href="/profile" 
              className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-emerald-400 transition"
              onClick={() => setIsDropdownOpen(false)}
            >
              {t('header.profile')}
            </Link>
            <div className="h-px bg-white/5 my-1" />
            <button 
              onClick={() => {
                setIsDropdownOpen(false);
                handleLogout();
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition"
            >
              {t('header.logout')}
            </button>
          </div>
        )}
        </div>
      </div>
    </header>
  );
}
