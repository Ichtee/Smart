import Link from 'next/link';

export default function Home() {
  return (
    <div suppressHydrationWarning className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          MyFitness
        </h1>
        <p className="text-xl text-zinc-400 mb-10">
          Người bạn đồng hành hoàn hảo cho hành trình sức khỏe của bạn. Ghi nhật ký ăn uống, lên lịch tập luyện và đạt được vóc dáng mơ ước.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/login"
            className="px-8 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition"
          >
            Đăng nhập
          </Link>
          <Link 
            href="/register"
            className="px-8 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold hover:opacity-90 transition shadow-lg shadow-emerald-500/20"
          >
            Bắt đầu ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
