'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/utils/api';
import { useExercises } from '@/hooks/useApi';
import { useAdmin } from '@/hooks/useAdmin';
import { Settings, Library, Dumbbell, ShieldAlert } from 'lucide-react';
import type { Exercise } from '@/types/domain';

const MUSCLE_NAMES_VI: Record<string, string> = {
  chest: 'Ngực (Chest)',
  'upper-back': 'Lưng trên (Upper Back)',
  'lower-back': 'Lưng dưới (Lower Back)',
  lats: 'Cơ xô (Lats)',
  trapezius: 'Cầu vai (Traps)',
  'front-deltoids': 'Vai trước/giữa (Delts)',
  'back-deltoids': 'Vai sau (Rear Delts)',
  biceps: 'Tay trước (Biceps)',
  triceps: 'Tay sau (Triceps)',
  forearm: 'Cẳng tay (Forearms)',
  quadriceps: 'Đùi trước (Quads)',
  hamstring: 'Đùi sau (Hamstrings)',
  adductor: 'Cơ khép (Adductors)',
  adductors: 'Cơ khép (Adductors)',
  calves: 'Bắp chân (Calves)',
  gluteal: 'Mông (Glutes)',
  abs: 'Bụng (Abs)',
  obliques: 'Cơ liên sườn (Obliques)',
  neck: 'Cổ (Neck)'
};

