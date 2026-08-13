'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const hasFetched = React.useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the URL.');
      return;
    }

    if (hasFetched.current) return;
    hasFetched.current = true;

    const verify = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/users/verify/${token}`);
        const data = await res.json();
        
        if (res.ok) {
          setStatus('success');
          setMessage('Your email has been verified successfully!');
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed.');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage('Network error. Please try again.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="bg-zinc-900 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-zinc-800 text-center">
      {status === 'loading' && (
        <div>
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-2">Verifying...</h1>
          <p className="text-zinc-400">Please wait while we verify your email.</p>
        </div>
      )}

      {status === 'success' && (
        <div>
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            ✓
          </div>
          <h1 className="text-2xl font-bold mb-2 text-emerald-400">Success!</h1>
          <p className="text-zinc-400 mb-6">{message}</p>
          <Link href="/login" className="block w-full py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold hover:opacity-90 transition">
            Continue to Login
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div>
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
            ✗
          </div>
          <h1 className="text-2xl font-bold mb-2 text-red-500">Verification Failed</h1>
          <p className="text-zinc-400 mb-6">{message}</p>
          <Link href="/login" className="block w-full py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition">
            Back to Login
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmail() {
  return (
    <div suppressHydrationWarning className="min-h-screen flex items-center justify-center bg-zinc-950 text-white px-4">
      <Suspense fallback={<div>Loading...</div>}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
