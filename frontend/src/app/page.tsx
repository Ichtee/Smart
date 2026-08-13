import Link from 'next/link';

export default function Home() {
  return (
    <div suppressHydrationWarning className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Smart Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#00E5FF]/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-[#00FF87]/10 blur-[140px] pointer-events-none" />

      <div className="text-center max-w-2xl relative z-10 space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#00E5FF] to-[#00FF87] p-0.5 mx-auto shadow-xl shadow-[#00E5FF]/30 flex items-center justify-center">
          <div className="w-full h-full bg-[#0B0F19] rounded-[22px] flex items-center justify-center">
            <span className="text-3xl font-black text-[#00E5FF]">⚡</span>
          </div>
        </div>

        <h1 className="text-6xl md:text-7xl font-black tracking-tight text-white">
          Smart
        </h1>
        
        <p className="text-lg text-slate-400 font-medium leading-relaxed">
          Hệ thống Quản lý & Luyện tập Thông minh. Ghi nhật ký ăn uống, theo dõi lịch tập luyện và đạt được vóc dáng mơ ước.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link 
            href="/login"
            className="px-8 py-3.5 rounded-xl bg-[#131B2E] border border-slate-800 hover:bg-[#18233C] text-slate-200 font-bold transition shadow-md"
          >
            Đăng nhập
          </Link>
          <Link 
            href="/register"
            className="px-8 py-3.5 rounded-xl bg-[#00E5FF] text-slate-950 font-black hover:bg-cyan-300 transition shadow-lg shadow-[#00E5FF]/20"
          >
            Bắt đầu ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
