'use client';
import { useRef } from 'react';
import { toFixedReps, MUSCLE_NAMES_VI } from './utils';
import Link from 'next/link';
import type { ExerciseDetailsMap } from './types';
import { setWeightText, withSetWeight } from './setWeights';

interface ExerciseChecklistProps {
  activeSelectedExercises: any[];
  adjustExerciseReps: (id: string, delta: number) => void;
  completedSetsMap: Record<string, number[]>;
  exerciseDetails: ExerciseDetailsMap;
  persistSetWeights: () => void;
  handleRemoveExercise: (exId: string) => void;
  isWorkoutSaved: boolean;
  REST_DURATION: number;
  restTimerActive: boolean;
  restTimerExerciseId: string | null;
  restTimerPaused: boolean;
  restTimerSeconds: number;
  restTimerTotal: number;
  setExerciseDetails: (updater: (prev: ExerciseDetailsMap) => ExerciseDetailsMap) => void;
  setSelectedDetailExercise: (value: any) => void;
  skipRestTimer: () => void;
  toggleCompleteExercise: (id: string, forcedState?: boolean | undefined, customSets?: number[] | undefined, setsMapOverride?: Record<string, number[]> | undefined) => void;
  toggleCompleteSet: (exId: string, setIndex: number, totalSets: number, exName: string) => void;
  toggleRestTimerPause: () => void;
  updateExerciseSets: (id: string, sets: number) => void;
}

