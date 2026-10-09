'use client';
import React, { createContext, useContext, useSyncExternalStore, ReactNode } from 'react';

type Language = 'vi' | 'en';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

import { translations } from '@/utils/translations';

// The chosen language lives in localStorage; the server (and the first client render) always use Vietnamese.
const listeners = new Set<() => void>();
const subscribeToLang = (onChange: () => void) => {
  listeners.add(onChange);
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
};
const readLang = (): Language => {
  try {
    return localStorage.getItem('lang') === 'en' ? 'en' : 'vi';
  } catch {
    return 'vi'; // storage unavailable
  }
};

// The string at a dot-separated path inside the (nested) translations object, or null
const lookup = (root: unknown, keys: string[]): string | null => {
  let node: unknown = root;
  for (const k of keys) {
    if (node && typeof node === 'object' && k in node) node = (node as Record<string, unknown>)[k];
    else return null;
  }
  return typeof node === 'string' ? node : null;
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const lang = useSyncExternalStore(subscribeToLang, readLang, (): Language => 'vi');

  const setLang = (newLang: Language) => {
    try {
      localStorage.setItem('lang', newLang);
    } catch {
      // not saved, but the page still switches until it is reloaded
    }
    listeners.forEach(notify => notify());
  };

  // Translation by dot notation (e.g. 'header.workouts'); falls back to Vietnamese, then to the key itself
  const t = (key: string): string => {
    const keys = key.split('.');
    return lookup(translations[lang] || translations['vi'], keys) ?? lookup(translations['vi'], keys) ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
