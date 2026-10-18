import { q, enc } from "./sb.js";
import { allFoods, foodBySlug } from "./foods.js";

// Món có trang /calo/: món Việt có khẩu phần, trừ món admin tắt; món admin bật thêm (ngoài món Việt) cũng có.
export async function caloRows() { return (await q("web_calo_pages?select=food_key,slug,enabled,intro,image_url,image_alt,portions,faq,related,noindex,updated_at")) || []; }
export async function caloFoods() {
  const [foods, rows] = await Promise.all([allFoods(), caloRows()]);
  const byKey = Object.fromEntries(rows.map((r) => [r.food_key, r]));
  return foods.filter((f) => { const r = byKey[f.key]; return r ? r.enabled : f.region === "vn" && f.portions.length > 0; }).map((f) => ({ ...f, page: byKey[f.key] || null, slug: byKey[f.key]?.slug || f.slug }));
}
export async function caloBySlug(slug) {
  const row = (await q(`web_calo_pages?slug=eq.${enc(slug)}&select=*&limit=1`))?.[0];
  if (row && !row.enabled) return { gone: true };
  const list = await caloFoods();
  const f = list.find((x) => x.slug === slug);
  if (f) return { food: f, page: f.page };
  return null;
}
export { foodBySlug };
