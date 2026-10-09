'use client';
import type { Dispatch, SetStateAction } from 'react';

interface NutritionDateBarProps {
  changeDateByDays: (days: number) => void;
  selectedDate: string;
  setSelectedDate: Dispatch<SetStateAction<string>>;
  todayStr: string;
}

export default function NutritionDateBar({
  changeDateByDays,
  selectedDate,
  setSelectedDate,
  todayStr,
}: NutritionDateBarProps) {
  return (
    <div className="flex items-center gap-2 bg-card border border-slate-800 p-1.5 rounded-2xl self-start">
      <button
        onClick={() => changeDateByDays(-1)}
        className="px-3 py-1.5 bg-inset hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-all"
        title="Xem ngày trước"
      >
        ◀
      </button>
      <div className="flex items-center gap-2 px-2">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
          className="bg-inset text-primary text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-800 focus:outline-none focus:border-primary cursor-pointer"
        />
        {selectedDate === todayStr && (
          <span className="bg-primary/20 text-primary text-xs font-black px-2 py-0.5 rounded-md border border-primary/30">
            Hôm nay
          </span>
        )}
      </div>
      <button
        onClick={() => changeDateByDays(1)}
        className="px-3 py-1.5 bg-inset hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-all"
        title="Xem ngày sau"
      >
        ▶
      </button>
      {selectedDate !== todayStr && (
        <button
          onClick={() => setSelectedDate(todayStr)}
          className="px-2.5 py-1.5 bg-primary text-slate-950 rounded-xl text-xs font-extrabold hover:bg-primary transition-all shadow-md shadow-primary/20"
        >
          Về hôm nay
        </button>
      )}
    </div>
  );
}
