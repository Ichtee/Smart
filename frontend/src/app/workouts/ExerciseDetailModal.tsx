'use client';
import { normalizeMuscleId, MUSCLE_NAMES_VI, getYouTubeEmbedUrl, getYouTubeSearchUrl } from './utils';
import type { DetailExercise } from './types';

interface ExerciseDetailModalProps {
  currentSelectedIds: string[];
  handleAddExerciseFromLibrary: (exId: string) => void;
  isWorkoutSaved: boolean;
  selectedDetailExercise: DetailExercise | null;
  setSelectedDetailExercise: (value: DetailExercise | null) => void;
}

export default function ExerciseDetailModal({ currentSelectedIds, handleAddExerciseFromLibrary, isWorkoutSaved, selectedDetailExercise, setSelectedDetailExercise }: ExerciseDetailModalProps) {
  return (
    <>
      {selectedDetailExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedDetailExercise(null)}></div>
          <div className="relative bg-card border border-primary/30 rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col space-y-5 animate-in fade-in zoom-in duration-200">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <span className="px-3 py-1 bg-primary-soft text-primary border border-primary/40 rounded-full text-xs font-black uppercase tracking-wider">
                  Chi Tiết Bài Tập
                </span>
                <h3 className="text-2xl font-black text-white mt-2 flex items-center gap-2">
                  <span>💪</span> {selectedDetailExercise.name}
                </h3>

                {/* Muscle & Equipment Badges */}
                <div className="flex flex-wrap gap-2 text-xs mt-3">
                  <span className="px-3 py-1 bg-success-soft/80 text-success border border-success/40 rounded-xl font-extrabold flex items-center gap-1">
                    🎯 Cơ chính: {MUSCLE_NAMES_VI[normalizeMuscleId(selectedDetailExercise.muscle)] || selectedDetailExercise.muscle}
                  </span>

                  {selectedDetailExercise.secondaryMuscles && selectedDetailExercise.secondaryMuscles.length > 0 && (
                    <span className="px-3 py-1 bg-purple-950/80 text-purple-300 border border-purple-500/40 rounded-xl font-extrabold flex items-center gap-1">
                      ✨ Cơ phụ: {selectedDetailExercise.secondaryMuscles.map((m: string) => MUSCLE_NAMES_VI[normalizeMuscleId(m)] || m).join(', ')}
                    </span>
                  )}

                  {selectedDetailExercise.equipment && (
                    <span className="px-3 py-1 bg-primary-soft/80 text-primary border border-primary/40 rounded-xl font-extrabold flex items-center gap-1">
                      🏋️ Dụng cụ: {selectedDetailExercise.equipment}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedDetailExercise(null)}
                className="w-9 h-9 rounded-full bg-surface-elevated hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xl font-bold transition border border-slate-700 shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto custom-scrollbar pr-3 flex-1">

              {/* YouTube Video Demonstration */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-black text-destructive uppercase tracking-wider flex items-center gap-2">
                    <span>▶️</span> Video minh họa bài tập (YouTube)
                  </h4>
                  <a
                    href={getYouTubeSearchUrl(selectedDetailExercise.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 bg-destructive hover:bg-destructive text-white font-black text-xs rounded-xl transition flex items-center gap-1 shadow-md shadow-destructive-soft/40 shrink-0"
                  >
                    <span>Xem thêm ↗</span>
                  </a>
                </div>

                {(() => {
                  const embedUrl = getYouTubeEmbedUrl(selectedDetailExercise.videoUrl);
                  if (embedUrl) {
                    return (
                      <div className="rounded-2xl overflow-hidden border border-destructive/30 shadow-xl aspect-video bg-black">
                        <iframe
                          src={embedUrl}
                          title={`Video ${selectedDetailExercise.name}`}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    );
                  }

                  return (
                    <div className="p-4 bg-inset rounded-2xl border border-slate-800 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-destructive-soft/80 border border-destructive/40 text-destructive font-bold flex items-center justify-center text-xl shrink-0">
                        ▶️
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white">Video Hướng Dẫn YouTube</h5>
                        <p className="text-xs text-slate-400">Xem clip minh họa kỹ thuật chuẩn form trên YouTube</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Prescribed Training Parameters */}
              <div className="bg-inset p-4 rounded-2xl border border-slate-800/90 space-y-3">
                <h4 className="text-xs font-black text-primary uppercase tracking-wider flex items-center gap-2">
                  <span>📊</span> Thông số tập luyện đề xuất
                </h4>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-card p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block font-medium">Số Hiệp (Sets):</span>
                    <strong className="text-white text-base font-black">{selectedDetailExercise.sets || selectedDetailExercise.defaultSets || 1} Hiệp</strong>
                  </div>
                  <div className="bg-card p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block font-medium">Số Lần (Reps):</span>
                    <strong className="text-primary text-base font-black">{selectedDetailExercise.reps || selectedDetailExercise.defaultReps || '10'} Lần</strong>
                  </div>
                  <div className="bg-card p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block font-medium">Ngưỡng RIR:</span>
                    <strong className="text-warning text-sm font-black">⚡ RIR {selectedDetailExercise.rir || '1'}</strong>
                  </div>
                  <div className="bg-card p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block font-medium">Thời gian nghỉ:</span>
                    <strong className="text-primary text-sm font-black">⏱️ {Math.round((selectedDetailExercise.restTimeSeconds || 180) / 60)} phút</strong>
                  </div>
                </div>

                {selectedDetailExercise.warmupNotes && (
                  <div className="p-3 bg-warning-soft/40 border border-warning/30 rounded-xl text-xs text-warning font-semibold flex items-start gap-2">
                    <span>🔥</span>
                    <div>
                      <strong className="block text-warning uppercase text-xs font-black">Yêu cầu Khởi Động:</strong>
                      <p className="mt-0.5">{selectedDetailExercise.warmupNotes}</p>
                    </div>
                  </div>
                )}

                {selectedDetailExercise.notes && (
                  <div className="p-3 bg-primary-soft/40 border border-primary/30 rounded-xl text-xs text-primary font-semibold flex items-start gap-2">
                    <span>📌</span>
                    <div>
                      <strong className="block text-primary uppercase text-xs font-black">Ghi Chú Kỹ Thuật:</strong>
                      <p className="mt-0.5">{selectedDetailExercise.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Technical Description & Execution Guide */}
              <div className="bg-inset p-4 rounded-2xl border border-slate-800/90 space-y-2">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span>📖</span> Hướng dẫn kỹ thuật
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedDetailExercise.description || 'Bài tập này giúp cô lập và phát triển nhóm cơ mục tiêu hiệu quả. Hãy giữ tư thế chuẩn, kiểm soát đà rơi tạ và siết chặt cơ ở đỉnh chuyển động.'}
                </p>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              {!currentSelectedIds.includes(selectedDetailExercise.id) && !isWorkoutSaved && (
                <button
                  onClick={() => {
                    handleAddExerciseFromLibrary(selectedDetailExercise.id);
                    setSelectedDetailExercise(null);
                  }}
                  className="px-4 py-2 bg-primary hover:bg-primary text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-primary/20 transition"
                >
                  + Thêm Bài Tập Này Vào Lịch
                </button>
              )}

              <button
                onClick={() => setSelectedDetailExercise(null)}
                className="px-5 py-2 bg-surface-elevated hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition ml-auto"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
