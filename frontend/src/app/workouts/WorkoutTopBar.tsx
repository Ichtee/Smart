'use client';
import LiveClock from './LiveClock';
import { Zap } from 'lucide-react';

interface WorkoutTopBarProps {
  activeRoutineId: string;
  handleRoutineChange: (newId: string) => void;
  routinesMap: Record<string, any>;
}

export default function WorkoutTopBar({
  activeRoutineId,
  handleRoutineChange,
  routinesMap,
}: WorkoutTopBarProps) {
  return (
    <>
      <div className="p-5 sm:p-8 bg-card border border-slate-800/80 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/80 flex flex-col md:flex-row md:items-center justify-between gap-6">

        <div className="flex items-center gap-4 sm:gap-5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-primary to-success p-0.5 shadow-lg shadow-primary/20 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-background rounded-[14px] flex items-center justify-center">
              <Zap className="size-6 text-primary" aria-hidden />
            </div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-2">
              Smart Workouts
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-0.5">Hệ thống Quản lý & Luyện tập Thông minh</p>
          </div>
        </div>

        {/* Live Time Clock Widget */}
        <LiveClock />

        {/* Active Routine Selection Dropdown */}
        <div className="w-full md:w-auto flex flex-col sm:flex-row sm:items-center gap-3 bg-inset p-3 sm:p-0 rounded-2xl border border-slate-800/80 md:border-none md:bg-transparent">
          <label className="text-xs sm:text-sm font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>LỊCH TẬP ĐANG CHỌN:</span>
          </label>
          <select
            value={activeRoutineId}
            onChange={(e) => handleRoutineChange(e.target.value)}
            className="w-full sm:w-auto bg-surface-elevated md:bg-inset border border-slate-700 md:border-slate-800 text-slate-100 px-4 py-3 rounded-xl focus:outline-none focus:border-primary text-sm sm:text-base font-extrabold shadow-sm cursor-pointer"
          >
            {Object.values(routinesMap).map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
