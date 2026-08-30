interface StatItem {
  value: string;
  suffix?: string;
  label: string;
}

const stats: StatItem[] = [
  { value: "100%", label: "Miễn phí trải nghiệm" },
  { value: "Camera", label: "Quét mã vạch Barcode" },
  { value: "3D Map", label: "Giải phẫu nhóm cơ" },
  { value: "BMR/TDEE", label: "Tính toán tự động" },
];

export function Stats() {
  return (
    <section id="stats" className="border-t border-border bg-secondary/50">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`text-center md:text-left ${
                index < stats.length - 1
                  ? "md:border-r md:border-border md:pr-8"
                  : ""
              }`}
            >
              <p className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
                {stat.value}
                {stat.suffix && (
                  <span className="text-muted-foreground">{stat.suffix}</span>
                )}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


