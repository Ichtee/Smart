'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/utils/api';
import { useRoutines, useExercises } from '@/hooks/useApi';
import { useAdmin } from '@/hooks/useAdmin';
import { useConfirm, useToast } from '@/components/ui/feedback';
import { ShieldAlert } from 'lucide-react';
import type { Exercise, MuscleTarget, Routine, RoutineDay, RoutineExercise } from '@/types/domain';

// A day as the editor holds it: both lists always exist, so they can be edited in place.
type EditableDay = RoutineDay & { exercises: RoutineExercise[]; targets: MuscleTarget[] };

function SearchableExerciseSelect({
  value,
  onChange,
  exercises,
  musclesMap
}: {
  value: string;
  onChange: (val: string) => void;
  exercises: Exercise[];
  musclesMap: Record<string, string>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = exercises.filter(ex => {
    const q = search.toLowerCase();
    const nameMatch = ex.name ? ex.name.toLowerCase().includes(q) : false;
    const muscleMatch = (musclesMap[ex.muscle] || ex.muscle || '').toLowerCase().includes(q);
    const equipMatch = (ex.equipment || '').toLowerCase().includes(q);
    return nameMatch || muscleMatch || equipMatch;
  });

  const selectedExercise = exercises.find(e => e.name === value);

  return (
    <div className="relative flex-1 min-w-[240px]" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-zinc-950 border border-slate-700 hover:border-success rounded-xl px-3 py-2 text-xs text-white flex items-center justify-between gap-2 text-left transition-colors shadow-sm"
      >
        <span className="truncate font-bold text-success">
          {value ? `${value} (${musclesMap[selectedExercise?.muscle || ''] || selectedExercise?.muscle || 'Thư viện'})` : '🔍 -- Tìm & Chọn bài tập --'}
        </span>
        <span className="text-slate-400 text-xs">▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-inset border border-primary/50 rounded-2xl p-2.5 shadow-2xl z-[999] space-y-2 animate-in fade-in duration-150">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-xs">🔍</span>
            <input
              type="text"
              autoFocus
              placeholder="Gõ để tìm tên bài tập, dụng cụ, nhóm cơ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-inset border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="max-h-52 overflow-y-auto custom-scrollbar space-y-1">
            {filtered.length > 0 ? (
              filtered.map(ex => (
                <div
                  key={ex._id || ex.id || ex.name}
                  onClick={() => {
                    onChange(ex.name);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`p-2 rounded-xl text-xs cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                    ex.name === value 
                      ? 'bg-success-soft/80 text-success border border-success/40 font-bold' 
                      : 'hover:bg-surface-elevated text-slate-200'
                  }`}
                >
                  <span className="font-medium truncate">{ex.name}</span>
                  <span className="text-xs text-primary bg-primary-soft/60 px-2 py-0.5 rounded-full border border-primary/30 shrink-0">
                    {musclesMap[ex.muscle] || ex.muscle}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-slate-500">
                Không tìm thấy bài tập nào chứa từ khóa &quot;{search}&quot;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickAddExerciseBar({
  onSelect,
  exercises,
  musclesMap
}: {
  onSelect: (exName: string) => void;
  exercises: Exercise[];
  musclesMap: Record<string, string>;
}) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = exercises.filter(ex => {
    if (!search.trim()) return false;
    const q = search.toLowerCase();
    const nameMatch = ex.name ? ex.name.toLowerCase().includes(q) : false;
    const muscleMatch = (musclesMap[ex.muscle] || ex.muscle || '').toLowerCase().includes(q);
    const equipMatch = (ex.equipment || '').toLowerCase().includes(q);
    return nameMatch || muscleMatch || equipMatch;
  });

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary text-xs">🔍</span>
        <input
          type="text"
          placeholder="🔍 Tìm nhanh bài tập để thêm (ví dụ: Squat, Bench, Cable, Dumbbell...)..."
          value={search}
          onFocus={() => setIsOpen(true)}
          onChange={e => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          className="w-full pl-9 pr-32 py-2.5 bg-inset border border-primary/50 focus:border-primary rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none shadow-lg transition-all"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute inset-y-0 right-28 flex items-center pr-2 text-slate-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute inset-y-1.5 right-1.5 px-3 bg-primary hover:bg-primary text-slate-950 font-black text-xs rounded-lg transition-colors flex items-center gap-1 shadow-md"
        >
          <span>📚</span> Xem Thư Viện
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-inset border border-primary/60 rounded-2xl p-3 shadow-2xl z-[999] space-y-2 animate-in fade-in duration-150 max-h-64 overflow-y-auto custom-scrollbar">
          {!search.trim() ? (
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 px-2 py-1 uppercase tracking-wider flex justify-between items-center">
                <span>Tất cả bài tập trong Thư viện ({exercises.length}):</span>
                <span className="text-xs text-primary">Bấm để thêm bài vào ngày tập</span>
              </p>
              {exercises.map(ex => (
                <div
                  key={ex._id || ex.id || ex.name}
                  onClick={() => {
                    onSelect(ex.name);
                    setSearch('');
                    setIsOpen(false);
                  }}
                  className="p-2 rounded-xl text-xs hover:bg-surface-elevated text-slate-200 cursor-pointer flex items-center justify-between gap-2 transition-colors group"
                >
                  <span className="font-medium group-hover:text-success transition-colors">{ex.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-primary bg-primary-soft/60 px-2 py-0.5 rounded-full border border-primary/30">
                      {musclesMap[ex.muscle] || ex.muscle}
                    </span>
                    <span className="text-xs text-success bg-success-soft px-2.5 py-0.5 rounded-lg border border-success/40 font-bold group-hover:scale-105 transition-transform">
                      + Thêm
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs font-bold text-success px-2 py-1 uppercase tracking-wider flex justify-between items-center">
                <span>Kết quả tìm kiếm ({filtered.length}):</span>
                <span className="text-xs text-primary">Bấm để thêm bài vào ngày tập</span>
              </p>
              {filtered.map(ex => (
                <div
                  key={ex._id || ex.id || ex.name}
                  onClick={() => {
                    onSelect(ex.name);
                    setSearch('');
                    setIsOpen(false);
                  }}
                  className="p-2 rounded-xl text-xs hover:bg-surface-elevated text-slate-200 cursor-pointer flex items-center justify-between gap-2 transition-colors group"
                >
                  <span className="font-medium group-hover:text-success transition-colors">{ex.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-primary bg-primary-soft/60 px-2 py-0.5 rounded-full border border-primary/30">
                      {musclesMap[ex.muscle] || ex.muscle}
                    </span>
                    <span className="text-xs text-success bg-success-soft px-2.5 py-0.5 rounded-lg border border-success/40 font-bold group-hover:scale-105 transition-transform">
                      + Thêm
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-400">
              Không tìm thấy bài tập nào khớp từ khóa &quot;{search}&quot;.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RoutineManagement() {
  const confirm = useConfirm();
  const toast = useToast();
  const router = useRouter();
  const { isAdmin, checking, authError } = useAdmin();
  const { routines: routineData, isLoading: routinesLoading, mutate: mutateRoutines } = useRoutines(isAdmin);
  const { exercises: exerciseData } = useExercises(isAdmin); // for the dynamic muscle categories
  const routines: Routine[] = Array.isArray(routineData) ? routineData : [];
  const exercises: Exercise[] = Array.isArray(exerciseData) ? exerciseData : [];
  const loading = checking || (isAdmin && routinesLoading);

  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [formData, setFormData] = useState<{ id: string; name: string; schedule: EditableDay[] }>({
    id: '',
    name: '',
    schedule: []
  });

  const musclesMap: Record<string, string> = {
    'chest': 'Ngực (Chest)',
    'upper-back': 'Lưng trên (Upper Back)',
    'front-deltoids': 'Vai trước (Front Delts)',
    'back-deltoids': 'Vai sau (Rear Delts)',
    'biceps': 'Tay trước (Biceps)',
    'triceps': 'Tay sau (Triceps)',
    'forearm': 'Cẳng tay (Forearms)',
    'quadriceps': 'Đùi trước (Quads)',
    'hamstring': 'Đùi sau (Hamstrings)',
    'adductor': 'Cơ khép (Adductors)',
    'calves': 'Bắp chân (Calves)',
    'gluteal': 'Mông (Glutes)',
    'abs': 'Bụng (Abs)',
    'obliques': 'Cơ liên sườn (Obliques)',
    'trapezius': 'Cầu vai (Traps)',
    'lower-back': 'Lưng dưới (Lower Back)'
  };

  const DAY_ORDER: Record<string, number> = {
    'Thứ 2': 1,
    'Thứ 3': 2,
    'Thứ 4': 3,
    'Thứ 5': 4,
    'Thứ 6': 5,
    'Thứ 7': 6,
    'Chủ nhật': 7,
  };

  // Trích xuất danh sách Category (Muscle Group) duy nhất từ Database

  const handleOpenAdd = () => {
    setFormData({
      id: '',
      name: '',
      schedule: []
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (routine: Routine) => {
    setFormData({
      id: routine.id,
      name: routine.name,
      schedule: (routine.schedule || []).map(d => ({ ...d, exercises: d.exercises ?? [], targets: d.targets ?? [] }))
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ message: 'Bạn có chắc chắn muốn xóa lịch tập này?', tone: 'danger' }))) return;
    try {
      const res = await apiFetch(`/api/routines/${id}`, { method: 'DELETE' });
      if (res.ok) {
        mutateRoutines();
      } else {
        const error = await res.json();
        toast.error(error.message || 'Lỗi khi xóa lịch tập');
      }
    } catch (err) {
      console.error('Failed to delete routine', err);
    }
  };

  const deriveTargetsFromExercises = (dayExercises: RoutineExercise[], catalogExercises: Exercise[]) => {
    if (!dayExercises || dayExercises.length === 0) return [];

    const counts: Record<string, number> = {};

    dayExercises.forEach(exItem => {
      let muscle = exItem.muscle;
      if (!muscle) {
        const found = catalogExercises.find(c => c.name === exItem.exerciseName);
        if (found) muscle = found.muscle;
      }
      muscle = muscle ? muscle.toLowerCase() : 'chest';
      counts[muscle] = (counts[muscle] || 0) + 1;
    });

    return Object.entries(counts).map(([muscleId, count]) => ({
      id: muscleId,
      label: musclesMap[muscleId] || muscleId,
      count
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = isEditing 
        ? `/api/routines/${formData.id}`
        : '/api/routines';
      
      const method = isEditing ? 'PUT' : 'POST';

      const preparedSchedule = formData.schedule.map(dayObj => {
        const autoTargets = deriveTargetsFromExercises(dayObj.exercises || [], exercises);
        return {
          ...dayObj,
          targets: autoTargets
        };
      });

      const sortedSchedule = [...preparedSchedule].sort((a, b) => {
        const orderA = DAY_ORDER[a.day] || 99;
        const orderB = DAY_ORDER[b.day] || 99;
        return orderA - orderB;
      });

      const payload = { ...formData, schedule: sortedSchedule };

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsModalOpen(false);
        mutateRoutines();
      } else {
        const error = await res.json();
        toast.error(error.message || 'Lỗi khi lưu lịch tập');
      }
    } catch (err) {
      console.error('Failed to save routine', err);
    } finally {
      setSaving(false);
    }
  };

  // Builder Methods
  const addDay = () => {
    setFormData({
      ...formData,
      schedule: [
        ...formData.schedule,
        { day: '', name: '', targets: [], exercises: [] }
      ]
    });
  };

  const removeDay = (dayIndex: number) => {
    const newSchedule = [...formData.schedule];
    newSchedule.splice(dayIndex, 1);
    setFormData({ ...formData, schedule: newSchedule });
  };

  const updateDay = (dayIndex: number, field: 'day' | 'name', value: string) => {
    const newSchedule = [...formData.schedule];
    newSchedule[dayIndex] = { ...newSchedule[dayIndex], [field]: value };
    setFormData({ ...formData, schedule: newSchedule });
  };

  const addExerciseToDay = (dayIndex: number, specifiedExName?: string) => {
    const newSchedule = [...formData.schedule];
    if (!newSchedule[dayIndex].exercises) {
      newSchedule[dayIndex].exercises = [];
    }
    let selectedName = specifiedExName;
    let foundEx = specifiedExName ? exercises.find(e => e.name === specifiedExName) : null;
    
    if (!selectedName && exercises.length > 0) {
      selectedName = exercises[0].name;
      foundEx = exercises[0];
    }

    newSchedule[dayIndex].exercises.push({
      exerciseId: foundEx ? String(foundEx._id || '') : '',
      exerciseName: selectedName || '',
      muscle: foundEx ? foundEx.muscle : 'chest',
      sets: 3,
      repsRange: '10',
      rir: '1',
      restTimeSeconds: 180
    });
    setFormData({ ...formData, schedule: newSchedule });
  };

  const removeExerciseFromDay = (dayIndex: number, exIndex: number) => {
    const newSchedule = [...formData.schedule];
    newSchedule[dayIndex].exercises.splice(exIndex, 1);
    setFormData({ ...formData, schedule: newSchedule });
  };

  const updateExerciseInDay = (dayIndex: number, exIndex: number, field: keyof RoutineExercise, value: string | number | boolean) => {
    const newSchedule = [...formData.schedule];
    if (field === 'exerciseName') {
      const name = String(value);
      const foundEx = exercises.find(e => e.name === name);
      newSchedule[dayIndex].exercises[exIndex].exerciseName = name;
      newSchedule[dayIndex].exercises[exIndex].exerciseId = foundEx ? String(foundEx._id || '') : '';
      if (foundEx) {
        newSchedule[dayIndex].exercises[exIndex].muscle = foundEx.muscle;
      }
    } else {
      newSchedule[dayIndex].exercises[exIndex] = { ...newSchedule[dayIndex].exercises[exIndex], [field]: value };
    }
    setFormData({ ...formData, schedule: newSchedule });
  };

  const filteredRoutines = routines.filter(r => {
    const term = searchTerm.toLowerCase();
    return r.name?.toLowerCase().includes(term) || r.id?.toLowerCase().includes(term);
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
    <div className="max-w-7xl mx-auto h-full flex flex-col relative">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Quản lý Lịch tập (Routines)</h1>
        <p className="text-zinc-400 mt-2">Tạo và chỉnh sửa các lịch tập mẫu (Templates) để cung cấp cho người dùng hệ thống.</p>
      </div>

      <div className="bg-card/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl flex flex-col flex-1 min-h-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-xl font-bold text-white">Danh sách Lịch tập ({filteredRoutines.length})</h2>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Tìm kiếm mã hoặc tên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-inset border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors w-full sm:w-[250px]"
            />
            <button 
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-primary text-slate-950 font-extrabold rounded-xl hover:bg-primary transition-colors whitespace-nowrap text-sm shadow-md shadow-primary/20"
            >
              + Thêm Mới
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex-1 flex justify-center items-center p-8"><div className="w-8 h-8 border-4 border-destructive border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar pr-2">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-zinc-900 z-10">
                <tr className="border-b border-white/10 text-zinc-400 text-sm">
                  <th className="p-4 font-medium">Mã (ID)</th>
                  <th className="p-4 font-medium">Tên Lịch tập</th>
                  <th className="p-4 font-medium">Số ngày tập</th>
                  <th className="p-4 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoutines.length > 0 ? (
                  filteredRoutines.map((routine) => (
                    <tr key={routine.id} className="border-b border-slate-800/80 hover:bg-surface-elevated/50 transition-colors group">
                      <td className="p-4">
                        <span className="bg-primary-soft text-primary border border-primary/30 px-3 py-1 rounded-full text-xs font-mono font-bold">
                          {routine.id}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-white">{routine.name}</p>
                      </td>
                      <td className="p-4 text-slate-400 text-sm">
                        {routine.schedule?.length || 0} ngày
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            onClick={() => handleOpenEdit(routine)} 
                            className="text-primary hover:text-primary text-sm font-bold"
                          >
                            Sửa
                          </button>
                          <button 
                            onClick={() => handleDelete(routine.id)} 
                            className="text-destructive hover:text-destructive text-sm font-medium"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-zinc-500">
                      Không tìm thấy lịch tập mẫu nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Routine Modal with Visual Builder */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !saving && setIsModalOpen(false)}></div>
          <div className="relative bg-card border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            
            <div className="flex justify-between items-start mb-6 border-b border-slate-800 pb-4 shrink-0">
              <div>
                <h3 className="text-2xl font-bold text-white">{isEditing ? 'Sửa Lịch tập' : 'Thêm Lịch tập Mẫu'}</h3>
                <p className="text-slate-400 text-sm mt-1">Dễ dàng xây dựng cấu trúc lịch tập với Visual Builder.</p>
              </div>
              <button disabled={saving} onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors text-xl disabled:opacity-50">&times;</button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-6">
              <form id="routine-form" onSubmit={handleSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-950 p-6 rounded-2xl border border-white/5">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Mã Lịch tập (ID)</label>
                    <input 
                      type="text" 
                      required
                      disabled={isEditing}
                      value={formData.id}
                      onChange={(e) => setFormData({...formData, id: e.target.value})}
                      placeholder="VD: ppl_6_days"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-destructive disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Tên hiển thị</label>
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="VD: Push Pull Legs 6 Ngày"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-destructive"
                    />
                  </div>
                </div>

                {/* Visual Builder */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-bold text-white">Cấu trúc Ngày tập</h4>
                    <button 
                      type="button" 
                      onClick={addDay}
                      className="text-xs px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 font-bold rounded-lg transition-colors"
                    >
                      + Thêm Ngày Mới
                    </button>
                  </div>

                  {formData.schedule.map((dayObj, dayIndex) => (
                    <div key={dayIndex} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 md:p-6 space-y-4">
                      
                      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div className="flex gap-4 flex-1">
                          <select 
                            value={dayObj.day}
                            onChange={(e) => updateDay(dayIndex, 'day', e.target.value)}
                            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-destructive w-1/3"
                            required
                          >
                            <option value="" disabled>-- Chọn Thứ --</option>
                            <option value="Thứ 2">Thứ 2</option>
                            <option value="Thứ 3">Thứ 3</option>
                            <option value="Thứ 4">Thứ 4</option>
                            <option value="Thứ 5">Thứ 5</option>
                            <option value="Thứ 6">Thứ 6</option>
                            <option value="Thứ 7">Thứ 7</option>
                            <option value="Chủ nhật">Chủ nhật</option>
                            {dayObj.day && !['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'].includes(dayObj.day) && (
                              <option value={dayObj.day}>{dayObj.day}</option>
                            )}
                          </select>
                          <input 
                            type="text"
                            placeholder="Tên buổi tập (VD: Push Day)"
                            value={dayObj.name}
                            onChange={(e) => updateDay(dayIndex, 'name', e.target.value)}
                            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-destructive flex-1"
                            required
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeDay(dayIndex)}
                          className="text-zinc-500 hover:text-destructive text-sm font-medium transition-colors whitespace-nowrap"
                        >
                          Xóa Ngày
                        </button>
                      </div>

                      {/* Auto-Calculated Target Muscle Groups */}
                      <div className="pl-4 border-l-2 border-primary/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                            <span>🎯</span> Target Nhóm Cơ (Tự Động Tính Theo Bài Tập)
                          </p>
                          <span className="text-xs text-primary font-bold bg-primary-soft/60 border border-primary/30 px-2 py-0.5 rounded-md">
                            ⚡ Tự động tổng hợp
                          </span>
                        </div>

                        {(() => {
                          const autoTargets = deriveTargetsFromExercises(dayObj.exercises || [], exercises);
                          if (autoTargets.length > 0) {
                            return (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {autoTargets.map(tgt => (
                                  <div key={tgt.id} className="px-3 py-1.5 bg-inset border border-primary/30 rounded-xl text-xs flex items-center gap-2 shadow-sm">
                                    <span className="text-white font-extrabold">{tgt.label}</span>
                                    <span className="px-2 py-0.5 bg-primary-soft text-primary border border-primary/40 rounded-full font-black text-xs">
                                      {tgt.count} bài
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return (
                            <p className="text-xs text-slate-500 italic py-1">
                              Chưa có bài tập nào. Hãy thêm bài tập ở bên dưới để hệ thống tự động tính Target Nhóm Cơ!
                            </p>
                          );
                        })()}
                      </div>

                      {/* Prescribed Exercises from Catalog */}
                      <div className="pl-4 border-l-2 border-success/30 space-y-3 pt-2">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <p className="text-xs font-bold text-success uppercase tracking-wider">Danh Sách Bài Tập Mẫu (Kèm chỉ định từ Thư viện)</p>
                          <span className="text-xs text-slate-400">Đã đồng bộ với Thư viện bài tập</span>
                        </div>

                        {/* Quick Search & Add Exercise Input Bar */}
                        <div className="py-1">
                          <QuickAddExerciseBar
                            onSelect={(selectedExName) => addExerciseToDay(dayIndex, selectedExName)}
                            exercises={exercises}
                            musclesMap={musclesMap}
                          />
                        </div>

                        {dayObj.exercises?.map((exObj, exIndex) => (
                          <div key={exIndex} className="p-3 bg-zinc-900 rounded-xl border border-white/5 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <SearchableExerciseSelect
                                value={exObj.exerciseName}
                                onChange={(newVal) => updateExerciseInDay(dayIndex, exIndex, 'exerciseName', newVal)}
                                exercises={exercises}
                                musclesMap={musclesMap}
                              />

                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-slate-400">Hiệp:</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={exObj.sets || 3}
                                  onChange={(e) => updateExerciseInDay(dayIndex, exIndex, 'sets', parseInt(e.target.value) || 1)}
                                  className="w-12 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-center text-white font-bold"
                                />

                                <span className="text-slate-400">Reps:</span>
                                <input
                                  type="text"
                                  value={exObj.repsRange || '10'}
                                  onChange={(e) => updateExerciseInDay(dayIndex, exIndex, 'repsRange', e.target.value)}
                                  className="w-16 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-center text-white font-bold"
                                />

                                <span className="text-warning font-semibold">RIR:</span>
                                <input
                                  type="text"
                                  value={exObj.rir || '1'}
                                  onChange={(e) => updateExerciseInDay(dayIndex, exIndex, 'rir', e.target.value)}
                                  className="w-12 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-center text-white font-bold"
                                />

                                <button
                                  type="button"
                                  onClick={() => removeExerciseFromDay(dayIndex, exIndex)}
                                  className="text-destructive hover:text-destructive px-2 py-1 text-xs font-bold"
                                >
                                  Xóa
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => addExerciseToDay(dayIndex)}
                          className="text-xs px-3 py-1.5 border border-dashed border-success/40 text-success hover:border-success hover:bg-success/10 rounded-lg transition-colors w-full font-bold"
                        >
                          + Thêm Bài Tập Chỉ Định Từ Thư Viện
                        </button>
                      </div>

                    </div>
                  ))}

                  {formData.schedule.length === 0 && (
                    <div className="text-center p-8 border border-dashed border-zinc-800 rounded-2xl text-zinc-500">
                      Chưa có ngày tập nào. Hãy bấm &quot;+ Thêm Ngày Mới&quot; để bắt đầu.
                    </div>
                  )}

                </div>

              </form>
            </div>

            <div className="flex gap-3 justify-end items-center pt-4 border-t border-slate-800 shrink-0">
              <button 
                type="button"
                disabled={saving}
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 bg-surface-elevated hover:bg-slate-800 text-slate-300 font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button 
                type="submit"
                form="routine-form"
                disabled={saving}
                className="px-6 py-2.5 bg-primary hover:bg-primary text-slate-950 font-extrabold rounded-xl transition-colors disabled:opacity-50 shadow-md shadow-primary/20"
              >
                {saving ? 'Đang lưu...' : (isEditing ? 'Cập nhật' : 'Lưu Lịch Tập')}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
