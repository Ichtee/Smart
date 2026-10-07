'use client';
import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '@/utils/api';

interface FoodItem {
  _id: string;
  name: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string;
  image?: string;
}

export default function AdminFoodsPage() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Tất cả');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formServingSize, setFormServingSize] = useState('1 phần');
  const [formCalories, setFormCalories] = useState('');
  const [formProtein, setFormProtein] = useState('0');
  const [formCarbs, setFormCarbs] = useState('0');
  const [formFat, setFormFat] = useState('0');
  const [formCategory, setFormCategory] = useState('Tất cả');
  const [formImage, setFormImage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchFoods = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/foods');
      if (res.ok) {
        const data = await res.json();
        setFoods(data);
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách món ăn:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFoods();
  }, []);

  const openCreateModal = () => {
    setEditingFood(null);
    setFormName('');
    setFormServingSize('1 phần');
    setFormCalories('');
    setFormProtein('0');
    setFormCarbs('0');
    setFormFat('0');
    setFormCategory('Tất cả');
    setFormImage('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (food: FoodItem) => {
    setEditingFood(food);
    setFormName(food.name);
    setFormServingSize(food.servingSize || '1 phần');
    setFormCalories(food.calories.toString());
    setFormProtein((food.protein || 0).toString());
    setFormCarbs((food.carbs || 0).toString());
    setFormFat((food.fat || 0).toString());
    setFormCategory(food.category || 'Tất cả');
    setFormImage(food.image || '');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSaveFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCalories) {
      setErrorMsg('Tên món ăn và Lượng Calo là bắt buộc.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        name: formName.trim(),
        servingSize: formServingSize.trim() || '1 phần',
        calories: Number(formCalories),
        protein: Number(formProtein) || 0,
        carbs: Number(formCarbs) || 0,
        fat: Number(formFat) || 0,
        category: formCategory,
        image: formImage.trim()
      };

      const url = editingFood
        ? `/api/foods/${editingFood._id}`
        : '/api/foods';
      const method = editingFood ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchFoods();
      } else {
        const data = await res.json();
        setErrorMsg(data.message || 'Thao tác thất bại');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFood = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa món ăn "${name}" khỏi cơ sở dữ liệu?`)) return;

    try {
      const res = await apiFetch(`/api/foods/${id}`, { method: 'DELETE' });

      if (res.ok) {
        fetchFoods();
      } else {
        alert('Xóa món ăn thất bại');
      }
    } catch (err) {
      alert('Lỗi kết nối khi xóa món ăn');
    }
  };

  const filteredFoods = useMemo(() => {
    return foods.filter(food => {
      const matchesSearch = food.name.toLowerCase().includes(search.toLowerCase().trim());
      const matchesCat = selectedCategoryFilter === 'Tất cả' || food.category === selectedCategoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [foods, search, selectedCategoryFilter]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
            <span>🥗</span> Quản Lý Thư Viện Món Ăn (Food Database)
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            Thêm, sửa, xóa các món ăn chuẩn để người dùng tra cứu và ghi nhận vào nhật ký.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-[#00E5FF] hover:bg-cyan-300 text-slate-950 text-xs font-extrabold rounded-xl shadow-lg shadow-[#00E5FF]/20 transition active:scale-95 flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <span>➕</span> Thêm món ăn mới
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 relative">
          <input
            type="text"
            placeholder="🔍 Tìm kiếm món ăn theo tên (VD: Phở, Ức gà, Cơm)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#131B2E] border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00E5FF]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-3 text-slate-500 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <select
          value={selectedCategoryFilter}
          onChange={(e) => setSelectedCategoryFilter(e.target.value)}
          className="bg-[#131B2E] border border-slate-800 rounded-2xl px-4 py-3 text-xs text-[#00E5FF] font-bold focus:outline-none focus:border-[#00E5FF] cursor-pointer"
        >
          <option value="Tất cả">📁 Tất cả phân loại</option>
          <option value="Bữa Sáng">🍳 Bữa Sáng</option>
          <option value="Bữa Trưa">🍱 Bữa Trưa</option>
          <option value="Bữa Tối">🥩 Bữa Tối</option>
          <option value="Ăn Vặt">🍎 Ăn Vặt</option>
        </select>
      </div>

      {/* Food Table */}
      <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-[#00E5FF] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredFoods.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0B101D] text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Món ăn</th>
                  <th className="p-4">Khẩu phần chuẩn</th>
                  <th className="p-4">Calo</th>
                  <th className="p-4">Dinh dưỡng (P / C / F)</th>
                  <th className="p-4">Phân loại</th>
                  <th className="p-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredFoods.map(food => (
                  <tr key={food._id} className="hover:bg-[#18233C]/50 transition-colors">
                    <td className="p-4 font-bold text-white flex items-center gap-3">
                      {food.image ? (
                        <img src={food.image} alt={food.name} className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-[#0B101D] border border-slate-800 flex items-center justify-center text-lg shrink-0">
                          🥗
                        </div>
                      )}
                      <span>{food.name}</span>
                    </td>
                    <td className="p-4 text-slate-300 font-medium">{food.servingSize}</td>
                    <td className="p-4 font-black text-[#00E5FF]">{food.calories} kcal</td>
                    <td className="p-4 text-slate-400 font-semibold">
                      <span className="text-cyan-400">{food.protein || 0}g Đạm</span> • <span className="text-amber-400">{food.carbs || 0}g Đường/Cap</span> • <span className="text-rose-400">{food.fat || 0}g Béo</span>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-[#0B101D] border border-slate-800 rounded-lg text-[10px] font-extrabold text-slate-300">
                        {food.category}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(food)}
                        className="px-3 py-1.5 bg-[#18233C] hover:bg-slate-800 text-[#00E5FF] rounded-xl font-extrabold border border-slate-700 transition"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDeleteFood(food._id, food.name)}
                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl font-extrabold border border-rose-500/30 transition"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500 text-xs italic">
            Không tìm thấy món ăn nào khớp với từ khóa tìm kiếm.
          </div>
        )}
      </div>

      {/* Add / Edit Food Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-[#131B2E] border border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl z-10 text-white space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <span>{editingFood ? '✏️' : '➕'}</span>
                {editingFood ? 'Chỉnh sửa món ăn' : 'Thêm món ăn mới vào Cơ sở dữ liệu'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white text-xl font-bold">&times;</button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveFood} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tên món ăn *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="VD: Phở bò, Ức gà luộc, Cơm tấm..."
                  className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Khẩu phần chuẩn</label>
                  <input
                    type="text"
                    value={formServingSize}
                    onChange={(e) => setFormServingSize(e.target.value)}
                    placeholder="VD: 1 phần, 100g, 1 tô..."
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Calo (kcal) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formCalories}
                    onChange={(e) => setFormCalories(e.target.value)}
                    placeholder="VD: 450"
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-xs text-[#00E5FF] font-black focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
              </div>

              {/* Macros (Optional) */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Đạm (Protein g)</label>
                  <input
                    type="number"
                    min="0"
                    value={formProtein}
                    onChange={(e) => setFormProtein(e.target.value)}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-2.5 text-xs text-cyan-400 font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    min="0"
                    value={formCarbs}
                    onChange={(e) => setFormCarbs(e.target.value)}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-2.5 text-xs text-amber-400 font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Chất béo (Fat g)</label>
                  <input
                    type="number"
                    min="0"
                    value={formFat}
                    onChange={(e) => setFormFat(e.target.value)}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-2.5 text-xs text-rose-400 font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Phân loại</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                  >
                    <option value="Tất cả">Tất cả</option>
                    <option value="Bữa Sáng">Bữa Sáng</option>
                    <option value="Bữa Trưa">Bữa Trưa</option>
                    <option value="Bữa Tối">Bữa Tối</option>
                    <option value="Ăn Vặt">Ăn Vặt</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">URL Hình ảnh (Tùy chọn)</label>
                  <input
                    type="url"
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-[#0B101D] border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-[#18233C] text-slate-300 font-bold rounded-xl hover:bg-slate-800 text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-[#00E5FF] text-slate-950 font-black rounded-xl hover:bg-cyan-300 text-xs shadow-lg shadow-[#00E5FF]/20 disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu món ăn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
