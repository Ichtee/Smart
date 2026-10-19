'use client';
import { useEffect } from 'react';
import { normalizeMuscleId, MUSCLE_NAMES_VI } from './utils';
import { Info, Library, Lock, Search, X } from 'lucide-react';
import type { DetailExercise, WorkoutExercise } from './types';

interface ExerciseLibraryProps {
  currentSelectedIds: string[];
  filteredLibraryExercises: WorkoutExercise[];
  handleAddExerciseFromLibrary: (exId: string) => void;
  isWorkoutSaved: boolean;
  librarySearchTerm: string;
  selectedMuscle: string | null;
  setLibrarySearchTerm: (value: string) => void;
  setSelectedDetailExercise: (value: DetailExercise | null) => void;
  /** `panel` is the column on a wide screen; `sheet` is the bottom sheet opened from "Thêm bài tập" on a phone */
  variant?: 'panel' | 'sheet';
  onClose?: () => void;
}

export default function ExerciseLibrary({
  currentSelectedIds,
  filteredLibraryExercises,
  handleAddExerciseFromLibrary,
  isWorkoutSaved,
  librarySearchTerm,
  selectedMuscle,
  setLibrarySearchTerm,
  setSelectedDetailExercise,
  variant = 'panel',
  onClose,
}: ExerciseLibraryProps) {
  const isSheet = variant === 'sheet';

  useEffect(() => {
    if (!isSheet) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isSheet, onClose]);

  const content = (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Library className="size-5" aria-hidden /> {selectedMuscle ? `Thư viện bài tập: ${MUSCLE_NAMES_VI[normalizeMuscleId(selectedMuscle)] || selectedMuscle}` : 'Thư viện bài tập (Tất cả)'}
        </h3>

        {/* Real-time Exercise Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="text"
            inputMode="search"
            placeholder="Tìm tên bài tập, dụng cụ..."
            value={librarySearchTerm}
            onChange={(e) => setLibrarySearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-inset border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      <div className={`space-y-3 overflow-y-auto pr-2 custom-scrollbar ${isSheet ? 'max-h-[55dvh]' : 'max-h-[380px] xl:max-h-none xl:min-h-0 xl:flex-1'}`}>
        {filteredLibraryExercises.length > 0 ? (
          filteredLibraryExercises.map(ex => {
            const isAlreadySelected = currentSelectedIds.includes(ex.id);

            return (
              <div key={ex.id} className="p-3.5 rounded-2xl bg-inset border border-slate-800/80 flex items-center justify-between hover:bg-surface-elevated transition-colors group gap-3">
                <div className="space-y-1 overflow-hidden">
                  <span
                    onClick={() => setSelectedDetailExercise(ex)}
                    className="font-bold text-sm text-slate-200 group-hover:text-primary cursor-pointer transition-colors flex items-center gap-1.5 truncate"
                    title="Bấm để xem hướng dẫn & chi tiết bài tập"
                  >
                    <span className="truncate">{ex.name}</span>
                    <Info className="size-3.5 shrink-0 text-primary opacity-70 group-hover:opacity-100" aria-hidden />
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-primary font-semibold">{MUSCLE_NAMES_VI[ex.normMuscle] || ex.muscle}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400 font-medium">{ex.equipment || 'Tạ / Máy'}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleAddExerciseFromLibrary(ex.id)}
                  disabled={isAlreadySelected || isWorkoutSaved}
                  className={`inline-flex min-h-11 items-center gap-1.5 px-3.5 rounded-xl text-xs font-bold transition-all shrink-0 ${isAlreadySelected || isWorkoutSaved
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      : 'bg-primary text-slate-950 hover:bg-primary shadow-md shadow-primary/20 cursor-pointer'
                    }`}
                >
                  {isAlreadySelected ? 'Đã thêm' : isWorkoutSaved ? <><Lock className="size-3.5" aria-hidden /> Đã chốt</> : '+ Thêm bài này'}
                </button>
              </div>
            );
          })
        ) : (
          <div className="p-6 text-center border border-dashed border-slate-800 rounded-2xl text-slate-400 text-xs">
            {librarySearchTerm
              ? `Không tìm thấy bài tập nào khớp từ khóa "${librarySearchTerm}"`
              : selectedMuscle
                ? `Chưa có bài tập nào thuộc nhóm cơ ${MUSCLE_NAMES_VI[normalizeMuscleId(selectedMuscle)] || selectedMuscle}.`
                : 'Không có bài tập nào.'}
          </div>
        )}
      </div>
    </>
  );

  if (isSheet) {
    return (
      <div className="fixed inset-0 z-[60] xl:hidden">
        <button type="button" aria-label="Đóng" className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div role="dialog" aria-modal="true" aria-label="Thư viện bài tập" className="absolute inset-x-0 bottom-0 max-h-[88dvh] space-y-3 overflow-y-auto rounded-t-3xl border-t border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl">
          <div className="flex justify-end">
            <button type="button" aria-label="Đóng thư viện" onClick={onClose} className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-elevated cursor-pointer">
              <X className="size-5" aria-hidden />
            </button>
          </div>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="hidden bg-card/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-4 sm:p-5 space-y-3 shadow-2xl xl:col-span-4 xl:flex xl:min-h-0 xl:flex-col">
      {content}
    </div>
  );
}
