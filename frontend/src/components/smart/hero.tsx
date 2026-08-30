import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Play } from "lucide-react";
import dashboardImage from "@/assets/smart-dashboard.png";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" />

      <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-16 text-center md:pt-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" />
          Hệ thống Quản lý & Luyện tập Thông minh
        </div>

        <h1 className="mx-auto mt-8 max-w-[18ch] text-balance text-4xl font-extrabold tracking-tight text-foreground md:text-6xl lg:text-7xl">
          Đạt vóc dáng mơ ước với sự{" "}
          <span className="text-primary">chính xác</span>
        </h1>

        <p className="mx-auto mt-6 max-w-[54ch] text-balance text-lg leading-relaxed text-muted-foreground md:text-xl">
          Ghi nhật ký ăn uống, theo dõi lịch tập luyện và đo lường tiến độ mỗi
          ngày. Smart là huấn luyện viên cá nhân luôn ở trong túi bạn.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground transition-all hover:brightness-110 glow-primary"
          >
            Bắt đầu miễn phí
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-full border border-border px-7 py-3.5 text-base font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <Play className="size-4 fill-current" />
            Xem tính năng
          </a>
        </div>

        <div className="relative mx-auto mt-16 max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <Image
            src={dashboardImage}
            alt="Giao diện ứng dụng Smart với lịch tập, nhật ký ăn uống và thống kê tiến độ"
            width={1440}
            height={912}
            className="w-full h-auto"
            priority
          />
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
        </div>
      </div>
    </section>
  );
}
