'use client';
import { useParams } from 'next/navigation';
import ResetPasswordForm from '@/components/ResetPasswordForm';

// The link we email: /reset-password/<token>
export default function ResetPasswordWithToken() {
  const params = useParams<{ token?: string }>();
  const token = typeof params?.token === 'string' ? params.token : '';

  return (
    <div suppressHydrationWarning className="min-h-screen flex items-center justify-center bg-background text-foreground px-4 relative overflow-hidden font-sans">
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
      <ResetPasswordForm token={token} />
    </div>
  );
}
