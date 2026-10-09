'use client';
import { CalendarDays } from 'lucide-react';
import type { RoutineDay } from '@/types/domain';

interface DaySelectorProps {
  activeRoutineId: string;
  handleSelectDayTab: (index: number) => void;
  realTodayString: string;
  realTodayWorkout: RoutineDay | undefined;
  safeDayIndex: number;
  sortedSchedule: RoutineDay[];
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
      <div className="bg-card/90 backdrop-blur-xl border border-slate-800/80 p-4 sm:p-4 rounded-2xl sm:rounded-3xl shadow-xl space-y-2 xl:col-span-7">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5 text-primary" aria-hidden />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">Lịch Tập Theo Ngày</h2>
          </div>

          <div className="text-xs sm:text-xs font-bold text-slate-400 bg-inset px-3 py-1 rounded-xl border border-slate-800/90">
            Hôm nay: <span className="text-primary font-black">
              {realTodayWorkout ? `${realTodayWorkout.day} - ${realTodayWorkout.name}` : realTodayString}
            </span>
          </div>
        </div>

        {/* Day Selector Tabs */}
        {sortedSchedule.length > 0 && activeRoutineId !== 'none' && (
          <div className="flex overflow-x-auto sm:overflow-visible gap-2 pt-3 pb-2 custom-scrollbar snap-x">
            {sortedSchedule.map((dayObj, index) => {
              const isRealToday = dayObj.day === realTodayString;
              const isActive = safeDayIndex === index;

              return (
                <button
                  key={index}
                  onClick={() => handleSelectDayTab(index)}
                  className={`relative px-4 sm:px-4 py-2 sm:py-2 rounded-xl sm:rounded-2xl text-xs sm:text-xs font-extrabold transition-all duration-300 flex flex-col items-center min-w-[110px] shrink-0 sm:shrink sm:flex-1 sm:min-w-0 snap-start ${isActive
                      ? 'bg-primary text-slate-950 shadow-[0_0_20px_var(--glow)] scale-105 z-10'
                      : 'bg-surface-elevated border border-slate-800/90 text-slate-400 hover:bg-edge hover:text-white'
                    }`}
                >
                  {isRealToday && (
                    <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 text-xs sm:text-xs font-black rounded-full shadow-lg uppercase tracking-wider whitespace-nowrap z-20 ${isActive
                        ? 'bg-success text-slate-950 border border-success-soft'
                        : 'bg-success text-slate-950 border border-success animate-pulse'
                      }`}>
                      📌 HÔM NAY
                    </span>
                  )}
                  <span className="uppercase tracking-wider opacity-80 mb-0.5">{dayObj.day}</span>
                  <span className="text-xs sm:text-xs font-black text-center leading-tight line-clamp-2 max-w-full">{dayObj.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
