'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      
      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        id: data._id,
        name: data.name,
        email: data.email,
        username: data.username
      }));

      // Check for missing profile info to trigger onboarding
      if (data.role === 'admin') {
        router.push('/admin/exercises');
      } else if (!data.height || !data.weight || !data.age) {
        router.push('/onboarding');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div suppressHydrationWarning className="min-h-screen flex items-center justify-center bg-zinc-950 text-white px-4">
      <div className="bg-zinc-900 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-zinc-800">
        <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          Welcome Back
        </h1>
        {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
              placeholder="Enter your username"
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
              placeholder="Enter your password"
              required 
            />
          </div>
          <button 
            type="submit"
            className="w-full py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/20"
          >
            Sign In
          </button>
        </form>
        <p className="mt-6 text-center text-zinc-400 text-sm">
          Don't have an account? <Link href="/register" className="text-emerald-400 hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
