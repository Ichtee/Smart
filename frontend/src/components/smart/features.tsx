import { Apple, Dumbbell, LineChart } from "lucide-react";

const features = [
  {
    icon: Apple,
    title: "Dinh dưỡng & Quét mã vạch",
    description:
      "Theo dõi lượng Calo, Protein, Carbs và Fat hàng ngày. Tích hợp camera quét mã vạch Barcode thực tế giúp tra cứu và lưu thực phẩm tức thì.",
    tags: ["Quét Barcode Camera", "Tính Calo & Macro", "Thực phẩm tùy chỉnh"],
  },
  {
    icon: Dumbbell,
    title: "Lịch tập & Bản đồ cơ bắp 3D",
    description:
      "Lên kế hoạch tập luyện cá nhân hóa (PPL, Fullbody...). Tích hợp bản đồ giải phẫu cơ bắp trực quan hóa các nhóm cơ được tác động.",
    tags: ["Bản đồ cơ bắp 3D", "Lịch tập PPL / Upper-Lower", "Ghi Set, Reps & Mức tạ"],
  },
  {
    icon: LineChart,
    title: "Thống kê tiến độ & BMR/TDEE",
    description:
      "Tự động tính toán BMR & TDEE theo mục tiêu thể hình. Biểu đồ theo dõi sự thay đổi Cân nặng, chỉ số BMI và lịch sử tập luyện.",
    tags: ["Tính BMR & TDEE", "Biểu đồ Cân nặng & BMI", "Lịch sử tập luyện"],
  },
];

export function Features() {
  return (
    <section id="features" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="max-w-[44ch]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Tính năng nổi bật
          </p>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            Kiểm soát sức khỏe & tập luyện thông minh
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Smart kết hợp theo dõi dinh dưỡng, phân tích nhóm cơ tập luyện và đo lường tiến độ vào một nền tảng duy nhất.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:bg-surface-elevated"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <feature.icon className="size-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {feature.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


