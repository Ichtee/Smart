'use client';
import { LanguageProvider } from '@/contexts/LanguageContext';
import AuthGuard from '@/components/AuthGuard';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AuthGuard>
        {children}
      </AuthGuard>
    </LanguageProvider>
  );
}

