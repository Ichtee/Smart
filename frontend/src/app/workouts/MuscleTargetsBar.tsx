'use client';
import type { Dispatch, SetStateAction } from 'react';
import { AlertTriangle } from 'lucide-react';
import { normalizeMuscleId, MUSCLE_NAMES_VI } from './utils';
import type { RoutineDay } from '@/types/domain';
import type { ActiveExercise } from './types';

interface MuscleTargetsBarProps {
  activeRoutineId: string;
  activeSelectedExercises: ActiveExercise[];
  effectiveTargets: { id: string; label: string; count: number; }[];
  safeDayIndex: number;
  selectedMuscle: string | null;
  setSelectedMuscle: Dispatch<SetStateAction<string | null>>;
  sortedSchedule: RoutineDay[];
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
        <p className="text-xs sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Lọc thư viện bài tập theo nhóm cơ:</p>
        {effectiveTargets.length > 0 && activeRoutineId !== 'none' ? (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:flex-wrap md:overflow-visible">
            {effectiveTargets.map((target, index) => {
              const normTargetId = normalizeMuscleId(target.id);
              const targetCount = target.count || 2;
              const currentCount = activeSelectedExercises.filter(ex => ex.normMuscle === normTargetId).length;
              const isExceeded = currentCount > targetCount;
              const isMatched = currentCount === targetCount;

              return (
                <button
                  key={`${target.id}-${index}`}
                  onClick={() => setSelectedMuscle(selectedMuscle === normTargetId ? null : normTargetId)}
                  className={`shrink-0 min-h-11 px-3 sm:px-3.5 text-xs font-bold rounded-xl transition-all border flex items-center gap-1.5 sm:gap-2 ${selectedMuscle === normTargetId
                      ? 'bg-primary text-slate-950 border-primary shadow-lg shadow-primary/20'
                      : isExceeded
                        ? 'bg-destructive-soft/40 text-destructive border-destructive/50 hover:bg-destructive-soft/50'
                        : isMatched
                          ? 'bg-success-soft/40 text-success border-success/40 hover:bg-success-soft/50'
                          : 'bg-surface-elevated text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                >
                  <span>{MUSCLE_NAMES_VI[normTargetId] || MUSCLE_NAMES_VI[target.id] || target.id}</span>

                  <span className={`text-xs sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-black ${selectedMuscle === normTargetId
                      ? 'bg-slate-950 text-primary'
                      : isExceeded
                        ? 'bg-destructive/30 text-destructive border border-destructive/50'
                        : isMatched
                          ? 'bg-success/30 text-success border border-success/40'
                          : 'bg-inset text-slate-400'
                    }`}>
                    {currentCount}/{targetCount} Bài {isExceeded ? <AlertTriangle className="inline size-3 align-[-1px]" aria-label="Vượt mục tiêu" /> : isMatched ? '✓' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          sortedSchedule[safeDayIndex]?.name === 'Nghỉ ngơi' ? (
            <p className="text-success font-bold text-sm">Hôm nay là ngày nghỉ, hãy để cơ thể phục hồi nhé!</p>
          ) : (
            <p className="text-xs text-slate-400">Hôm nay không có nhóm cơ nào được lên lịch.</p>
          )
        )}
      </div>
    </>
  );
}
