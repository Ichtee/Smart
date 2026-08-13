'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Header() {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    <header className="relative mb-6 pb-4 border-b border-slate-800/80">
      <div className="flex justify-between items-center">
        
        {/* Brand & Desktop Nav */}
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-2xl font-black tracking-tight text-white flex items-center gap-2 cursor-pointer">
            <span className="text-[#00E5FF]">Smart</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 text-xs text-slate-400 font-bold uppercase tracking-wider">
            <Link href="/workouts" className="hover:text-[#00E5FF] transition">{t('header.workouts')}</Link>
            <Link href="/nutrition" className="hover:text-[#00E5FF] transition">{t('header.nutrition')}</Link>
          </nav>
        </div>

        {/* Desktop Controls */}
        <div className="hidden md:flex items-center gap-4">
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

        {/* Mobile Hamburger Toggle Button */}
        <div className="flex md:hidden items-center gap-3">
          {/* Language Switcher Quick Badge */}
          <button 
            onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
            className="px-2.5 py-1.5 bg-[#131B2E] border border-slate-800 rounded-xl text-xs font-bold text-slate-300"
          >
            {lang === 'vi' ? '🇻🇳' : '🇺🇸'}
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2.5 bg-[#131B2E] border border-slate-800 rounded-xl text-[#00E5FF] hover:bg-[#18233C] transition"
            aria-label="Toggle Navigation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

      </div>

      {/* Collapsible Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden mt-4 pt-4 border-t border-slate-800/80 bg-[#131B2E] border border-slate-800 rounded-2xl p-4 space-y-3 shadow-2xl animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-[#00E5FF] flex items-center justify-center font-black text-sm uppercase border border-cyan-500/30">
              {userName.charAt(0)}
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('header.hello')}</p>
              <p className="text-sm font-extrabold text-white">{userName}</p>
            </div>
          </div>

          <nav className="flex flex-col space-y-1 text-sm font-bold">
            <Link 
              href="/workouts" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl hover:bg-[#18233C] text-slate-200 hover:text-[#00E5FF] transition flex items-center gap-2"
            >
              <span>🏋️</span> {t('header.workouts')}
            </Link>
            
            <Link 
              href="/nutrition" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl hover:bg-[#18233C] text-slate-200 hover:text-[#00E5FF] transition flex items-center gap-2"
            >
              <span>🥗</span> {t('header.nutrition')}
            </Link>

            <Link 
              href="/profile" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl hover:bg-[#18233C] text-slate-200 hover:text-[#00E5FF] transition flex items-center gap-2"
            >
              <span>👤</span> {t('header.profile')}
            </Link>

            <button 
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full text-left px-4 py-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition flex items-center gap-2"
            >
              <span>🚪</span> {t('header.logout')}
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
