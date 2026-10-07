'use client';
import type { SaveStatus } from '@/hooks/useServerSave';

export default function SaveStatusBanner({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  if (status === 'idle') return null;

  if (status === 'saving') {
    return (
      <div className="fixed bottom-24 md:bottom-6 right-4 z-[60] px-3 py-1.5 rounded-full bg-card border border-border text-xs font-bold text-muted-foreground shadow-lg">
        Đang lưu...
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 left-4 md:left-auto z-[60] bg-destructive/10 border border-destructive/40 backdrop-blur rounded-2xl p-3 flex items-center justify-between gap-3 text-xs text-destructive shadow-xl">
      <span className="font-bold text-white">Chưa lưu được lên máy chủ. Dữ liệu mới nhất chưa được đồng bộ.</span>
      <button
        onClick={onRetry}
        className="px-3 py-1.5 bg-primary hover:bg-primary text-slate-950 font-black rounded-xl text-xs shrink-0 cursor-pointer"
      >
        Thử lại
      </button>
    </div>
  );
}
