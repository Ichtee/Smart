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
          <p className="text-xs sm:text-xs font-bold text-primary uppercase tracking-wider">
            Các bài đã chọn ({activeSelectedExercises.length})
          </p>
          <span className="flex items-center gap-3">
            <Link href="/routines" className="text-xs sm:text-xs font-bold text-primary hover:text-primary">📋 Lịch tập của tôi</Link>
            <Link href="/records" className="text-xs sm:text-xs font-bold text-warning hover:text-warning">🏆 Kỷ lục cá nhân</Link>
            <Link href="/volume" className="text-xs sm:text-xs font-bold text-success hover:text-success">📊 Khối lượng theo tuần</Link>
          </span>
          <span className="text-xs sm:text-xs text-slate-400 font-semibold hidden sm:inline">
            {isWorkoutSaved ? 'Tích chọn để đánh dấu hoàn thành' : 'Chỉnh sửa theo ý bạn rồi bấm LƯU để bắt đầu'}
          </span>
        </div>

        {activeSelectedExercises.length > 0 ? (
          activeSelectedExercises.map((ex, i) => (
            <div key={ex.id} className="flex flex-col gap-2">
              <div className="p-3.5 sm:p-5 rounded-2xl bg-inset border border-slate-800/90 hover:border-primary/40 transition-all flex items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-lg group">

                <div className="flex-1 space-y-2.5 sm:space-y-3 min-w-0">
                  <div className="flex items-start sm:items-center justify-between flex-wrap gap-1.5 sm:gap-2">
                    <h3 
                      onClick={() => setSelectedDetailExercise(ex)}
                      className="font-extrabold text-white text-sm sm:text-base hover:text-primary cursor-pointer transition-colors flex flex-wrap items-center gap-1.5 sm:gap-2"
                      title="Bấm để xem hướng dẫn & chi tiết bài tập"
                    >
                      <span>{i + 1}. {ex.name}</span>
                      <span className="text-xs sm:text-xs font-bold text-primary opacity-80 hover:opacity-100 flex items-center gap-0.5">
                        ℹ️ Chi tiết
                      </span>
                      {ex.requiresWarmup && (
                        <span className="px-2 py-0.5 bg-warning-soft/80 text-warning border border-warning/40 rounded-full text-xs sm:text-xs font-extrabold" title={ex.warmupNotes || 'Cần khởi động'}>
                          🔥 Khởi Động
                        </span>
                      )}
                      {ex.isOptional && (
                        <span className="px-2 py-0.5 bg-purple-950/80 text-purple-300 border border-purple-500/40 rounded-full text-xs sm:text-xs font-extrabold">
                          💡 Tùy Chọn
                        </span>
                      )}
                    </h3>
                    {!isWorkoutSaved && (
                      <button
                        onClick={() => handleRemoveExercise(ex.id)}
                        className="text-xs sm:text-xs text-destructive hover:text-destructive font-bold ml-auto"
                      >
                        ✕ Xóa
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-xs">
                    {/* Sets adjustment */}
                    {!isWorkoutSaved ? (
                      <div className="flex items-center gap-1.5 bg-inset px-2 py-1 rounded-xl border border-slate-800">
                        <span className="text-slate-400 font-semibold text-xs sm:text-xs">Hiệp:</span>
                        <button
                          onClick={() => updateExerciseSets(ex.id, ex.sets - 1)}
                          className="w-6 h-6 rounded-lg bg-surface-elevated hover:bg-slate-700 text-primary font-black flex items-center justify-center text-xs border border-slate-700 active:scale-95"
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
                          className="w-7 bg-transparent text-primary font-black text-center focus:outline-none text-xs"
                        />
                        <button
                          onClick={() => updateExerciseSets(ex.id, ex.sets + 1)}
                          className="w-6 h-6 rounded-lg bg-surface-elevated hover:bg-slate-700 text-primary font-black flex items-center justify-center text-xs border border-slate-700 active:scale-95"
                        >+</button>
                      </div>
                    ) : (
                      <span className="bg-inset px-2.5 py-1 rounded-xl border border-slate-800 text-slate-300 font-bold">
                        Hiệp: <strong className="text-primary">{ex.sets}</strong>
                      </span>
                    )}

                    {/* Reps adjustment */}
                    {!isWorkoutSaved ? (
                      <div className="flex items-center gap-1.5 bg-inset px-2 py-1 rounded-xl border border-slate-800">
                        <span className="text-slate-400 font-semibold text-xs sm:text-xs">Lần:</span>
                        <button
                          onClick={() => adjustExerciseReps(ex.id, -1)}
                          className="w-6 h-6 rounded-lg bg-surface-elevated hover:bg-slate-700 text-primary font-black flex items-center justify-center text-xs border border-slate-700 active:scale-95"
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
                          className="w-12 bg-transparent text-primary font-black text-center focus:outline-none text-xs"
                        />
                        <button
                          onClick={() => adjustExerciseReps(ex.id, 1)}
                          className="w-6 h-6 rounded-lg bg-surface-elevated hover:bg-slate-700 text-primary font-black flex items-center justify-center text-xs border border-slate-700 active:scale-95"
                        >+</button>
                      </div>
                    ) : (
                      <span className="bg-inset px-2.5 py-1 rounded-xl border border-slate-800 text-slate-300 font-bold">
                        Lần: <strong className="text-primary">{toFixedReps(ex.reps)}</strong>
                      </span>
                    )}

                    {ex.rir && (
                      <span className="bg-inset px-2 py-1 rounded-xl border border-slate-800 text-warning font-bold text-xs sm:text-xs">
                        ⚡ RIR: <strong className="text-white">{ex.rir}</strong>
                      </span>
                    )}

                    {ex.restTimeSeconds && (
                      <span className="bg-inset px-2 py-1 rounded-xl border border-slate-800 text-primary font-bold text-xs sm:text-xs">
                        ⏱️ Nghỉ: <strong className="text-white">{Math.round(ex.restTimeSeconds / 60)}p</strong>
                      </span>
                    )}

                    <span className="text-success font-semibold text-xs sm:text-xs">
                      🎯 {MUSCLE_NAMES_VI[ex.normMuscle] || ex.muscle}
                    </span>
                  </div>

                  {/* Warmup or technique notes */}
                  {(ex.warmupNotes || ex.notes) && (
                    <div className="text-xs text-slate-300 bg-inset p-2.5 rounded-xl border border-slate-800/80 space-y-1">
                      {ex.warmupNotes && (
                        <p className="text-warning font-semibold">🔥 Khởi động: {ex.warmupNotes}</p>
                      )}
                      {ex.notes && (
                        <p className="text-primary font-medium">📌 Ghi chú: {ex.notes}</p>
                      )}
                    </div>
                  )}

                  {/* ═══ MINI-SUB SET BREAKDOWN LIST ═══ */}
                  <div className="w-full mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5 text-primary">
                        <span>🔢</span> Các hiệp tập ({ex.sets} Hiệp)
                      </span>
                      <span className="text-xs text-primary font-bold bg-primary-soft/60 border border-primary/30 px-2 py-0.5 rounded-md">
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
                                ? 'bg-success/10 border-success/50 text-white shadow-sm shadow-success/10'
                                : 'bg-inset border-slate-800/80 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            {/* Mini-sub name */}
                            <div className="flex items-center gap-2 font-extrabold min-w-0">
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 font-mono font-black ${
                                isSetDone ? 'bg-success text-slate-950' : 'bg-surface-elevated text-primary border border-primary/30'
                              }`}>
                                #{setIdx + 1}
                              </span>
                              <span className="truncate text-white text-xs font-bold">
                                {setLabelName}
                              </span>
                            </div>

                            {/* Reps Display & Checkbox */}
                            <div className="flex items-center gap-2.5 shrink-0">
                              <span className="text-xs font-bold text-slate-400">
                                Lần: <strong className="text-primary">{toFixedReps(ex.reps)}</strong>
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
                                className="w-16 sm:w-20 bg-inset border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-center font-bold text-white focus:outline-none focus:border-primary disabled:opacity-40"
                              />

                              {/* Set Checkbox Button */}
                              <button
                                type="button"
                                onClick={() => toggleCompleteSet(ex.id, setIdx, ex.sets, ex.name)}
                                disabled={!isWorkoutSaved}
                                title={!isWorkoutSaved ? 'Vui lòng nhấn LƯU ở trên để bắt đầu tập' : `Đánh dấu hoàn thành Hiệp ${setIdx + 1}`}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-black transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                                  isSetDone
                                    ? 'bg-success border-success text-slate-950 shadow-success/20'
                                    : isWorkoutSaved
                                      ? 'bg-surface-elevated hover:bg-slate-700 border-primary/40 text-primary cursor-pointer'
                                      : 'bg-inset border-slate-800 text-slate-600 cursor-not-allowed'
                                }`}
                              >
                                {isSetDone ? (
                                  <>
                                    <span>✓</span>
                                    <span>Hiệp {setIdx + 1}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="w-3.5 h-3.5 rounded border border-primary/60 inline-block"></span>
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
                      ? 'bg-success border-success text-slate-950 shadow-lg shadow-success/30 scale-105'
                      : isWorkoutSaved
                        ? 'border-primary/60 hover:border-primary bg-inset text-slate-600'
                        : 'border-slate-800 bg-inset/50 text-slate-700 cursor-not-allowed'
                    }`}
                >
                  {ex.completed ? (
                    <span className="font-black text-base">✓</span>
                  ) : !isWorkoutSaved ? (
                    <span className="text-xs text-slate-600">🔒</span>
                  ) : null}
                </button>
              </div>

              {/* ═══ INLINE REST TIMER BELOW EXERCISE ═══ */}
              {restTimerActive && restTimerExerciseId === ex.id && (
                <div className="w-full p-3 sm:p-4 bg-inset border border-primary/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg shadow-primary/5 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-base shrink-0 animate-pulse">
                      ⏱️
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">Nghỉ giữa set/bài:</span>
                        <span className={`text-xl sm:text-2xl font-black tracking-tight tabular-nums ${
                          restTimerSeconds <= 10 ? 'text-destructive animate-pulse' : restTimerSeconds <= 30 ? 'text-warning' : 'text-primary'
                        }`}>
                          {Math.floor(restTimerSeconds / 60)}:{String(restTimerSeconds % 60).padStart(2, '0')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-semibold">
                        {restTimerPaused ? '⏸ Tạm dừng đếm ngược' : restTimerSeconds <= 0 ? '✅ Hết giờ nghỉ!' : 'Nghỉ giữa các set/bài...'}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar in middle */}
                  <div className="w-full sm:flex-1 mx-0 sm:mx-4 h-2 bg-card rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                        restTimerSeconds <= 10
                          ? 'bg-gradient-to-r from-destructive to-destructive'
                          : restTimerSeconds <= 30
                            ? 'bg-gradient-to-r from-warning to-warning'
                            : 'bg-gradient-to-r from-primary to-success'
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
                          ? 'bg-primary text-slate-950 hover:bg-primary shadow-md shadow-primary/20'
                          : 'bg-warning/20 text-warning border border-warning/40 hover:bg-warning/30'
                      }`}
                    >
                      {restTimerPaused ? '▶ Tiếp tục' : '⏸ Tạm dừng'}
                    </button>
                    <button
                      onClick={skipRestTimer}
                      className="px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-slate-800 text-slate-300 text-xs font-extrabold border border-slate-700 transition-all active:scale-95"
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
