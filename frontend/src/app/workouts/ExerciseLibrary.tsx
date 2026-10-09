'use client';
import { normalizeMuscleId, MUSCLE_NAMES_VI } from './utils';
import { Library } from 'lucide-react';
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
}: ExerciseLibraryProps) {
  return (
    <>
      <div className="bg-card/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Library className="size-5" aria-hidden /> {selectedMuscle ? `Thư viện bài tập: ${MUSCLE_NAMES_VI[normalizeMuscleId(selectedMuscle)] || selectedMuscle}` : 'Thư viện bài tập (Tất cả)'}
          </h3>

          {/* Real-time Exercise Search Input */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Tìm tên bài tập, dụng cụ..."
              value={librarySearchTerm}
              onChange={(e) => setLibrarySearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-inset border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
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
                      <span className="text-xs font-semibold text-primary opacity-70 group-hover:opacity-100 shrink-0">ℹ️</span>
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
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${isAlreadySelected || isWorkoutSaved
                        ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                        : 'bg-primary text-slate-950 hover:bg-primary shadow-md shadow-primary/20'
                      }`}
                  >
                    {isAlreadySelected ? 'Đã thêm' : isWorkoutSaved ? '🔒 Đã chốt' : '+ Thêm bài này'}
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
      </div>
    </>
  );
}
