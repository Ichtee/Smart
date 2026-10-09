'use client';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toFixedReps, MUSCLE_NAMES_VI } from './utils';
import Link from 'next/link';
import type { ExerciseDetailsMap } from './types';
import { setWeightText, withSetWeight } from './setWeights';
import ProgressRing from '@/components/ui/ProgressRing';
import { Check, ChevronDown, ClipboardList, Flame, Info, Lightbulb, Lock, Minus, Pause, Pin, Play, Plus, SkipForward, Target, Timer, Trophy, X, Zap, BarChart3 } from 'lucide-react';
import type { ActiveExercise, DetailExercise } from './types';

interface ExerciseChecklistProps {
  activeSelectedExercises: ActiveExercise[];
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
  setSelectedDetailExercise: (value: DetailExercise | null) => void;
  skipRestTimer: () => void;
  toggleCompleteExercise: (id: string, forcedState?: boolean | undefined, customSets?: number[] | undefined, setsMapOverride?: Record<string, number[]> | undefined) => void;
  toggleCompleteSet: (exId: string, setIndex: number, totalSets: number, exName: string) => void;
  toggleRestTimerPause: () => void;
  updateExerciseSets: (id: string, sets: number) => void;
}

// 44px touch targets: usable with sweaty hands in the gym
const STEP_BTN = 'size-11 rounded-xl bg-surface-elevated hover:bg-slate-700 text-primary font-black flex items-center justify-center border border-slate-700 active:scale-95 cursor-pointer';
const CHIP = 'bg-inset px-2.5 py-1 rounded-xl border border-slate-800 text-sm';

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
  // the per-set rows are folded away until asked for, to keep the exercise cards short
  const [openSets, setOpenSets] = useState<Record<string, boolean>>({});
  const allDone = isWorkoutSaved && activeSelectedExercises.length > 0 && activeSelectedExercises.every(ex => ex.completed);
  const timerExercise = restTimerActive ? activeSelectedExercises.find(ex => ex.id === restTimerExerciseId) : null;
  const timerTone = restTimerSeconds <= 10 ? 'text-destructive' : restTimerSeconds <= 30 ? 'text-warning' : 'text-primary';

  return (
    <>
      <div className="space-y-3 sm:space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-800/80 pb-2">
          <p className="text-sm font-bold text-primary uppercase tracking-wider">
            Các bài đã chọn ({activeSelectedExercises.length})
          </p>
          <span className="flex items-center flex-wrap gap-x-4 gap-y-1">
            <Link href="/routines" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"><ClipboardList className="size-4" aria-hidden="true" /> Lịch tập của tôi</Link>
            <Link href="/records" className="inline-flex items-center gap-1.5 text-sm font-bold text-pr hover:underline"><Trophy className="size-4" aria-hidden="true" /> Kỷ lục cá nhân</Link>
            <Link href="/volume" className="inline-flex items-center gap-1.5 text-sm font-bold text-success hover:underline"><BarChart3 className="size-4" aria-hidden="true" /> Khối lượng theo tuần</Link>
          </span>
          <span className="text-sm text-slate-400 font-semibold hidden sm:inline">
            {isWorkoutSaved ? 'Tích chọn để đánh dấu hoàn thành' : 'Chỉnh sửa theo ý bạn rồi bấm LƯU để bắt đầu'}
          </span>
        </div>

        {allDone && (
          <div role="status" className="flex items-center gap-3 rounded-2xl border border-success/40 bg-success/10 p-4 text-success animate-[pop_.4s_ease-out]">
            <Trophy className="size-8 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-display text-2xl font-bold leading-tight">Hoàn thành buổi tập!</p>
              <p className="text-sm font-semibold text-foreground/80">Bạn đã xong tất cả bài hôm nay. Nhớ uống nước và ăn đủ protein nhé.</p>
            </div>
          </div>
        )}

        {activeSelectedExercises.length > 0 ? (
          activeSelectedExercises.map((ex, i) => (
            <div key={ex.id} className="flex flex-col gap-2">
              <div className={`p-3.5 sm:p-4 rounded-2xl bg-inset border transition-all flex items-start justify-between gap-3 sm:gap-4 shadow-lg group ${ex.completed ? 'border-success/50' : 'border-slate-800/90 hover:border-primary/40'}`}>

                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <h3
                      onClick={() => setSelectedDetailExercise(ex)}
                      className="font-bold text-foreground text-lg sm:text-xl hover:text-primary cursor-pointer transition-colors flex flex-wrap items-center gap-2"
                      title="Bấm để xem hướng dẫn & chi tiết bài tập"
                    >
                      <span>{i + 1}. {ex.name}</span>
                      <span className="text-sm font-bold text-primary opacity-80 hover:opacity-100 flex items-center gap-1">
                        <Info className="size-4" aria-hidden="true" /> Chi tiết
                      </span>
                      {ex.requiresWarmup && (
                        <span className="px-2 py-0.5 bg-warning-soft/80 text-warning border border-warning/40 rounded-full text-xs font-extrabold inline-flex items-center gap-1" title={ex.warmupNotes || 'Cần khởi động'}>
                          <Flame className="size-3.5" aria-hidden="true" /> Khởi Động
                        </span>
                      )}
                      {ex.isOptional && (
                        <span className="px-2 py-0.5 bg-purple-950/80 text-purple-300 border border-purple-500/40 rounded-full text-xs font-extrabold inline-flex items-center gap-1">
                          <Lightbulb className="size-3.5" aria-hidden="true" /> Tùy Chọn
                        </span>
                      )}
                    </h3>
                    {!isWorkoutSaved && (
                      <button
                        onClick={() => handleRemoveExercise(ex.id)}
                        className="min-h-11 px-2 text-sm text-destructive hover:underline font-bold ml-auto inline-flex items-center gap-1 cursor-pointer"
                      >
                        <X className="size-4" aria-hidden="true" /> Xóa
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {/* Sets adjustment */}
                    {!isWorkoutSaved ? (
                      <div className="flex items-center gap-2 bg-inset px-2 py-1.5 rounded-xl border border-slate-800">
                        <span className="text-slate-400 font-semibold">Hiệp:</span>
                        <button
                          aria-label={`Giảm số hiệp của ${ex.name}`}
                          onClick={() => updateExerciseSets(ex.id, ex.sets - 1)}
                          className={STEP_BTN}
                        ><Minus className="size-4" aria-hidden="true" /></button>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={ex.sets}
                          onChange={(e) => {
                            const clean = e.target.value.replace(/[^0-9]/g, '');
                            updateExerciseSets(ex.id, parseInt(clean) || 1);
                          }}
                          className="w-9 bg-transparent text-primary font-black text-center focus:outline-none text-base"
                        />
                        <button
                          aria-label={`Tăng số hiệp của ${ex.name}`}
                          onClick={() => updateExerciseSets(ex.id, ex.sets + 1)}
                          className={STEP_BTN}
                        ><Plus className="size-4" aria-hidden="true" /></button>
                      </div>
                    ) : (
                      <span className={`${CHIP} text-slate-300 font-bold`}>
                        Hiệp: <strong className="text-primary">{ex.sets}</strong>
                      </span>
                    )}

                    {/* Reps adjustment */}
                    {!isWorkoutSaved ? (
                      <div className="flex items-center gap-2 bg-inset px-2 py-1.5 rounded-xl border border-slate-800">
                        <span className="text-slate-400 font-semibold">Lần:</span>
                        <button
                          aria-label={`Giảm số lần của ${ex.name}`}
                          onClick={() => adjustExerciseReps(ex.id, -1)}
                          className={STEP_BTN}
                        ><Minus className="size-4" aria-hidden="true" /></button>
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
                          className="w-12 bg-transparent text-primary font-black text-center focus:outline-none text-base"
                        />
                        <button
                          aria-label={`Tăng số lần của ${ex.name}`}
                          onClick={() => adjustExerciseReps(ex.id, 1)}
                          className={STEP_BTN}
                        ><Plus className="size-4" aria-hidden="true" /></button>
                      </div>
                    ) : (
                      <span className={`${CHIP} text-slate-300 font-bold`}>
                        Lần: <strong className="text-primary">{toFixedReps(ex.reps)}</strong>
                      </span>
                    )}

                    {ex.rir && (
                      <span className={`${CHIP} text-warning font-bold inline-flex items-center gap-1`}>
                        <Zap className="size-4" aria-hidden="true" /> RIR: <strong className="text-foreground">{ex.rir}</strong>
                      </span>
                    )}

                    {ex.restTimeSeconds && (
                      <span className={`${CHIP} text-primary font-bold inline-flex items-center gap-1`}>
                        <Timer className="size-4" aria-hidden="true" /> Nghỉ: <strong className="text-foreground">{Math.round(ex.restTimeSeconds / 60)}p</strong>
                      </span>
                    )}

                    <span className="text-success font-semibold inline-flex items-center gap-1">
                      <Target className="size-4" aria-hidden="true" /> {MUSCLE_NAMES_VI[ex.normMuscle] || ex.muscle}
                    </span>
                  </div>

                  {/* Warmup or technique notes */}
                  {(ex.warmupNotes || ex.notes) && (
                    <div className="text-sm text-slate-300 bg-inset p-3 rounded-xl border border-slate-800/80 space-y-1">
                      {ex.warmupNotes && (
                        <p className="text-warning font-semibold flex items-start gap-1.5"><Flame className="size-4 mt-0.5 shrink-0" aria-hidden="true" /> Khởi động: {ex.warmupNotes}</p>
                      )}
                      {ex.notes && (
                        <p className="text-primary font-medium flex items-start gap-1.5"><Pin className="size-4 mt-0.5 shrink-0" aria-hidden="true" /> Ghi chú: {ex.notes}</p>
                      )}
                    </div>
                  )}

                  {/* ═══ SET BREAKDOWN LIST ═══ */}
                  <div className="w-full mt-2 pt-2 border-t border-slate-800/80 space-y-1">
                    <button
                      type="button"
                      aria-expanded={!!openSets[ex.id]}
                      onClick={() => setOpenSets(prev => ({ ...prev, [ex.id]: !prev[ex.id] }))}
                      className="w-full min-h-11 flex items-center justify-between gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider cursor-pointer"
                    >
                      <span className="text-primary inline-flex items-center gap-1.5">
                        <ChevronDown className={`size-4 transition-transform ${openSets[ex.id] ? 'rotate-180' : ''}`} aria-hidden="true" />
                        Các hiệp tập ({ex.sets} Hiệp)
                      </span>
                      <span className="text-sm text-primary font-bold bg-primary-soft/60 border border-primary/30 px-2 py-0.5 rounded-md">
                        {(completedSetsMap[ex.id] || []).length} / {ex.sets} Hoàn thành
                      </span>
                    </button>

                    <div className={`grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2 ${openSets[ex.id] ? '' : 'hidden'}`}>
                      {Array.from({ length: ex.sets }).map((_, setIdx) => {
                        const isSetDone = (completedSetsMap[ex.id] || []).includes(setIdx);
                        const setLabelName = `${ex.name} #${setIdx + 1}`;

                        return (
                          <div
                            key={setIdx}
                            className={`relative p-2 rounded-xl border transition-all flex items-center justify-between gap-2 text-sm ${
                              isSetDone
                                ? 'bg-success/10 border-success/50 text-foreground shadow-sm shadow-success/10'
                                : 'bg-inset border-slate-800/80 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            {/* Set name */}
                            <div className="flex items-center gap-2 font-extrabold min-w-0">
                              <span className={`min-w-8 h-8 px-1 rounded-lg flex items-center justify-center text-sm shrink-0 font-display font-bold ${
                                isSetDone ? 'bg-success text-slate-950' : 'bg-surface-elevated text-primary border border-primary/30'
                              }`}>
                                #{setIdx + 1}
                              </span>
                              <span className="sr-only">
                                {setLabelName}
                              </span>
                            </div>

                            {/* Reps display, weight and the tick button */}
                            <div className="flex items-center gap-2.5 shrink-0">
                              <span className="sr-only">
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
                                className="w-20 h-11 bg-inset border border-slate-700 rounded-xl px-2 text-base text-center font-bold text-foreground focus:outline-none focus:border-primary disabled:opacity-40"
                              />

                              {/* Set Checkbox Button */}
                              <button
                                type="button"
                                onClick={() => toggleCompleteSet(ex.id, setIdx, ex.sets, ex.name)}
                                disabled={!isWorkoutSaved}
                                title={!isWorkoutSaved ? 'Vui lòng nhấn LƯU ở trên để bắt đầu tập' : `Đánh dấu hoàn thành Hiệp ${setIdx + 1}`}
                                className={`min-h-11 min-w-24 px-3 rounded-xl border text-sm font-black transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 ${
                                  isSetDone
                                    ? 'bg-success border-success text-slate-950 shadow-success/20 cursor-pointer'
                                    : isWorkoutSaved
                                      ? 'bg-surface-elevated hover:bg-slate-700 border-primary/40 text-primary cursor-pointer'
                                      : 'bg-inset border-slate-800 text-slate-600 cursor-not-allowed'
                                }`}
                              >
                                {isSetDone ? (
                                  <>
                                    <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                                    <span>Hiệp {setIdx + 1}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="size-4 rounded border-2 border-current inline-block" aria-hidden="true"></span>
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

                {/* Mark the whole exercise */}
                <button
                  onClick={() => toggleCompleteExercise(ex.id)}
                  disabled={!isWorkoutSaved}
                  aria-label={ex.completed ? `Bỏ đánh dấu ${ex.name}` : `Hoàn thành ${ex.name}`}
                  title={!isWorkoutSaved ? 'Vui lòng bấm LƯU ở trên để bắt đầu tập' : 'Đánh dấu hoàn thành'}
                  className={`size-12 rounded-2xl border-2 transition-all flex items-center justify-center shrink-0 ${ex.completed
                      ? 'bg-success border-success text-slate-950 shadow-lg shadow-success/30 scale-105 cursor-pointer'
                      : isWorkoutSaved
                        ? 'border-primary/60 hover:border-primary bg-inset text-slate-600 cursor-pointer'
                        : 'border-slate-800 bg-inset/50 text-slate-700 cursor-not-allowed'
                    }`}
                >
                  {ex.completed ? (
                    <Check className="size-6" strokeWidth={3} aria-hidden="true" />
                  ) : !isWorkoutSaved ? (
                    <Lock className="size-5 text-slate-600" aria-hidden="true" />
                  ) : null}
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400 italic py-4 border-t border-slate-800/80">Chưa có bài tập nào được chọn.</p>
        )}
      </div>

      {/* ═══ REST TIMER: floats at the bottom of the screen so it stays visible while scrolling the sets ═══ */}
      {timerExercise && typeof document !== 'undefined' && createPortal(
        <div
          role="timer"
          aria-label="Đồng hồ nghỉ"
          className="fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-xl items-center gap-3 rounded-3xl border border-primary/50 bg-popover p-3 shadow-2xl shadow-black/40 animate-[toast-in_.2s_ease-out] sm:p-4 md:bottom-6 md:left-auto md:right-6 md:mx-0 md:w-[440px]"
        >
          <ProgressRing value={restTimerSeconds} max={restTimerTotal || REST_DURATION} size={72} stroke={7} colorClass={timerTone}>
            <span className={`font-display text-2xl font-bold leading-none tabular-nums ${timerTone} ${restTimerSeconds <= 10 && !restTimerPaused ? 'animate-pulse' : ''}`}>
              {Math.floor(restTimerSeconds / 60)}:{String(restTimerSeconds % 60).padStart(2, '0')}
            </span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-slate-300 uppercase tracking-wider">Nghỉ giữa set/bài:</p>
            <p className="truncate text-sm font-semibold text-foreground">{timerExercise.name}</p>
            <p className="text-xs text-slate-400 font-semibold">
              {restTimerPaused ? 'Tạm dừng đếm ngược' : restTimerSeconds <= 0 ? 'Hết giờ nghỉ!' : 'Nghỉ giữa các set/bài...'}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <button
              onClick={toggleRestTimerPause}
              className={`min-h-11 px-3 rounded-xl text-sm font-extrabold transition-all active:scale-95 inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                restTimerPaused
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'bg-warning/20 text-warning border border-warning/40 hover:bg-warning/30'
              }`}
            >
              {restTimerPaused ? <><Play className="size-4" aria-hidden="true" /> Tiếp tục</> : <><Pause className="size-4" aria-hidden="true" /> Tạm dừng</>}
            </button>
            <button
              onClick={skipRestTimer}
              className="min-h-11 px-3 rounded-xl bg-surface-elevated hover:bg-slate-800 text-slate-300 text-sm font-extrabold border border-slate-700 transition-all active:scale-95 inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <SkipForward className="size-4" aria-hidden="true" /> Bỏ qua
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
