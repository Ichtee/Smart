'use client';
import type { Dispatch, SetStateAction } from 'react';
import type { MealItem } from './types';

interface NutritionDetailModalProps {
  caloriesConsumed: number;
  meals: Record<string, MealItem[]>;
  mlPerGlass: number;
  selectedDate: string;
  setSelectedPreviewImage: Dispatch<SetStateAction<string | null>>;
  setShowDetailModal: Dispatch<SetStateAction<boolean>>;
  showDetailModal: boolean;
  targetCalories: number;
  waterGlasses: number;
}

export default function NutritionDetailModal({
  caloriesConsumed,
  meals,
  mlPerGlass,
  selectedDate,
  setSelectedPreviewImage,
  setShowDetailModal,
  showDetailModal,
  targetCalories,
  waterGlasses,
}: NutritionDetailModalProps) {
  return (
    <>
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowDetailModal(false)}></div>
          <div className="relative bg-card border border-slate-800 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl z-10 max-h-[85vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>📋</span> Báo cáo dinh dưỡng ngày: <span className="text-primary font-black">{selectedDate.split('-').reverse().join('/')}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Tổng quan Calo, Nước và các bữa ăn đã ghi nhận trong ngày.</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-500 hover:text-white text-2xl font-bold">&times;</button>
            </div>

            {/* Quick Stat Summary Cards */}
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="bg-inset p-3 rounded-2xl border border-slate-800">
                <div className="text-slate-400 text-xs font-bold uppercase">Tổng nạp</div>
                <div className="text-lg font-black text-primary">{caloriesConsumed} kcal</div>
              </div>
              <div className="bg-inset p-3 rounded-2xl border border-slate-800">
                <div className="text-slate-400 text-xs font-bold uppercase">Mục tiêu</div>
                <div className="text-lg font-black text-white">{targetCalories} kcal</div>
              </div>
              <div className="bg-inset p-3 rounded-2xl border border-slate-800">
                <div className="text-slate-400 text-xs font-bold uppercase">Lượng nước</div>
                <div className="text-lg font-black text-primary">{waterGlasses * mlPerGlass} ml</div>
              </div>
            </div>

            {/* Meal Breakdowns */}
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Chi tiết các bữa ăn:</h4>
              {[
                { name: 'Bữa Sáng', icon: '🍳' },
                { name: 'Bữa Trưa', icon: '🍱' },
                { name: 'Bữa Tối', icon: '🥩' },
                { name: 'Ăn Vặt', icon: '🍎' }
              ].map(cat => {
                const list = meals[cat.name] || [];
                const catCal = list.reduce((s, i) => s + i.calories, 0);

                return (
                  <div key={cat.name} className="bg-inset p-4 rounded-2xl border border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold border-b border-slate-800 pb-2">
                      <span className="text-white flex items-center gap-1.5">
                        <span>{cat.icon}</span> {cat.name}
                      </span>
                      <span className="text-primary">{catCal} kcal</span>
                    </div>

                    {list.length > 0 ? (
                      <div className="space-y-2">
                        {list.map(item => (
                          <div key={item.id} className="flex items-center justify-between bg-card p-2.5 rounded-xl text-xs">
                            <div className="flex items-center gap-3">
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  onClick={() => setSelectedPreviewImage(item.image!)}
                                  className="w-10 h-10 rounded-lg object-cover cursor-pointer border border-slate-700 hover:border-primary transition-all"
                                  title="Xem ảnh"
                                />
                              )}
                              <div>
                                <span className="font-medium text-slate-200">{item.name}</span>
                                {item.quantity && (
                                  <span className="ml-1.5 text-xs text-slate-400 font-normal">({item.quantity})</span>
                                )}
                              </div>
                            </div>
                            <span className="font-bold text-primary">{item.calories} kcal</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">Không có ghi nhận món ăn nào.</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2.5 bg-surface-elevated text-slate-300 font-bold rounded-xl hover:bg-slate-800 text-xs"
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
