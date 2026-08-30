# Smart Landing Page — Complete Code Package

Use this package to replicate the Smart fitness-app landing page in any React + Tailwind v4 project. It replaces the root `/` route with a dark, Vietnamese-language landing page.

## What you get

- `src/routes/index.tsx` — root route with SEO meta
- `src/components/smart/*.tsx` — Navbar, Hero, Features, Stats, Testimonial, CTA, Footer, Logo
- `src/styles.css` — dark-first Smart design tokens and custom utilities
- Asset reference: `src/assets/smart-dashboard.png` (dashboard preview image)

## Tech assumptions

- React 19 + TypeScript
- TanStack Router / TanStack Start
- Tailwind CSS v4 with `@theme inline` support
- `lucide-react` for icons
- `clsx` / `tailwind-merge` not required here

---

## 1. `src/styles.css`

Replace or merge with your existing global styles. Keep `@import` rules at the very top.

```css
@import "tailwindcss" source(none);
@source "../src";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

/*
 * Smart design system.
 *
 * Dark-first athletic palette with an electric cyan accent.
 * All colors use oklch format.
 */

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);
  --radius-3xl: calc(var(--radius) + 12px);
  --radius-4xl: calc(var(--radius) + 16px);

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-ring-offset-background: var(--background);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);

  /* Smart custom tokens */
  --color-glow: var(--glow);
  --color-glow-strong: var(--glow-strong);
  --color-surface: var(--surface);
  --color-surface-elevated: var(--surface-elevated);
}

:root {
  --radius: 0.75rem;

  /* Dark-first Smart palette */
  --background: oklch(0.145 0.03 260);
  --foreground: oklch(0.96 0.01 260);
  --card: oklch(0.185 0.035 260);
  --card-foreground: oklch(0.96 0.01 260);
  --popover: oklch(0.185 0.035 260);
  --popover-foreground: oklch(0.96 0.01 260);
  --primary: oklch(0.75 0.18 185);
  --primary-foreground: oklch(0.12 0.04 260);
  --secondary: oklch(0.235 0.04 260);
  --secondary-foreground: oklch(0.96 0.01 260);
  --muted: oklch(0.32 0.04 260);
  --muted-foreground: oklch(0.65 0.03 260);
  --accent: oklch(0.75 0.18 185);
  --accent-foreground: oklch(0.12 0.04 260);
  --destructive: oklch(0.62 0.22 25);
  --destructive-foreground: oklch(0.98 0.01 260);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 12%);
  --ring: oklch(0.75 0.18 185);
  --chart-1: oklch(0.75 0.18 185);
  --chart-2: oklch(0.65 0.15 145);
  --chart-3: oklch(0.55 0.12 260);
  --chart-4: oklch(0.7 0.16 90);
  --chart-5: oklch(0.6 0.14 340);

  --glow: oklch(0.75 0.18 185 / 0.35);
  --glow-strong: oklch(0.75 0.18 185 / 0.55);
  --surface: oklch(0.2 0.04 260);
  --surface-elevated: oklch(0.24 0.045 260);
}

@layer base {
  * {
    border-color: var(--color-border);
  }

  body {
    background-color: var(--color-background);
    color: var(--color-foreground);
  }

  html {
    scroll-behavior: smooth;
  }
}

@utility text-balance {
  text-wrap: balance;
}

@utility glow-primary {
  box-shadow: 0 0 40px -10px var(--color-glow);
}

@utility glow-primary-strong {
  box-shadow: 0 0 60px -8px var(--color-glow-strong);
}

@utility bg-hero-glow {
  background: radial-gradient(
    ellipse 60% 40% at 50% 0%,
    var(--color-glow),
    transparent 70%
  );
}

@utility bg-cta-glow {
  background: radial-gradient(
    ellipse 50% 60% at 50% 100%,
    var(--color-glow),
    transparent 70%
  );
}
```

---

## 2. `src/routes/index.tsx`

```tsx
import { createFileRoute } from "@tanstack/react-router";

import { Navbar } from "@/components/smart/navbar";
import { Hero } from "@/components/smart/hero";
import { Features } from "@/components/smart/features";
import { Stats } from "@/components/smart/stats";
import { Testimonial } from "@/components/smart/testimonial";
import { CTA } from "@/components/smart/cta";
import { Footer } from "@/components/smart/footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart — Hệ thống Quản lý & Luyện tập Thông minh" },
      {
        name: "description",
        content:
          "Ghi nhật ký ăn uống, theo dõi lịch tập luyện và đạt được vóc dáng mơ ước với Smart.",
      },
      {
        property: "og:title",
        content: "Smart — Hệ thống Quản lý & Luyện tập Thông minh",
      },
      {
        property: "og:description",
        content:
          "Ghi nhật ký ăn uống, theo dõi lịch tập luyện và đạt được vóc dáng mơ ước với Smart.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Stats />
        <Testimonial />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
```

---

## 3. `src/components/smart/logo.tsx`

