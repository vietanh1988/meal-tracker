import "./globals.css";
import { Inter } from "next/font/google";
import Nav from "@/components/Nav";
import Track from "@/components/Track";
import Footer from "@/components/Footer";
import { safeUrl } from "@/lib/sanitize";
import { headTags } from "@/lib/headTags";
import { getSettings, getMenu, siteUrl, ogBase } from "@/lib/site";

// Font y hệt app: thứ tự -apple-system, "system-ui", Inter, "Inter Fallback", "Segoe UI", Roboto, … (globals.css).
// Máy Apple dùng San Francisco; Windows / Android dùng Inter — tải từ chính fipilotai.com (next/font, chỉ bộ chữ Việt + Latin,
// 1 file biến thiên mọi độ đậm), không chờ Google Fonts nên chữ hiện ngay. Bỏ Roboto (đứng sau Inter, gần như không dùng tới).
// 23/10 PageSpeed: Android dùng system-ui (Roboto), Apple dùng San Francisco → chỉ Windows cần Inter. Bỏ preload để điện thoại không tải 58 KB phông không dùng.
const inter = Inter({ subsets: ["latin", "vietnamese"], display: "swap", variable: "--font-inter", preload: false });

export async function generateMetadata() {
  const s = await getSettings();
  const t = s.tracking || {};
  const verification = {};
  if (t.gsc) verification.google = t.gsc;
  const other = {};
  if (t.bing) other["msvalidate.01"] = t.bing;
  if (t.fb_domain) other["facebook-domain-verification"] = t.fb_domain;
  if (Object.keys(other).length) verification.other = other;
  return {
    metadataBase: new URL(siteUrl(s, "/")),
    title: { default: `${s.site.name} — ${s.site.tagline}, thực đơn đúng calo`, template: (s.site.title_tpl || "%title% | %site%").replace("%title%", "%s").replace("%site%", s.site.name) },
    description: "Giảm cân bằng món Việt quen thuộc. App tự lên thực đơn đúng calo mỗi ngày — phở, bún, cơm tấm vẫn ăn được.",
    applicationName: s.site.name,
    twitter: { card: "summary_large_image" },
    openGraph: ogBase(s),
    ...(s.site.favicon_url ? { icons: { icon: s.site.favicon_url, apple: s.site.favicon_url } } : {}),
    verification,
    ...(s.seo?.block_all ? { robots: { index: false, follow: false } } : {}),
  }; // canonical đặt ở từng trang (đặt ở đây thì /tim-kiem, 404 kế thừa canonical trang chủ)
}
export const viewport = { themeColor: "#0062F0", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }) {
  const s = await getSettings();
  const [header, f1, f2, f3, mobile] = await Promise.all([getMenu("header"), getMenu("footer_1"), getMenu("footer_2"), getMenu("footer_3"), getMenu("mobile")]);
  const nb = s.notice_bar || {};
  const now = Date.now();
  const showBar = nb.enabled && nb.text && (!nb.from || Date.parse(nb.from) <= now) && (!nb.to || Date.parse(nb.to) >= now);
  const t = s.tracking || {};
  const ga4 = /^G-[A-Z0-9]+$/.test(t.ga4 || "") ? t.ga4 : "";
  return (
    <html lang="vi" className={inter.variable}>
      <head>
        {/* GA4 + mã <head> tuỳ ý in thẳng vào HTML (không chèn bằng JS sau khi tải) → Google "Kiểm tra thẻ" và bot đọc được. async nên không làm chậm trang */}
        {/* 23/10: Search Console đã xác minh bằng thẻ HTML → gtag.js (178 KB) không cần nằm sẵn trong <head>. Lệnh gtag vẫn ghi ngay vào dataLayer;
            file gtag.js tải sau khi trang hiện xong (load + 1,5 s) hoặc ngay khi khách chạm / cuộn — không giành mạng với nội dung (PageSpeed điện thoại).
            Cài đặt SEO › Mã theo dõi tắt "Chỉ chạy mã đo sau khi trang đã hiện xong" (lazy = false) thì tải ngay như cũ. */}
        {ga4 && <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());if(/(^|\\.)fipilotai\\.com$/.test(location.hostname)){gtag('config','${ga4}');(function(){var d=0;function go(){if(d)return;d=1;var g=document.createElement('script');g.async=1;g.src='https://www.googletagmanager.com/gtag/js?id=${ga4}';document.head.appendChild(g)}${t.lazy === false ? "go()" : "['touchstart','scroll','keydown','mousemove'].forEach(function(e){addEventListener(e,go,{once:true,passive:true})});function w(){setTimeout(go,1500)}document.readyState==='complete'?w():addEventListener('load',w)"}})()}` }} />}
        {headTags(t.head, ga4)}
      </head>
      <body>
        {showBar && <a href={safeUrl(nb.url)} style={{ display: "block", background: "#0B1F45", color: "#fff", textAlign: "center", padding: "10px 16px", fontSize: 14, fontWeight: 600 }}>{nb.text}</a>}
        <Nav items={header} mobile={mobile} s={s} />
        {children}
        <Footer s={s} menus={{ footer_1: f1, footer_2: f2, footer_3: f3 }} />
        <Track />
        {t.vercel_analytics && <script dangerouslySetInnerHTML={{ __html: later(t, `window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};var v=document.createElement('script');v.defer=1;v.src='/_vercel/insights/script.js';document.head.appendChild(v);`) }} />}
        {/^\d{5,20}$/.test(t.fb_pixel || "") && <script dangerouslySetInnerHTML={{ __html: later(t, `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${t.fb_pixel}');fbq('track','PageView');`) }} />}
        {(t.body_start || t.body_end) && <script dangerouslySetInnerHTML={{ __html: customLoader(t) }} />}
      </body>
    </html>
  );
}

// Mã đo: mặc định chạy sau khi trang tải xong (Cài đặt SEO › Mã theo dõi › Chỉ chạy mã đo sau khi trang đã hiện xong)
function later(t, js) {
  const g = `if(navigator.webdriver||!/(^|\\.)fipilotai\\.com$/.test(location.hostname))return;`; // không đếm máy test / bản xem trước
  return t.lazy === false ? `(function(){${g}${js}})();` : `(function(){${g}function go(){${js}}document.readyState==="complete"?go():addEventListener("load",go)})();`;
}

// Cài đặt SEO › Mã theo dõi › Chèn mã tuỳ ý (chỉ admin nhập): chèn khi trang hiện xong; createContextualFragment để <script> trong mã vẫn chạy
function customLoader(t) {
  const j = (v) => JSON.stringify(String(v || "")).replace(/</g, "\\u003c");
  return `(function(){function put(h,el,first){if(!h)return;try{var f=document.createRange().createContextualFragment(h);first?el.insertBefore(f,el.firstChild):el.appendChild(f)}catch(e){}}function go(){put(${j(t.body_start)},document.body,1);put(${j(t.body_end)},document.body)}document.readyState==="complete"?go():addEventListener("load",go)})();`;
}

