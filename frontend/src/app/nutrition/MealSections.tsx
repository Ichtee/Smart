'use client';
import type { Dispatch, SetStateAction } from 'react';
import type { MealItem } from './types';
import { Utensils } from 'lucide-react';

interface MealSectionsProps {
  caloriesConsumed: number;
  handleRemoveFood: (category: string, itemId: string) => void;
  meals: Record<string, MealItem[]>;
  onCopyPreviousDay: () => void;
  copyBusy: boolean;
  copyNotice: string;
  canCopy: boolean;
  setActiveMealCategory: Dispatch<SetStateAction<string | null>>;
  setSelectedPreviewImage: Dispatch<SetStateAction<string | null>>;
}

export default function MealSections({
  caloriesConsumed,
  handleRemoveFood,
  meals,
  onCopyPreviousDay,
  copyBusy,
  copyNotice,
  canCopy,
  setActiveMealCategory,
  setSelectedPreviewImage,
}: MealSectionsProps) {
  return (
    <>
      <div className="bg-card/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3 xl:flex xl:min-h-[26rem] xl:flex-1 xl:flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-3 sm:pb-4 gap-2">
          <h3 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
            <Utensils className="size-5 text-primary" aria-hidden /> Ghi chép bữa ăn trong ngày
          </h3>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCopyPreviousDay}
              disabled={!canCopy || copyBusy}
              className="px-3 py-1.5 rounded-xl bg-surface-elevated text-slate-200 text-xs sm:text-xs font-bold hover:bg-edge disabled:opacity-50 transition-all cursor-pointer"
            >
              {copyBusy ? 'Đang sao chép...' : '📋 Sao chép từ hôm qua'}
            </button>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tổng: <strong className="text-primary font-black">{caloriesConsumed} kcal</strong></span>
          </div>
        </div>

        {copyNotice && (
          <p role="status" className="text-xs font-semibold text-primary">{copyNotice}</p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-4">
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
              <div key={categoryName} className="bg-inset border border-slate-800/90 rounded-2xl p-3.5 sm:p-4 space-y-3 hover:border-primary/30 transition-all xl:flex xl:min-h-0 xl:flex-col">
                <div className="flex flex-col sm:flex-row xl:flex-col sm:items-center xl:items-start justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-surface-elevated rounded-xl flex items-center justify-center text-base sm:text-xl shrink-0">
                      {mealConfig.icon}
                    </div>
                    <div>
                      <h4 className="whitespace-nowrap font-extrabold text-white text-sm sm:text-base">{categoryName}</h4>
                      <span className="text-xs sm:text-xs text-primary font-bold">{categoryCalories} kcal</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <button
                      onClick={() => setActiveMealCategory(categoryName)}
                      className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-primary text-slate-950 text-xs sm:text-xs font-black hover:bg-primary transition-all shadow-md shadow-primary/20 cursor-pointer flex items-center gap-1 whitespace-nowrap"
                    >
                      <span>+</span> Thêm món
                    </button>
                  </div>
                </div>

                {/* Food Items List */}
                <div className="space-y-2 pt-2 border-t border-slate-800/60 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
                  {itemList.length > 0 ? (
                    itemList.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-card p-3 rounded-xl border border-slate-800/60 text-xs">
                        <div className="flex items-center gap-3">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              onClick={() => setSelectedPreviewImage(item.image!)}
                              className="w-10 h-10 rounded-lg object-cover cursor-pointer border border-slate-700 hover:border-primary hover:scale-105 transition-all shadow-sm"
                              title="Bấm để xem ảnh phóng to"
                            />
                          )}
                          <div>
                            <span className="font-semibold text-slate-200">{item.name}</span>
                            {item.quantity && (
                              <span className="ml-1.5 text-xs text-slate-400 font-medium">({item.quantity})</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-primary font-bold">{item.calories} kcal</span>
                          <button
                            onClick={() => handleRemoveFood(categoryName, item.id)}
                            className="text-destructive hover:text-destructive font-bold text-sm ml-1"
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
