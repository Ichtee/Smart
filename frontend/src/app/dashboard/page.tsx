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


  if (isLoading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <Header />
        {/* Welcome Section */}
        <div className="mb-10">
          <h2 className="text-3xl font-semibold mb-2">Chào mừng trở lại! 👋</h2>
          <p className="text-zinc-400">Hôm nay bạn muốn thực hiện hoạt động gì? (Chức năng đang phát triển)</p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Food Diary */}
          <div 
            onClick={() => router.push('/nutrition')}
            className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl hover:border-emerald-500/50 transition cursor-pointer group"
          >
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center mb-4 text-2xl group-hover:scale-110 transition">
              🥗
            </div>
            <h3 className="text-xl font-semibold mb-2">Nhật ký ăn uống</h3>
            <p className="text-zinc-400 text-sm">Ghi lại lượng calo và dinh dưỡng mỗi ngày của bạn.</p>
          </div>

          {/* Card 2: Workout Schedule */}
          <div 
            onClick={() => router.push('/workouts')}
            className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl hover:border-cyan-500/50 transition cursor-pointer group"
          >
            <div className="w-12 h-12 bg-cyan-500/10 text-cyan-400 rounded-xl flex items-center justify-center mb-4 text-2xl group-hover:scale-110 transition">
              💪
            </div>
            <h3 className="text-xl font-semibold mb-2">Lịch tập luyện</h3>
            <p className="text-zinc-400 text-sm">Thiết kế và theo dõi các bài tập cho từng nhóm cơ.</p>
          </div>

          {/* Card 3: Progress */}
          <div 
            onClick={() => router.push('/progress')}
            className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl hover:border-purple-500/50 transition cursor-pointer group"
          >
            <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center mb-4 text-2xl group-hover:scale-110 transition">
              📈
            </div>
            <h3 className="text-xl font-semibold mb-2">Theo dõi tiến độ & Thống kê</h3>
            <p className="text-zinc-400 text-sm">Báo cáo lịch tập luyện trong tháng, calo hàng ngày & chỉ số cơ thể.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
