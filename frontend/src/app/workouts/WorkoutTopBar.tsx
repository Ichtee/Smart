'use client';
import LiveClock from './LiveClock';
import type { Routine } from '@/types/domain';

interface WorkoutTopBarProps {
  activeRoutineId: string;
  handleRoutineChange: (newId: string) => void;
  routinesMap: Record<string, Routine>;
}

export default function WorkoutTopBar({
  activeRoutineId,
  handleRoutineChange,
  routinesMap,
}: WorkoutTopBarProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Live Time Clock Widget */}
      <div className="hidden lg:block">
        <LiveClock />
      </div>

      {/* Active Routine Selection Dropdown */}
      <label className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-400">
        <span className="hidden 2xl:inline">LỊCH TẬP ĐANG CHỌN:</span>
        <select
          value={activeRoutineId}
          onChange={(e) => handleRoutineChange(e.target.value)}
          aria-label="Lịch tập đang chọn"
          className="bg-inset border border-slate-800 text-slate-100 px-3 py-2 rounded-xl focus:outline-none focus:border-primary text-sm font-bold cursor-pointer normal-case tracking-normal"
        >
          {Object.values(routinesMap).map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
