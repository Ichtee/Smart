'use client';
import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/utils/api';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';

interface MealItem {
  id: string;
  name: string;
  calories: number;
  quantity?: string;
  image?: string;
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

  // Helper for local YYYY-MM-DD date string (prevents UTC timezone shift bug)
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Date Selector State (defaults to today YYYY-MM-DD in local timezone)
  const todayStr = getTodayStr();
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Modal State for adding food & photo upload
  const [activeMealCategory, setActiveMealCategory] = useState<string | null>(null);
  const [foodName, setFoodName] = useState('');
  const [servingSize, setServingSize] = useState('1 phần');
  const [baseCalories, setBaseCalories] = useState('');
  const [portionMultiplier, setPortionMultiplier] = useState<string>('1');
  const [foodImage, setFoodImage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  // Barcode Scanner Modal State
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

  // Live Food Database State
  const [dbFoods, setDbFoods] = useState<Array<{
    _id: string;
    name: string;
    servingSize: string;
    calories: number;
    category?: string;
    image?: string;
    isCustom?: boolean;
  }>>([]);
  const [showDbDropdown, setShowDbDropdown] = useState(false);
  const [saveAsCustomFood, setSaveAsCustomFood] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'search' | 'my_foods'>('search');

  const fetchFoodsFromDb = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/foods`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setDbFoods(data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchFoodsFromDb();
  }, []);

  const computedTotalCalories = useMemo(() => {
    const mult = parseFloat(portionMultiplier);
    const baseCal = parseFloat(baseCalories);
    if (isNaN(mult) || mult <= 0 || isNaN(baseCal) || baseCal <= 0) {
      return 0;
    }
    return Math.round(mult * baseCal);
  }, [portionMultiplier, baseCalories]);

  const handleDetectedProduct = (product: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    servingSize: string;
  }) => {
    const targetCat = activeMealCategory || 'Bữa Sáng';
    setActiveMealCategory(targetCat);
    setFoodName(product.name);
    setServingSize(product.servingSize || '1 phần');
    setBaseCalories((product.calories || 0).toString());
    setPortionMultiplier('1');
  };

  const pushNutritionToBackend = async (
    targetWaterGlasses: number,
    targetMlPerGlass: number,
    targetMeals: Record<string, MealItem[]>
  ) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await fetch(`${API_URL}/api/nutrition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          date: selectedDate,
          waterGlasses: targetWaterGlasses,
          mlPerGlass: targetMlPerGlass,
          meals: targetMeals
        })
      });
    } catch (err) {
      console.error('Failed to push nutrition log to API:', err);
    }
  };

  // Load meals & water for selectedDate with real-time event synchronization
  useEffect(() => {
    let isCancelled = false;

    const loadNutrition = async () => {
      let loadedFromApi = false;
      let targetWater = 0;
      let targetMl = mlPerGlass || 250;
      let targetMeals: Record<string, MealItem[]> = {
        'Bữa Sáng': [],
        'Bữa Trưa': [],
        'Bữa Tối': [],
        'Ăn Vặt': []
      };

      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await fetch(`${API_URL}/api/nutrition?date=${selectedDate}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            credentials: 'include'
          });
          if (res.ok) {
            const apiLog = await res.json();
            if (apiLog) {
              targetWater = apiLog.waterGlasses || 0;
              targetMl = apiLog.mlPerGlass || 250;
              targetMeals = {
                'Bữa Sáng': apiLog.meals?.['Bữa Sáng'] || [],
                'Bữa Trưa': apiLog.meals?.['Bữa Trưa'] || [],
                'Bữa Tối': apiLog.meals?.['Bữa Tối'] || [],
                'Ăn Vặt': apiLog.meals?.['Ăn Vặt'] || []
              };
              loadedFromApi = true;
            }
          }
        } catch (e) { }
      }

      if (!token && !loadedFromApi) {
        try {
          let savedWater = localStorage.getItem(`smart_water_${selectedDate}`);
          let savedMeals = localStorage.getItem(`smart_meals_${selectedDate}`);

          // Auto-migrate data logged under yesterday if today is empty due to previous UTC bug
          if (selectedDate === todayStr && !savedMeals) {
            const yesterdayDate = new Date();
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            const yStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;
            const yesterdayMeals = localStorage.getItem(`smart_meals_${yStr}`);
            if (yesterdayMeals) {
              localStorage.setItem(`smart_meals_${selectedDate}`, yesterdayMeals);
              savedMeals = yesterdayMeals;
            }
            const yesterdayWater = localStorage.getItem(`smart_water_${yStr}`);
            if (yesterdayWater && !savedWater) {
              localStorage.setItem(`smart_water_${selectedDate}`, yesterdayWater);
              savedWater = yesterdayWater;
            }
          }

          targetWater = savedWater ? parseInt(savedWater, 10) || 0 : 0;
          if (savedMeals) {
            targetMeals = JSON.parse(savedMeals);
          }
        } catch (e) { }
      }

      if (isCancelled) return;

      setWaterGlasses(targetWater);
      setMlPerGlass(targetMl);
      setMeals(targetMeals);
    };

    loadNutrition();

    window.addEventListener('storage', loadNutrition);
    window.addEventListener('smart_nutrition_updated', loadNutrition);
    window.addEventListener('smart_workout_updated', loadNutrition);
    window.addEventListener('focus', loadNutrition);

    return () => {
      isCancelled = true;
      window.removeEventListener('storage', loadNutrition);
      window.removeEventListener('smart_nutrition_updated', loadNutrition);
      window.removeEventListener('smart_workout_updated', loadNutrition);
      window.removeEventListener('focus', loadNutrition);
    };
  }, [selectedDate, todayStr]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const res = await fetch(`${API_URL}/api/users/profile`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          credentials: 'include'
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

  // Date navigation helpers using local date arithmetic
  const changeDateByDays = (days: number) => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${da}`);
  };

  // Helper to notify other tabs / components of real-time storage changes
  const notifyStorageChange = (dateStr: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('smart_nutrition_updated', { detail: { date: dateStr } }));
    }
  };

  // Update Water Glasses with persistence for selectedDate
  const updateWater = (delta: number) => {
    const newVal = Math.max(0, waterGlasses + delta);
    setWaterGlasses(newVal);
    localStorage.setItem(`smart_water_${selectedDate}`, newVal.toString());
    pushNutritionToBackend(newVal, mlPerGlass, meals);
    notifyStorageChange(selectedDate);
  };

  // Handle Image Upload reading STRICTLY from process.env without any hardcoded secret
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setImageUploadError('');

    try {
      const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
      if (!apiKey) {
        throw new Error('Chưa cấu hình NEXT_PUBLIC_IMGBB_API_KEY trong .env.local hoặc Vercel!');
      }

      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.data?.url) {
        setFoodImage(data.data.url);
      } else {
        throw new Error(data.error?.message || 'Upload ảnh thất bại');
      }
    } catch (err: any) {
      setImageUploadError(err.message || 'Không thể tải ảnh lên ImgBB');
    } finally {
      setUploadingImage(false);
    }
  };

  // Add Food Item to Meal for selectedDate
  const handleAddFood = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedFoodName = foodName.trim().replace(/\s+/g, ' ');
    if (!activeMealCategory || !trimmedFoodName || computedTotalCalories <= 0) return;

    if (trimmedFoodName.length < 2 || trimmedFoodName.length > 60) {
      alert('Tên món ăn không được chứa toàn khoảng trắng, độ dài từ 2 đến 60 ký tự!');
      return;
    }

    if (computedTotalCalories > 10000) {
      alert('Lượng Calo tổng phải là số dương hợp lệ (tối đa 10,000 kcal)!');
      return;
    }

    const multVal = parseFloat(portionMultiplier) || 1;
    const cleanServing = servingSize.trim() || '1 phần';
    const formattedQuantity = multVal === 1 ? cleanServing : `${multVal} x (${cleanServing})`;

    const newItem: MealItem = {
      id: Date.now().toString(),
      name: trimmedFoodName,
      calories: computedTotalCalories,
      quantity: formattedQuantity,
      image: foodImage || undefined
    };

    const updatedMeals = {
      ...meals,
      [activeMealCategory]: [...(meals[activeMealCategory] || []), newItem]
    };

    setMeals(updatedMeals);
    localStorage.setItem(`smart_meals_${selectedDate}`, JSON.stringify(updatedMeals));
    pushNutritionToBackend(waterGlasses, mlPerGlass, updatedMeals);
    notifyStorageChange(selectedDate);

    // Save as Custom Food if checked
    if (saveAsCustomFood) {
      const token = localStorage.getItem('token');
      if (token) {
        fetch(`${API_URL}/api/foods/custom`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
          body: JSON.stringify({
            name: trimmedFoodName,
            servingSize: cleanServing,
            calories: parseFloat(baseCalories) || computedTotalCalories,
            image: foodImage || ''
          })
        }).then(() => fetchFoodsFromDb()).catch(() => {});
      }
    }

    // Reset Form & Modal
    setFoodName('');
    setServingSize('1 phần');
    setBaseCalories('');
    setPortionMultiplier('1');
    setFoodImage('');
    setSaveAsCustomFood(false);
    setImageUploadError('');
    setActiveMealCategory(null);
  };

  // Remove Food Item for selectedDate
  const handleRemoveFood = (category: string, itemId: string) => {
    const updatedMeals = {
      ...meals,
      [category]: (meals[category] || []).filter(item => item.id !== itemId)
    };
    setMeals(updatedMeals);
    localStorage.setItem(`smart_meals_${selectedDate}`, JSON.stringify(updatedMeals));
    pushNutritionToBackend(waterGlasses, mlPerGlass, updatedMeals);
    notifyStorageChange(selectedDate);
  };

  // View Detail Modal state for Nutrition summary
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Calculate Total Consumed Calories for selected date
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
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#00E5FF]/10 blur-[140px] pointer-events-none transform-gpu" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-[#00FF87]/10 blur-[140px] pointer-events-none transform-gpu" />

      <div className="max-w-7xl mx-auto relative z-10 space-y-6 sm:space-y-8">
        <Header />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <span className="text-[#00E5FF]">🥗</span> Nhật ký ăn uống & Dinh dưỡng
            </h1>
            <p className="text-slate-400 text-[11px] sm:text-xs font-semibold mt-1">Theo dõi và ghi chép chi tiết lượng Calo và Nước nạp vào cơ thể.</p>
          </div>

          {/* Date Picker Navigation Bar */}
          <div className="flex items-center gap-2 bg-[#131B2E] border border-slate-800 p-2 rounded-2xl shadow-lg self-start md:self-auto">
            <button
              onClick={() => changeDateByDays(-1)}
              className="px-3 py-1.5 bg-[#0B101D] hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-all"
              title="Xem ngày trước"
            >
              ◀
            </button>
            <div className="flex items-center gap-2 px-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="bg-[#0B101D] text-[#00E5FF] text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-800 focus:outline-none focus:border-[#00E5FF] cursor-pointer"
              />
              {selectedDate === todayStr && (
                <span className="bg-[#00E5FF]/20 text-[#00E5FF] text-[10px] font-black px-2 py-0.5 rounded-md border border-[#00E5FF]/30">
                  Hôm nay
                </span>
              )}
            </div>
            <button
              onClick={() => changeDateByDays(1)}
              className="px-3 py-1.5 bg-[#0B101D] hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-all"
              title="Xem ngày sau"
            >
              ▶
            </button>
            {selectedDate !== todayStr && (
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="px-2.5 py-1.5 bg-[#00E5FF] text-slate-950 rounded-xl text-xs font-extrabold hover:bg-cyan-300 transition-all shadow-md shadow-[#00E5FF]/20"
              >
                Về hôm nay
              </button>
            )}
          </div>
        </div>

        {/* Calorie & Water Dashboard */}
        <div className="grid grid-cols-2 gap-3 sm:gap-8">

          {/* Calorie Circle Card */}
          <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl flex flex-col items-center justify-between group hover:border-cyan-500/30 transition-all">
            <div className="flex items-center justify-between w-full mb-3 sm:mb-6">
              <h2 className="text-[#00E5FF] font-extrabold uppercase tracking-wider text-[10px] sm:text-xs">Mục tiêu Calo</h2>
              <button
                onClick={() => setShowDetailModal(true)}
                className="px-2 sm:px-3 py-1 sm:py-1.5 bg-[#0B101D] hover:bg-slate-800 text-[#00E5FF] border border-[#00E5FF]/30 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
              >
                <span>🔍</span> <span className="hidden sm:inline">Xem chi tiết</span>
              </button>
            </div>

            <div className="relative w-36 h-36 sm:w-52 sm:h-52 flex items-center justify-center">
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
                <span className="text-xl sm:text-4xl font-black text-white drop-shadow-md">{targetCalories}</span>
                <span className="text-slate-400 text-[9px] sm:text-xs font-bold uppercase tracking-wider mt-0.5">Kcal / Ngày</span>
              </div>
            </div>

            {/* TDEE and Deficit Info */}
            <div className="w-full mt-4 sm:mt-6 bg-[#0B101D] rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border border-slate-800 text-center text-[10px] sm:text-xs flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
              <span className="text-slate-400 font-semibold">TDEE: <strong className="text-white font-extrabold">{tdee} kcal</strong></span>
              <span className="text-slate-700 hidden sm:inline">|</span>
              {calorieDeficit < 0 ? (
                <span className="text-rose-400 font-bold">Thâm hụt {Math.abs(calorieDeficit)} kcal</span>
              ) : calorieDeficit > 0 ? (
                <span className="text-[#00E5FF] font-bold">Tăng {calorieDeficit} kcal</span>
              ) : (
                <span className="text-slate-400 font-bold">Giữ cân</span>
              )}
            </div>

            <div className="w-full mt-3 sm:mt-6 grid grid-cols-2 gap-2 sm:gap-4 text-center">
              <div className="bg-[#0B101D] p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800">
                <div className="text-slate-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-0.5">Đã nạp</div>
                <div className="text-sm sm:text-2xl font-black text-[#00E5FF]">{caloriesConsumed}</div>
              </div>
              <div className="bg-emerald-950/30 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-500/20">
                <div className="text-[#00FF87] text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-0.5">Còn lại</div>
                <div className="text-sm sm:text-2xl font-black text-[#00FF87]">{caloriesRemaining}</div>
              </div>
            </div>
          </div>

          {/* Water Tracker Card */}
          <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl flex flex-col items-center justify-between group hover:border-cyan-500/30 transition-all">
            <h2 className="text-[#00E5FF] font-extrabold uppercase tracking-wider text-[10px] sm:text-xs mb-3 sm:mb-6">Lượng nước</h2>

            <div className="relative w-36 h-36 sm:w-52 sm:h-52 flex items-center justify-center">
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
                <span className="text-xl sm:text-4xl font-black text-white drop-shadow-md">{waterGlasses * mlPerGlass}</span>
                <span className="text-slate-400 text-[9px] sm:text-xs font-bold uppercase tracking-wider mt-0.5">ml / 2000 ml</span>
              </div>
            </div>

            <div className="flex flex-col items-center w-full mt-4 sm:mt-6 space-y-2 sm:space-y-4">
              <div className="flex items-center gap-3 sm:gap-6">
                <button
                  onClick={() => updateWater(-1)}
                  className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#0B101D] border border-slate-800 flex items-center justify-center text-lg sm:text-2xl font-black hover:bg-[#18233C] transition-colors text-slate-300 active:scale-95"
                >-</button>

                <div className="flex flex-col items-center">
                  <div className="text-lg sm:text-2xl font-black text-white">{waterGlasses} <span className="text-xs sm:text-sm font-semibold text-slate-400">cốc</span></div>
                  <div className="flex items-center gap-1 bg-[#0B101D] px-2 sm:px-3 py-0.5 sm:py-1 rounded-xl border border-slate-800 mt-1">
                    <input
                      type="number"
                      value={mlPerGlass}
                      onChange={(e) => setMlPerGlass(Number(e.target.value) || 0)}
                      onKeyDown={(e) => { if (['e', 'E', '-', '+'].includes(e.key)) e.preventDefault(); }}
                      className="w-10 sm:w-14 bg-transparent text-[#00E5FF] font-black text-center text-[10px] sm:text-xs focus:outline-none"
                    />
                    <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold">ml/cốc</span>
                  </div>
                </div>

                <button
                  onClick={() => updateWater(1)}
                  className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#00E5FF] text-slate-950 font-black flex items-center justify-center text-lg sm:text-2xl hover:bg-cyan-300 transition-colors shadow-lg shadow-[#00E5FF]/20 active:scale-95"
                >+</button>
              </div>
            </div>
          </div>

        </div>

        {/* Meal Logging Section */}
        <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-3 sm:pb-4 gap-2">
            <h3 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
              <span>🍱</span> Ghi chép bữa ăn trong ngày
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tổng: <strong className="text-[#00E5FF] font-black">{caloriesConsumed} kcal</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-6">
            {[
              { name: 'Bữa Sáng', icon: '🍳' },
              { name: 'Bữa Trưa', icon: '🍱' },
              { name: 'Bữa Tối', icon: '🥩' },
              { name: 'Ăn Vặt', icon: '🍎' }
            ].map((mealConfig) => {
              const categoryName = mealConfig.name;
              const itemList = meals[categoryName] || [];
              const categoryCalories = itemList.reduce((sum, item) => sum + item.calories, 0);

              return (
                <div key={categoryName} className="bg-[#0E1526] border border-slate-800/90 rounded-2xl p-3.5 sm:p-6 space-y-3 sm:space-y-4 hover:border-cyan-500/30 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#18233C] rounded-xl flex items-center justify-center text-base sm:text-xl shrink-0">
                        {mealConfig.icon}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-white text-xs sm:text-base">{categoryName}</h4>
                        <span className="text-[10px] sm:text-xs text-[#00E5FF] font-bold">{categoryCalories} kcal</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <button
                        onClick={() => setActiveMealCategory(categoryName)}
                        className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-[#00E5FF] text-slate-950 text-[10px] sm:text-xs font-black hover:bg-cyan-300 transition-all shadow-md shadow-[#00E5FF]/20 cursor-pointer flex items-center gap-1"
                      >
                        <span>+</span> Thêm món
                      </button>
                    </div>
                  </div>

                  {/* Food Items List */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/60">
                    {itemList.length > 0 ? (
                      itemList.map(item => (
                        <div key={item.id} className="flex items-center justify-between bg-[#131B2E] p-3 rounded-xl border border-slate-800/60 text-xs">
                          <div className="flex items-center gap-3">
                            {item.image && (
                              <img
                                src={item.image}
                                alt={item.name}
                                onClick={() => setSelectedPreviewImage(item.image!)}
                                className="w-10 h-10 rounded-lg object-cover cursor-pointer border border-slate-700 hover:border-[#00E5FF] hover:scale-105 transition-all shadow-sm"
                                title="Bấm để xem ảnh phóng to"
                              />
                            )}
                            <div>
                              <span className="font-semibold text-slate-200">{item.name}</span>
                              {item.quantity && (
                                <span className="ml-1.5 text-[11px] text-slate-400 font-medium">({item.quantity})</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[#00E5FF] font-bold">{item.calories} kcal</span>
                            <button
                              onClick={() => handleRemoveFood(categoryName, item.id)}
                              className="text-rose-400 hover:text-rose-300 font-bold text-sm ml-1"
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
          <div className="relative bg-[#131B2E] border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>➕</span> Thêm món vào <span className="text-[#00E5FF]">{activeMealCategory}</span>
              </h3>
              <button onClick={() => setActiveMealCategory(null)} className="text-slate-500 hover:text-white text-xl font-bold">&times;</button>
            </div>

            {/* Modal Tabs */}
            <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-[#0B101D] border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveModalTab('search')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  activeModalTab === 'search'
                    ? 'bg-[#00E5FF] text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🔍 Tra cứu / Nhập mới
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('my_foods')}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeModalTab === 'my_foods'
                    ? 'bg-[#00E5FF] text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>⭐ Món của tôi</span>
                <span className="px-1.5 py-0.2 bg-slate-800 text-slate-200 text-[10px] rounded-full">
                  {dbFoods.filter(f => f.isCustom).length}
                </span>
              </button>
            </div>

            {activeModalTab === 'my_foods' ? (
              /* Tab 2: My Custom Foods List */
              <div className="space-y-3">
                <p className="text-xs text-slate-400 font-semibold">Danh sách các món ăn cá nhân bạn đã lưu lại để dùng nhanh:</p>
                {dbFoods.filter(f => f.isCustom).length > 0 ? (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {dbFoods.filter(f => f.isCustom).map(item => (
                      <div
                        key={item._id}
                        onClick={() => {
                          setFoodName(item.name);
                          setServingSize(item.servingSize || '1 phần');
                          setBaseCalories(item.calories.toString());
                          setPortionMultiplier('1');
                          if (item.image) setFoodImage(item.image);
                          setActiveModalTab('search');
                        }}
                        className="p-3 bg-[#0B101D] border border-slate-800 hover:border-[#00E5FF] rounded-2xl cursor-pointer transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">⭐</span>
                          <div>
                            <p className="text-xs font-bold text-white group-hover:text-[#00E5FF]">{item.name}</p>
                            <p className="text-[10px] text-slate-400">{item.servingSize}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-[#00E5FF]">{item.calories} kcal</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!confirm(`Xóa món "${item.name}" khỏi "Món ăn của tôi"?`)) return;
                              const token = localStorage.getItem('token');
                              if (token) {
                                fetch(`${API_URL}/api/foods/custom/${item._id}`, {
                                  method: 'DELETE',
                                  headers: { 'Authorization': `Bearer ${token}` },
                                  credentials: 'include'
                                }).then(() => fetchFoodsFromDb());
                              }
                            }}
                            className="text-slate-500 hover:text-rose-400 p-1 text-sm font-bold"
                            title="Xóa món ăn cá nhân"
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-[#0B101D] border border-slate-800 rounded-2xl space-y-2">
                    <p className="text-2xl">⭐</p>
                    <p className="text-xs text-slate-400 font-semibold">Bạn chưa có món ăn cá nhân nào.</p>
                    <p className="text-[10px] text-slate-500">Khi nhập món ăn mới, tích chọn ô <i>"Lưu vào Món ăn của tôi"</i> để hiển thị tại đây!</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setActiveModalTab('search')}
                  className="w-full py-2.5 bg-[#18233C] text-slate-300 hover:text-white font-bold rounded-xl text-xs transition"
                >
                  ← Quay lại nhập món
                </button>
              </div>
            ) : (
              /* Tab 1: Standard Add Food Form */
              <form onSubmit={handleAddFood} className="space-y-4">
              <button
                type="button"
                onClick={() => setIsBarcodeModalOpen(true)}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer mb-2"
              >
                <span>📷</span> Quét mã vạch tự động
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase font-bold">hoặc nhập thủ công</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>
              
              {/* 1. Tên món ăn (kèm Live Search từ MongoDB Food Database) */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Tên món ăn *</span>
                  <span className="text-[10px] text-[#00E5FF] font-semibold">🔍 Tìm từ cơ sở dữ liệu</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={foodName}
                  onFocus={() => setShowDbDropdown(true)}
                  onChange={(e) => {
                    setFoodName(e.target.value);
                    setShowDbDropdown(true);
                  }}
                  placeholder="VD: Phở bò, Ức gà, Cơm tấm..."
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#00E5FF]"
                />

                {/* Live Food Database Dropdown Results */}
                {showDbDropdown && dbFoods.length > 0 && foodName.trim() && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-[#131B2E] border border-slate-700 rounded-2xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-slate-800">
                    {dbFoods
                      .filter(f => f.name.toLowerCase().includes(foodName.toLowerCase().trim()))
                      .slice(0, 8)
                      .map(item => (
                        <div
                          key={item._id}
                          onClick={() => {
                            setFoodName(item.name);
                            setServingSize(item.servingSize || '1 phần');
                            setBaseCalories(item.calories.toString());
                            setPortionMultiplier('1');
                            if (item.image) setFoodImage(item.image);
                            setShowDbDropdown(false);
                          }}
                          className="p-3 hover:bg-[#18233C] cursor-pointer transition-colors flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">🥗</span>
                            <div>
                              <p className="font-bold text-white">{item.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{item.servingSize}</p>
                            </div>
                          </div>
                          <span className="font-black text-[#00E5FF]">{item.calories} kcal</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* 2. Khẩu phần chuẩn gốc & Calo 1 khẩu phần */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Khẩu phần chuẩn</label>
                  <input
                    type="text"
                    maxLength={30}
                    value={servingSize}
                    onChange={(e) => setServingSize(e.target.value)}
                    placeholder="VD: Gói 200g, 100g, 1 tô..."
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Calo / 1 khẩu phần</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="10000"
                    value={baseCalories}
                    onChange={(e) => setBaseCalories(e.target.value)}
                    placeholder="VD: 400"
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
              </div>

              {/* 3. Bộ nhân số lượng (Portion Multiplier) */}
              <div className="bg-[#0B101D] p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Số lượng / Khẩu phần ăn</label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 font-medium">Hệ số:</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="50"
                      value={portionMultiplier}
                      onChange={(e) => setPortionMultiplier(e.target.value)}
                      className="w-14 bg-[#131B2E] border border-slate-700 text-[#00E5FF] font-black text-center text-xs py-1 rounded-lg focus:outline-none focus:border-[#00E5FF]"
                    />
                  </div>
                </div>

                {/* Quick Multiplier Buttons */}
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { label: '½', val: 0.5 },
                    { label: '1', val: 1 },
                    { label: '1.5', val: 1.5 },
                    { label: '2', val: 2 },
                    { label: '3', val: 3 }
                  ].map((btn) => {
                    const isSelected = parseFloat(portionMultiplier) === btn.val;
                    return (
                      <button
                        key={btn.val}
                        type="button"
                        onClick={() => setPortionMultiplier(btn.val.toString())}
                        className={`py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#00E5FF] text-slate-950 shadow-md shadow-[#00E5FF]/20'
                            : 'bg-[#18233C] text-slate-300 hover:bg-slate-800 border border-slate-800'
                        }`}
                      >
                        {btn.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Tổng Calo tính toán tự động */}
              <div className="p-3.5 bg-[#0E1526] border border-[#00E5FF]/40 rounded-2xl flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">TỔNG CALO NẠP VÀO</span>
                  <span className="text-xs text-slate-300 font-medium">
                    {portionMultiplier || '1'} x ({servingSize || '1 phần'})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-[#00E5FF]">{computedTotalCalories}</span>
                  <span className="text-xs text-slate-400 font-bold ml-1">kcal</span>
                </div>
              </div>

              {/* Checkbox: Save to My Custom Foods */}
              <label className="flex items-center gap-2.5 p-3 bg-[#0B101D] border border-slate-800/80 rounded-xl cursor-pointer hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={saveAsCustomFood}
                  onChange={(e) => setSaveAsCustomFood(e.target.checked)}
                  className="w-4 h-4 rounded text-[#00E5FF] bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                  <span>⭐</span> Lưu vào <b className="text-white font-bold">"Món ăn của tôi"</b> để dùng lại sau
                </span>
              </label>

              {/* Photo Upload via ImgBB */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Hình ảnh món ăn (tùy chọn)</label>
                {foodImage ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-700 group">
                    <img src={foodImage} alt="Ảnh bữa ăn" className="w-full h-36 object-cover" />
                    <button
                      type="button"
                      onClick={() => setFoodImage('')}
                      className="absolute top-2 right-2 bg-rose-500/80 hover:bg-rose-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shadow-md transition-all"
                      title="Xóa ảnh"
                    >
                      &times;
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] text-emerald-400 font-bold flex items-center gap-1 border border-emerald-500/30">
                      <span>✓</span> Đã tải lên ImgBB
                    </div>
                  </div>
                ) : uploadingImage ? (
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#00E5FF] p-6 bg-[#0B101D] border border-slate-800 rounded-2xl">
                    <div className="w-4 h-4 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin"></div>
                    Đang tải ảnh lên ImgBB...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {/* Option 1: Pick existing image from device / gallery */}
                    <label className="flex flex-col items-center justify-center border border-slate-800 hover:border-[#00E5FF] bg-[#0B101D] hover:bg-[#131B2E] rounded-2xl p-4 cursor-pointer transition-all group text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                      <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🖼️</span>
                      <span className="text-xs font-bold text-slate-300 group-hover:text-[#00E5FF]">Chọn từ thiết bị</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Thư viện ảnh / File</span>
                    </label>

                    {/* Option 2: Direct camera capture */}
                    <label className="flex flex-col items-center justify-center border border-slate-800 hover:border-[#00FF87] bg-[#0B101D] hover:bg-[#131B2E] rounded-2xl p-4 cursor-pointer transition-all group text-center">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageSelect}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                      <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">📸</span>
                      <span className="text-xs font-bold text-slate-300 group-hover:text-[#00FF87]">Chụp ảnh mới</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Camera điện thoại</span>
                    </label>
                  </div>
                )}
                {imageUploadError && (
                  <p className="text-rose-400 text-xs mt-1 font-semibold">{imageUploadError}</p>
                )}
              </div>

              {/* Quick suggestions */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Gợi ý nhanh:</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Phở bò', cal: 450, qty: '1 tô' },
                    { name: 'Cơm tấm', cal: 600, qty: '1 dĩa' },
                    { name: 'Ức gà', cal: 220, qty: '200g' },
                    { name: 'Trứng ốp la', cal: 150, qty: '2 quả' },
                    { name: 'Bánh mì', cal: 300, qty: '1 ổ' }
                  ].map(sug => (
                    <button
                      key={sug.name}
                      type="button"
                      onClick={() => {
                        setFoodName(sug.name);
                        setServingSize(sug.qty);
                        setBaseCalories(sug.cal.toString());
                        setPortionMultiplier('1');
                      }}
                      className="px-2.5 py-1 bg-[#18233C] hover:bg-slate-800 border border-slate-800 rounded-lg text-xs text-slate-300 font-medium"
                    >
                      {sug.name} ({sug.qty} • {sug.cal} kcal)
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
                  disabled={uploadingImage}
                  className="flex-1 py-3 bg-[#00E5FF] text-slate-950 font-black rounded-xl hover:bg-cyan-300 text-xs shadow-lg shadow-[#00E5FF]/20 disabled:opacity-50"
                >
                  Lưu món ăn
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* Full Daily Nutrition Summary Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowDetailModal(false)}></div>
          <div className="relative bg-[#131B2E] border border-slate-800 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl z-10 max-h-[85vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>📋</span> Báo cáo dinh dưỡng ngày: <span className="text-[#00E5FF] font-black">{selectedDate.split('-').reverse().join('/')}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Tổng quan Calo, Nước và các bữa ăn đã ghi nhận trong ngày.</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-500 hover:text-white text-2xl font-bold">&times;</button>
            </div>

            {/* Quick Stat Summary Cards */}
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="bg-[#0B101D] p-3 rounded-2xl border border-slate-800">
                <div className="text-slate-400 text-[10px] font-bold uppercase">Tổng nạp</div>
                <div className="text-lg font-black text-[#00E5FF]">{caloriesConsumed} kcal</div>
              </div>
              <div className="bg-[#0B101D] p-3 rounded-2xl border border-slate-800">
                <div className="text-slate-400 text-[10px] font-bold uppercase">Mục tiêu</div>
                <div className="text-lg font-black text-white">{targetCalories} kcal</div>
              </div>
              <div className="bg-[#0B101D] p-3 rounded-2xl border border-slate-800">
                <div className="text-slate-400 text-[10px] font-bold uppercase">Lượng nước</div>
                <div className="text-lg font-black text-cyan-400">{waterGlasses * mlPerGlass} ml</div>
              </div>
            </div>

            {/* Meal Breakdowns */}
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Chi tiết các bữa ăn:</h4>
              {[
                { name: 'Bữa Sáng', icon: '🍳' },
                { name: 'Bữa Trưa', icon: '🍱' },
                { name: 'Bữa Tối', icon: '🥩' },
                { name: 'Ăn Vặt', icon: '🍎' }
              ].map(cat => {
                const list = meals[cat.name] || [];
                const catCal = list.reduce((s, i) => s + i.calories, 0);

                return (
                  <div key={cat.name} className="bg-[#0B101D] p-4 rounded-2xl border border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold border-b border-slate-800 pb-2">
                      <span className="text-white flex items-center gap-1.5">
                        <span>{cat.icon}</span> {cat.name}
                      </span>
                      <span className="text-[#00E5FF]">{catCal} kcal</span>
                    </div>

                    {list.length > 0 ? (
                      <div className="space-y-2">
                        {list.map(item => (
                          <div key={item.id} className="flex items-center justify-between bg-[#131B2E] p-2.5 rounded-xl text-xs">
                            <div className="flex items-center gap-3">
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  onClick={() => setSelectedPreviewImage(item.image!)}
                                  className="w-10 h-10 rounded-lg object-cover cursor-pointer border border-slate-700 hover:border-[#00E5FF] transition-all"
                                  title="Xem ảnh"
                                />
                              )}
                              <div>
                                <span className="font-medium text-slate-200">{item.name}</span>
                                {item.quantity && (
                                  <span className="ml-1.5 text-[11px] text-slate-400 font-normal">({item.quantity})</span>
                                )}
                              </div>
                            </div>
                            <span className="font-bold text-[#00E5FF]">{item.calories} kcal</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">Không có ghi nhận món ăn nào.</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2.5 bg-[#18233C] text-slate-300 font-bold rounded-xl hover:bg-slate-800 text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Image Preview Modal Lightbox */}
      {selectedPreviewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedPreviewImage(null)}></div>
          <div className="relative bg-[#131B2E] border border-slate-800 rounded-3xl p-4 max-w-xl w-full shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedPreviewImage(null)}
              className="absolute top-3 right-3 text-slate-300 hover:text-white text-xl font-bold bg-slate-900/80 rounded-full w-8 h-8 flex items-center justify-center border border-slate-700"
            >
              &times;
            </button>
            <img src={selectedPreviewImage} alt="Ảnh món ăn đầy đủ" className="w-full h-auto max-h-[75vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        onDetectedProduct={handleDetectedProduct}
      />

    </div>
  );
}
