'use client';
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export function CTA() {
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/register');
  };

  return (
    <section id="cta" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-8 py-16 text-center md:px-16 md:py-20">
          <div className="pointer-events-none absolute inset-0 bg-cta-glow" />

          <div className="relative">
            <h2 className="mx-auto max-w-[16ch] text-balance text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              Bắt đầu hành trình của bạn hôm nay
            </h2>
            <p className="mx-auto mt-5 max-w-[44ch] text-balance text-lg text-muted-foreground">
              Miễn phí hoàn toàn. Đăng ký tài khoản và quản lý tập luyện ngay tức thì.
            </p>

            <form onSubmit={handleSubmit} className="mx-auto mt-9 flex max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="email"
                placeholder="email@ban.vn"
                className="flex-1 rounded-full border border-input bg-background px-5 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 cursor-pointer"
              >
                Đăng ký miễn phí
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>

            <p className="mt-5 text-xs text-muted-foreground">
              Bảo mật tài khoản với JWT Cookie & Email Verification
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

