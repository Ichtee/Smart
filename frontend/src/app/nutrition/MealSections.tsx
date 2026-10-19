'use client';
import { useState, type Dispatch, type SetStateAction } from 'react';
import type { MealItem } from './types';
import { Apple, ChevronDown, ClipboardCopy, Moon, Plus, Sun, Sunrise, Utensils, X, type LucideIcon } from 'lucide-react';

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

const MEALS: { name: string; icon: LucideIcon }[] = [
  { name: 'Bữa Sáng', icon: Sunrise },
  { name: 'Bữa Trưa', icon: Sun },
  { name: 'Bữa Tối', icon: Moon },
  { name: 'Ăn Vặt', icon: Apple },
];

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
  // On a phone a meal can be folded to its header; from md up every list is always shown.
  const [folded, setFolded] = useState<Record<string, boolean>>({});

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
              className="inline-flex min-h-11 items-center gap-1.5 px-3 rounded-xl bg-surface-elevated text-slate-200 text-xs font-bold hover:bg-edge disabled:opacity-50 transition-all cursor-pointer"
            >
              <ClipboardCopy className="size-4" aria-hidden />
              {copyBusy ? 'Đang sao chép...' : 'Sao chép từ hôm qua'}
            </button>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tổng: <strong className="text-primary font-black">{caloriesConsumed} kcal</strong></span>
          </div>
        </div>

        {copyNotice && (
          <p role="status" className="text-xs font-semibold text-primary">{copyNotice}</p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-4">
          {MEALS.map(({ name: categoryName, icon: Icon }) => {
            const itemList = meals[categoryName] || [];
            const categoryCalories = itemList.reduce((sum, item) => sum + item.calories, 0);
            const isFolded = !!folded[categoryName];

            return (
              <div key={categoryName} className="bg-inset border border-slate-800/90 rounded-2xl p-3 sm:p-4 space-y-2 hover:border-primary/30 transition-all xl:flex xl:min-h-0 xl:flex-col">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    aria-expanded={!isFolded}
                    onClick={() => setFolded(f => ({ ...f, [categoryName]: !f[categoryName] }))}
                    className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 text-left md:pointer-events-none"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-elevated text-primary">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block whitespace-nowrap text-sm sm:text-base font-extrabold text-white">{categoryName}</span>
                      <span className="block text-xs text-primary font-bold">{categoryCalories} kcal</span>
                    </span>
                    <ChevronDown className={`ml-auto size-4 shrink-0 text-slate-400 transition-transform md:hidden ${isFolded ? '-rotate-90' : ''}`} aria-hidden />
                  </button>

                  <button
                    type="button"
                    aria-label={`Thêm món vào ${categoryName}`}
                    onClick={() => setActiveMealCategory(categoryName)}
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-slate-950 shadow-md shadow-primary/20 cursor-pointer md:hidden"
                  >
                    <Plus className="size-5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMealCategory(categoryName)}
                    className="hidden shrink-0 items-center gap-1 whitespace-nowrap rounded-xl bg-primary px-3.5 py-1.5 text-xs font-black text-slate-950 shadow-md shadow-primary/20 transition-all cursor-pointer md:flex"
                  >
                    <span>+</span> Thêm món
                  </button>
                </div>

                {/* Food Items List */}
                <div data-meal-list className={`space-y-2 pt-2 border-t border-slate-800/60 xl:min-h-0 xl:flex-1 xl:overflow-y-auto ${isFolded ? 'hidden md:block' : ''}`}>
                  {itemList.length > 0 ? (
                    itemList.map(item => (
                      <div key={item.id} className="flex items-start justify-between gap-2 bg-card px-3 py-2 sm:py-3 rounded-xl border border-slate-800/60 text-xs">
                        <div className="flex min-w-0 items-center gap-3">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              onClick={() => setSelectedPreviewImage(item.image!)}
                              className="w-10 h-10 rounded-lg object-cover cursor-pointer border border-slate-700 hover:border-primary hover:scale-105 transition-all shadow-sm"
                              title="Bấm để xem ảnh phóng to"
                            />
                          )}
                          <div className="min-w-0 break-words">
                            <span className="font-semibold text-slate-200">{item.name}</span>
                            {item.quantity && (
                              <span className="ml-1.5 text-xs text-slate-400 font-medium">({item.quantity})</span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <span className="whitespace-nowrap text-primary font-bold">{item.calories} kcal</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFood(categoryName, item.id)}
                            className="inline-flex size-11 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer -my-2.5 -mr-2"
                            title="Xóa món này"
                            aria-label={`Xóa ${item.name}`}
                          >
                            <X className="size-4" aria-hidden />
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
