'use client';
import { useRouter } from 'next/navigation';
import { useAdminUsers, useExercises } from '@/hooks/useApi';
import { useAdmin } from '@/hooks/useAdmin';

export default function AdminDashboard() {
  const router = useRouter();
  const { isAdmin, checking, authError } = useAdmin();
  const { total: usersCount, isLoading: usersLoading } = useAdminUsers(isAdmin);
  const { exercises, isLoading: exercisesLoading } = useExercises(isAdmin);
  const stats = { users: usersCount, exercises: Array.isArray(exercises) ? exercises.length : 0 };
  const loading = checking || (isAdmin && (usersLoading || exercisesLoading));

  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-6xl mb-4">⛔</div>
        <h1 className="text-2xl font-bold text-rose-500 mb-2">{authError}</h1>
        <button onClick={() => router.push('/')} className="mt-6 px-6 py-2 bg-[#18233C] hover:bg-slate-800 text-white rounded-xl transition-colors">Về trang chủ</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Tổng quan Hệ thống</h1>
        <p className="text-slate-400 mt-2">Báo cáo thống kê (Statistic Report) chung của Smart.</p>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="w-8 h-8 border-4 border-[#00E5FF] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stats Card: Users */}
          <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00E5FF]/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">Tổng người dùng</p>
                <h3 className="text-5xl font-black text-white">{stats.users}</h3>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 text-[#00E5FF] flex items-center justify-center text-3xl border border-cyan-500/30">
                👥
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800">
              <button onClick={() => router.push('/dashboard/admin/users')} className="text-[#00E5FF] text-xs font-bold hover:text-cyan-300 transition-colors uppercase tracking-wider">
                Xem chi tiết →
              </button>
            </div>
          </div>

          {/* Stats Card: Exercises */}
          <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00FF87]/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">Thư viện bài tập</p>
                <h3 className="text-5xl font-black text-white">{stats.exercises}</h3>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-[#00FF87] flex items-center justify-center text-3xl border border-emerald-500/30">
                🏋️
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800">
              <button onClick={() => router.push('/dashboard/admin/exercises')} className="text-[#00FF87] text-xs font-bold hover:text-emerald-300 transition-colors uppercase tracking-wider">
                Xem chi tiết →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
