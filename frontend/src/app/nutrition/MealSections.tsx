'use client';
import type { Dispatch, SetStateAction } from 'react';
import type { MealItem } from './types';

interface MealSectionsProps {
  caloriesConsumed: number;
  handleRemoveFood: (category: string, itemId: string) => void;
  meals: Record<string, MealItem[]>;
  setActiveMealCategory: Dispatch<SetStateAction<string | null>>;
  setSelectedPreviewImage: Dispatch<SetStateAction<string | null>>;
}

export default function MealSections({
  caloriesConsumed,
  handleRemoveFood,
  meals,
  setActiveMealCategory,
  setSelectedPreviewImage,
}: MealSectionsProps) {
  return (
    <>
      <div className="bg-[#131B2E]/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-3 sm:pb-4 gap-2">
          <h3 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
            <span>🍱</span> Ghi chép bữa ăn trong ngày
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tổng: <strong className="text-[#00E5FF] font-black">{caloriesConsumed} kcal</strong></span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-6">
          {[
            { name: 'Bữa Sáng', icon: '🍳' },
            { name: 'Bữa Trưa', icon: '🍱' },
            { name: 'Bữa Tối', icon: '🥩' },
            { name: 'Ăn Vặt', icon: '🍎' }
          ].map((mealConfig) => {
            const categoryName = mealConfig.name;
            const itemList = meals[categoryName] || [];
            const categoryCalories = itemList.reduce((sum, item) => sum + item.calories, 0);

            return (
              <div key={categoryName} className="bg-[#0E1526] border border-slate-800/90 rounded-2xl p-3.5 sm:p-6 space-y-3 sm:space-y-4 hover:border-cyan-500/30 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#18233C] rounded-xl flex items-center justify-center text-base sm:text-xl shrink-0">
                      {mealConfig.icon}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white text-xs sm:text-base">{categoryName}</h4>
                      <span className="text-[10px] sm:text-xs text-[#00E5FF] font-bold">{categoryCalories} kcal</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <button
                      onClick={() => setActiveMealCategory(categoryName)}
                      className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-[#00E5FF] text-slate-950 text-[10px] sm:text-xs font-black hover:bg-cyan-300 transition-all shadow-md shadow-[#00E5FF]/20 cursor-pointer flex items-center gap-1"
                    >
                      <span>+</span> Thêm món
                    </button>
                  </div>
                </div>

                {/* Food Items List */}
                <div className="space-y-2 pt-2 border-t border-slate-800/60">
                  {itemList.length > 0 ? (
                    itemList.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-[#131B2E] p-3 rounded-xl border border-slate-800/60 text-xs">
                        <div className="flex items-center gap-3">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              onClick={() => setSelectedPreviewImage(item.image!)}
                              className="w-10 h-10 rounded-lg object-cover cursor-pointer border border-slate-700 hover:border-[#00E5FF] hover:scale-105 transition-all shadow-sm"
                              title="Bấm để xem ảnh phóng to"
                            />
                          )}
                          <div>
                            <span className="font-semibold text-slate-200">{item.name}</span>
                            {item.quantity && (
                              <span className="ml-1.5 text-[11px] text-slate-400 font-medium">({item.quantity})</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[#00E5FF] font-bold">{item.calories} kcal</span>
                          <button
                            onClick={() => handleRemoveFood(categoryName, item.id)}
                            className="text-rose-400 hover:text-rose-300 font-bold text-sm ml-1"
                            title="Xóa món này"
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic py-2">Chưa ghi nhận món ăn nào cho {categoryName}.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
