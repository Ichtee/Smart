'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import { useRouter } from 'next/navigation';
import { apiFetch, isUnauthorized } from '@/utils/api';
import { calcEnergyPlan } from '@/utils/nutritionCalc';
import { waterGoalMl as calcWaterGoalMl, waterGoalGlasses } from '@/utils/waterGoal';
import { useFoods, useProfile, isUnauthorizedError } from '@/hooks/useApi';
import { useServerSave } from '@/hooks/useServerSave';
import SaveStatusBanner from '@/components/SaveStatusBanner';
import type { MealItem, DbFood } from './types';
import ImagePreviewModal from './ImagePreviewModal';
import NutritionDetailModal from './NutritionDetailModal';
import AddFoodModal from './AddFoodModal';
import MealSections from './MealSections';
import NutritionSummaryCards from './NutritionSummaryCards';
import MacroSummary from './MacroSummary';
import { PageSkeleton } from '@/components/ui/Skeleton';
import NutritionDateBar from './NutritionDateBar';
import { mergeCopiedMeals, previousDay } from './copyMeals';


export default function Nutrition() {
  const router = useRouter();

  // Water Tracker State
  const [waterGlasses, setWaterGlasses] = useState(4);
  const [mlPerGlass, setMlPerGlass] = useState(250);

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

  // Which meal the add-food modal is open for (the modal owns its own form state)
  const [activeMealCategory, setActiveMealCategory] = useState<string | null>(null);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  // Food database from the shared SWR cache (system foods + the user's custom foods)
  const { foods: dbFoodsData, mutate: mutateFoods } = useFoods();
  const dbFoods: DbFood[] = useMemo(() => (dbFoodsData as DbFood[] | undefined) ?? [], [dbFoodsData]);

  const { save: saveToServer, retry: retrySave, status: saveStatus } = useServerSave();

  // Persist a full snapshot of one day. The date is captured now, not when the queued request runs.
  const pushNutritionToBackend = (
    date: string,
    glasses: number,
    mlGlass: number,
    dayMeals: Record<string, MealItem[]>
  ) => {
    saveToServer(() => apiFetch('/api/nutrition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, waterGlasses: glasses, mlPerGlass: mlGlass, meals: dayMeals })
    }));
  };

  // Load meals & water for selectedDate from the server (the only copy of the data).
  // `loadedDate` / `dayLoadErrorDate` are keyed by date so switching days never shows stale state.
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const [dayLoadErrorDate, setDayLoadErrorDate] = useState<string | null>(null);
  const [dayRetryTick, setDayRetryTick] = useState(0);
  const dayLoaded = loadedDate === selectedDate;
  const dayLoadError = dayLoadErrorDate === selectedDate;

  useEffect(() => {
    let isCancelled = false;

    const loadNutrition = async () => {
      try {
        const res = await apiFetch(`/api/nutrition?date=${selectedDate}`);
        if (isCancelled) return;
        if (isUnauthorized(res)) {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const apiLog = await res.json();
        if (isCancelled) return;

        setWaterGlasses(apiLog.waterGlasses || 0);
        setMlPerGlass(apiLog.mlPerGlass || 250);
        setMeals({
          'Bữa Sáng': apiLog.meals?.['Bữa Sáng'] || [],
          'Bữa Trưa': apiLog.meals?.['Bữa Trưa'] || [],
          'Bữa Tối': apiLog.meals?.['Bữa Tối'] || [],
          'Ăn Vặt': apiLog.meals?.['Ăn Vặt'] || []
        });
        setLoadedDate(selectedDate);
        setDayLoadErrorDate(null);
      } catch (err) {
        console.error('Failed to load nutrition log', err);
        if (!isCancelled) setDayLoadErrorDate(selectedDate);
      }
    };

    loadNutrition();

    return () => {
      isCancelled = true;
    };
  }, [selectedDate, dayRetryTick, router]);


  // Profile comes from the shared SWR cache (one request for all pages)
  const { profile, error: profileFetchError, isLoading: profileLoading, mutate: mutateProfile } = useProfile();

  useEffect(() => {
    if (isUnauthorizedError(profileFetchError)) {
      localStorage.removeItem('token');
      router.push('/login');
    }
  }, [profileFetchError, router]);

  useEffect(() => {
    if (profile && (!profile.height || !profile.weight)) router.push('/onboarding');
  }, [profile, router]);

  const profileError = !!profileFetchError && !isUnauthorizedError(profileFetchError);
  const loading = profileLoading && !profile;
  // one plan for the whole page; 0 until the profile is complete (the page sends you to onboarding then)
  const plan = profile ? calcEnergyPlan(profile) : null;
  const targetCalories = plan?.target ?? 0;
  const tdee = plan?.tdee ?? 0;
  const calorieDeficit = plan?.delta ?? 0;
  const waterGoalMl = calcWaterGoalMl(profile?.weight, profile?.age);
  const targetWaterGlasses = waterGoalGlasses(waterGoalMl, mlPerGlass);


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

  // Update Water Glasses with persistence for selectedDate
  const updateWater = (delta: number) => {
    if (!dayLoaded) return; // never overwrite a day that has not loaded
    const newVal = Math.max(0, waterGlasses + delta);
    setWaterGlasses(newVal);
    pushNutritionToBackend(selectedDate, newVal, mlPerGlass, meals);
  };

  // "Same as yesterday": append the previous day's foods to this day.
  // The request is async, so it reads the latest day/meals from a ref and gives up if the user moved to
  // another day meanwhile (it must never write yesterday's foods into a different day).
  const [copyBusy, setCopyBusy] = useState(false);
  const [copyNotice, setCopyNotice] = useState('');
  const latest = useRef({ selectedDate, meals, waterGlasses, mlPerGlass });
  useEffect(() => {
    latest.current = { selectedDate, meals, waterGlasses, mlPerGlass };
  }, [selectedDate, meals, waterGlasses, mlPerGlass]);
  // a notice belongs to the day it was shown for
  const [noticeDate, setNoticeDate] = useState(selectedDate);
  if (noticeDate !== selectedDate) {
    setNoticeDate(selectedDate);
    setCopyNotice('');
  }

  const handleCopyPreviousDay = async () => {
    if (!dayLoaded || copyBusy) return;
    const targetDate = selectedDate;
    const from = previousDay(targetDate);
    setCopyBusy(true);
    setCopyNotice('');
    try {
      const res = await apiFetch(`/api/nutrition?date=${from}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const source = await res.json();
      if (latest.current.selectedDate !== targetDate) return;
      const { meals: merged, added } = mergeCopiedMeals(latest.current.meals, source?.meals);
      if (added === 0) {
        setCopyNotice(`Ngày ${from} chưa có món ăn nào để sao chép.`);
        return;
      }
      setMeals(merged);
      pushNutritionToBackend(targetDate, latest.current.waterGlasses, latest.current.mlPerGlass, merged);
      setCopyNotice(`Đã sao chép ${added} món từ ngày ${from}.`);
    } catch {
      if (latest.current.selectedDate === targetDate) setCopyNotice('Không sao chép được. Vui lòng thử lại.');
    } finally {
      setCopyBusy(false);
    }
  };

  // Called by the add-food modal with a fully validated item
  const handleAddItem = (category: string, item: MealItem) => {
    const updatedMeals = {
      ...meals,
      [category]: [...(meals[category] || []), item]
    };
    setMeals(updatedMeals);
    pushNutritionToBackend(selectedDate, waterGlasses, mlPerGlass, updatedMeals);
  };

  // Remove Food Item for selectedDate
  const handleRemoveFood = (category: string, itemId: string) => {
    if (!dayLoaded) return;
    const updatedMeals = {
      ...meals,
      [category]: (meals[category] || []).filter(item => item.id !== itemId)
    };
    setMeals(updatedMeals);
    pushNutritionToBackend(selectedDate, waterGlasses, mlPerGlass, updatedMeals);
  };

  // View Detail Modal state for Nutrition summary
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Calculate Total Consumed Calories for selected date
  const caloriesConsumed = Object.values(meals).flat().reduce((sum, item) => sum + item.calories, 0);
  const caloriesRemaining = targetCalories - caloriesConsumed;

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="mx-auto max-w-5xl p-4 md:p-8"><PageSkeleton rows={3} /></main>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="min-h-screen bg-background text-foreground flex font-sans overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 p-4 md:p-8 lg:p-10 space-y-8 overflow-y-auto pb-28 md:pb-10">
        <div className="max-w-[1600px] w-full mx-auto space-y-6 sm:space-y-8">

        {profileError && (
          <div className="bg-destructive/10 border border-destructive/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-destructive">
            <p className="font-extrabold text-white">Không tải được hồ sơ, mục tiêu Calo đang dùng giá trị mặc định.</p>
            <button
              onClick={() => { mutateProfile(); }}
              className="px-4 py-2 bg-primary hover:bg-primary text-slate-950 font-black rounded-xl text-xs transition shrink-0 cursor-pointer"
            >
              🔄 Thử lại
            </button>
          </div>
        )}

        {dayLoadError && (
          <div className="bg-destructive/10 border border-destructive/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-destructive">
            <p className="font-extrabold text-white">Không tải được nhật ký ngày {selectedDate}. Chỉnh sửa đã bị khóa để tránh ghi đè dữ liệu.</p>
            <button
              onClick={() => { setDayLoadErrorDate(null); setDayRetryTick(t => t + 1); }}
              className="px-4 py-2 bg-primary hover:bg-primary text-slate-950 font-black rounded-xl text-xs transition shrink-0 cursor-pointer"
            >
              🔄 Thử lại
            </button>
          </div>
        )}

        <SaveStatusBanner status={saveStatus} onRetry={retrySave} />

        <NutritionDateBar
          changeDateByDays={changeDateByDays}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          todayStr={todayStr}
        />

        {/* Calorie & Water Dashboard */}
        <NutritionSummaryCards
          calorieDeficit={calorieDeficit}
          caloriesConsumed={caloriesConsumed}
          caloriesRemaining={caloriesRemaining}
          mlPerGlass={mlPerGlass}
          setMlPerGlass={setMlPerGlass}
          setShowDetailModal={setShowDetailModal}
          targetCalories={targetCalories}
          targetWaterGlasses={targetWaterGlasses}
          waterGoalMl={waterGoalMl}
          tdee={tdee}
          updateWater={updateWater}
          waterGlasses={waterGlasses}
        />

        <MacroSummary meals={meals} targetCalories={targetCalories} profile={profile} />

        {/* Meal Logging Section */}
        <MealSections
          caloriesConsumed={caloriesConsumed}
          handleRemoveFood={handleRemoveFood}
          meals={meals}
          onCopyPreviousDay={handleCopyPreviousDay}
          copyBusy={copyBusy}
          copyNotice={copyNotice}
          canCopy={dayLoaded}
          setActiveMealCategory={setActiveMealCategory}
          setSelectedPreviewImage={setSelectedPreviewImage}
        />

      </div>

      {/* Add Food Item Modal */}
      {activeMealCategory && (
        <AddFoodModal
          category={activeMealCategory}
          dbFoods={dbFoods}
          dayLoaded={dayLoaded}
          mutateFoods={mutateFoods}
          onAddItem={handleAddItem}
          onClose={() => setActiveMealCategory(null)}
        />
      )}

      {/* Full Daily Nutrition Summary Detail Modal */}
      <NutritionDetailModal
        caloriesConsumed={caloriesConsumed}
        meals={meals}
        mlPerGlass={mlPerGlass}
        selectedDate={selectedDate}
        setSelectedPreviewImage={setSelectedPreviewImage}
        setShowDetailModal={setShowDetailModal}
        showDetailModal={showDetailModal}
        targetCalories={targetCalories}
        waterGlasses={waterGlasses}
      />

      {/* Full Image Preview Modal Lightbox */}
      <ImagePreviewModal
        selectedPreviewImage={selectedPreviewImage}
        setSelectedPreviewImage={setSelectedPreviewImage}
      />

      </main>
    </div>
  );
}
