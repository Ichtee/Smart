import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-[#0B0F19] text-white overflow-x-hidden">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
