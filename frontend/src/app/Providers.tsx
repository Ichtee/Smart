'use client';
import { useEffect } from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import AuthGuard from '@/components/AuthGuard';
import MusicPlayer from '@/components/MusicPlayer';
import { FeedbackProvider } from '@/components/ui/feedback';

// The app used to mirror workout/nutrition data into localStorage (smart_* keys). The server is now
// the only source of truth, so remove those stale copies once instead of leaving them to rot.
const purgeLegacyLocalData = () => {
  try {
    Object.keys(localStorage)
      .filter(key => key.startsWith('smart_'))
      .forEach(key => localStorage.removeItem(key));
  } catch {
    // storage unavailable (private mode etc.): nothing to clean
  }
};

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    purgeLegacyLocalData();
  }, []);

  return (
    <LanguageProvider>
      <FeedbackProvider>
        <AuthGuard>
          {children}
          <MusicPlayer />
        </AuthGuard>
      </FeedbackProvider>
    </LanguageProvider>
  );
}
