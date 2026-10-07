'use client';
import type { Dispatch, SetStateAction } from 'react';
import Model from 'react-body-highlighter';
import { PersonStanding } from 'lucide-react';

interface BodyMapPanelProps {
  handleClickBodyMuscle: (muscle: any) => void;
  highlighterData: any[];
  modelColors: string[];
  modelType: "anterior" | "posterior";
  setModelType: Dispatch<SetStateAction<"anterior" | "posterior">>;
  setShowMobileBodyModel: Dispatch<SetStateAction<boolean>>;
  showMobileBodyModel: boolean;
}

export default function BodyMapPanel({
  handleClickBodyMuscle,
  highlighterData,
  modelColors,
  modelType,
  setModelType,
  setShowMobileBodyModel,
  showMobileBodyModel,
}: BodyMapPanelProps) {
  return (
    <>
      <div className="lg:col-span-5 lg:sticky lg:top-6 h-fit self-start bg-card/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 z-20">
        <div className="flex justify-between items-center w-full border-b border-slate-800/80 pb-3">
          <h2 className="text-base sm:text-lg font-bold text-primary flex items-center gap-2">
            <PersonStanding className="size-5" aria-hidden /> Sơ đồ cơ bắp 3D
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModelType(prev => prev === 'anterior' ? 'posterior' : 'anterior')}
              className="px-3 py-1.5 bg-surface-elevated hover:bg-edge rounded-xl text-xs font-bold text-primary border border-primary/30 transition shadow-sm"
            >
              {modelType === 'anterior' ? 'Mặt sau' : 'Mặt trước'}
            </button>
            <button
              onClick={() => setShowMobileBodyModel(prev => !prev)}
              className="lg:hidden px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition border border-slate-700"
            >
              {showMobileBodyModel ? 'Thu gọn' : 'Hiện sơ đồ'}
            </button>
          </div>
        </div>

        <div className={`${showMobileBodyModel ? 'block' : 'hidden'} lg:block space-y-3`}>
          <div className="w-full max-w-[240px] sm:max-w-xs mx-auto py-2">
            <Model
              type={modelType}
              data={highlighterData}
              style={{ width: '100%' }}
              onClick={handleClickBodyMuscle}
              highlightedColors={modelColors}
            />
          </div>

        </div>
      </div>
    </>
  );
}
