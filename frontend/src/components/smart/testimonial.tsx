import { Star } from "lucide-react";

export function Testimonial() {
  return (
    <section id="testimonial" className="border-t border-border">
      <div className="mx-auto max-w-4xl px-6 py-20 text-center md:py-28">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Đánh giá từ người dùng
        </p>

        <div className="mx-auto mt-6 flex justify-center gap-1 text-primary">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="size-5 fill-current" />
          ))}
        </div>

        <blockquote className="mx-auto mt-8 max-w-[38ch] text-balance text-2xl font-medium leading-snug tracking-tight text-foreground md:text-3xl">
          “Tính năng quét mã vạch tra calo và bản đồ cơ bắp trực quan giúp tôi biết chính xác buổi tập tác động vào đâu và ăn uống chuẩn hơn mỗi ngày.”
        </blockquote>

        <div className="mt-10 flex items-center justify-center gap-3">
          <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            MA
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">Minh Anh</p>
            <p className="text-xs text-muted-foreground">
              Người tập Gym & Fitness
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

