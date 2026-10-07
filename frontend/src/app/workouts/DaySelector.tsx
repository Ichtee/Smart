'use client';

interface DaySelectorProps {
  activeRoutineId: string;
  handleSelectDayTab: (index: number) => void;
  realTodayString: string;
  realTodayWorkout: any;
  safeDayIndex: number;
  sortedSchedule: any;
}

export default function DaySelector({
  activeRoutineId,
  handleSelectDayTab,
  realTodayString,
  realTodayWorkout,
  safeDayIndex,
  sortedSchedule,
}: DaySelectorProps) {
  return (
    <>
      <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[#00E5FF] text-base sm:text-lg">🧬</span>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">Lịch Tập Theo Ngày</h2>
          </div>

          <div className="text-[11px] sm:text-xs font-bold text-slate-400 bg-[#0B101D] px-3 py-1 rounded-xl border border-slate-800/90">
            Hôm nay: <span className="text-[#00E5FF] font-black">
              {realTodayWorkout ? `${realTodayWorkout.day} - ${realTodayWorkout.name}` : realTodayString}
            </span>
          </div>
        </div>

        {/* Day Selector Tabs */}
        {sortedSchedule.length > 0 && activeRoutineId !== 'none' && (
          <div className="flex overflow-x-auto gap-2 sm:gap-3 pt-3 pb-2 custom-scrollbar snap-x">
            {sortedSchedule.map((dayObj: any, index: number) => {
              const isRealToday = dayObj.day === realTodayString;
              const isActive = safeDayIndex === index;

              return (
                <button
                  key={index}
                  onClick={() => handleSelectDayTab(index)}
                  className={`relative px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-extrabold transition-all duration-300 flex flex-col items-center min-w-[110px] sm:min-w-[130px] shrink-0 snap-start ${isActive
                      ? 'bg-[#00E5FF] text-slate-950 shadow-[0_0_20px_rgba(0,229,255,0.4)] scale-105 z-10'
                      : 'bg-[#18233C] border border-slate-800/90 text-slate-400 hover:bg-[#1E2C4F] hover:text-white'
                    }`}
                >
                  {isRealToday && (
                    <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[8px] sm:text-[9px] font-black rounded-full shadow-lg uppercase tracking-wider whitespace-nowrap z-20 ${isActive
                        ? 'bg-[#00FF87] text-slate-950 border border-emerald-950'
                        : 'bg-[#00FF87] text-slate-950 border border-emerald-400 animate-pulse'
                      }`}>
                      📌 HÔM NAY
                    </span>
                  )}
                  <span className="uppercase tracking-wider opacity-80 mb-0.5">{dayObj.day}</span>
                  <span className="text-xs sm:text-sm font-black truncate max-w-full">{dayObj.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
