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
              <span className="text-slate-400 text-[9px] sm:text-xs font-bold uppercase tracking-wider mt-0.5">ml / {waterGoalMl} ml</span>
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
    </>
  );
}
