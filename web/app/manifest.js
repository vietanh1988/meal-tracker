// 23/10: /manifest.webmanifest — web có hướng dẫn "Thêm vào màn hình chính" → đủ icon 192 / 512 + bản maskable
export default function manifest() {
  return {
    name: "Fipilot AI — Giảm cân bằng món Việt",
    short_name: "Fipilot AI",
    description: "Thực đơn món Việt đúng calo, bảng calo món ăn và máy tính calo.",
    start_url: "/",
    display: "standalone",
    background_color: "#F3F6FB",
    theme_color: "#0062F0",
    lang: "vi",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