export default function ExerciseChecklist({
  activeSelectedExercises,
  adjustExerciseReps,
  completedSetsMap,
  exerciseDetails,
  persistSetWeights,
  handleRemoveExercise,
  isWorkoutSaved,
  REST_DURATION,
  restTimerActive,
  restTimerExerciseId,
  restTimerPaused,
  restTimerSeconds,
  restTimerTotal,
  setExerciseDetails,
  setSelectedDetailExercise,
  skipRestTimer,
  toggleCompleteExercise,
  toggleCompleteSet,
  toggleRestTimerPause,
  updateExerciseSets,
}: ExerciseChecklistProps) {
  // a weight box only saves when its text changed since it got focus (tabbing through does not save)
  const weightOnFocus = useRef('');
  return (
    <>
      <div className="space-y-3 sm:space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
          <p className="text-[11px] sm:text-xs font-bold text-[#00E5FF] uppercase tracking-wider">
            Các bài đã chọn ({activeSelectedExercises.length})
          </p>
          <span className="flex items-center gap-3">
            <Link href="/routines" className="text-[11px] sm:text-xs font-bold text-cyan-300 hover:text-cyan-200">📋 Lịch tập của tôi</Link>
            <Link href="/records" className="text-[11px] sm:text-xs font-bold text-amber-300 hover:text-amber-200">🏆 Kỷ lục cá nhân</Link>
          </span>
          <span className="text-[10px] sm:text-xs text-slate-400 font-semibold hidden sm:inline">
            {isWorkoutSaved ? 'Tích chọn để đánh dấu hoàn thành' : 'Chỉnh sửa theo ý bạn rồi bấm LƯU để bắt đầu'}
          </span>
        </div>

        {activeSelectedExercises.length > 0 ? (
          activeSelectedExercises.map((ex, i) => (
            <div key={ex.id} className="flex flex-col gap-2">
              <div className="p-3.5 sm:p-5 rounded-2xl bg-[#0E1526] border border-slate-800/90 hover:border-cyan-500/40 transition-all flex items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-lg group">

                <div className="flex-1 space-y-2.5 sm:space-y-3 min-w-0">
                  <div className="flex items-start sm:items-center justify-between flex-wrap gap-1.5 sm:gap-2">
                    <h3 
                      onClick={() => setSelectedDetailExercise(ex)}
                      className="font-extrabold text-white text-sm sm:text-base hover:text-[#00E5FF] cursor-pointer transition-colors flex flex-wrap items-center gap-1.5 sm:gap-2"
                      title="Bấm để xem hướng dẫn & chi tiết bài tập"
                    >
                      <span>{i + 1}. {ex.name}</span>
                      <span className="text-[11px] sm:text-xs font-bold text-cyan-400 opacity-80 hover:opacity-100 flex items-center gap-0.5">
                        ℹ️ Chi tiết
                      </span>
                      {ex.requiresWarmup && (
                        <span className="px-2 py-0.5 bg-amber-950/80 text-amber-400 border border-amber-500/40 rounded-full text-[9px] sm:text-[10px] font-extrabold" title={ex.warmupNotes || 'Cần khởi động'}>
                          🔥 Khởi Động
                        </span>
                      )}
                      {ex.isOptional && (
                        <span className="px-2 py-0.5 bg-purple-950/80 text-purple-300 border border-purple-500/40 rounded-full text-[9px] sm:text-[10px] font-extrabold">
                          💡 Tùy Chọn
                        </span>
                      )}
                    </h3>
                    {!isWorkoutSaved && (
                      <button
                        onClick={() => handleRemoveExercise(ex.id)}
                        className="text-[11px] sm:text-xs text-rose-400 hover:text-rose-300 font-bold ml-auto"
                      >
                        ✕ Xóa
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs">
                    {/* Sets adjustment */}
                    {!isWorkoutSaved ? (
                      <div className="flex items-center gap-1.5 bg-[#0B101D] px-2 py-1 rounded-xl border border-slate-800">
                        <span className="text-slate-400 font-semibold text-[10px] sm:text-xs">Hiệp:</span>
                        <button
                          onClick={() => updateExerciseSets(ex.id, ex.sets - 1)}
                          className="w-6 h-6 rounded-lg bg-[#18233C] hover:bg-slate-700 text-[#00E5FF] font-black flex items-center justify-center text-xs border border-slate-700 active:scale-95"
                        >-</button>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={ex.sets}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/[^0-9]/g, '');
                            updateExerciseSets(ex.id, parseInt(clean) || 1);
                          }}
                          className="w-7 bg-transparent text-[#00E5FF] font-black text-center focus:outline-none text-xs"
                        />
                        <button
                          onClick={() => updateExerciseSets(ex.id, ex.sets + 1)}
                          className="w-6 h-6 rounded-lg bg-[#18233C] hover:bg-slate-700 text-[#00E5FF] font-black flex items-center justify-center text-xs border border-slate-700 active:scale-95"
                        >+</button>
                      </div>
                    ) : (
                      <span className="bg-[#0B101D] px-2.5 py-1 rounded-xl border border-slate-800 text-slate-300 font-bold">
                        Hiệp: <strong className="text-[#00E5FF]">{ex.sets}</strong>
                      </span>
                    )}

                    {/* Reps adjustment */}
                    {!isWorkoutSaved ? (
                      <div className="flex items-center gap-1.5 bg-[#0B101D] px-2 py-1 rounded-xl border border-slate-800">
                        <span className="text-slate-400 font-semibold text-[10px] sm:text-xs">Lần:</span>
                        <button
                          onClick={() => adjustExerciseReps(ex.id, -1)}
                          className="w-6 h-6 rounded-lg bg-[#18233C] hover:bg-slate-700 text-[#00E5FF] font-black flex items-center justify-center text-xs border border-slate-700 active:scale-95"
                        >-</button>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={toFixedReps(ex.reps)}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            if (val.length > 3) return;
                            setExerciseDetails(prev => {
                              const updated = {
                                ...prev,
                                [ex.id]: { ...(prev[ex.id] || { sets: ex.sets, reps: '10' }), reps: val }
                              };
                              return updated;
                            });
                          }}
                          className="w-12 bg-transparent text-[#00E5FF] font-black text-center focus:outline-none text-xs"
                        />
                        <button
                          onClick={() => adjustExerciseReps(ex.id, 1)}
                          className="w-6 h-6 rounded-lg bg-[#18233C] hover:bg-slate-700 text-[#00E5FF] font-black flex items-center justify-center text-xs border border-slate-700 active:scale-95"
                        >+</button>
                      </div>
                    ) : (
                      <span className="bg-[#0B101D] px-2.5 py-1 rounded-xl border border-slate-800 text-slate-300 font-bold">
                        Lần: <strong className="text-[#00E5FF]">{toFixedReps(ex.reps)}</strong>
                      </span>
                    )}

                    {ex.rir && (
                      <span className="bg-[#0B101D] px-2 py-1 rounded-xl border border-slate-800 text-amber-400 font-bold text-[10px] sm:text-xs">
                        ⚡ RIR: <strong className="text-white">{ex.rir}</strong>
                      </span>
                    )}

                    {ex.restTimeSeconds && (
                      <span className="bg-[#0B101D] px-2 py-1 rounded-xl border border-slate-800 text-cyan-400 font-bold text-[10px] sm:text-xs">
                        ⏱️ Nghỉ: <strong className="text-white">{Math.round(ex.restTimeSeconds / 60)}p</strong>
                      </span>
                    )}

                    <span className="text-emerald-400 font-semibold text-[10px] sm:text-xs">
                      🎯 {MUSCLE_NAMES_VI[ex.normMuscle] || ex.muscle}
                    </span>
                  </div>

                  {/* Warmup or technique notes */}
                  {(ex.warmupNotes || ex.notes) && (
                    <div className="text-[11px] text-slate-300 bg-[#0B101D] p-2.5 rounded-xl border border-slate-800/80 space-y-1">
                      {ex.warmupNotes && (
                        <p className="text-amber-300 font-semibold">🔥 Khởi động: {ex.warmupNotes}</p>
                      )}
                      {ex.notes && (
                        <p className="text-cyan-300 font-medium">📌 Ghi chú: {ex.notes}</p>
                      )}
                    </div>
                  )}

                  {/* ═══ MINI-SUB SET BREAKDOWN LIST ═══ */}
                  <div className="w-full mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5 text-[#00E5FF]">
                        <span>🔢</span> Các hiệp tập ({ex.sets} Hiệp)
                      </span>
                      <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                        {(completedSetsMap[ex.id] || []).length} / {ex.sets} Hoàn thành
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {Array.from({ length: ex.sets }).map((_, setIdx) => {
                        const isSetDone = (completedSetsMap[ex.id] || []).includes(setIdx);
                        const setLabelName = `${ex.name} #${setIdx + 1}`;

                        return (
                          <div
                            key={setIdx}
                            className={`p-2.5 sm:p-3 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs ${
                              isSetDone
                                ? 'bg-[#00FF87]/10 border-[#00FF87]/50 text-white shadow-sm shadow-[#00FF87]/10'
                                : 'bg-[#0B101D] border-slate-800/80 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            {/* Mini-sub name */}
                            <div className="flex items-center gap-2 font-extrabold min-w-0">
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0 font-mono font-black ${
                                isSetDone ? 'bg-[#00FF87] text-slate-950' : 'bg-[#18233C] text-cyan-400 border border-cyan-500/30'
                              }`}>
                                #{setIdx + 1}
                              </span>
                              <span className="truncate text-white text-xs font-bold">
                                {setLabelName}
                              </span>
                            </div>

                            {/* Reps Display & Checkbox */}
                            <div className="flex items-center gap-2.5 shrink-0">
                              <span className="text-[11px] font-bold text-slate-400">
                                Lần: <strong className="text-[#00E5FF]">{toFixedReps(ex.reps)}</strong>
                              </span>

                              {/* Weight lifted in this set (kg) */}
                              <input
                                type="text"
                                inputMode="decimal"
                                aria-label={`Mức tạ Hiệp ${setIdx + 1} của ${ex.name} (kg)`}
                                placeholder="kg"
                                value={setWeightText(exerciseDetails[ex.id], setIdx)}
                                disabled={!isWorkoutSaved}
                                onChange={(e) => setExerciseDetails(prev => ({
                                  ...prev,
                                  [ex.id]: withSetWeight(prev[ex.id] || { sets: ex.sets, reps: ex.reps }, setIdx, e.target.value),
                                }))}
                                onFocus={(e) => { weightOnFocus.current = e.currentTarget.value; }}
                                onBlur={(e) => { if (e.currentTarget.value !== weightOnFocus.current) persistSetWeights(); }}
                                className="w-16 sm:w-20 bg-[#0B101D] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-center font-bold text-white focus:outline-none focus:border-[#00E5FF] disabled:opacity-40"
                              />

                              {/* Set Checkbox Button */}
                              <button
                                type="button"
                                onClick={() => toggleCompleteSet(ex.id, setIdx, ex.sets, ex.name)}
                                disabled={!isWorkoutSaved}
                                title={!isWorkoutSaved ? 'Vui lòng nhấn LƯU ở trên để bắt đầu tập' : `Đánh dấu hoàn thành Hiệp ${setIdx + 1}`}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-black transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                                  isSetDone
                                    ? 'bg-[#00FF87] border-[#00FF87] text-slate-950 shadow-[#00FF87]/20'
                                    : isWorkoutSaved
                                      ? 'bg-[#18233C] hover:bg-slate-700 border-cyan-500/40 text-cyan-300 cursor-pointer'
                                      : 'bg-[#0B101D] border-slate-800 text-slate-600 cursor-not-allowed'
                                }`}
                              >
                                {isSetDone ? (
                                  <>
                                    <span>✓</span>
                                    <span>Hiệp {setIdx + 1}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="w-3.5 h-3.5 rounded border border-cyan-400/60 inline-block"></span>
                                    <span>Hiệp {setIdx + 1}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Interactive Checkbox */}
                <button
                  onClick={() => toggleCompleteExercise(ex.id)}
                  disabled={!isWorkoutSaved}
                  title={!isWorkoutSaved ? 'Vui lòng bấm LƯU ở trên để bắt đầu tập' : 'Đánh dấu hoàn thành'}
                  className={`w-9 h-9 rounded-xl border-2 transition-all flex items-center justify-center shrink-0 ${ex.completed
                      ? 'bg-[#00FF87] border-[#00FF87] text-slate-950 shadow-lg shadow-[#00FF87]/30 scale-105'
                      : isWorkoutSaved
                        ? 'border-cyan-500/60 hover:border-[#00E5FF] bg-[#0B101D] text-slate-600'
                        : 'border-slate-800 bg-[#0B101D]/50 text-slate-700 cursor-not-allowed'
                    }`}
                >
                  {ex.completed ? (
                    <span className="font-black text-base">✓</span>
                  ) : !isWorkoutSaved ? (
                    <span className="text-[10px] text-slate-600">🔒</span>
                  ) : null}
                </button>
              </div>

              {/* ═══ INLINE REST TIMER BELOW EXERCISE ═══ */}
              {restTimerActive && restTimerExerciseId === ex.id && (
                <div className="w-full p-3 sm:p-4 bg-[#0B101D] border border-cyan-500/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg shadow-cyan-500/5 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-base shrink-0 animate-pulse">
                      ⏱️
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">Nghỉ giữa set/bài:</span>
                        <span className={`text-xl sm:text-2xl font-black tracking-tight tabular-nums ${
                          restTimerSeconds <= 10 ? 'text-rose-400 animate-pulse' : restTimerSeconds <= 30 ? 'text-amber-300' : 'text-[#00E5FF]'
                        }`}>
                          {Math.floor(restTimerSeconds / 60)}:{String(restTimerSeconds % 60).padStart(2, '0')}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        {restTimerPaused ? '⏸ Tạm dừng đếm ngược' : restTimerSeconds <= 0 ? '✅ Hết giờ nghỉ!' : 'Nghỉ giữa các set/bài...'}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar in middle */}
                  <div className="w-full sm:flex-1 mx-0 sm:mx-4 h-2 bg-[#131B2E] rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                        restTimerSeconds <= 10
                          ? 'bg-gradient-to-r from-rose-500 to-rose-400'
                          : restTimerSeconds <= 30
                            ? 'bg-gradient-to-r from-amber-500 to-amber-300'
                            : 'bg-gradient-to-r from-[#00E5FF] to-[#00FF87]'
                      }`}
                      style={{ width: `${(restTimerSeconds / (restTimerTotal || REST_DURATION)) * 100}%` }}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                    <button
                      onClick={toggleRestTimerPause}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all active:scale-95 ${
                        restTimerPaused
                          ? 'bg-[#00E5FF] text-slate-950 hover:bg-cyan-300 shadow-md shadow-[#00E5FF]/20'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                      }`}
                    >
                      {restTimerPaused ? '▶ Tiếp tục' : '⏸ Tạm dừng'}
                    </button>
                    <button
                      onClick={skipRestTimer}
                      className="px-3 py-1.5 rounded-xl bg-[#18233C] hover:bg-slate-800 text-slate-300 text-xs font-extrabold border border-slate-700 transition-all active:scale-95"
                    >
                      ⏭ Bỏ qua
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-400 italic py-4 border-t border-slate-800/80">Chưa có bài tập nào được chọn.</p>
        )}
      </div>
    </>
  );
}
