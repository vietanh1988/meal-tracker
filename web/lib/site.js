import { safeUrl } from "./sanitize.js";
import { aboutApp, fmtPhone } from "./appdata.js";
import { q } from "./sb.js";
import { getPlan, fillTrial } from "./plans.js";

export const DEFAULTS = {
  site: { name: "Fipilot AI", tagline: "Giảm cân bằng món Việt", url: "https://fipilotai.com", app_url: "https://app.fipilotai.com", posts_per_page: 12, title_tpl: "%title% | %site%" },
  contact: { email: "mrvietanh1988@gmail.com", phone: "0967 838 989" },
  footer: { about: "Giảm cân bằng món Việt quen thuộc — app lo phần tính, bạn chỉ việc ăn theo.", copyright: "© %year% Fipilot AI", note: "Số calo tham khảo từ kho món Fipilot AI · không thay thế tư vấn bác sĩ", popular_foods: ["phở bò", "cơm tấm", "bánh mì thịt", "bún chả", "bún bò huế", "bánh cuốn", "cháo gà"], show_app_card: true },
  seo: { cat_base: "chu-de", tag_base: "the", calo_base: "calo", sitemap: { post: true, page: true, category: true, tag: false, calo: true, author: true, images: true }, robots_extra: "Disallow: /api/\nDisallow: /tim-kiem\n", allow_ai_bots: true, org: { type: "Organization", name: "Fipilot AI" } },
  tracking: {},
  notice_bar: { enabled: false },
  pricing: { free: { name: "Miễn phí" }, premium: { name: "Premium" }, faq: [] }, // giá thật: s.plan (từ app)
};

export async function getSettings() {
  const rows = (await q("web_settings?select=key,value")) || [];
  const s = JSON.parse(JSON.stringify(DEFAULTS));
  for (const r of rows) s[r.key] = { ...(s[r.key] || {}), ...(r.value || {}) };
  // Liên hệ: ô trống ở Cài đặt web lấy từ trang Giới thiệu của app (email, hotline, Zalo, Facebook)
  const a = await aboutApp();
  const fromApp = { email: a.contact, phone: a.hotline && fmtPhone(a.hotline), zalo: a.zalo && `https://zalo.me/${String(a.zalo).replace(/\D/g, "")}`, zalo_phone: a.zalo && fmtPhone(a.zalo), facebook: a.facebook };
  const web = Object.fromEntries(Object.entries((rows.find((r) => r.key === "contact") || {}).value || {}).filter(([, v]) => v));
  const plan = await getPlan(); // giá + ngày dùng thử + giới hạn AI lấy từ app (Gói cước & giới hạn)
  // %trial% ở mọi ô chữ của Cài đặt (thanh thông báo, chân trang, hỏi đáp…) → số ngày dùng thử thật
  const fill = (v) => (typeof v === "string" ? fillTrial(v, plan) : Array.isArray(v) ? v.map(fill) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)])) : v);
  for (const k of Object.keys(s)) s[k] = fill(s[k]);
  s.plan = plan;
  s.contact = { ...DEFAULTS.contact, ...Object.fromEntries(Object.entries(fromApp).filter(([, v]) => v)), ...web };
  return s;
}

export async function getMenu(location) {
  const rows = await q(`web_menus?location=eq.${location}&select=items`);
  // lọc link menu (chặn javascript:…) ngay ở nguồn — Nav / Footer dùng thẳng it.url
  const fix = (l) => (Array.isArray(l) ? l : []).map((it) => ({ ...it, url: safeUrl(it?.url), children: it?.children ? fix(it.children) : it?.children }));
  return fix(rows?.[0]?.items);
}

// openGraph của trang ghi đè hẳn của layout (Next không gộp) → trang nào khai openGraph phải trải ogBase trước
export const ogBase = (s) => ({ siteName: s?.site?.name || "Fipilot AI", locale: "vi_VN", type: "website", images: [{ url: s?.site?.og_image || "/og-image.jpg", width: 1200, height: 630 }] });
export const siteUrl = (s, path = "/") => (s?.site?.url || DEFAULTS.site.url).replace(/\/$/, "") + path;
export const appLink = (s, ref) => `${s?.site?.app_url || DEFAULTS.site.app_url}/?ref=${encodeURIComponent(ref || "web")}`;
export function titleOf(s, t) { return (s?.site?.title_tpl || "%title% | %site%").replace("%title%", t).replace("%site%", s?.site?.name || "Fipilot AI"); }

// canonical + hreflang (web chỉ tiếng Việt: vi-VN + x-default trỏ cùng địa chỉ)
export const alt = (path) => ({ canonical: path, languages: { "vi-VN": path, "x-default": path } });
