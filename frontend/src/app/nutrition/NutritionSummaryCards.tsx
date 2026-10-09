'use client';
import type { Dispatch, SetStateAction } from 'react';

interface NutritionSummaryCardsProps {
  calorieDeficit: number;
  caloriesConsumed: number;
  caloriesRemaining: number;
  mlPerGlass: number;
  setMlPerGlass: Dispatch<SetStateAction<number>>;
  setShowDetailModal: Dispatch<SetStateAction<boolean>>;
  targetCalories: number;
  targetWaterGlasses: number;
  waterGoalMl: number;
  tdee: number;
  updateWater: (delta: number) => void;
  waterGlasses: number;
}

export default function NutritionSummaryCards({
  calorieDeficit,
  caloriesConsumed,
  caloriesRemaining,
  mlPerGlass,
  setMlPerGlass,
  setShowDetailModal,
  targetCalories,
  targetWaterGlasses,
  waterGoalMl,
  tdee,
  updateWater,
  waterGlasses,
}: NutritionSummaryCardsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:contents">

        {/* Calorie Circle Card */}
        <div className="xl:col-span-4 bg-card/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col items-center justify-between group hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between w-full mb-3 sm:mb-3">
            <h2 className="text-primary font-extrabold uppercase tracking-wider text-xs sm:text-xs">Mục tiêu Calo</h2>
            <button
              onClick={() => setShowDetailModal(true)}
              className="px-2 sm:px-3 py-1 sm:py-1.5 bg-inset hover:bg-slate-800 text-primary border border-primary/30 rounded-xl text-xs sm:text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
            >
              <span>🔍</span> <span className="hidden sm:inline">Xem chi tiết</span>
            </button>
          </div>

          <div className="relative w-36 h-36 sm:w-40 sm:h-40 xl:w-32 xl:h-32 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-slate-800/80" strokeWidth="7" />
              <circle
                cx="50" cy="50" r="45" fill="none" stroke="currentColor"
                className="text-primary drop-shadow-[0_0_12px_var(--glow-strong)] transition-all duration-1000"
                strokeWidth="7"
                strokeDasharray="283"
                strokeDashoffset={targetCalories > 0 ? 283 - (283 * (Math.min(caloriesConsumed, targetCalories) / targetCalories)) : 283}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl sm:text-3xl xl:text-2xl font-black text-white drop-shadow-md">{targetCalories}</span>
              <span className="text-slate-400 text-xs sm:text-xs xl:text-[10px] font-bold uppercase tracking-wider xl:tracking-normal mt-0.5">Kcal / Ngày</span>
            </div>
          </div>

          {/* TDEE and Deficit Info */}
          <div className="w-full mt-4 sm:mt-3 bg-inset rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border border-slate-800 text-center text-xs sm:text-xs flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            <span className="text-slate-400 font-semibold">TDEE: <strong className="text-white font-extrabold">{tdee} kcal</strong></span>
            <span className="text-slate-700 hidden sm:inline">|</span>
            {calorieDeficit < 0 ? (
              <span className="text-destructive font-bold">Thâm hụt {Math.abs(calorieDeficit)} kcal</span>
            ) : calorieDeficit > 0 ? (
              <span className="text-primary font-bold">Tăng {calorieDeficit} kcal</span>
            ) : (
              <span className="text-slate-400 font-bold">Giữ cân</span>
            )}
          </div>

          <div className="w-full mt-3 sm:mt-3 grid grid-cols-2 gap-2 sm:gap-3 text-center">
            <div className="bg-inset p-2.5 sm:p-2 rounded-xl sm:rounded-2xl border border-slate-800">
              <div className="text-slate-400 text-xs sm:text-xs font-bold uppercase tracking-wider mb-0.5">Đã nạp</div>
              <div className="text-sm sm:text-xl font-black text-primary">{caloriesConsumed}</div>
            </div>
            <div className="bg-success-soft/30 p-2.5 sm:p-2 rounded-xl sm:rounded-2xl border border-success/20">
              <div className="text-success text-xs sm:text-xs font-bold uppercase tracking-wider mb-0.5">Còn lại</div>
              <div className="text-sm sm:text-xl font-black text-success">{caloriesRemaining}</div>
            </div>
          </div>
        </div>

        {/* Water Tracker Card */}
        <div className="xl:col-span-3 bg-card/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col items-center justify-between group hover:border-primary/30 transition-all">
          <h2 className="text-primary font-extrabold uppercase tracking-wider text-xs sm:text-xs mb-3 sm:mb-3">Lượng nước</h2>

          <div className="relative w-36 h-36 sm:w-40 sm:h-40 xl:w-32 xl:h-32 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-slate-800/80" strokeWidth="7" />
              <circle
                cx="50" cy="50" r="45" fill="none" stroke="currentColor"
                className="text-primary drop-shadow-[0_0_12px_var(--glow-strong)] transition-all duration-1000"
                strokeWidth="7"
                strokeDasharray="283"
                strokeDashoffset={targetWaterGlasses > 0 ? 283 - (283 * (Math.min(waterGlasses, targetWaterGlasses) / targetWaterGlasses)) : 283}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl sm:text-3xl xl:text-2xl font-black text-white drop-shadow-md">{waterGlasses * mlPerGlass}</span>
              <span className="text-slate-400 text-xs sm:text-xs xl:text-[10px] font-bold uppercase tracking-wider xl:tracking-normal mt-0.5">ml / {waterGoalMl} ml</span>
            </div>
          </div>

          <div className="flex flex-col items-center w-full mt-4 sm:mt-3 space-y-2 sm:space-y-2">
            <div className="flex flex-wrap items-center justify-center gap-3 sm:flex-nowrap sm:gap-6">
              <button
                onClick={() => updateWater(-1)}
                className="size-11 sm:size-10 rounded-xl sm:rounded-2xl bg-inset border border-slate-800 flex items-center justify-center text-lg sm:text-2xl font-black hover:bg-surface-elevated transition-colors text-slate-300 active:scale-95"
              >-</button>

              <div className="order-first flex w-full flex-col items-center sm:order-none sm:w-auto">
                <div className="text-lg sm:text-2xl font-black text-white">{waterGlasses} <span className="text-xs sm:text-sm font-semibold text-slate-400">cốc</span></div>
                <div className="flex items-center gap-1 bg-inset px-2 sm:px-3 py-0.5 sm:py-1 rounded-xl border border-slate-800 mt-1">
                  <input
                    type="number"
                    value={mlPerGlass}
                    min={50}
                    max={1000}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val >= 0 && val <= 1000) setMlPerGlass(val || 0);
                    }}
                    onBlur={() => {
                      if (mlPerGlass < 50) setMlPerGlass(50);
                      if (mlPerGlass > 1000) setMlPerGlass(1000);
                    }}
                    onKeyDown={(e) => { if (['e', 'E', '-', '+'].includes(e.key)) e.preventDefault(); }}
                    className="w-10 sm:w-14 bg-transparent text-primary font-black text-center text-xs sm:text-xs focus:outline-none"
                  />
                  <span className="text-xs sm:text-xs text-slate-400 font-bold">ml/cốc</span>
                </div>
              </div>

              <button
                onClick={() => updateWater(1)}
                className="size-11 sm:size-10 rounded-xl sm:rounded-2xl bg-primary text-slate-950 font-black flex items-center justify-center text-lg sm:text-2xl hover:bg-primary transition-colors shadow-lg shadow-primary/20 active:scale-95"
              >+</button>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
