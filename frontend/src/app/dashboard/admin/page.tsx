'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ users: 0, exercises: 0 });
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const checkAuthAndFetchStats = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setAuthError('Bạn chưa đăng nhập.');
        setLoading(false);
        return;
      }

      try {
        const profileRes = await fetch('http://localhost:5000/api/users/profile', {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        });
        const user = await profileRes.json();
        
        if (profileRes.ok && user.role === 'admin') {
          // Fetch stats
          const [usersRes, exercisesRes] = await Promise.all([
            fetch('http://localhost:5000/api/users', {
              headers: { 'Authorization': `Bearer ${storedToken}` }
            }),
            fetch('http://localhost:5000/api/exercises')
          ]);

          let usersCount = 0;
          let exercisesCount = 0;

          if (usersRes.ok) {
            const usersData = await usersRes.json();
            usersCount = usersData.length || 0;
          }
          if (exercisesRes.ok) {
            const exercisesData = await exercisesRes.json();
            exercisesCount = exercisesData.length || 0;
          }

          setStats({
            users: usersCount,
            exercises: exercisesCount
          });
        } else {
          setAuthError('Từ chối truy cập: Bạn không có quyền Quản trị viên.');
        }
      } catch (err) {
        setAuthError('Lỗi xác thực.');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchStats();
  }, []);

  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-6xl mb-4">⛔</div>
        <h1 className="text-2xl font-bold text-rose-500 mb-2">{authError}</h1>
        <button onClick={() => router.push('/')} className="mt-6 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">Về trang chủ</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Tổng quan Hệ thống</h1>
        <p className="text-zinc-400 mt-2">Báo cáo thống kê (Statistic Report) chung của MyFitness.</p>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stats Card: Users */}
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-zinc-400 font-medium mb-1">Tổng người dùng</p>
                <h3 className="text-5xl font-bold text-white">{stats.users}</h3>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl">
                👥
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5">
              <button onClick={() => router.push('/dashboard/admin/users')} className="text-emerald-400 text-sm font-medium hover:text-emerald-300 transition-colors">
                Xem chi tiết →
              </button>
            </div>
          </div>

          {/* Stats Card: Exercises */}
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-zinc-400 font-medium mb-1">Thư viện bài tập</p>
                <h3 className="text-5xl font-bold text-white">{stats.exercises}</h3>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-3xl">
                🏋️
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5">
              <button onClick={() => router.push('/dashboard/admin/exercises')} className="text-rose-400 text-sm font-medium hover:text-rose-300 transition-colors">
                Xem chi tiết →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
