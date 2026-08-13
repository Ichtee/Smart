'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminExercises() {
  const router = useRouter();
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [token, setToken] = useState<string | null>(null);
  
  // Search and Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMuscle, setFilterMuscle] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    muscle: 'Chest',
    defaultSets: 3,
    defaultReps: '10-12'
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const muscles = ['chest', 'upper-back', 'front-deltoids', 'back-deltoids', 'biceps', 'triceps', 'forearm', 'quadriceps', 'hamstring', 'adductors', 'calves', 'gluteal', 'abs', 'obliques', 'trapezius', 'lower-back'];

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setAuthError('Bạn chưa đăng nhập. Vui lòng đăng nhập bằng tài khoản Admin.');
        setLoading(false);
        return;
      }
      setToken(storedToken);

      try {
        const res = await fetch('http://localhost:5000/api/users/profile', {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        });
        const user = await res.json();
        
        if (res.ok && user.role === 'admin') {
          fetchExercises();
        } else {
          setAuthError('Từ chối truy cập: Bạn không có quyền Quản trị viên (Admin).');
          setLoading(false);
        }
      } catch (err) {
        setAuthError('Lỗi xác thực.');
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const fetchExercises = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/exercises');
      const data = await res.json();
      setExercises(data);
    } catch (err) {
      console.error('Failed to fetch exercises', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      if (editingId) {
        await fetch(`http://localhost:5000/api/exercises/${editingId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });
      } else {
        await fetch('http://localhost:5000/api/exercises', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });
      }
      setFormData({ name: '', muscle: 'Chest', defaultSets: 3, defaultReps: '10-12' });
      setEditingId(null);
      fetchExercises();
    } catch (err) {
      console.error('Failed to save exercise', err);
    }
  };

  const handleEdit = (ex: any) => {
    setEditingId(ex._id);
    setFormData({
      name: ex.name,
      muscle: ex.muscle,
      defaultSets: ex.defaultSets,
      defaultReps: ex.defaultReps
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bài tập này?')) return;
    if (!token) return;
    try {
      await fetch(`http://localhost:5000/api/exercises/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchExercises();
    } catch (err) {
      console.error('Failed to delete exercise', err);
    }
  };

  const filteredExercises = exercises.filter(ex => {
    const matchName = ex.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchMuscle = filterMuscle === '' || ex.muscle.toLowerCase() === filterMuscle.toLowerCase();
    return matchName && matchMuscle;
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
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Quản lý Bài tập</h1>
        <p className="text-zinc-400 mt-2">Thêm, sửa, xóa dữ liệu bài tập trong thư viện hệ thống.</p>
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Form */}
          <div className="lg:col-span-1 bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl h-fit">
            <h2 className="text-xl font-bold text-white mb-6">{editingId ? 'Sửa bài tập' : 'Thêm bài tập mới'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Tên bài tập</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-rose-500 transition-colors"
                  placeholder="VD: Barbell Bench Press"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Nhóm cơ</label>
                <select 
                  value={formData.muscle}
                  onChange={e => setFormData({...formData, muscle: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-rose-500 transition-colors capitalize"
                >
                  {muscles.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Số Hiệp (Sets)</label>
                  <input 
                    type="number" 
                    required
                    value={formData.defaultSets}
                    onChange={e => setFormData({...formData, defaultSets: Number(e.target.value)})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Số Lần (Reps)</label>
                  <input 
                    type="text" 
                    required
                    value={formData.defaultReps}
                    onChange={e => setFormData({...formData, defaultReps: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-rose-500 transition-colors"
                    placeholder="VD: 10-12"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                <button type="submit" className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 px-4 rounded-xl transition-colors">
                  {editingId ? 'Lưu thay đổi' : 'Thêm bài tập'}
                </button>
                {editingId && (
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setFormData({ name: '', muscle: 'Chest', defaultSets: 3, defaultReps: '10-12' });
                    }}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 px-4 rounded-xl transition-colors"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* List */}
          <div className="lg:col-span-2 bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col h-[700px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <h2 className="text-xl font-bold text-white">Thư viện dữ liệu ({filteredExercises.length})</h2>
              
              {/* Search and Filter */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Tìm kiếm bài tập..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors min-w-[200px]"
                />
                <select
                  value={filterMuscle}
                  onChange={(e) => setFilterMuscle(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors capitalize"
                >
                  <option value="">Tất cả nhóm cơ</option>
                  {muscles.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {loading ? (
              <div className="flex-1 flex justify-center items-center p-8"><div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div></div>
            ) : (
              <div className="flex-1 overflow-auto custom-scrollbar pr-2">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-zinc-900 z-10">
                    <tr className="border-b border-white/10 text-zinc-400 text-sm">
                      <th className="p-4 font-medium">Tên bài tập</th>
                      <th className="p-4 font-medium">Nhóm cơ</th>
                      <th className="p-4 font-medium">Mặc định</th>
                      <th className="p-4 font-medium text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExercises.length > 0 ? (
                      filteredExercises.map((ex) => (
                        <tr key={ex._id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                          <td className="p-4 font-semibold text-white">{ex.name}</td>
                          <td className="p-4">
                            <span className="px-3 py-1 rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300 capitalize">
                              {ex.muscle}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-zinc-400 whitespace-nowrap">
                            {ex.defaultSets} x {ex.defaultReps}
                          </td>
                          <td className="p-4 text-right whitespace-nowrap">
                            <button onClick={() => handleEdit(ex)} className="text-cyan-400 hover:text-cyan-300 mr-4 text-sm font-medium">Sửa</button>
                            <button onClick={() => handleDelete(ex._id)} className="text-rose-400 hover:text-rose-300 text-sm font-medium">Xóa</button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-zinc-500">
                          Không tìm thấy bài tập nào khớp với bộ lọc.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
    </div>
  );
}