const getYouTubeEmbedUrl = (url?: string): string => {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?autoplay=0&rel=0&enablejsapi=1` : '';
};

export default function AdminExercises() {
  const router = useRouter();
  const { isAdmin, checking, authError } = useAdmin();
  const { exercises: exerciseData, isLoading: exercisesLoading, mutate: mutateExercises } = useExercises(isAdmin);
  const exercises: Exercise[] = Array.isArray(exerciseData) ? exerciseData : [];
  const loading = checking || (isAdmin && exercisesLoading);
  
  // Search and Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMuscle, setFilterMuscle] = useState('');

  // Detail Modal state
  const [viewingExercise, setViewingExercise] = useState<Exercise | null>(null);

  // Success / Failure / Confirmation Popup Modal state
  const [popup, setPopup] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'confirm';
    title: string;
    message: string;
    confirmText?: string;
    onConfirm?: () => void;
  } | null>(null);

  // Form state for all exercise catalog fields
  const [formData, setFormData] = useState({
    name: '',
    muscle: 'chest',
    secondaryMuscles: '',
    equipment: '',
    defaultSets: 1,
    defaultReps: '10',
    videoUrl: '',
    description: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const muscles = [
    'chest', 'upper-back', 'lats', 'trapezius', 'lower-back',
    'front-deltoids', 'back-deltoids', 'biceps', 'triceps', 'forearm',
    'quadriceps', 'hamstring', 'adductors', 'calves', 'gluteal', 'abs', 'obliques'
  ];

  const equipmentOptions = [
    'Machine', 'Cable Machine', 'Smith Machine', 'Barbell', 'Dumbbell', 'Bodyweight', 'Assisted Machine', 'Bench'
  ];

  const resetForm = () => {
    setFormData({
      name: '',
      muscle: 'chest',
      secondaryMuscles: '',
      equipment: '',
      defaultSets: 1,
      defaultReps: '10',
      videoUrl: '',
      description: ''
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Process secondary muscles comma separated list
    const secMusclesArray = formData.secondaryMuscles
      ? formData.secondaryMuscles.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      : [];

    const payload = {
      name: formData.name,
      muscle: formData.muscle.toLowerCase(),
      defaultSets: Number(formData.defaultSets),
      defaultReps: formData.defaultReps,
      equipment: formData.equipment,
      videoUrl: formData.videoUrl,
      description: formData.description,
      secondaryMuscles: secMusclesArray
    };

    try {
      let res;
      if (editingId) {
        res = await apiFetch(`/api/exercises/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch('/api/exercises', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();

      if (res.ok) {
        const isEdit = !!editingId;
        const currentName = formData.name;
        resetForm();
        mutateExercises();
        setPopup({
          show: true,
          type: 'success',
          title: isEdit ? 'Cập Nhật Thành Công! 🎉' : 'Thêm Bài Tập Thành Công! 🚀',
          message: isEdit 
            ? `Dữ liệu bài tập "${currentName}" đã được cập nhật thành công vào cơ sở dữ liệu.` 
            : `Bài tập mới "${currentName}" đã được thêm thành công vào thư viện hệ thống!`
        });
      } else {
        setPopup({
          show: true,
          type: 'error',
          title: 'Lỗi Thao Tác ❌',
          message: data.message || 'Không thể lưu bài tập. Vui lòng kiểm tra lại dữ liệu nhập vào!'
        });
      }
    } catch {
      setPopup({
        show: true,
        type: 'error',
        title: 'Lỗi Kết Nối Server ❌',
        message: 'Đã xảy ra lỗi khi gửi yêu cầu tới máy chủ API.'
      });
    }
  };

  const handleEdit = (ex: Exercise) => {
    setEditingId(ex._id);
    setFormData({
      name: ex.name || '',
      muscle: ex.muscle || 'chest',
      secondaryMuscles: Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles.join(', ') : '',
      equipment: ex.equipment || '',
      defaultSets: ex.defaultSets || 1,
      defaultReps: ex.defaultReps || '10',
      videoUrl: ex.videoUrl || '',
      description: ex.description || ''
    });
  };

  const confirmDelete = (ex: Exercise) => {
    setPopup({
      show: true,
      type: 'confirm',
      title: 'Xác Nhận Xóa Bài Tập ⚠️',
      message: `Bạn có chắc chắn muốn xóa bài tập "${ex.name}" khỏi thư viện hệ thống không? Tất cả lịch tập sử dụng bài tập này có thể bị ảnh hưởng.`,
      confirmText: 'Xóa bài tập',
      onConfirm: () => performDelete(ex._id, ex.name)
    });
  };

  const performDelete = async (id: string, name: string) => {
    setPopup(null);
    try {
      const res = await apiFetch(`/api/exercises/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        mutateExercises();
        setPopup({
          show: true,
          type: 'success',
          title: 'Đã Xóa Bài Tập! 🗑️',
          message: `Bài tập "${name}" đã được xóa thành công khỏi hệ thống.`
        });
      } else {
        setPopup({
          show: true,
          type: 'error',
          title: 'Xóa Thất Bại ❌',
          message: data.message || 'Không thể xóa bài tập này.'
        });
      }
    } catch {
      setPopup({
        show: true,
        type: 'error',
        title: 'Lỗi Máy Chủ ❌',
        message: 'Đã xảy ra lỗi kết nối khi gửi yêu cầu xóa.'
      });
    }
  };

  const filteredExercises = exercises.filter(ex => {
    const matchName = ex.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchMuscle = filterMuscle === '' || ex.muscle.toLowerCase() === filterMuscle.toLowerCase();
    return matchName && matchMuscle;
  });

  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <ShieldAlert className="mb-4 size-16 text-destructive" aria-hidden />
        <h1 className="text-2xl font-bold text-destructive mb-2">{authError}</h1>
        <button onClick={() => router.push('/')} className="mt-6 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">Về trang chủ</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col space-y-6 pb-12">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Settings className="size-7" aria-hidden /> Quản Lý Thư Viện Bài Tập
          </h1>
          <p className="text-slate-400 mt-1 text-sm font-medium">Chỉnh sửa toàn bộ các trường dữ liệu bài tập (Tên, Cơ chính/phụ, Dụng cụ, Sets/Reps, Video YouTube & Kỹ thuật).</p>
        </div>
        <span className="px-4 py-2 bg-card border border-primary/30 text-primary font-extrabold text-xs rounded-2xl shadow-md">
          Tổng số: {exercises.length} Bài Tập
        </span>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-12 gap-8 items-start">
        
        {/* Form Panel (Left) */}
        <div className="2xl:col-span-5 bg-card/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl space-y-5 2xl:sticky 2xl:top-6">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <span>{editingId ? '✏️' : '➕'}</span>
              <span>{editingId ? 'Sửa bài tập' : 'Thêm bài tập mới'}</span>
            </h2>
            {editingId && (
              <button 
                onClick={resetForm}
                className="text-xs font-bold text-slate-400 hover:text-white bg-surface-elevated px-3 py-1 rounded-xl transition"
              >
                Hủy sửa
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
            {/* Tên bài tập */}
            <div>
              <label className="block text-slate-300 font-bold mb-1">Tên bài tập *</label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-inset border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition"
                placeholder="VD: Leg Extension Machine"
              />
            </div>

            {/* Nhóm cơ chính & Dụng cụ */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Nhóm cơ chính *</label>
                <select 
                  value={formData.muscle}
                  onChange={e => setFormData({...formData, muscle: e.target.value})}
                  className="w-full bg-inset border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition"
                >
                  {muscles.map(m => (
                    <option key={m} value={m}>{MUSCLE_NAMES_VI[m] || m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Dụng cụ tập luyện</label>
                <input
                  type="text"
                  list="equipment-list"
                  value={formData.equipment}
                  onChange={e => setFormData({...formData, equipment: e.target.value})}
                  className="w-full bg-inset border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition"
                  placeholder="VD: Machine, Cable..."
                />
                <datalist id="equipment-list">
                  {equipmentOptions.map(eq => (
                    <option key={eq} value={eq} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Nhóm cơ phụ */}
            <div>
              <label className="block text-slate-300 font-bold mb-1">Nhóm cơ phụ (phân cách bởi dấu phẩy)</label>
              <input 
                type="text" 
                value={formData.secondaryMuscles}
                onChange={e => setFormData({...formData, secondaryMuscles: e.target.value})}
                className="w-full bg-inset border border-slate-800 rounded-xl p-3 text-purple-300 focus:outline-none focus:border-purple-400 transition"
                placeholder="VD: triceps, front-deltoids"
              />
            </div>

            {/* Sets & Reps */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Số Hiệp mặc định (Sets) *</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  value={formData.defaultSets}
                  onChange={e => setFormData({...formData, defaultSets: Number(e.target.value)})}
                  className="w-full bg-inset border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-primary transition font-bold"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">Số Lần mặc định (Reps) *</label>
                <input 
                  type="text" 
                  required
                  value={formData.defaultReps}
                  onChange={e => setFormData({...formData, defaultReps: e.target.value})}
                  className="w-full bg-inset border border-slate-800 rounded-xl p-3 text-primary focus:outline-none focus:border-primary transition font-bold"
                  placeholder="VD: 10"
                />
              </div>
            </div>

            {/* Video URL YouTube */}
            <div>
              <label className="block text-slate-300 font-bold mb-1">Link Video Minh Họa YouTube</label>
              <input 
                type="url" 
                value={formData.videoUrl}
                onChange={e => setFormData({...formData, videoUrl: e.target.value})}
                className="w-full bg-inset border border-slate-800 rounded-xl p-3 text-destructive focus:outline-none focus:border-destructive transition"
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>

            {/* Hướng dẫn kỹ thuật / Description */}
            <div>
              <label className="block text-slate-300 font-bold mb-1">Hướng dẫn kỹ thuật / Mô tả chi tiết</label>
              <textarea 
                rows={3}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full bg-inset border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-primary transition leading-relaxed"
                placeholder="Nhập ghi chú kỹ thuật, tư thế chuẩn, lưu ý hít thở..."
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button type="submit" className="flex-1 bg-primary hover:bg-primary text-slate-950 font-black py-3 px-4 rounded-xl transition shadow-lg shadow-primary/20 active:scale-95 text-xs uppercase tracking-wider">
                {editingId ? '💾 LƯU CẬP NHẬT' : '➕ THÊM VÀO THƯ VIỆN'}
              </button>
              {editingId && (
                <button 
                  type="button"
                  onClick={resetForm}
                  className="bg-surface-elevated hover:bg-slate-800 text-slate-300 font-bold py-3 px-4 rounded-xl transition text-xs"
                >
                  Hủy
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Exercises Table List Panel (Right) */}
        <div className="2xl:col-span-7 bg-card/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Library className="size-5" aria-hidden /> Danh Sách Dữ Liệu ({filteredExercises.length})
            </h2>
            
            {/* Search and Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                placeholder="🔍 Tìm bài tập..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-inset border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary transition min-w-[170px]"
              />
              <select
                value={filterMuscle}
                onChange={(e) => setFilterMuscle(e.target.value)}
                className="bg-inset border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary transition"
              >
                <option value="">Tất cả nhóm cơ</option>
                {muscles.map(m => (
                  <option key={m} value={m}>{MUSCLE_NAMES_VI[m] || m}</option>
                ))}
              </select>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar max-h-[680px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-inset z-10 text-slate-400 font-extrabold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Bài tập</th>
                    <th className="p-3.5">Cơ chính / Dụng cụ</th>
                    <th className="p-3.5">Mặc định</th>
                    <th className="p-3.5 text-center">Video</th>
                    <th className="p-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredExercises.length > 0 ? (
                    filteredExercises.map((ex) => (
                      <tr key={ex._id} className="hover:bg-surface-elevated/60 transition group">
                        <td className="p-3.5">
                          <div className="font-extrabold text-white text-sm group-hover:text-primary transition flex items-center gap-1.5">
                            <span>{ex.name}</span>
                          </div>
                          {ex.secondaryMuscles && ex.secondaryMuscles.length > 0 && (
                            <span className="text-xs text-purple-300 block mt-0.5">
                              ✨ Cơ phụ: {ex.secondaryMuscles.join(', ')}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 rounded-lg bg-success-soft/80 text-success border border-success/30 font-bold inline-block">
                            {MUSCLE_NAMES_VI[ex.muscle] || ex.muscle}
                          </span>
                          {ex.equipment && (
                            <span className="px-2.5 py-1 rounded-lg bg-primary-soft/80 text-primary border border-primary/30 font-bold inline-block ml-1 mt-1">
                              🏋️ {ex.equipment}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-bold text-slate-300 whitespace-nowrap">
                          {ex.defaultSets} Hiệp x <span className="text-primary">{ex.defaultReps}</span>
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {ex.videoUrl ? (
                            <span className="text-destructive font-bold bg-destructive-soft/60 border border-destructive/30 px-2 py-0.5 rounded-md text-xs">
                              ▶️ Có Video
                            </span>
                          ) : (
                            <span className="text-slate-600 text-xs">Chưa có</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap space-x-2">
                          <button
                            onClick={() => setViewingExercise(ex)}
                            className="px-2.5 py-1 bg-primary-soft hover:bg-primary-soft text-primary border border-primary/40 rounded-lg font-bold transition text-xs"
                          >
                            👁️ Xem
                          </button>
                          <button 
                            onClick={() => handleEdit(ex)} 
                            className="px-2.5 py-1 bg-warning-soft hover:bg-warning-soft text-warning border border-warning/40 rounded-lg font-bold transition text-xs"
                          >
                            ✏️ Sửa
                          </button>
                          <button 
                            onClick={() => confirmDelete(ex)} 
                            className="px-2.5 py-1 bg-destructive-soft hover:bg-destructive-soft text-destructive border border-destructive/40 rounded-lg font-bold transition text-xs"
                          >
                            🗑️ Xóa
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                        Không tìm thấy bài tập nào phù hợp.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Admin View Exercise Modal */}
      {viewingExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setViewingExercise(null)}></div>
          <div className="relative bg-card border border-primary/30 rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col space-y-5 animate-in fade-in zoom-in duration-200">
            
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <span className="px-3 py-1 bg-primary-soft text-primary border border-primary/40 rounded-full text-xs font-black uppercase tracking-wider">
                  Chi Tiết Bài Tập trong Catalog Admin
                </span>
                <h3 className="text-2xl font-black text-white mt-2 flex items-center gap-2">
                  <Dumbbell className="size-5" aria-hidden /> {viewingExercise.name}
                </h3>

                <div className="flex flex-wrap gap-2 text-xs mt-3">
                  <span className="px-3 py-1 bg-success-soft/80 text-success border border-success/40 rounded-xl font-extrabold">
                    🎯 Cơ chính: {MUSCLE_NAMES_VI[viewingExercise.muscle] || viewingExercise.muscle}
                  </span>

                  {viewingExercise.secondaryMuscles && viewingExercise.secondaryMuscles.length > 0 && (
                    <span className="px-3 py-1 bg-purple-950/80 text-purple-300 border border-purple-500/40 rounded-xl font-extrabold">
                      ✨ Cơ phụ: {viewingExercise.secondaryMuscles.join(', ')}
                    </span>
                  )}

                  {viewingExercise.equipment && (
                    <span className="px-3 py-1 bg-primary-soft/80 text-primary border border-primary/40 rounded-xl font-extrabold">
                      🏋️ Dụng cụ: {viewingExercise.equipment}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setViewingExercise(null)}
                className="w-9 h-9 rounded-full bg-surface-elevated hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xl font-bold transition border border-slate-700 shrink-0"
              >
                &times;
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto custom-scrollbar pr-3 flex-1 text-xs">
              {/* YouTube Video */}
              {viewingExercise.videoUrl && (
                <div className="space-y-2">
                  <h4 className="font-black text-destructive uppercase tracking-wider flex items-center gap-2">
                    <span>▶️</span> Video Minh Họa YouTube
                  </h4>
                  {(() => {
                    const embedUrl = getYouTubeEmbedUrl(viewingExercise.videoUrl);
                    if (embedUrl) {
                      return (
                        <div className="rounded-2xl overflow-hidden border border-destructive/30 shadow-xl aspect-video bg-black">
                          <iframe
                            src={embedUrl}
                            title={`Video ${viewingExercise.name}`}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              {/* Description */}
              <div className="bg-inset p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-black text-slate-300 uppercase tracking-wider">📖 Mô Tả Kỹ Thuật:</h4>
                <p className="text-slate-300 leading-relaxed">{viewingExercise.description || 'Chưa có mô tả kỹ thuật.'}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => {
                  handleEdit(viewingExercise);
                  setViewingExercise(null);
                }}
                className="px-4 py-2 bg-warning hover:bg-warning text-slate-950 font-black text-xs rounded-xl shadow-md transition"
              >
                ✏️ Chỉnh Sửa Dữ Liệu Này
              </button>
              <button
                onClick={() => setViewingExercise(null)}
                className="px-5 py-2 bg-surface-elevated hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Global Success / Error / Confirm Popup Modal */}
      {popup && popup.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" 
            onClick={() => popup.type !== 'confirm' && setPopup(null)}
          ></div>
          
          <div className={`relative bg-card border ${
            popup.type === 'success' 
              ? 'border-success/50 shadow-success/10' 
              : popup.type === 'error' 
                ? 'border-destructive/50 shadow-destructive/10' 
                : 'border-warning/50 shadow-warning/10'
          } rounded-3xl p-6 sm:p-8 shadow-2xl max-w-md w-full flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-200`}>
            
            {/* Icon Badge */}
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg border ${
              popup.type === 'success'
                ? 'bg-success-soft/80 text-success border-success/40 shadow-success-soft/40'
                : popup.type === 'error'
                  ? 'bg-destructive-soft/80 text-destructive border-destructive/40 shadow-destructive-soft/40'
                  : 'bg-warning-soft/80 text-warning border-warning/40 shadow-warning-soft/40'
            }`}>
              {popup.type === 'success' ? '✅' : popup.type === 'error' ? '❌' : '⚠️'}
            </div>

            {/* Title & Message */}
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">{popup.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">{popup.message}</p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 w-full flex gap-3">
              {popup.type === 'confirm' ? (
                <>
                  <button
                    onClick={() => setPopup(null)}
                    className="flex-1 py-3 bg-surface-elevated hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => {
                      if (popup.onConfirm) popup.onConfirm();
                    }}
                    className="flex-1 py-3 bg-destructive hover:bg-destructive text-white font-black text-xs rounded-xl shadow-lg shadow-destructive-soft/40 transition active:scale-95 uppercase tracking-wider"
                  >
                    {popup.confirmText || 'Xác nhận'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setPopup(null)}
                  className={`w-full py-3 font-black text-xs rounded-xl transition shadow-lg active:scale-95 uppercase tracking-wider ${
                    popup.type === 'success'
                      ? 'bg-primary hover:bg-primary text-slate-950 shadow-primary/20'
                      : 'bg-destructive hover:bg-destructive text-white shadow-destructive/20'
                  }`}
                >
                  Đồng Ý / Đóng
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