```tsx
import { Zap } from "lucide-react";

interface LogoProps {
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({ showText = true, size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "size-7 text-sm",
    md: "size-9 text-base",
    lg: "size-11 text-lg",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`grid ${sizeClasses[size]} place-items-center rounded-xl bg-primary text-primary-foreground`}
      >
        <Zap className="size-[55%] fill-current" />
      </div>
      {showText && (
        <span
          className={`font-semibold tracking-tight ${textSizes[size]} text-foreground`}
        >
          Smart
        </span>
      )}
    </div>
  );
}
```

---

## 4. `src/components/smart/navbar.tsx`

```tsx
import { Link } from "@tanstack/react-router";
import { Logo } from "./logo";

const navLinks = [
  { label: "Tính năng", href: "#features" },
  { label: "Số liệu", href: "#stats" },
  { label: "Cộng đồng", href: "#testimonial" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="#cta"
            className="hidden rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary sm:inline-flex"
          >
            Đăng nhập
          </a>
          <a
            href="#cta"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
          >
            Bắt đầu ngay
          </a>
        </div>
      </div>
    </header>
  );
}
```

---

## 5. `src/components/smart/hero.tsx`

```tsx
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
          <a
            href="#cta"
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground transition-all hover:brightness-110 glow-primary"
          >
            Bắt đầu miễn phí
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-full border border-border px-7 py-3.5 text-base font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <Play className="size-4 fill-current" />
            Xem tính năng
          </a>
        </div>

        <div className="relative mx-auto mt-16 max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <img
            src={dashboardImage}
            alt="Giao diện ứng dụng Smart với lịch tập, nhật ký ăn uống và thống kê tiến độ"
            width={1440}
            height={912}
            className="w-full"
            loading="eager"
          />
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
        </div>
      </div>
    </section>
  );
}
```

---

## 6. `src/components/smart/features.tsx`

```tsx
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
```

---

## 7. `src/components/smart/stats.tsx`

```tsx
const stats = [
  { value: "120K+", label: "thành viên tại Việt Nam" },
  { value: "4.9", suffix: "/5", label: "đánh giá trung bình" },
  { value: "18M+", label: "bữa ăn đã ghi nhận" },
  { value: "2.4M", label: "bài tập mỗi tuần" },
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
```

---

## 8. `src/components/smart/testimonial.tsx`

```tsx
import { Star } from "lucide-react";

export function Testimonial() {
  return (
    <section id="testimonial" className="border-t border-border">
      <div className="mx-auto max-w-4xl px-6 py-20 text-center md:py-28">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Cộng đồng
        </p>

        <div className="mx-auto mt-6 flex justify-center gap-1 text-primary">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="size-5 fill-current" />
          ))}
        </div>

        <blockquote className="mx-auto mt-8 max-w-[36ch] text-balance text-2xl font-medium leading-snug tracking-tight text-foreground md:text-4xl">
          “Smart giúp tôi nhìn thấy sự tiến bộ từng ngày. Lần đầu tiên tôi duy
          trì được thói quen tập luyện suốt 6 tháng.”
        </blockquote>

        <div className="mt-10 flex items-center justify-center gap-3">
          <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            MA
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">Minh Anh</p>
            <p className="text-xs text-muted-foreground">
              Huấn luyện viên cá nhân · Hà Nội
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
```

---

## 9. `src/components/smart/cta.tsx`

```tsx
import { ArrowRight } from "lucide-react";

export function CTA() {
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
              30 ngày miễn phí. Không cần thẻ tín dụng. Hủy bất cứ lúc nào.
            </p>

            <form className="mx-auto mt-9 flex max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="email"
                placeholder="email@ban.vn"
                className="flex-1 rounded-full border border-input bg-background px-5 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
              >
                Đăng ký miễn phí
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>

            <p className="mt-5 text-xs text-muted-foreground">
              Dùng thử không ràng buộc · Hỗ trợ tiếng Việt
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
```

---

## 10. `src/components/smart/footer.tsx`

```tsx
import { Logo } from "./logo";

const footerLinks = [
  { label: "Điều khoản", href: "#" },
  { label: "Quyền riêng tư", href: "#" },
  { label: "Liên hệ", href: "#" },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
        <div className="flex items-center gap-4">
          <Logo size="sm" />
          <span className="text-sm text-muted-foreground">
            © 2026 Smart. Thiết kế cho thể thao.
          </span>
        </div>

        <div className="flex items-center gap-6">
          {footerLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
```

---

## Asset note

The Hero imports `src/assets/smart-dashboard.png`. Place any dashboard/preview screenshot at that path, or update the import in `hero.tsx` to point to your own image.

## How to use with another AI

Copy this entire document and say:

> "Replicate this Smart landing page in my React + Tailwind v4 project. Replace `src/routes/index.tsx`, create the `src/components/smart/` folder with the components below, and merge `src/styles.css` into my global styles. Keep the dark cyan theme and Vietnamese copy."
