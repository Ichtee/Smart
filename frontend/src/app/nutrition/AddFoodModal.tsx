'use client';
import { useMemo, useState } from 'react';
import { apiFetch } from '@/utils/api';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import CustomFoodsTab from './CustomFoodsTab';
import type { MealItem, DbFood } from './types';

// Module-level so the id source is not treated as an impure call during render
const newMealItemId = () => Date.now().toString();

interface AddFoodModalProps {
  /** Meal the food is being added to (Bữa Sáng, ...). The page mounts the modal only while it is open. */
  category: string;
  dbFoods: DbFood[];
  /** False until the selected day has loaded from the server: adding would overwrite unread data. */
  dayLoaded: boolean;
  mutateFoods: () => void;
  onAddItem: (category: string, item: MealItem) => void;
  onClose: () => void;
}

export default function AddFoodModal({ category, dbFoods, dayLoaded, mutateFoods, onAddItem, onClose }: AddFoodModalProps) {
  // The form owns its own state: it is created fresh every time the modal opens.
  const [foodName, setFoodName] = useState('');
  const [servingSize, setServingSize] = useState('1 phần');
  const [baseCalories, setBaseCalories] = useState('');
  const [portionMultiplier, setPortionMultiplier] = useState<string>('1');
  // Macros (grams) for ONE base serving of the selected food; null = unknown (manual entry)
  const [baseMacros, setBaseMacros] = useState<{ protein: number; carbs: number; fat: number } | null>(null);
  const [foodImage, setFoodImage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [showDbDropdown, setShowDbDropdown] = useState(false);
  const [saveAsCustomFood, setSaveAsCustomFood] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'search' | 'my_foods'>('search');

  const computedTotalCalories = useMemo(() => {
    const mult = parseFloat(portionMultiplier);
    const baseCal = parseFloat(baseCalories);
    if (isNaN(mult) || mult <= 0 || isNaN(baseCal) || baseCal <= 0) {
      return 0;
    }
    return Math.round(mult * baseCal);
  }, [portionMultiplier, baseCalories]);

  // A saved food was picked in the "my foods" tab: fill the search form with it and go back to it
  const handlePickCustomFood = (food: DbFood) => {
    setFoodName(food.name);
    setServingSize(food.servingSize || '1 phần');
    setBaseCalories(food.calories.toString());
    setBaseMacros({ protein: food.protein || 0, carbs: food.carbs || 0, fat: food.fat || 0 });
    setPortionMultiplier('1');
    if (food.image) setFoodImage(food.image);
    setActiveModalTab('search');
  };

  const handleDetectedProduct = (product: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    servingSize: string;
  }) => {
    setFoodName(product.name);
    setServingSize(product.servingSize || '1 phần');
    setBaseCalories((product.calories || 0).toString());
    setBaseMacros({ protein: product.protein || 0, carbs: product.carbs || 0, fat: product.fat || 0 });
    setPortionMultiplier('1');
  };

  // Handle Image Upload reading STRICTLY from process.env without any hardcoded secret
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setImageUploadError('');

    try {
      const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
      if (!apiKey) {
        throw new Error('Chưa cấu hình NEXT_PUBLIC_IMGBB_API_KEY trong .env.local hoặc Vercel!');
      }

      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.data?.url) {
        setFoodImage(data.data.url);
      } else {
        throw new Error(data.error?.message || 'Upload ảnh thất bại');
      }
    } catch (err: any) {
      setImageUploadError(err.message || 'Không thể tải ảnh lên ImgBB');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddFood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dayLoaded) {
      alert('Dữ liệu ngày này chưa tải xong. Vui lòng đợi giây lát hoặc bấm Thử lại.');
      return;
    }
    const trimmedFoodName = foodName.trim().replace(/\s+/g, ' ');
    if (!trimmedFoodName || computedTotalCalories <= 0) return;

    if (trimmedFoodName.length < 2 || trimmedFoodName.length > 60) {
      alert('Tên món ăn không được chứa toàn khoảng trắng, độ dài từ 2 đến 60 ký tự!');
      return;
    }

    if (computedTotalCalories > 10000) {
      alert('Lượng Calo tổng phải là số dương hợp lệ (tối đa 10,000 kcal)!');
      return;
    }

    const multVal = parseFloat(portionMultiplier) || 1;
    const cleanServing = servingSize.trim() || '1 phần';
    const formattedQuantity = multVal === 1 ? cleanServing : `${multVal} x (${cleanServing})`;

    const newItem: MealItem = {
      id: newMealItemId(),
      name: trimmedFoodName,
      calories: computedTotalCalories,
      quantity: formattedQuantity,
      image: foodImage || undefined,
      ...(baseMacros ? {
        protein: Math.round(baseMacros.protein * multVal * 10) / 10,
        carbs: Math.round(baseMacros.carbs * multVal * 10) / 10,
        fat: Math.round(baseMacros.fat * multVal * 10) / 10
      } : {})
    };

    onAddItem(category, newItem);

    // Save as Custom Food if checked (non-idempotent POST: no auto-retry)
    if (saveAsCustomFood) {
      apiFetch('/api/foods/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedFoodName,
          servingSize: cleanServing,
          calories: parseFloat(baseCalories) || computedTotalCalories,
          ...(baseMacros || {}),
          image: foodImage || ''
        })
      }, 0).then(() => mutateFoods()).catch(() => {});
    }

    onClose();
  };

  return (
    <>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => onClose()}></div>
          <div className="relative bg-card border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>➕</span> Thêm món vào <span className="text-primary">{category}</span>
              </h3>
              <button onClick={() => onClose()} className="text-slate-500 hover:text-white text-xl font-bold">&times;</button>
            </div>

            {/* Modal Tabs */}
            <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-inset border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveModalTab('search')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  activeModalTab === 'search'
                    ? 'bg-primary text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🔍 Tra cứu / Nhập mới
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('my_foods')}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeModalTab === 'my_foods'
                    ? 'bg-primary text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>⭐ Món của tôi</span>
                <span className="px-1.5 py-0.2 bg-slate-800 text-slate-200 text-xs rounded-full">
                  {dbFoods.filter(f => f.isCustom).length}
                </span>
              </button>
            </div>

            {activeModalTab === 'my_foods' ? (
              /* Tab 2: My Custom Foods List & Inline Creation Form */
              <CustomFoodsTab
                dbFoods={dbFoods}
                mutateFoods={mutateFoods}
                onPickFood={handlePickCustomFood}
                onBackToSearch={() => setActiveModalTab('search')}
              />
            ) : (
              /* Tab 1: Standard Add Food Form */
              <form onSubmit={handleAddFood} className="space-y-4">
              <button
                type="button"
                onClick={() => setIsBarcodeModalOpen(true)}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-success to-teal-400 text-slate-950 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-md shadow-success/20 active:scale-95 cursor-pointer mb-2"
              >
                <span>📷</span> Quét mã vạch tự động
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-3 text-xs text-slate-500 uppercase font-bold">hoặc nhập thủ công</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>
              
              {/* 1. Tên món ăn (kèm Live Search từ MongoDB Food Database) */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Tên món ăn *</span>
                  <span className="text-xs text-primary font-semibold">🔍 Tìm từ cơ sở dữ liệu</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={foodName}
                  onFocus={() => setShowDbDropdown(true)}
                  onChange={(e) => {
                    setFoodName(e.target.value);
                    setShowDbDropdown(true);
                  }}
                  placeholder="VD: Phở bò, Ức gà, Cơm tấm..."
                  className="w-full bg-inset border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary"
                />

                {/* Live Food Database Dropdown Results */}
                {showDbDropdown && dbFoods.length > 0 && foodName.trim() && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-card border border-slate-700 rounded-2xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-slate-800">
                    {dbFoods
                      .filter(f => f.name.toLowerCase().includes(foodName.toLowerCase().trim()))
                      .slice(0, 8)
                      .map(item => (
                        <div
                          key={item._id}
                          onClick={() => {
                            setFoodName(item.name);
                            setServingSize(item.servingSize || '1 phần');
                            setBaseCalories(item.calories.toString());
                            setBaseMacros({ protein: item.protein || 0, carbs: item.carbs || 0, fat: item.fat || 0 });
                            setPortionMultiplier('1');
                            if (item.image) setFoodImage(item.image);
                            setShowDbDropdown(false);
                          }}
                          className="p-3 hover:bg-surface-elevated cursor-pointer transition-colors flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">🥗</span>
                            <div>
                              <p className="font-bold text-white">{item.name}</p>
                              <p className="text-xs text-slate-400 font-medium">{item.servingSize}</p>
                            </div>
                          </div>
                          <span className="font-black text-primary">{item.calories} kcal</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* 2. Khẩu phần chuẩn gốc & Calo 1 khẩu phần */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Khẩu phần chuẩn</label>
                  <input
                    type="text"
                    maxLength={30}
                    value={servingSize}
                    onChange={(e) => setServingSize(e.target.value)}
                    placeholder="VD: Gói 200g, 100g, 1 tô..."
                    className="w-full bg-inset border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Calo / 1 khẩu phần</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="10000"
                    value={baseCalories}
                    onChange={(e) => { setBaseCalories(e.target.value); setBaseMacros(null); }}
                    placeholder="VD: 400"
                    className="w-full bg-inset border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* 3. Bộ nhân số lượng (Portion Multiplier) */}
              <div className="bg-inset p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Số lượng / Khẩu phần ăn</label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-medium">Hệ số:</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="50"
                      value={portionMultiplier}
                      onChange={(e) => setPortionMultiplier(e.target.value)}
                      className="w-14 bg-card border border-slate-700 text-primary font-black text-center text-xs py-1 rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Quick Multiplier Buttons */}
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { label: '½', val: 0.5 },
                    { label: '1', val: 1 },
                    { label: '1.5', val: 1.5 },
                    { label: '2', val: 2 },
                    { label: '3', val: 3 }
                  ].map((btn) => {
                    const isSelected = parseFloat(portionMultiplier) === btn.val;
                    return (
                      <button
                        key={btn.val}
                        type="button"
                        onClick={() => setPortionMultiplier(btn.val.toString())}
                        className={`py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary text-slate-950 shadow-md shadow-primary/20'
                            : 'bg-surface-elevated text-slate-300 hover:bg-slate-800 border border-slate-800'
                        }`}
                      >
                        {btn.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Tổng Calo tính toán tự động */}
              <div className="p-3.5 bg-inset border border-primary/40 rounded-2xl flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">TỔNG CALO NẠP VÀO</span>
                  <span className="text-xs text-slate-300 font-medium">
                    {portionMultiplier || '1'} x ({servingSize || '1 phần'})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-primary">{computedTotalCalories}</span>
                  <span className="text-xs text-slate-400 font-bold ml-1">kcal</span>
                </div>
              </div>

              {/* Checkbox: Save to My Custom Foods */}
              <label className="flex items-center gap-2.5 p-3 bg-inset border border-slate-800/80 rounded-xl cursor-pointer hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={saveAsCustomFood}
                  onChange={(e) => setSaveAsCustomFood(e.target.checked)}
                  className="w-4 h-4 rounded text-primary bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
                />
                <span className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                  <span>⭐</span> Lưu vào <b className="text-white font-bold">"Món ăn của tôi"</b> để dùng lại sau
                </span>
              </label>

              {/* Photo Upload via ImgBB */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Hình ảnh món ăn (tùy chọn)</label>
                {foodImage ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-700 group">
                    <img src={foodImage} alt="Ảnh bữa ăn" className="w-full h-36 object-cover" />
                    <button
                      type="button"
                      onClick={() => setFoodImage('')}
                      className="absolute top-2 right-2 bg-destructive/80 hover:bg-destructive text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shadow-md transition-all"
                      title="Xóa ảnh"
                    >
                      &times;
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs text-success font-bold flex items-center gap-1 border border-success/30">
                      <span>✓</span> Đã tải lên ImgBB
                    </div>
                  </div>
                ) : uploadingImage ? (
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-primary p-6 bg-inset border border-slate-800 rounded-2xl">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    Đang tải ảnh lên ImgBB...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {/* Option 1: Pick existing image from device / gallery */}
                    <label className="flex flex-col items-center justify-center border border-slate-800 hover:border-primary bg-inset hover:bg-card rounded-2xl p-4 cursor-pointer transition-all group text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                      <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🖼️</span>
                      <span className="text-xs font-bold text-slate-300 group-hover:text-primary">Chọn từ thiết bị</span>
                      <span className="text-xs text-slate-500 mt-0.5">Thư viện ảnh / File</span>
                    </label>

                    {/* Option 2: Direct camera capture */}
                    <label className="flex flex-col items-center justify-center border border-slate-800 hover:border-success bg-inset hover:bg-card rounded-2xl p-4 cursor-pointer transition-all group text-center">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageSelect}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                      <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">📸</span>
                      <span className="text-xs font-bold text-slate-300 group-hover:text-success">Chụp ảnh mới</span>
                      <span className="text-xs text-slate-500 mt-0.5">Camera điện thoại</span>
                    </label>
                  </div>
                )}
                {imageUploadError && (
                  <p className="text-destructive text-xs mt-1 font-semibold">{imageUploadError}</p>
                )}
              </div>

              {/* Quick suggestions */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gợi ý nhanh:</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Phở bò', cal: 450, qty: '1 tô' },
                    { name: 'Cơm tấm', cal: 600, qty: '1 dĩa' },
                    { name: 'Ức gà', cal: 220, qty: '200g' },
                    { name: 'Trứng ốp la', cal: 150, qty: '2 quả' },
                    { name: 'Bánh mì', cal: 300, qty: '1 ổ' }
                  ].map(sug => (
                    <button
                      key={sug.name}
                      type="button"
                      onClick={() => {
                        setFoodName(sug.name);
                        setServingSize(sug.qty);
                        setBaseCalories(sug.cal.toString());
                        setBaseMacros(null);
                        setPortionMultiplier('1');
                      }}
                      className="px-2.5 py-1 bg-surface-elevated hover:bg-slate-800 border border-slate-800 rounded-lg text-xs text-slate-300 font-medium"
                    >
                      {sug.name} ({sug.qty} • {sug.cal} kcal)
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => onClose()}
                  className="flex-1 py-3 bg-surface-elevated text-slate-300 font-bold rounded-xl hover:bg-slate-800 text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={uploadingImage}
                  className="flex-1 py-3 bg-primary text-slate-950 font-black rounded-xl hover:bg-primary text-xs shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  Lưu món ăn
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        onDetectedProduct={handleDetectedProduct}
      />
    </>
  );
}
