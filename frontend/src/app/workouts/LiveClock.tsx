'use client';
import { useState, useEffect } from 'react';

export default function LiveClock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time ? time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '20:16:36';
  const formattedDate = time ? time.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Thu, Aug 13, 2026';

  return (
    <div suppressHydrationWarning className="flex items-center gap-2 sm:gap-3 bg-inset px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border border-slate-800/80 shadow-inner">
      <div className="flex items-center gap-1.5 sm:gap-2 bg-success-soft/80 border border-success/30 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-success animate-ping" />
        <span className="text-xs sm:text-xs font-bold text-success uppercase tracking-wider">LIVE</span>
      </div>
      <span className="text-sm sm:text-2xl font-mono font-black text-primary tracking-tight">{formattedTime}</span>
      <span className="text-xs sm:text-xs text-slate-400 font-medium border-l border-slate-800 pl-2 sm:pl-3 truncate">{formattedDate}</span>
    </div>
  );
}
