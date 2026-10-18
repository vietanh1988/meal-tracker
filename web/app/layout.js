import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { getSettings, getMenu, siteUrl } from "@/lib/site";

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
    title: { default: `${s.site.name} — ${s.site.tagline}`, template: (s.site.title_tpl || "%title% | %site%").replace("%title%", "%s").replace("%site%", s.site.name) },
    description: "Giảm cân bằng món Việt quen thuộc. App tự lên thực đơn đúng calo mỗi ngày — phở, bún, cơm tấm vẫn ăn được.",
    applicationName: s.site.name,
    openGraph: { siteName: s.site.name, locale: "vi_VN", type: "website", images: [{ url: "/og-image.png", width: 1200, height: 630 }] },
    icons: { icon: "/favicon.png", apple: "/icon-192.png" },
    verification,
    alternates: { canonical: "/" },
  };
}
export const viewport = { themeColor: "#0062F0", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }) {
  const s = await getSettings();
  const [header, f1, f2, f3] = await Promise.all([getMenu("header"), getMenu("footer_1"), getMenu("footer_2"), getMenu("footer_3")]);
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
        <Nav items={header} s={s} />
        {children}
        <Footer s={s} menus={{ footer_1: f1, footer_2: f2, footer_3: f3 }} />
        {t.ga4 && /^G-[A-Z0-9]+$/.test(t.ga4) && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${t.ga4}`} />
            <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${t.ga4}');` }} />
          </>
        )}
      </body>
    </html>
  );
}
