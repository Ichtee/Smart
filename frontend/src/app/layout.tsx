import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import Providers from "./Providers";

// Body text: full Vietnamese support. Display: bold condensed face for headings and big numbers.
const bodyFont = Be_Vietnam_Pro({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

const displayFont = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700", "800"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "Smart Fitness - Hệ Thống Luyện Tập & Quản Lý Thông Minh",
    template: "%s | Smart Fitness",
  },
  description: "Ứng dụng theo dõi lịch tập, phân tích nhóm cơ 3D/2D và quản lý dinh dưỡng thông minh hàng ngày.",
  keywords: ["Smart Fitness", "Lịch tập", "Gym", "Fullbody", "PPL", "Upper Lower", "Dinh dưỡng", "Workout"],
  authors: [{ name: "Smart Fitness Team" }],
  icons: {
    icon: "/favicon.ico",
  },
};

// Runs before paint so a saved light theme does not flash dark first. Dark is the default.
const themeScript = `try{var d=document.documentElement;if(localStorage.getItem('theme')==='light')d.classList.add('light');var v=JSON.parse(localStorage.getItem('accentVars')||'null');if(v)for(var k in v)d.style.setProperty(k,v[k])}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="vi"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${bodyFont.variable} ${displayFont.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-background text-foreground overflow-x-clip">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
