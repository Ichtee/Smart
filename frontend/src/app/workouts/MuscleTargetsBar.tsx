'use client';
import type { Dispatch, SetStateAction } from 'react';
import { normalizeMuscleId, MUSCLE_NAMES_VI } from './utils';

interface MuscleTargetsBarProps {
  activeRoutineId: string;
  activeSelectedExercises: any[];
  effectiveTargets: { id: string; label: string; count: number; }[];
  safeDayIndex: number;
  selectedMuscle: string | null;
  setSelectedMuscle: Dispatch<SetStateAction<string | null>>;
  sortedSchedule: any;
}

export default function MuscleTargetsBar({
  activeRoutineId,
  activeSelectedExercises,
  effectiveTargets,
  safeDayIndex,
  selectedMuscle,
  setSelectedMuscle,
  sortedSchedule,
}: MuscleTargetsBarProps) {
  return (
    <>
      <div>
        <p className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Lọc thư viện bài tập theo nhóm cơ:</p>
        {effectiveTargets.length > 0 && activeRoutineId !== 'none' ? (
          <div className="flex flex-wrap gap-2">
            {effectiveTargets.map((target: any, index: number) => {
              const normTargetId = normalizeMuscleId(target.id);
              const targetCount = target.count || 2;
              const currentCount = activeSelectedExercises.filter(ex => ex.normMuscle === normTargetId).length;
              const isExceeded = currentCount > targetCount;
              const isMatched = currentCount === targetCount;

              return (
                <button
                  key={`${target.id}-${index}`}
                  onClick={() => setSelectedMuscle(selectedMuscle === normTargetId ? null : normTargetId)}
                  className={`px-3 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all border flex items-center gap-1.5 sm:gap-2 ${selectedMuscle === normTargetId
                      ? 'bg-[#00E5FF] text-slate-950 border-[#00E5FF] shadow-lg shadow-[#00E5FF]/20'
                      : isExceeded
                        ? 'bg-rose-950/40 text-rose-300 border-rose-500/50 hover:bg-rose-900/50'
                        : isMatched
                          ? 'bg-emerald-950/40 text-[#00FF87] border-emerald-500/40 hover:bg-emerald-900/50'
                          : 'bg-[#18233C] text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                >
                  <span>{MUSCLE_NAMES_VI[normTargetId] || MUSCLE_NAMES_VI[target.id] || target.id}</span>

                  <span className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-black ${selectedMuscle === normTargetId
                      ? 'bg-slate-950 text-[#00E5FF]'
                      : isExceeded
                        ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                        : isMatched
                          ? 'bg-emerald-500/30 text-[#00FF87] border border-emerald-500/40'
                          : 'bg-[#0B101D] text-slate-400'
                    }`}>
                    {currentCount}/{targetCount} Bài {isExceeded ? '⚠️' : isMatched ? '✓' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          sortedSchedule[safeDayIndex]?.name === 'Nghỉ ngơi' ? (
            <p className="text-[#00FF87] font-bold text-sm">Hôm nay là ngày nghỉ, hãy để cơ thể phục hồi nhé!</p>
          ) : (
            <p className="text-xs text-slate-400">Hôm nay không có nhóm cơ nào được lên lịch.</p>
          )
        )}
      </div>
    </>
  );
}
