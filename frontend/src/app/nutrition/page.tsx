'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useRouter } from 'next/navigation';

export default function Nutrition() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [targetCalories, setTargetCalories] = useState(0);
  const [tdee, setTdee] = useState(0);
  const [calorieDeficit, setCalorieDeficit] = useState(0);
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [mlPerGlass, setMlPerGlass] = useState(250);
  const targetWaterGlasses = Math.ceil(2000 / (mlPerGlass || 250));

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const res = await fetch('http://localhost:5000/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const user = await res.json();
          
          if (!user.height || !user.weight) {
             router.push('/onboarding');
             return;
          }

          // Calculate Target Calories
          const w = Number(user.weight);
          const h = Number(user.height);
          const a = Number(user.age);
          
          let bmr = (10 * w) + (6.25 * h) - (5 * a);
          if (user.gender === 'Nam') {
            bmr += 5;
          } else {
            bmr -= 161;
          }

          let multiplier = 1.2;
          switch (user.activityLevel) {
            case 'Ít vận động': multiplier = 1.2; break;
            case 'Vận động nhẹ': multiplier = 1.375; break;
            case 'Vận động vừa': multiplier = 1.55; break;
            case 'Vận động nhiều': multiplier = 1.725; break;
            case 'Vận động cực nhiều': multiplier = 1.9; break;
            default: multiplier = 1.2; break;
          }
          
          const tdeeValue = bmr * multiplier;
          let calories = tdeeValue;
          let deficit = 0;
          
          if (user.goal === 'Giảm mỡ') {
            calories -= 500;
            deficit = -500;
          } else if (user.goal === 'Tăng cơ' || user.goal === 'Tăng cân') {
            calories += 300;
            deficit = 300;
          }

          setTdee(Math.round(tdeeValue));
          setCalorieDeficit(deficit);
          setTargetCalories(Math.round(calories));
        } else {
          localStorage.removeItem('token');
          router.push('/login');
        }
      } catch (err) {
        console.error('Failed to fetch profile', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Placeholder data for UI demonstration
  const caloriesConsumed = 0;
  const caloriesRemaining = targetCalories - caloriesConsumed;

  return (
    <div suppressHydrationWarning className="min-h-screen bg-zinc-950 text-white p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <Header />

        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Nhật ký ăn uống</h1>
          <p className="text-zinc-400 mt-2">Theo dõi và ghi chép lượng dinh dưỡng nạp vào để đạt hiệu quả cao nhất.</p>
        </div>

        {/* Calorie & Water Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          
          {/* Calorie Circle Card */}
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center relative group hover:border-emerald-500/30 transition-colors">
            <h2 className="text-emerald-400 font-semibold uppercase tracking-wider text-sm mb-6">Mục tiêu Calo</h2>
            
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-zinc-800/80" strokeWidth="6" />
                <circle 
                  cx="50" cy="50" r="45" fill="none" stroke="currentColor" 
                  className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)] transition-all duration-1000" 
                  strokeWidth="6" 
                  strokeDasharray="283" 
                  strokeDashoffset={targetCalories > 0 ? 283 - (283 * (Math.min(caloriesConsumed, targetCalories) / targetCalories)) : 283} 
                  strokeLinecap="round" 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-white drop-shadow-md">{targetCalories}</span>
                <span className="text-zinc-500 text-sm font-medium">Kcal / Ngày</span>
              </div>
            </div>

            {/* TDEE and Deficit Info */}
            <div className="w-full mt-6 bg-black/20 rounded-xl p-3 border border-white/5 text-center text-sm flex items-center justify-center gap-2 flex-wrap">
              <span className="text-zinc-400">TDEE: <strong className="text-white">{tdee}</strong></span>
              <span className="text-zinc-600">|</span>
              {calorieDeficit < 0 ? (
                <span className="text-rose-400 font-medium">Thâm hụt {Math.abs(calorieDeficit)} kcal</span>
              ) : calorieDeficit > 0 ? (
                <span className="text-cyan-400 font-medium">Tăng thêm {calorieDeficit} kcal</span>
              ) : (
                <span className="text-zinc-400 font-medium">Giữ nguyên</span>
              )}
            </div>

            <div className="w-full mt-6 grid grid-cols-2 gap-4 text-center">
              <div className="bg-zinc-950/50 p-3 rounded-2xl border border-white/5">
                <div className="text-zinc-500 text-xs font-bold uppercase mb-1">Đã nạp</div>
                <div className="text-xl font-bold text-cyan-400">{caloriesConsumed}</div>
              </div>
              <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20">
                <div className="text-emerald-500/80 text-xs font-bold uppercase mb-1">Còn lại</div>
                <div className="text-xl font-bold text-emerald-400">{caloriesRemaining}</div>
              </div>
            </div>
          </div>

          {/* Water Tracker Card */}
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center group hover:border-cyan-500/30 transition-colors">
            <h2 className="text-cyan-400 font-semibold uppercase tracking-wider text-sm mb-6">Lượng nước hôm nay</h2>
            
            <div className="relative w-48 h-48 flex items-center justify-center mb-4">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-zinc-800/80" strokeWidth="6" />
                <circle 
                  cx="50" cy="50" r="45" fill="none" stroke="currentColor" 
                  className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-all duration-1000" 
                  strokeWidth="6" 
                  strokeDasharray="283" 
                  strokeDashoffset={targetWaterGlasses > 0 ? 283 - (283 * (Math.min(waterGlasses, targetWaterGlasses) / targetWaterGlasses)) : 283} 
                  strokeLinecap="round" 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-white drop-shadow-md">{waterGlasses * mlPerGlass}</span>
                <span className="text-zinc-500 text-sm font-medium">ml / 2000 ml</span>
              </div>
            </div>
            
            <div className="flex flex-col items-center w-full mt-4">
               
               <div className="flex items-center gap-6">
                 <button 
                   onClick={() => setWaterGlasses(Math.max(0, waterGlasses - 1))}
                   className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-2xl hover:bg-zinc-700 hover:text-white transition-colors text-zinc-400 shrink-0"
                 >-</button>
                 
                 <div className="flex flex-col items-center">
                   <div className="text-2xl font-bold text-white mb-2">{waterGlasses} <span className="text-lg text-zinc-500">cốc</span></div>
                   <div className="flex items-center gap-1 bg-black/30 p-1.5 rounded-lg border border-white/5">
                     <input 
                       type="number" 
                       value={mlPerGlass} 
                       onChange={(e) => setMlPerGlass(Number(e.target.value) || 0)}
                       className="w-14 bg-transparent text-cyan-400 font-bold text-center text-sm focus:outline-none"
                     />
                     <span className="text-xs text-zinc-500 font-medium pr-1">ml/cốc</span>
                   </div>
                 </div>

                 <button 
                   onClick={() => setWaterGlasses(waterGlasses + 1)}
                   className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center text-2xl hover:bg-cyan-500/40 hover:text-cyan-300 transition-colors shadow-[0_0_15px_rgba(34,211,238,0.2)] shrink-0"
                 >+</button>
               </div>
               
            </div>
          </div>

        </div>

        {/* Meal Logging Placeholder */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white mb-4">Các bữa ăn trong ngày</h3>
          
          {['Bữa Sáng', 'Bữa Trưa', 'Bữa Tối', 'Ăn Vặt'].map((meal, idx) => (
            <div key={idx} className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 hover:border-white/10 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-2xl group-hover:bg-zinc-700 transition-colors">
                  {idx === 0 ? '🍳' : idx === 1 ? '🍱' : idx === 2 ? '🥩' : '🍎'}
                </div>
                <div>
                  <h4 className="font-semibold text-lg">{meal}</h4>
                  <p className="text-sm text-zinc-500">Chưa ghi nhận món ăn nào</p>
                </div>
              </div>
              <button className="px-6 py-2 rounded-full bg-zinc-800 text-sm font-semibold hover:bg-emerald-500 hover:text-white transition-colors">
                + Thêm món
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
