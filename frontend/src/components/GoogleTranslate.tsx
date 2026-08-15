'use client';
import { useEffect, useState, useRef } from 'react';

interface Language {
  code: string;
  name: string;
  native: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: 'vi', name: 'Tiếng Việt', native: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', name: 'Tiếng Anh', native: 'English', flag: '🇺🇸' },
  { code: 'zh-CN', name: 'Tiếng Trung (Giản thể)', native: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', name: 'Tiếng Trung (Phồn thể)', native: '繁體中文', flag: '🇹🇼' },
  { code: 'ja', name: 'Tiếng Nhật', native: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Tiếng Hàn', native: '한국어', flag: '🇰🇷' },
  { code: 'fr', name: 'Tiếng Pháp', native: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Tiếng Đức', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Tiếng Tây Ban Nha', native: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Tiếng Ý', native: 'Italiano', flag: '🇮🇹' },
  { code: 'ru', name: 'Tiếng Nga', native: 'Русский', flag: '🇷🇺' },
  { code: 'th', name: 'Tiếng Thái', native: 'ไทย', flag: '🇹🇭' },
  { code: 'lo', name: 'Tiếng Lào', native: 'ພາສາລາວ', flag: '🇱𝒶' },
  { code: 'km', name: 'Tiếng Campuchia', native: 'ភាសាខ្មែរ', flag: '🇰🇭' },
  { code: 'id', name: 'Tiếng Indonesia', native: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms', name: 'Tiếng Mã Lai', native: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'hi', name: 'Tiếng Ấn Độ', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ar', name: 'Tiếng Ả Rập', native: 'العربية', flag: '🇸🇦' },
  { code: 'pt', name: 'Tiếng Bồ Đào Nha', native: 'Português', flag: '🇵🇹' },
  { code: 'nl', name: 'Tiếng Hà Lan', native: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Tiếng Ba Lan', native: 'Polski', flag: '🇵🇱' },
  { code: 'tr', name: 'Tiếng Thổ Nhĩ Kỳ', native: 'Türkçe', flag: '🇹🇷' },
  { code: 'sv', name: 'Tiếng Thụy Điển', native: 'Svenska', flag: '🇸🇪' },
  { code: 'no', name: 'Tiếng Na Uy', native: 'Norsk', flag: '🇳🇴' },
  { code: 'fi', name: 'Tiếng Phần Lan', native: 'Suomi', flag: '🇫🇮' },
  { code: 'da', name: 'Tiếng Đan Mạch', native: 'Dansk', flag: '🇩🇰' },
  { code: 'el', name: 'Tiếng Hy Lạp', native: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'he', name: 'Tiếng Do Thái', native: 'עברית', flag: '🇮🇱' },
  { code: 'uk', name: 'Tiếng Ukraina', native: 'Українська', flag: '🇺🇦' },
  { code: 'cs', name: 'Tiếng Séc', native: 'Čeština', flag: '🇨🇿' }
];

export default function GoogleTranslate() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLang, setSelectedLang] = useState<Language>(LANGUAGES[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Continuously enforce body top: 0px to prevent Google Translate top bar layout displacement
    const enforceBodyStyle = () => {
      if (document.body.style.top !== '0px') {
        document.body.style.top = '0px';
      }
      const bannerFrames = document.querySelectorAll(
        '.goog-te-banner-frame, iframe.goog-te-banner-frame, iframe[name="goog-te-banner-frame"]'
      );
      bannerFrames.forEach((frame) => {
        (frame as HTMLElement).style.display = 'none';
        (frame as HTMLElement).style.visibility = 'hidden';
      });

      // Remove "Được hỗ trợ bởi" text nodes dynamically
      const gadgets = document.querySelectorAll('.goog-te-gadget');
      gadgets.forEach((gadget) => {
        Array.from(gadget.childNodes).forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            node.textContent = '';
          }
        });
      });
    };

    const interval = setInterval(enforceBodyStyle, 300);

    // Prevent duplicate script insertion
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);

      (window as any).googleTranslateElementInit = () => {
        if ((window as any).google && (window as any).google.translate) {
          new (window as any).google.translate.TranslateElement(
            {
              pageLanguage: 'vi',
              autoDisplay: false,
            },
            'google_translate_element'
          );
        }
      };
    }

    // Close dropdown on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectLanguage = (lang: Language) => {
    setSelectedLang(lang);
    setIsOpen(false);
    setSearchQuery('');

    // Trigger Google Translate engine
    const selectEl = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (selectEl) {
      selectEl.value = lang.code;
      selectEl.dispatchEvent(new Event('change'));
    } else {
      // Fallback via googtrans cookie
      document.cookie = `googtrans=/vi/${lang.code}; path=/`;
      window.location.reload();
    }
  };

  const filteredLanguages = LANGUAGES.filter(lang => 
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.native.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Hidden Google Translate container */}
      <div id="google_translate_element" className="hidden" />

      {/* Main Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-[#131B2E] border border-slate-800 hover:border-cyan-500/50 rounded-xl px-3 py-1.5 shadow-sm text-xs font-bold text-[#00E5FF] transition-all"
      >
        <span className="text-sm">🌐</span>
        <span>{selectedLang.flag} {selectedLang.name}</span>
        <span className="text-[10px] text-slate-400">▼</span>
      </button>

      {/* Searchable Dropdown Modal Overlay */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-[#131B2E]/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150">
          
          {/* Search Bar Input Header */}
          <div className="p-2.5 border-b border-slate-800 bg-[#0B101D]">
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-xs text-slate-400">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm ngôn ngữ..."
                autoFocus
                className="w-full bg-[#18233C] text-xs text-white placeholder-slate-400 pl-8 pr-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-[#00E5FF] font-medium"
              />
            </div>
          </div>

          {/* Languages Scrollable List */}
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
            {filteredLanguages.length > 0 ? (
              filteredLanguages.map((lang) => {
                const isSelected = selectedLang.code === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleSelectLanguage(lang)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-[#00E5FF] text-slate-950 font-extrabold'
                        : 'text-slate-200 hover:bg-[#18233C] hover:text-[#00E5FF]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">{lang.flag}</span>
                      <span>{lang.name}</span>
                    </span>
                    <span className={`text-[10px] ${isSelected ? 'text-slate-950 font-black' : 'text-slate-400'}`}>
                      {lang.native}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-6 text-center text-xs text-slate-400">
                Không tìm thấy ngôn ngữ phù hợp.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
