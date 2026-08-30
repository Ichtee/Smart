import { Apple, Dumbbell, LineChart, Target } from "lucide-react";

const features = [
  {
    icon: Apple,
    title: "Nhật ký ăn uống thông minh",
    description:
      "Ghi lại mọi bữa ăn với cơ sở dữ liệu món Việt phong phú. Tự động tính calo, đạm, carb và chất béo theo khẩu phần của bạn.",
    tags: ["12.000+ món ăn", "Mã vạch quét nhanh"],
  },
  {
    icon: Dumbbell,
    title: "Lịch tập luyện cá nhân",
    description:
      "Lên kế hoạch buổi tập, ghi nhận số set/rep và theo dõi cường độ. Đồng bộ với đồng hồ thông minh để có dữ liệu chính xác nhất.",
    tags: ["38 bài tập mẫu", "12 chế độ tập"],
  },
  {
    icon: LineChart,
    title: "Theo dõi tiến độ trực quan",
    description:
      "Biểu đồ cân nặng, tỷ lệ mỡ, cơ bắp và BMI giúp bạn nhìn thấy sự thay đổi qua từng tuần, từng tháng.",
    tags: ["7 chỉ số sức khỏe", "Báo cáo hàng tuần"],
  },
  {
    icon: Target,
    title: "Mục tiêu & thói quen",
    description:
      "Đặt mục tiêu giảm cân, tăng cơ hay duy trì sức khỏe. Smart nhắc nhở và điều chỉnh kế hoạch để bạn không bỏ cuộc giữa chừng.",
    tags: ["Nhắc nhở thông minh", "Thưởng thành tích"],
  },
];

export function Features() {
  return (
    <section id="features" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="max-w-[44ch]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Tính năng
          </p>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            Mọi thứ bạn cần để kiểm soát cơ thể
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Không cần ứng dụng rời rạc. Smart tập hợp dinh dưỡng, tập luyện và
            tiến độ vào một nơi duy nhất.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                    className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
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
