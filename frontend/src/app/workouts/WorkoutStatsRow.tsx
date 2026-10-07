'use client';

interface WorkoutStatsRowProps {
  activeRoutine: any;
  isWorkoutSaved: boolean;
  progressPercent: number;
  streakDays: number;
}

export default function WorkoutStatsRow({
  activeRoutine,
  isWorkoutSaved,
  progressPercent,
  streakDays,
}: WorkoutStatsRowProps) {
  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:gap-6">

        {/* Stat 1: Progress */}
        <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 p-2.5 sm:p-5 rounded-xl sm:rounded-3xl flex flex-col sm:flex-row items-center gap-2 sm:gap-4 shadow-xl text-center sm:text-left">
          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm sm:text-xl font-bold shrink-0">
            📋
          </div>
          <div className="flex-1 min-w-0 w-full">
            <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">TIẾN ĐỘ</span>
            <span className="text-xs sm:text-xl font-extrabold text-white block truncate">
              {isWorkoutSaved ? `${progressPercent}%` : 'Chọn bài...'}
            </span>
            <div className="w-full h-1 sm:h-2 bg-[#0B101D] rounded-full mt-1 overflow-hidden border border-slate-800">
              <div className="h-full bg-gradient-to-r from-[#00E5FF] to-[#00FF87] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Stat 2: Mode */}
        <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 p-2.5 sm:p-5 rounded-xl sm:rounded-3xl flex flex-col sm:flex-row items-center gap-2 sm:gap-4 shadow-xl text-center sm:text-left">
          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#00FF87] text-sm sm:text-xl font-bold shrink-0">
            🏋️
          </div>
          <div className="min-w-0 w-full">
            <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">CHẾ ĐỘ</span>
            <span className="text-xs sm:text-xl font-extrabold text-[#00FF87] block truncate">{activeRoutine?.name || 'Push-Pull-Leg'}</span>
          </div>
        </div>

        {/* Stat 3: Streak */}
        <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 p-2.5 sm:p-5 rounded-xl sm:rounded-3xl flex flex-col sm:flex-row items-center gap-2 sm:gap-4 shadow-xl text-center sm:text-left">
          <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-sm sm:text-xl font-bold shrink-0">
            🔥
          </div>
          <div className="min-w-0 w-full">
            <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">STREAK</span>
            <span className="text-xs sm:text-xl font-extrabold text-white block truncate">{streakDays} Ngày</span>
          </div>
        </div>

      </div>
    </>
  );
}
