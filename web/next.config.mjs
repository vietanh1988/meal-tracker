/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  trailingSlash: false,
  images: {
    formats: ["image/avif", "image/webp"],
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
