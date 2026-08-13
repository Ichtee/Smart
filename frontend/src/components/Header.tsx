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
    <header className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800/80">
      <div className="flex items-center gap-8">
        <Link href="/dashboard" className="text-2xl font-black tracking-tight text-white flex items-center gap-2 cursor-pointer">
          <span className="text-[#00E5FF]">Smart</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-xs text-slate-400 font-bold uppercase tracking-wider">
          <Link href="/workouts" className="hover:text-[#00E5FF] transition">{t('header.workouts')}</Link>
          <Link href="/nutrition" className="hover:text-[#00E5FF] transition">{t('header.nutrition')}</Link>
        </nav>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Language Switcher */}
        <div className="relative" ref={langDropdownRef}>
          <button 
            onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-[#131B2E] hover:bg-[#18233C] rounded-xl text-xs transition border border-slate-800 text-slate-300 font-bold"
          >
            {lang === 'vi' ? '🇻🇳 VI' : '🇺🇸 EN'}
          </button>
          
          {isLangDropdownOpen && (
            <div className="absolute right-0 mt-2 w-36 bg-[#131B2E] border border-slate-800 rounded-xl shadow-2xl py-2 z-50 overflow-hidden">
              <button 
                onClick={() => { setLang('vi'); setIsLangDropdownOpen(false); }}
                className={`w-full text-left px-4 py-2 text-xs font-bold transition ${lang === 'vi' ? 'bg-[#18233C] text-[#00E5FF]' : 'text-slate-300 hover:bg-[#18233C] hover:text-[#00E5FF]'}`}
              >
                🇻🇳 Tiếng Việt
              </button>
              <button 
                onClick={() => { setLang('en'); setIsLangDropdownOpen(false); }}
                className={`w-full text-left px-4 py-2 text-xs font-bold transition ${lang === 'en' ? 'bg-[#18233C] text-[#00E5FF]' : 'text-slate-300 hover:bg-[#18233C] hover:text-[#00E5FF]'}`}
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
            className="flex items-center gap-2.5 px-4 py-2 bg-[#131B2E] hover:bg-[#18233C] rounded-xl text-xs font-bold transition border border-slate-800"
          >
            <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-[#00E5FF] flex items-center justify-center font-black text-xs uppercase border border-cyan-500/30">
              {userName.charAt(0)}
            </div>
            <span className="text-slate-300">{t('header.hello')} <strong className="text-[#00E5FF] font-bold">{userName}</strong></span>
            <svg className={`w-4 h-4 text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                {t('header.profile')}
              </Link>
              <div className="h-px bg-slate-800 my-1" />
              <button 
                onClick={() => {
                  setIsDropdownOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-4 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition"
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
