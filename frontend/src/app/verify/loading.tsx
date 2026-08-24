export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center p-4 font-sans">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#00E5FF] border-t-transparent rounded-full animate-spin"></div>
        <div className="space-y-1 text-center">
          <div className="h-3 w-28 bg-slate-800 rounded-full animate-pulse"></div>
          <div className="h-2 w-20 bg-slate-800/60 rounded-full animate-pulse mx-auto"></div>
        </div>
      </div>
    </div>
  );
}
