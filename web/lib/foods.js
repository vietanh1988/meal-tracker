// Số calo của web = số calo của app: đọc thẳng kho món app (bản chép lib/app/localFoodDB.js) + chỉnh sửa admin (food_overrides).
import { LOCAL_FOODS, UNIT_MAP } from "./app/localFoodDB.js";
import { q } from "./sb.js";
import { slugify, cap } from "./slug.js";

export const GROUPS = { starch: "Cơm, bún, phở, bánh", poultry: "Gà, vịt", beef: "Thịt bò", pork: "Thịt heo", seafood: "Hải sản", egg_dairy: "Trứng, sữa", veg: "Rau", fruit: "Trái cây", nuts: "Hạt, đậu, dầu", drink: "Đồ uống" };

let patched = null;
async function base() {
  if (patched && Date.now() - patched.t < 60_000) return patched.foods;
  const foods = {};
  for (const [k, v] of Object.entries(LOCAL_FOODS)) foods[k] = { ...v };
  const ov = await q("food_overrides?select=key,p,c,f,cal,fiber");
  for (const o of ov || []) {
    const k = String(o.key || "").toLowerCase().trim();
    if (!foods[k]) continue;
    for (const f of ["p", "c", "f", "cal", "fiber"]) if (o[f] != null) foods[k][f] = +o[f];
  }
  patched = { t: Date.now(), foods };
  return foods;
}

const r1 = (n) => Math.round(n * 10) / 10;
export function shape(key, f) {
  if (!f) return null;
  const units = (UNIT_MAP[key] || []).map((u) => ({ name: u.name, gram: u.gram, cal: Math.round((f.cal * u.gram) / 100), p: r1((f.p * u.gram) / 100), c: r1((f.c * u.gram) / 100), f: r1((f.f * u.gram) / 100), fiber: r1(((f.fiber || 0) * u.gram) / 100) }));
  return { key, slug: slugify(key), name: cap(key), group: GROUPS[f.cat] || "Khác", cat: f.cat, region: f.region, per100: { cal: f.cal, p: f.p, c: f.c, f: f.f, fiber: f.fiber || 0 }, portions: units };
}

export async function getFood(key) { const all = await base(); return shape(key, all[key]); }
export async function allFoods() { const all = await base(); return Object.entries(all).map(([k, v]) => shape(k, v)); }
export async function foodBySlug(slug) { const all = await allFoods(); return all.find((x) => x.slug === slug) || null; }
export const mainPortion = (fd) => fd?.portions?.find((p) => /vừa/.test(p.name)) || fd?.portions?.[0] || null;

// Tên khẩu phần như bản vẽ: "ổ" → "1 ổ" (đơn vị trơn thêm 1), "tô vừa" giữ nguyên; cap=true viết hoa chữ đầu ("Tô vừa")
export const porName = (p, cap = false) => { if (!p?.name) return ""; const n = /\d|nhỏ|vừa|lớn/.test(p.name) ? p.name : `1 ${p.name}`; return cap ? n[0].toUpperCase() + n.slice(1) : n; };
// Nhóm món theo bản vẽ 139g (lọc theo kiểu món, không theo nhóm dinh dưỡng)
export const DISH_GROUPS = [["Món nước", /^(phở|bún|hủ tiếu|mì quảng|cao lầu|miến|bánh canh|mì)/i], ["Cơm", /^cơm/i], ["Bánh", /^(bánh|nem|gỏi cuốn)/i], ["Xôi, cháo", /^(xôi|cháo)/i], ["Đồ uống", /^(trà|cà phê|sinh tố|nước|sữa)/i]];
export const dishGroup = (fd) => DISH_GROUPS.findIndex(([, re]) => re.test(fd?.name || ""));
