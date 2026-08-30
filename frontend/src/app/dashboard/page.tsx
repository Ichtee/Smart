'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Utensils, Dumbbell, TrendingUp, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    // Auth check
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    } else {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.role) setUserRole(user.role);
        }
      } catch (e) {}
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-foreground font-sans">Đang tải...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8 relative overflow-x-hidden font-sans">
      {/* Smart Ambient Glow */}
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" />

      <div className="max-w-6xl mx-auto relative z-10 space-y-6">
        <Header />

        {/* Welcome Section */}
        <div className="p-6 md:p-8 bg-card border border-border rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground mb-3">
                <Sparkles className="size-3.5 text-primary" />
                Hệ Thống Luyện Tập & Quản Lý Thông Minh
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Chào mừng trở lại! 👋
              </h1>
              <p className="text-muted-foreground text-sm font-medium mt-1">
                Theo dõi dinh dưỡng, tối ưu lịch tập và bứt phá mục tiêu của bạn hôm nay.
              </p>
            </div>

            {userRole === 'admin' && (
              <button 
                onClick={() => router.push('/dashboard/admin')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary/10 border border-primary/30 text-primary font-semibold text-xs hover:bg-primary/20 transition cursor-pointer self-start md:self-auto"
              >
                <ShieldCheck className="size-4" /> Quản trị Admin
              </button>
            )}
          </div>
        </div>

        {/* Main Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card 1: Food Diary */}
          <div 
            onClick={() => router.push('/nutrition')}
            className="group bg-card border border-border p-6 rounded-3xl hover:border-primary/40 hover:bg-surface-elevated transition-all cursor-pointer shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="size-14 bg-primary/10 border border-primary/20 text-primary rounded-2xl flex items-center justify-center mb-5 group-hover:scale-105 transition shrink-0">
                <Utensils className="size-7" />
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-2 text-foreground group-hover:text-primary transition-colors">
                Nhật ký ăn uống
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Ghi lại bữa ăn, theo dõi calo, đạm, carb và chất béo tự động hàng ngày.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-primary">
              <span>Mở nhật ký</span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          {/* Card 2: Workout Schedule */}
          <div 
            onClick={() => router.push('/workouts')}
            className="group bg-card border border-border p-6 rounded-3xl hover:border-primary/40 hover:bg-surface-elevated transition-all cursor-pointer shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="size-14 bg-primary/10 border border-primary/20 text-primary rounded-2xl flex items-center justify-center mb-5 group-hover:scale-105 transition shrink-0">
                <Dumbbell className="size-7" />
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-2 text-foreground group-hover:text-primary transition-colors">
                Lịch tập luyện
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Lên kế hoạch buổi tập, theo dõi các nhóm cơ 3D/2D và chỉ số sức mạnh.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-primary">
              <span>Xem lịch tập</span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          {/* Card 3: Progress */}
          <div 
            onClick={() => router.push('/progress')}
            className="group bg-card border border-border p-6 rounded-3xl hover:border-primary/40 hover:bg-surface-elevated transition-all cursor-pointer shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="size-14 bg-primary/10 border border-primary/20 text-primary rounded-2xl flex items-center justify-center mb-5 group-hover:scale-105 transition shrink-0">
                <TrendingUp className="size-7" />
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-2 text-foreground group-hover:text-primary transition-colors">
                Báo cáo tiến độ
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Xem biểu đồ thay đổi cân nặng, tỷ lệ mỡ và báo cáo thống kê hàng tuần.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-primary">
              <span>Xem báo cáo</span>
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
