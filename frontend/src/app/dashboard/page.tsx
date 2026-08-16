'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

export default function Dashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Basic auth check
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    } else {
      setIsLoading(false);
    }
  }, [router]);


  if (isLoading) return <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center text-white">Đang tải...</div>;

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-4 sm:p-6 md:p-8 relative overflow-x-hidden font-sans">
      {/* Ambient Neon Glow Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#00E5FF]/10 blur-[140px] pointer-events-none transform-gpu" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-[#00FF87]/10 blur-[140px] pointer-events-none transform-gpu" />

      <div className="max-w-6xl mx-auto relative z-10 space-y-6">
        <Header />

        {/* Welcome Section */}
        <div className="p-4 sm:p-6 bg-[#131B2E]/90 backdrop-blur-2xl border border-slate-800/80 rounded-2xl sm:rounded-3xl shadow-2xl">
          <h2 className="text-xl sm:text-3xl font-extrabold mb-1 tracking-tight">Chào mừng trở lại! 👋</h2>
          <p className="text-slate-400 text-xs sm:text-sm font-medium">Hệ Thống Luyện Tập & Quản Lý Thông Minh Smart Fitness</p>
        </div>

        {/* Dashboard Grid - 3 Columns on Mobile & Desktop */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
          
          {/* Card 1: Food Diary */}
          <div 
            onClick={() => router.push('/nutrition')}
            className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl hover:border-emerald-500/50 transition cursor-pointer group shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 text-lg sm:text-2xl group-hover:scale-110 transition shrink-0">
                🥗
              </div>
              <h3 className="text-xs sm:text-xl font-extrabold mb-1 text-white truncate">Nhật ký ăn uống</h3>
              <p className="text-slate-400 text-[10px] sm:text-xs line-clamp-2">Ghi lại lượng calo và dinh dưỡng mỗi ngày.</p>
            </div>
          </div>

          {/* Card 2: Workout Schedule */}
          <div 
            onClick={() => router.push('/workouts')}
            className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl hover:border-cyan-500/50 transition cursor-pointer group shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 bg-cyan-500/10 border border-cyan-500/20 text-[#00E5FF] rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 text-lg sm:text-2xl group-hover:scale-110 transition shrink-0">
                🏋️
              </div>
              <h3 className="text-xs sm:text-xl font-extrabold mb-1 text-white truncate">Lịch tập luyện</h3>
              <p className="text-slate-400 text-[10px] sm:text-xs line-clamp-2">Thiết kế và theo dõi bài tập theo nhóm cơ.</p>
            </div>
          </div>

          {/* Card 3: Progress */}
          <div 
            onClick={() => router.push('/progress')}
            className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl hover:border-purple-500/50 transition cursor-pointer group shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 sm:w-12 sm:h-12 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 text-lg sm:text-2xl group-hover:scale-110 transition shrink-0">
                📈
              </div>
              <h3 className="text-xs sm:text-xl font-extrabold mb-1 text-white truncate">Báo cáo tiến độ</h3>
              <p className="text-slate-400 text-[10px] sm:text-xs line-clamp-2">Thống kê lịch tập trong tháng & calo hàng ngày.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
