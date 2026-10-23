/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  trailingSlash: false,
  // Ngày dựng bản web — làm "lastmod" cho trang lấy dữ liệu từ code (bảng calo, trang cố định) trong sitemap / llms.txt
  env: { BUILD_DATE: new Date().toISOString() },
  images: {
    // 23/10: ảnh tối ưu (hiện chỉ infographic /i/…png) ra WebP, đúng 2 cỡ 400 / 800 như ảnh trong bài
    formats: ["image/webp"],
    deviceSizes: [400, 800],
    imageSizes: [],
    remotePatterns: [{ protocol: "https", hostname: "veodsvojxjmjhtrlaieq.supabase.co" }],
  },
  // Ảnh của web trên tên miền fipilotai.com: /anh/2026/10/pho-bo_1600w.webp → kho ảnh 'web'
  async rewrites() {
    return [{ source: "/anh/:path*", destination: "https://veodsvojxjmjhtrlaieq.supabase.co/storage/v1/object/public/web/img/:path*" }];
  },
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    ] }];
  },
};
export default nextConfig;
