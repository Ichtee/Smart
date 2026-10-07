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
            <span className="text-[#00E5FF]">🥗</span> Nhật ký ăn uống & Dinh dưỡng
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm font-semibold mt-1">Theo dõi và ghi chép chi tiết lượng Calo và Nước nạp vào cơ thể.</p>
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
    </>
  );
}
