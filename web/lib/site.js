import { q } from "./sb.js";

export const DEFAULTS = {
  site: { name: "Fipilot AI", tagline: "Giảm cân bằng món Việt", url: "https://fipilotai.com", app_url: "https://app.fipilotai.com", posts_per_page: 12, title_tpl: "%title% | %site%" },
  contact: { email: "mrvietanh1988@gmail.com", phone: "0967 838 989" },
  footer: { about: "Giảm cân bằng món Việt quen thuộc — app lo phần tính, bạn chỉ việc ăn theo.", copyright: "© %year% Fipilot AI", note: "Số calo tham khảo từ kho món Fipilot AI · không thay thế tư vấn bác sĩ", popular_foods: ["phở bò", "cơm tấm", "bánh mì thịt", "bún chả", "bún bò huế", "bánh cuốn", "cháo gà"], show_app_card: true },
  seo: { cat_base: "chu-de", tag_base: "the", calo_base: "calo", sitemap: { post: true, page: true, category: true, tag: false, calo: true, author: true, images: true }, robots_extra: "Disallow: /api/\nDisallow: /tim-kiem\n", allow_ai_bots: true, org: { type: "Organization", name: "Fipilot AI" } },
  tracking: {},
  notice_bar: { enabled: false },
  pricing: { free: { name: "Miễn phí", price: "0đ" }, premium: { name: "Premium", price: "99.000đ", unit: " / tháng", trial: "Dùng thử 7 ngày, không cần thẻ" } },
};

export async function getSettings() {
  const rows = (await q("web_settings?select=key,value")) || [];
  const s = JSON.parse(JSON.stringify(DEFAULTS));
  for (const r of rows) s[r.key] = { ...(s[r.key] || {}), ...(r.value || {}) };
  return s;
}

export async function getMenu(location) {
  const rows = await q(`web_menus?location=eq.${location}&select=items`);
  return rows?.[0]?.items || [];
}

export const siteUrl = (s, path = "/") => (s?.site?.url || DEFAULTS.site.url).replace(/\/$/, "") + path;
export const appLink = (s, ref) => `${s?.site?.app_url || DEFAULTS.site.app_url}/?ref=${encodeURIComponent(ref || "web")}`;
export function titleOf(s, t) { return (s?.site?.title_tpl || "%title% | %site%").replace("%title%", t).replace("%site%", s?.site?.name || "Fipilot AI"); }
