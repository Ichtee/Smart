'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/utils/api';

interface MealItem {
  id: string;
  name: string;
  calories: number;
}

export default function Nutrition() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [targetCalories, setTargetCalories] = useState(2000);
  const [tdee, setTdee] = useState(2000);
  const [calorieDeficit, setCalorieDeficit] = useState(0);

  // Water Tracker State
  const [waterGlasses, setWaterGlasses] = useState(4);
  const [mlPerGlass, setMlPerGlass] = useState(250);
  const targetWaterGlasses = Math.ceil(2000 / (mlPerGlass || 250));

  // Meals State with persistence
  const [meals, setMeals] = useState<Record<string, MealItem[]>>({
    'Bữa Sáng': [],
    'Bữa Trưa': [],
    'Bữa Tối': [],
    'Ăn Vặt': []
  });

  // Modal State for adding food
  const [activeMealCategory, setActiveMealCategory] = useState<string | null>(null);
  const [foodName, setFoodName] = useState('');
  const [foodCalories, setFoodCalories] = useState('');

  useEffect(() => {
    // Load local storage states
    try {
      const todayDateStr = new Date().toISOString().split('T')[0];
      const savedWater = localStorage.getItem(`smart_water_${todayDateStr}`);
      if (savedWater) setWaterGlasses(parseInt(savedWater) || 0);

      const savedMeals = localStorage.getItem(`smart_meals_${todayDateStr}`);
      if (savedMeals) setMeals(JSON.parse(savedMeals));
    } catch (e) { }

    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const res = await fetch(`${API_URL}/api/users/profile`, {
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

  // Update Water Glasses with persistence
  const updateWater = (delta: number) => {
    const newVal = Math.max(0, waterGlasses + delta);
    setWaterGlasses(newVal);
    const todayDateStr = new Date().toISOString().split('T')[0];
    localStorage.setItem(`smart_water_${todayDateStr}`, newVal.toString());
  };

  // Add Food Item to Meal
  const handleAddFood = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedFoodName = foodName.trim().replace(/\s+/g, ' ');
    if (!activeMealCategory || !trimmedFoodName || !foodCalories) return;

    if (trimmedFoodName.length < 2 || trimmedFoodName.length > 60) {
      alert('Tên món ăn không được chứa toàn khoảng trắng, độ dài từ 2 đến 60 ký tự!');
      return;
    }

    const calVal = parseInt(foodCalories, 10);
    if (isNaN(calVal) || calVal <= 0 || calVal > 10000) {
      alert('Lượng Calo phải là số dương hợp lệ (từ 1 đến 10,000 kcal)!');
      return;
    }

    const newItem: MealItem = {
      id: Date.now().toString(),
      name: trimmedFoodName,
      calories: calVal
    };

    const updatedMeals = {
      ...meals,
      [activeMealCategory]: [...(meals[activeMealCategory] || []), newItem]
    };

    setMeals(updatedMeals);
    const todayDateStr = new Date().toISOString().split('T')[0];
    localStorage.setItem(`smart_meals_${todayDateStr}`, JSON.stringify(updatedMeals));

    // Reset Form & Modal
    setFoodName('');
    setFoodCalories('');
    setActiveMealCategory(null);
  };

  // Remove Food Item
  const handleRemoveFood = (category: string, itemId: string) => {
    const updatedMeals = {
      ...meals,
      [category]: (meals[category] || []).filter(item => item.id !== itemId)
    };
    setMeals(updatedMeals);
    const todayDateStr = new Date().toISOString().split('T')[0];
    localStorage.setItem(`smart_meals_${todayDateStr}`, JSON.stringify(updatedMeals));
  };

  // Calculate Total Consumed Calories
  const caloriesConsumed = Object.values(meals).flat().reduce((sum, item) => sum + item.calories, 0);
  const caloriesRemaining = targetCalories - caloriesConsumed;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#00E5FF] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="min-h-screen bg-[#0B0F19] text-white p-4 md:p-8 relative overflow-hidden font-sans">
      {/* Smart Ambient Glow Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#00E5FF]/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-[#00FF87]/10 blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 space-y-8">
        <Header />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <span className="text-[#00E5FF]">🥗</span> Nhật ký ăn uống & Dinh dưỡng
            </h1>
            <p className="text-slate-400 text-xs font-semibold mt-1">Theo dõi và ghi chép chi tiết lượng Calo và Nước nạp vào cơ thể.</p>
          </div>
        </div>

        {/* Calorie & Water Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Calorie Circle Card */}
          <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-between group hover:border-cyan-500/30 transition-all">
            <h2 className="text-[#00E5FF] font-extrabold uppercase tracking-wider text-xs mb-6">Mục tiêu Calo</h2>

            <div className="relative w-52 h-52 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-slate-800/80" strokeWidth="7" />
                <circle
                  cx="50" cy="50" r="45" fill="none" stroke="currentColor"
                  className="text-[#00E5FF] drop-shadow-[0_0_12px_rgba(0,229,255,0.6)] transition-all duration-1000"
                  strokeWidth="7"
                  strokeDasharray="283"
                  strokeDashoffset={targetCalories > 0 ? 283 - (283 * (Math.min(caloriesConsumed, targetCalories) / targetCalories)) : 283}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-white drop-shadow-md">{targetCalories}</span>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">Kcal / Ngày</span>
              </div>
            </div>

            {/* TDEE and Deficit Info */}
            <div className="w-full mt-6 bg-[#0B101D] rounded-2xl p-3.5 border border-slate-800 text-center text-xs flex items-center justify-center gap-3 flex-wrap">
              <span className="text-slate-400 font-semibold">TDEE: <strong className="text-white font-extrabold">{tdee} kcal</strong></span>
              <span className="text-slate-700">|</span>
              {calorieDeficit < 0 ? (
                <span className="text-rose-400 font-bold">Thâm hụt {Math.abs(calorieDeficit)} kcal</span>
              ) : calorieDeficit > 0 ? (
                <span className="text-[#00E5FF] font-bold">Tăng thêm {calorieDeficit} kcal</span>
              ) : (
                <span className="text-slate-400 font-bold">Giữ cân</span>
              )}
            </div>

            <div className="w-full mt-6 grid grid-cols-2 gap-4 text-center">
              <div className="bg-[#0B101D] p-4 rounded-2xl border border-slate-800">
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Đã nạp</div>
                <div className="text-2xl font-black text-[#00E5FF]">{caloriesConsumed} kcal</div>
              </div>
              <div className="bg-emerald-950/30 p-4 rounded-2xl border border-emerald-500/20">
                <div className="text-[#00FF87] text-[10px] font-bold uppercase tracking-wider mb-1">Còn lại</div>
                <div className="text-2xl font-black text-[#00FF87]">{caloriesRemaining} kcal</div>
              </div>
            </div>
          </div>

          {/* Water Tracker Card */}
          <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-between group hover:border-cyan-500/30 transition-all">
            <h2 className="text-[#00E5FF] font-extrabold uppercase tracking-wider text-xs mb-6">Lượng nước hôm nay</h2>

            <div className="relative w-52 h-52 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-slate-800/80" strokeWidth="7" />
                <circle
                  cx="50" cy="50" r="45" fill="none" stroke="currentColor"
                  className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)] transition-all duration-1000"
                  strokeWidth="7"
                  strokeDasharray="283"
                  strokeDashoffset={targetWaterGlasses > 0 ? 283 - (283 * (Math.min(waterGlasses, targetWaterGlasses) / targetWaterGlasses)) : 283}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-white drop-shadow-md">{waterGlasses * mlPerGlass}</span>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">ml / 2000 ml</span>
              </div>
            </div>

            <div className="flex flex-col items-center w-full mt-6 space-y-4">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => updateWater(-1)}
                  className="w-12 h-12 rounded-2xl bg-[#0B101D] border border-slate-800 flex items-center justify-center text-2xl font-black hover:bg-[#18233C] transition-colors text-slate-300 active:scale-95"
                >-</button>

                <div className="flex flex-col items-center">
                  <div className="text-2xl font-black text-white">{waterGlasses} <span className="text-sm font-semibold text-slate-400">cốc</span></div>
                  <div className="flex items-center gap-1 bg-[#0B101D] px-3 py-1 rounded-xl border border-slate-800 mt-1">
                    <input
                      type="number"
                      value={mlPerGlass}
                      onChange={(e) => setMlPerGlass(Number(e.target.value) || 0)}
                      className="w-14 bg-transparent text-[#00E5FF] font-black text-center text-xs focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">ml/cốc</span>
                  </div>
                </div>

                <button
                  onClick={() => updateWater(1)}
                  className="w-12 h-12 rounded-2xl bg-[#00E5FF] text-slate-950 font-black flex items-center justify-center text-2xl hover:bg-cyan-300 transition-colors shadow-lg shadow-[#00E5FF]/20 active:scale-95"
                >+</button>
              </div>
            </div>
          </div>

        </div>

        {/* Meal Logging Section */}
        <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🍱</span> Ghi chép bữa ăn trong ngày
            </h3>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tổng: <strong className="text-[#00E5FF] font-black">{caloriesConsumed} kcal</strong></span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { name: 'Bữa Sáng', icon: '🍳', defaultFoods: ['Trứng ốp la (150 kcal)', 'Bánh mì (220 kcal)'] },
              { name: 'Bữa Trưa', icon: '🍱', defaultFoods: ['Cơm trắng (200 kcal)', 'Ức gà áp chảo (250 kcal)'] },
              { name: 'Bữa Tối', icon: '🥩', defaultFoods: ['Thịt bò bít tết (350 kcal)', 'Salad rau củ (100 kcal)'] },
              { name: 'Ăn Vặt', icon: '🍎', defaultFoods: ['Táo tây (80 kcal)', 'Hạt hạnh nhân (160 kcal)'] }
            ].map((mealConfig) => {
              const categoryName = mealConfig.name;
              const itemList = meals[categoryName] || [];
              const categoryCalories = itemList.reduce((sum, item) => sum + item.calories, 0);

              return (
                <div key={categoryName} className="bg-[#0E1526] border border-slate-800/90 rounded-2xl p-6 space-y-4 hover:border-cyan-500/30 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#18233C] rounded-xl flex items-center justify-center text-xl">
                        {mealConfig.icon}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-white text-base">{categoryName}</h4>
                        <span className="text-xs text-[#00E5FF] font-bold">{categoryCalories} kcal</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveMealCategory(categoryName)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#00E5FF] text-slate-950 text-xs font-black hover:bg-cyan-300 transition-all shadow-md shadow-[#00E5FF]/20"
                    >
                      + Thêm món
                    </button>
                  </div>

                  {/* Food Items List */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/60">
                    {itemList.length > 0 ? (
                      itemList.map(item => (
                        <div key={item.id} className="flex items-center justify-between bg-[#131B2E] p-3 rounded-xl border border-slate-800/60 text-xs">
                          <span className="font-semibold text-slate-200">{item.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[#00E5FF] font-bold">{item.calories} kcal</span>
                            <button
                              onClick={() => handleRemoveFood(categoryName, item.id)}
                              className="text-rose-400 hover:text-rose-300 font-bold text-sm"
                              title="Xóa món này"
                            >
                              &times;
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic py-2">Chưa ghi nhận món ăn nào cho {categoryName}.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Add Food Item Modal */}
      {activeMealCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setActiveMealCategory(null)}></div>
          <div className="relative bg-[#131B2E] border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span>➕</span> Thêm món vào <span className="text-[#00E5FF]">{activeMealCategory}</span>
              </h3>
              <button onClick={() => setActiveMealCategory(null)} className="text-slate-500 hover:text-white text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleAddFood} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tên món ăn</label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  placeholder="VD: Phở bò, Ức gà, Cơm tấm..."
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Lượng Calo (kcal)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="10000"
                  value={foodCalories}
                  onChange={(e) => setFoodCalories(e.target.value)}
                  onKeyDown={(e) => { if (['e', 'E', '-', '+'].includes(e.key)) e.preventDefault(); }}
                  placeholder="VD: 350"
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              {/* Quick suggestions */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Gợi ý nhanh:</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Phở bò', cal: 450 },
                    { name: 'Cơm tấm', cal: 600 },
                    { name: 'Ức gà', cal: 220 },
                    { name: 'Trứng ốp la', cal: 150 },
                    { name: 'Bánh mì', cal: 300 }
                  ].map(sug => (
                    <button
                      key={sug.name}
                      type="button"
                      onClick={() => { setFoodName(sug.name); setFoodCalories(sug.cal.toString()); }}
                      className="px-2.5 py-1 bg-[#18233C] hover:bg-slate-800 border border-slate-800 rounded-lg text-xs text-slate-300 font-medium"
                    >
                      {sug.name} ({sug.cal}k)
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setActiveMealCategory(null)}
                  className="flex-1 py-3 bg-[#18233C] text-slate-300 font-bold rounded-xl hover:bg-slate-800 text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#00E5FF] text-slate-950 font-black rounded-xl hover:bg-cyan-300 text-xs shadow-lg shadow-[#00E5FF]/20"
                >
                  Lưu món ăn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
