'use client';
import { useState } from 'react';
import { apiFetch } from '@/utils/api';
import type { DbFood } from './types';

interface CustomFoodsTabProps {
  dbFoods: DbFood[];
  mutateFoods: () => void;
  /** User tapped one of their saved foods: the modal fills the search form with it. */
  onPickFood: (food: DbFood) => void;
  onBackToSearch: () => void;
}

export default function CustomFoodsTab({ dbFoods, mutateFoods, onPickFood, onBackToSearch }: CustomFoodsTabProps) {
  // Direct custom food creation inside tab 2
  const [showCreateCustomForm, setShowCreateCustomForm] = useState(false);
  const [customFormName, setCustomFormName] = useState('');
  const [customFormServing, setCustomFormServing] = useState('1 phần');
  const [customFormCal, setCustomFormCal] = useState('');
  const [customFormProtein, setCustomFormProtein] = useState('0');
  const [customFormCarbs, setCustomFormCarbs] = useState('0');
  const [customFormFat, setCustomFormFat] = useState('0');
  const [customFormCategory, setCustomFormCategory] = useState('Tất cả');
  const [customFormImage, setCustomFormImage] = useState('');
  const [savingCustomFood, setSavingCustomFood] = useState(false);

  const handleCreateCustomFoodDirectly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFormName.trim() || !customFormCal) return;

    setSavingCustomFood(true);
    try {
      if (!localStorage.getItem('token')) {
        alert('Bạn cần đăng nhập để tạo món ăn cá nhân!');
        return;
      }

      // retries = 0: creating a food is not idempotent, never auto-retry a POST that may have succeeded
      const res = await apiFetch('/api/foods/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customFormName.trim(),
          servingSize: customFormServing.trim() || '1 phần',
          calories: Number(customFormCal),
          protein: Number(customFormProtein) || 0,
          carbs: Number(customFormCarbs) || 0,
          fat: Number(customFormFat) || 0,
          category: customFormCategory || 'Tất cả',
          image: customFormImage.trim() || ''
        })
      }, 0);

      if (res.ok) {
        setCustomFormName('');
        setCustomFormServing('1 phần');
        setCustomFormCal('');
        setCustomFormProtein('0');
        setCustomFormCarbs('0');
        setCustomFormFat('0');
        setCustomFormCategory('Tất cả');
        setCustomFormImage('');
        setShowCreateCustomForm(false);
        mutateFoods();
      } else {
        const data = await res.json();
        alert(data.message || 'Lỗi khi lưu món ăn cá nhân');
      }
    } catch (err) {
      alert('Lỗi kết nối khi lưu món ăn cá nhân');
    } finally {
      setSavingCustomFood(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Danh sách món cá nhân</span>
          <button
            type="button"
            onClick={() => setShowCreateCustomForm(!showCreateCustomForm)}
            className="px-3 py-1.5 bg-[#00E5FF] hover:bg-cyan-300 text-slate-950 text-xs font-black rounded-xl transition shadow-md shadow-[#00E5FF]/20 flex items-center gap-1 cursor-pointer"
          >
            <span>{showCreateCustomForm ? '✕ Đóng' : '➕ Tạo món mới'}</span>
          </button>
        </div>

        {/* Form tạo món cá nhân mới trực tiếp */}
        {showCreateCustomForm && (
          <form onSubmit={handleCreateCustomFoodDirectly} className="p-4 bg-[#0B101D] border border-[#00E5FF]/40 rounded-2xl space-y-3 shadow-lg animate-in fade-in">
            <h4 className="text-xs font-extrabold text-[#00E5FF] uppercase tracking-wider flex items-center gap-1.5">
              <span>⭐</span> Tạo món ăn cá nhân mới
            </h4>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tên món ăn *</label>
              <input
                type="text"
                required
                maxLength={60}
                value={customFormName}
                onChange={(e) => setCustomFormName(e.target.value)}
                placeholder="VD: Cơm gà kho nấm nhà làm..."
                className="w-full bg-[#131B2E] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Khẩu phần chuẩn</label>
                <input
                  type="text"
                  value={customFormServing}
                  onChange={(e) => setCustomFormServing(e.target.value)}
                  placeholder="VD: 1 phần, 150g..."
                  className="w-full bg-[#131B2E] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Calo (kcal) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="10000"
                  value={customFormCal}
                  onChange={(e) => setCustomFormCal(e.target.value)}
                  placeholder="VD: 250"
                  className="w-full bg-[#131B2E] border border-slate-700 rounded-xl p-2.5 text-xs text-[#00E5FF] font-black focus:outline-none focus:border-[#00E5FF]"
                />
              </div>
            </div>

            {/* Macros: Protein, Carbs, Fat */}
            <div className="grid grid-cols-3 gap-2 pt-0.5">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Đạm (Protein g)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={customFormProtein}
                  onChange={(e) => setCustomFormProtein(e.target.value)}
                  className="w-full bg-[#131B2E] border border-slate-700 rounded-xl p-2 text-xs text-cyan-400 font-bold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Carbs (g)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={customFormCarbs}
                  onChange={(e) => setCustomFormCarbs(e.target.value)}
                  className="w-full bg-[#131B2E] border border-slate-700 rounded-xl p-2 text-xs text-amber-400 font-bold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Chất béo (Fat g)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={customFormFat}
                  onChange={(e) => setCustomFormFat(e.target.value)}
                  className="w-full bg-[#131B2E] border border-slate-700 rounded-xl p-2 text-xs text-rose-400 font-bold focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Phân loại</label>
                <select
                  value={customFormCategory}
                  onChange={(e) => setCustomFormCategory(e.target.value)}
                  className="w-full bg-[#131B2E] border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                >
                  <option value="Tất cả">Tất cả</option>
                  <option value="Bữa Sáng">Bữa Sáng</option>
                  <option value="Bữa Trưa">Bữa Trưa</option>
                  <option value="Bữa Tối">Bữa Tối</option>
                  <option value="Ăn Vặt">Ăn Vặt</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">URL Ảnh (Tùy chọn)</label>
                <input
                  type="url"
                  value={customFormImage}
                  onChange={(e) => setCustomFormImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#131B2E] border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCreateCustomForm(false)}
                className="flex-1 py-2 bg-[#18233C] text-slate-300 font-bold rounded-xl hover:bg-slate-800 text-xs"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={savingCustomFood}
                className="flex-1 py-2 bg-[#00E5FF] text-slate-950 font-black rounded-xl hover:bg-cyan-300 text-xs shadow-md shadow-[#00E5FF]/20 disabled:opacity-50"
              >
                {savingCustomFood ? 'Đang lưu...' : 'Lưu món ăn'}
              </button>
            </div>
          </form>
        )}

        {/* Custom Foods List */}
        {dbFoods.filter(f => f.isCustom).length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {dbFoods.filter(f => f.isCustom).map(item => (
              <div
                key={item._id}
                onClick={() => onPickFood(item)}
                className="p-3 bg-[#0B101D] border border-slate-800 hover:border-[#00E5FF] rounded-2xl cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">⭐</span>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-[#00E5FF]">{item.name}</p>
                    <p className="text-[10px] text-slate-400">{item.servingSize}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-[#00E5FF]">{item.calories} kcal</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!confirm(`Xóa món "${item.name}" khỏi "Món ăn của tôi"?`)) return;
                      apiFetch(`/api/foods/custom/${item._id}`, { method: 'DELETE' })
                        .then(res => {
                          if (!res.ok) throw new Error(`HTTP ${res.status}`);
                          mutateFoods();
                        })
                        .catch(() => alert('Không xóa được món ăn. Vui lòng thử lại.'));
                    }}
                    className="text-slate-500 hover:text-rose-400 p-1 text-sm font-bold"
                    title="Xóa món ăn cá nhân"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-[#0B101D] border border-slate-800 rounded-2xl space-y-2">
            <p className="text-3xl">⭐</p>
            <p className="text-xs text-slate-300 font-bold">Bạn chưa có món ăn cá nhân nào.</p>
            <p className="text-[10px] text-slate-500">
              Hãy nhấn nút <b className="text-[#00E5FF]">"➕ Tạo món mới"</b> ở trên để thêm món ăn yêu thích của bạn!
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onBackToSearch}
          className="w-full py-2.5 bg-[#18233C] text-slate-300 hover:text-white font-bold rounded-xl text-xs transition"
        >
          ← Quay lại nhập món
        </button>
      </div>
    </>
  );
}
