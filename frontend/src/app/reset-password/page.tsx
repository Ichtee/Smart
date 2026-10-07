'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ResetPasswordForm from '@/components/ResetPasswordForm';

// Older form of the link (/reset-password?token=...), or no token at all: the form then asks for it.
function FromQuery() {
  const searchParams = useSearchParams();
  return <ResetPasswordForm token={searchParams.get('token') || ''} />;
}

export default function ResetPasswordPage() {
  return (
    <div suppressHydrationWarning className="min-h-screen flex items-center justify-center bg-background text-foreground px-4 relative overflow-hidden font-sans">
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" />

      <Suspense fallback={<div className="text-center text-foreground font-sans">Đang tải...</div>}>
        <FromQuery />
      </Suspense>
    </div>
  );
}
