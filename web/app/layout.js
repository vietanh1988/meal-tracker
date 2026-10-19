import "./globals.css";
import Nav from "@/components/Nav";
import Track from "@/components/Track";
import Footer from "@/components/Footer";
import { getSettings, getMenu, siteUrl, alt } from "@/lib/site";

// Font y hệt app (index.html của app): Inter + Roboto từ Google Fonts, cùng độ đậm, cùng thứ tự dự phòng.
const FONT_CSS = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Roboto:wght@400;500;700;900&display=swap";

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
    openGraph: { siteName: s.site.name, locale: "vi_VN", type: "website", images: [{ url: s.site.og_image || "/og-image.png", width: 1200, height: 630 }] },
    ...(s.site.favicon_url ? { icons: { icon: s.site.favicon_url, apple: s.site.favicon_url } } : {}),
    verification,
    alternates: alt("/"),
  };
}
export const viewport = { themeColor: "#0062F0", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }) {
  const s = await getSettings();
  const [header, f1, f2, f3, mobile] = await Promise.all([getMenu("header"), getMenu("footer_1"), getMenu("footer_2"), getMenu("footer_3"), getMenu("mobile")]);
  const nb = s.notice_bar || {};
  const now = Date.now();
  const showBar = nb.enabled && nb.text && (!nb.from || Date.parse(nb.from) <= now) && (!nb.to || Date.parse(nb.to) >= now);
  const t = s.tracking || {};
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href={FONT_CSS} rel="stylesheet" />
      </head>
      <body>
        {showBar && <a href={nb.url || "#"} style={{ display: "block", background: "#0B1F45", color: "#fff", textAlign: "center", padding: "10px 16px", fontSize: 14, fontWeight: 600 }}>{nb.text}</a>}
        <Nav items={header} mobile={mobile} s={s} />
        {children}
        <Footer s={s} menus={{ footer_1: f1, footer_2: f2, footer_3: f3 }} />
        <Track />
        {t.ga4 && /^G-[A-Z0-9]+$/.test(t.ga4) && <script dangerouslySetInnerHTML={{ __html: later(t, `window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${t.ga4}');var g=document.createElement('script');g.async=1;g.src='https://www.googletagmanager.com/gtag/js?id=${t.ga4}';document.head.appendChild(g);`) }} />}
        {t.vercel_analytics && <script dangerouslySetInnerHTML={{ __html: later(t, `window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};var v=document.createElement('script');v.defer=1;v.src='/_vercel/insights/script.js';document.head.appendChild(v);`) }} />}
        {/^\d{5,20}$/.test(t.fb_pixel || "") && <script dangerouslySetInnerHTML={{ __html: later(t, `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${t.fb_pixel}');fbq('track','PageView');`) }} />}
        {(t.head || t.body_start || t.body_end) && <script dangerouslySetInnerHTML={{ __html: customLoader(t) }} />}
      </body>
    </html>
  );
}

// Mã đo: mặc định chạy sau khi trang tải xong (Cài đặt SEO › Mã theo dõi › Chỉ chạy mã đo sau khi trang đã hiện xong)
function later(t, js) { return t.lazy === false ? js : `(function(){function go(){${js}}document.readyState==="complete"?go():addEventListener("load",go)})();`; }

// Cài đặt SEO › Mã theo dõi › Chèn mã tuỳ ý (chỉ admin nhập): chèn khi trang hiện xong; createContextualFragment để <script> trong mã vẫn chạy
function customLoader(t) {
  const j = (v) => JSON.stringify(String(v || "")).replace(/</g, "\\u003c");
  return `(function(){function put(h,el,first){if(!h)return;try{var f=document.createRange().createContextualFragment(h);first?el.insertBefore(f,el.firstChild):el.appendChild(f)}catch(e){}}function go(){put(${j(t.head)},document.head);put(${j(t.body_start)},document.body,1);put(${j(t.body_end)},document.body)}document.readyState==="complete"?go():addEventListener("load",go)})();`;
}
