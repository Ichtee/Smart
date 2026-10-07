'use client';

interface WorkoutActionBarProps {
  currentTabWorkout: any;
  handleResetToTemplate: () => void;
  handleSaveWorkout: () => void;
  handleUnlockWorkout: () => void;
  isWorkoutSaved: boolean;
}

export default function WorkoutActionBar({
  currentTabWorkout,
  handleResetToTemplate,
  handleSaveWorkout,
  handleUnlockWorkout,
  isWorkoutSaved,
}: WorkoutActionBarProps) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 sm:pb-4 flex-wrap gap-3">
        <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
          <span>📅</span> <span className="hidden sm:inline">Danh sách bài tập - </span>
          <span className="text-[#00E5FF]">
            {currentTabWorkout?.day} ({currentTabWorkout?.name})
          </span>
        </h2>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
          {!isWorkoutSaved && currentTabWorkout?.exercises && currentTabWorkout.exercises.length > 0 && (
            <button
              onClick={handleResetToTemplate}
              title="Khôi phục danh sách bài tập về lịch gốc mặc định"
              className="px-3 py-1.5 bg-[#18233C] hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition flex-1 sm:flex-none text-center"
            >
              🔄 Khôi phục lịch gốc
            </button>
          )}

          {isWorkoutSaved ? (
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <span className="px-3 py-1.5 bg-emerald-950/80 border border-emerald-500/40 text-[#00FF87] text-xs font-extrabold rounded-xl shadow-md">
                🔒 ĐÃ CHỐT LỊCH
              </span>
              <button
                onClick={handleUnlockWorkout}
                className="px-3 py-1.5 bg-[#18233C] hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition"
              >
                ✏️ Sửa lại
              </button>
            </div>
          ) : (
            <button
              onClick={handleSaveWorkout}
              className="w-full sm:w-auto px-4 py-2.5 bg-[#00E5FF] hover:bg-cyan-300 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-[#00E5FF]/20 transition active:scale-95 text-center"
            >
              💾 LƯU & BẮT ĐẦU TẬP
            </button>
          )}
        </div>
      </div>
    </>
  );
}
