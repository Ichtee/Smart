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
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
            <span className="text-primary">🥗</span> Nhật ký ăn uống & Dinh dưỡng
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm font-semibold mt-1">Theo dõi và ghi chép chi tiết lượng Calo và Nước nạp vào cơ thể.</p>
        </div>

        {/* Date Picker Navigation Bar */}
        <div className="flex items-center gap-2 bg-card border border-slate-800 p-2 rounded-2xl shadow-lg self-start md:self-auto">
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
      </div>
    </>
  );
}
