'use client';
import { useState, useMemo } from 'react';
import { apiFetch } from '@/utils/api';
import { useFoods } from '@/hooks/useApi';
import { useConfirm, useToast } from '@/components/ui/feedback';

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
  const confirm = useConfirm();
  const toast = useToast();
  const { foods: foodData, isLoading: loading, mutate: mutateFoods } = useFoods();
  const foods: FoodItem[] = Array.isArray(foodData) ? foodData : [];
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
        mutateFoods();
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
    if (!(await confirm({ message: `Bạn có chắc chắn muốn xóa món ăn "${name}" khỏi cơ sở dữ liệu?`, tone: 'danger' }))) return;

    try {
      const res = await apiFetch(`/api/foods/${id}`, { method: 'DELETE' });

      if (res.ok) {
        mutateFoods();
      } else {
        toast.error('Xóa món ăn thất bại');
      }
    } catch (err) {
      toast.error('Lỗi kết nối khi xóa món ăn');
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
          className="px-4 py-2.5 bg-primary hover:bg-primary text-slate-950 text-xs font-extrabold rounded-xl shadow-lg shadow-primary/20 transition active:scale-95 flex items-center gap-2 self-start sm:self-auto cursor-pointer"
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
            className="w-full bg-card border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary"
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
          className="bg-card border border-slate-800 rounded-2xl px-4 py-3 text-xs text-primary font-bold focus:outline-none focus:border-primary cursor-pointer"
        >
          <option value="Tất cả">📁 Tất cả phân loại</option>
          <option value="Bữa Sáng">🍳 Bữa Sáng</option>
          <option value="Bữa Trưa">🍱 Bữa Trưa</option>
          <option value="Bữa Tối">🥩 Bữa Tối</option>
          <option value="Ăn Vặt">🍎 Ăn Vặt</option>
        </select>
      </div>

      {/* Food Table */}
      <div className="bg-card/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredFoods.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-inset text-slate-400 uppercase text-xs font-black tracking-wider border-b border-slate-800">
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
                  <tr key={food._id} className="hover:bg-surface-elevated/50 transition-colors">
                    <td className="p-4 font-bold text-white flex items-center gap-3">
                      {food.image ? (
                        <img src={food.image} alt={food.name} className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-inset border border-slate-800 flex items-center justify-center text-lg shrink-0">
                          🥗
                        </div>
                      )}
                      <span>{food.name}</span>
                    </td>
                    <td className="p-4 text-slate-300 font-medium">{food.servingSize}</td>
                    <td className="p-4 font-black text-primary">{food.calories} kcal</td>
                    <td className="p-4 text-slate-400 font-semibold">
                      <span className="text-primary">{food.protein || 0}g Đạm</span> • <span className="text-warning">{food.carbs || 0}g Đường/Cap</span> • <span className="text-destructive">{food.fat || 0}g Béo</span>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-inset border border-slate-800 rounded-lg text-xs font-extrabold text-slate-300">
                        {food.category}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(food)}
                        className="px-3 py-1.5 bg-surface-elevated hover:bg-slate-800 text-primary rounded-xl font-extrabold border border-slate-700 transition"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDeleteFood(food._id, food.name)}
                        className="px-3 py-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-xl font-extrabold border border-destructive/30 transition"
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
          <div className="relative bg-card border border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl z-10 text-white space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <span>{editingFood ? '✏️' : '➕'}</span>
                {editingFood ? 'Chỉnh sửa món ăn' : 'Thêm món ăn mới vào Cơ sở dữ liệu'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white text-xl font-bold">&times;</button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive font-semibold">
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
                  className="w-full bg-inset border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-primary"
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
                    className="w-full bg-inset border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-primary"
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
                    className="w-full bg-inset border border-slate-800 rounded-xl p-3 text-xs text-primary font-black focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Macros (Optional) */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Đạm (Protein g)</label>
                  <input
                    type="number"
                    min="0"
                    value={formProtein}
                    onChange={(e) => setFormProtein(e.target.value)}
                    className="w-full bg-inset border border-slate-800 rounded-xl p-2.5 text-xs text-primary font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    min="0"
                    value={formCarbs}
                    onChange={(e) => setFormCarbs(e.target.value)}
                    className="w-full bg-inset border border-slate-800 rounded-xl p-2.5 text-xs text-warning font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Chất béo (Fat g)</label>
                  <input
                    type="number"
                    min="0"
                    value={formFat}
                    onChange={(e) => setFormFat(e.target.value)}
                    className="w-full bg-inset border border-slate-800 rounded-xl p-2.5 text-xs text-destructive font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Phân loại</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-inset border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-primary"
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
                    className="w-full bg-inset border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-surface-elevated text-slate-300 font-bold rounded-xl hover:bg-slate-800 text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-primary text-slate-950 font-black rounded-xl hover:bg-primary text-xs shadow-lg shadow-primary/20 disabled:opacity-50"
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
