import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Smart Fitness",
    short_name: "Smart Fitness",
    description: "Theo dõi lịch tập, dinh dưỡng và chỉ số cơ thể.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#1a1c20",
    theme_color: "#1a1c20",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
