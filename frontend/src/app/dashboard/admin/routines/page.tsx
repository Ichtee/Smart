'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/utils/api';

export default function RoutineManagement() {
  const router = useRouter();
  const [routines, setRoutines] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [token, setToken] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    schedule: [] as any[]
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

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setAuthError('Bạn chưa đăng nhập.');
        setLoading(false);
        return;
      }
      setToken(storedToken);

      try {
        const res = await fetch(`${API_URL}/api/users/profile`, {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        });
        const user = await res.json();
        
        if (res.ok && user.role === 'admin') {
          fetchRoutines();
          fetchExercises(); // Pre-fetch exercises to extract dynamic categories
        } else {
          setAuthError('Từ chối truy cập: Bạn không có quyền Quản trị viên.');
          setLoading(false);
        }
      } catch (err) {
        setAuthError('Lỗi xác thực.');
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const fetchRoutines = async () => {
    try {
      const res = await fetch(`${API_URL}/api/routines`);
      if (!res.ok) throw new Error(`Lỗi Server: ${res.status}`);
      const data = await res.json();
      setRoutines(data);
    } catch (err) {
      console.error('Failed to fetch routines', err);
    } finally {
      setLoading(false);
    }
  };



  const fetchExercises = async () => {
    try {
      const res = await fetch(`${API_URL}/api/exercises`);
      if (!res.ok) throw new Error(`Lỗi Server: ${res.status}`);
      const data = await res.json();
      setExercises(data);
    } catch (err) {
      console.error('Failed to fetch exercises', err);
    }
  };

  // Trích xuất danh sách Category (Muscle Group) duy nhất từ Database
  const dynamicCategories = Array.from(new Set(exercises.map(ex => ex.muscle))).filter(Boolean);

  const handleOpenAdd = () => {
    setFormData({
      id: '',
      name: '',
      schedule: []
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (routine: any) => {
    setFormData({
      id: routine.id,
      name: routine.name,
      schedule: routine.schedule || []
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa lịch tập này?')) return;
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/routines/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setRoutines(routines.filter(r => r.id !== id));
      } else {
        const error = await res.json();
        alert(error.message || 'Lỗi khi xóa lịch tập');
      }
    } catch (err) {
      console.error('Failed to delete routine', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const url = isEditing 
        ? `${API_URL}/api/routines/${formData.id}`
        : `${API_URL}/api/routines`;
      
      const method = isEditing ? 'PUT' : 'POST';

      const sortedSchedule = [...formData.schedule].sort((a, b) => {
        const orderA = DAY_ORDER[a.day] || 99;
        const orderB = DAY_ORDER[b.day] || 99;
        return orderA - orderB;
      });

      const payload = { ...formData, schedule: sortedSchedule };

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchRoutines();
      } else {
        const error = await res.json();
        alert(error.message || 'Lỗi khi lưu lịch tập');
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
        { day: '', name: '', targets: [] }
      ]
    });
  };

  const removeDay = (dayIndex: number) => {
    const newSchedule = [...formData.schedule];
    newSchedule.splice(dayIndex, 1);
    setFormData({ ...formData, schedule: newSchedule });
  };

  const updateDay = (dayIndex: number, field: string, value: string) => {
    const newSchedule = [...formData.schedule];
    newSchedule[dayIndex][field] = value;
    setFormData({ ...formData, schedule: newSchedule });
  };

  const addTarget = (dayIndex: number) => {
    const newSchedule = [...formData.schedule];
    newSchedule[dayIndex].targets.push({ id: '', label: '', count: 3 });
    setFormData({ ...formData, schedule: newSchedule });
  };

  const removeTarget = (dayIndex: number, targetIndex: number) => {
    const newSchedule = [...formData.schedule];
    newSchedule[dayIndex].targets.splice(targetIndex, 1);
    setFormData({ ...formData, schedule: newSchedule });
  };

  const updateTarget = (dayIndex: number, targetIndex: number, muscleId: string) => {
    const newSchedule = [...formData.schedule];
    newSchedule[dayIndex].targets[targetIndex] = {
      ...newSchedule[dayIndex].targets[targetIndex],
      id: muscleId,
      label: musclesMap[muscleId] || muscleId
    };
    setFormData({ ...formData, schedule: newSchedule });
  };

  const updateTargetCount = (dayIndex: number, targetIndex: number, count: number) => {
    const newSchedule = [...formData.schedule];
    newSchedule[dayIndex].targets[targetIndex].count = count;
    setFormData({ ...formData, schedule: newSchedule });
  };

  const addExerciseToDay = (dayIndex: number) => {
    const newSchedule = [...formData.schedule];
    if (!newSchedule[dayIndex].exercises) {
      newSchedule[dayIndex].exercises = [];
    }
    const defaultEx = exercises[0] ? exercises[0].name : '';
    const defaultMuscle = exercises[0] ? exercises[0].muscle : 'chest';
    newSchedule[dayIndex].exercises.push({
      exerciseName: defaultEx,
      muscle: defaultMuscle,
      sets: 3,
      repsRange: '8-12',
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

  const updateExerciseInDay = (dayIndex: number, exIndex: number, field: string, value: any) => {
    const newSchedule = [...formData.schedule];
    if (field === 'exerciseName') {
      const foundEx = exercises.find(e => e.name === value);
      newSchedule[dayIndex].exercises[exIndex].exerciseName = value;
      if (foundEx) {
        newSchedule[dayIndex].exercises[exIndex].muscle = foundEx.muscle;
      }
    } else {
      newSchedule[dayIndex].exercises[exIndex][field] = value;
    }
    setFormData({ ...formData, schedule: newSchedule });
  };

  const filteredRoutines = routines.filter(r => {
    const term = searchTerm.toLowerCase();
    return r.name?.toLowerCase().includes(term) || r.id?.toLowerCase().includes(term);
  });

  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-6xl mb-4">⛔</div>
        <h1 className="text-2xl font-bold text-rose-500 mb-2">{authError}</h1>
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

      <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl flex flex-col flex-1 min-h-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-xl font-bold text-white">Danh sách Lịch tập ({filteredRoutines.length})</h2>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Tìm kiếm mã hoặc tên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#0B101D] border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#00E5FF] transition-colors w-full sm:w-[250px]"
            />
            <button 
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-[#00E5FF] text-slate-950 font-extrabold rounded-xl hover:bg-cyan-300 transition-colors whitespace-nowrap text-sm shadow-md shadow-[#00E5FF]/20"
            >
              + Thêm Mới
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex-1 flex justify-center items-center p-8"><div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div></div>
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
                    <tr key={routine.id} className="border-b border-slate-800/80 hover:bg-[#18233C]/50 transition-colors group">
                      <td className="p-4">
                        <span className="bg-cyan-950 text-[#00E5FF] border border-cyan-500/30 px-3 py-1 rounded-full text-xs font-mono font-bold">
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
                            className="text-[#00E5FF] hover:text-cyan-300 text-sm font-bold"
                          >
                            Sửa
                          </button>
                          <button 
                            onClick={() => handleDelete(routine.id)} 
                            className="text-rose-400 hover:text-rose-300 text-sm font-medium"
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
          <div className="relative bg-[#131B2E] border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            
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
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 disabled:opacity-50"
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
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500"
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
                      className="text-xs px-3 py-1.5 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 font-bold rounded-lg transition-colors"
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
                            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 w-1/3"
                            required
                          >
                            <option value="" disabled>-- Chọn Thứ / Ngày --</option>
                            <optgroup label="Theo Thứ">
                              <option value="Thứ 2">Thứ 2</option>
                              <option value="Thứ 3">Thứ 3</option>
                              <option value="Thứ 4">Thứ 4</option>
                              <option value="Thứ 5">Thứ 5</option>
                              <option value="Thứ 6">Thứ 6</option>
                              <option value="Thứ 7">Thứ 7</option>
                              <option value="Chủ nhật">Chủ nhật</option>
                            </optgroup>
                            <optgroup label="Theo Ngày / Buổi">
                              <option value="Ngày 1">Ngày 1</option>
                              <option value="Ngày 2">Ngày 2</option>
                              <option value="Ngày 3">Ngày 3</option>
                              <option value="Ngày 4">Ngày 4</option>
                              <option value="Ngày 5">Ngày 5</option>
                              <option value="Ngày 6">Ngày 6</option>
                              <option value="Ngày 7">Ngày 7</option>
                              <option value="Buổi A">Buổi A</option>
                              <option value="Buổi B">Buổi B</option>
                              <option value="Nghỉ">Nghỉ</option>
                            </optgroup>
                            {dayObj.day && (
                              <option value={dayObj.day}>{dayObj.day}</option>
                            )}
                          </select>
                          <input 
                            type="text"
                            placeholder="Tên buổi tập (VD: Push Day)"
                            value={dayObj.name}
                            onChange={(e) => updateDay(dayIndex, 'name', e.target.value)}
                            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 flex-1"
                            required
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeDay(dayIndex)}
                          className="text-zinc-500 hover:text-rose-400 text-sm font-medium transition-colors whitespace-nowrap"
                        >
                          Xóa Ngày
                        </button>
                      </div>

                      {/* Muscle Targets */}
                      <div className="pl-4 border-l-2 border-cyan-500/30 space-y-3">
                        <p className="text-xs font-bold text-[#00E5FF] uppercase tracking-wider">Target Nhóm Cơ (Chỉ tiêu)</p>
                        {dayObj.targets?.map((target: any, targetIndex: number) => (
                          <div key={targetIndex} className="flex gap-3 items-center bg-zinc-900 p-2 rounded-xl border border-white/5">
                            <select 
                              value={target.id}
                              onChange={(e) => updateTarget(dayIndex, targetIndex, e.target.value)}
                              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 flex-1 truncate"
                              required
                            >
                              <option value="" disabled>-- Chọn nhóm cơ --</option>
                              {dynamicCategories.map(cat => (
                                <option key={cat} value={cat}>{musclesMap[cat] || cat}</option>
                              ))}
                              {!dynamicCategories.includes(target.id) && target.id && (
                                <option value={target.id}>{target.label || target.id}</option>
                              )}
                            </select>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-500">Số bài</span>
                              <input 
                                type="number" 
                                min="1"
                                value={target.count}
                                onChange={(e) => updateTargetCount(dayIndex, targetIndex, parseInt(e.target.value) || 1)}
                                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-rose-500 w-16 text-center"
                                required
                              />
                            </div>
                            
                            <button 
                              type="button"
                              onClick={() => removeTarget(dayIndex, targetIndex)}
                              className="text-zinc-600 hover:text-rose-400 p-2"
                              title="Xóa target này"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                        
                        <button 
                          type="button"
                          onClick={() => addTarget(dayIndex)}
                          className="text-xs px-3 py-1.5 border border-dashed border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white rounded-lg transition-colors w-full"
                        >
                          + Thêm Target Nhóm Cơ
                        </button>
                      </div>

                      {/* Prescribed Exercises from Catalog */}
                      <div className="pl-4 border-l-2 border-emerald-500/30 space-y-3 pt-2">
                        <div className="flex justify-between items-center">
                          <p className="text-xs font-bold text-[#00FF87] uppercase tracking-wider">Danh Sách Bài Tập Mẫu (Kèm chỉ định từ Thư viện)</p>
                          <span className="text-[10px] text-slate-400">Đã đồng bộ với Thư viện bài tập</span>
                        </div>

                        {dayObj.exercises?.map((exObj: any, exIndex: number) => (
                          <div key={exIndex} className="p-3 bg-zinc-900 rounded-xl border border-white/5 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <select
                                value={exObj.exerciseName}
                                onChange={(e) => updateExerciseInDay(dayIndex, exIndex, 'exerciseName', e.target.value)}
                                className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00FF87] flex-1 min-w-[200px]"
                              >
                                <option value="" disabled>-- Chọn bài tập từ Thư viện --</option>
                                {exercises.map((ex: any) => (
                                  <option key={ex._id || ex.id || ex.name} value={ex.name}>
                                    {ex.name} ({musclesMap[ex.muscle] || ex.muscle})
                                  </option>
                                ))}
                                {!exercises.some((e: any) => e.name === exObj.exerciseName) && exObj.exerciseName && (
                                  <option value={exObj.exerciseName}>{exObj.exerciseName}</option>
                                )}
                              </select>

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
                                  value={exObj.repsRange || '8-12'}
                                  onChange={(e) => updateExerciseInDay(dayIndex, exIndex, 'repsRange', e.target.value)}
                                  className="w-16 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-center text-white font-bold"
                                />

                                <span className="text-amber-400 font-semibold">RIR:</span>
                                <input
                                  type="text"
                                  value={exObj.rir || '1'}
                                  onChange={(e) => updateExerciseInDay(dayIndex, exIndex, 'rir', e.target.value)}
                                  className="w-12 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-center text-white font-bold"
                                />

                                <button
                                  type="button"
                                  onClick={() => removeExerciseFromDay(dayIndex, exIndex)}
                                  className="text-rose-400 hover:text-rose-300 px-2 py-1 text-xs font-bold"
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
                          className="text-xs px-3 py-1.5 border border-dashed border-emerald-500/40 text-emerald-400 hover:border-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors w-full font-bold"
                        >
                          + Thêm Bài Tập Chỉ Định Từ Thư Viện
                        </button>
                      </div>

                    </div>
                  ))}

                  {formData.schedule.length === 0 && (
                    <div className="text-center p-8 border border-dashed border-zinc-800 rounded-2xl text-zinc-500">
                      Chưa có ngày tập nào. Hãy bấm "+ Thêm Ngày Mới" để bắt đầu.
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
                className="px-6 py-2.5 bg-[#18233C] hover:bg-slate-800 text-slate-300 font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button 
                type="submit"
                form="routine-form"
                disabled={saving}
                className="px-6 py-2.5 bg-[#00E5FF] hover:bg-cyan-300 text-slate-950 font-extrabold rounded-xl transition-colors disabled:opacity-50 shadow-md shadow-[#00E5FF]/20"
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
