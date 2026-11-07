// 07/11 (chủ dự án chốt bản vẽ "Bảng calo đủ món"): /bang-calo tra được mọi món trong kho app (~1.400 món),
// món có trang /calo riêng có ảnh + link, món chỉ tra cứu thì không link. Hàm thuần, có test (web/tests/calotable.test.mjs).
import { DISH_GROUPS } from "./foods.js";
import { slugify } from "./slug.js";

// 5 nhóm kiểu món (theo tên) đứng trước, rồi 5 nhóm theo loại thực phẩm
export const TABLE_GROUPS = [...DISH_GROUPS.map(([n]) => n), "Trái cây", "Rau", "Thịt, cá, trứng", "Sữa, hạt", "Khác"];
const MEAT = new Set(["poultry", "beef", "pork", "seafood"]);
export function tableGroup(f) {
  const d = DISH_GROUPS.findIndex(([, re]) => re.test(f?.name || ""));
  if (d >= 0) return d;
  const c = f?.cat;
  if (c === "drink") return 4;
  if (c === "fruit") return 5;
  if (c === "veg") return 6;
  if (MEAT.has(c) || (c === "egg_dairy" && /trứng/i.test(f?.name || ""))) return 7;
  if (c === "egg_dairy" || c === "nuts") return 8;
  return 9;
}

// all: allFoods() (thứ tự kho, món phổ biến trước); pages: caloFoods() (món có trang riêng)
// → { list (đã lọc + xếp: có trang trước, rồi theo nhóm, rồi thứ tự kho), groups: [[slug, tên, số món]], total, withPage }
export function caloTable(all, pages, { g = "", q = "" } = {}) {
  const byKey = new Map(pages.map((p) => [p.key, p]));
  let list = all.map((f, i) => { const p = byKey.get(f.key); return { ...f, ...(p ? { slug: p.slug, page: p.page } : {}), hasPage: !!p, tg: tableGroup(f), _i: i }; });
  // món có trang nhưng không còn trong kho (không xảy ra, phòng hờ): vẫn hiện
  for (const p of pages) if (!list.some((x) => x.key === p.key)) list.push({ ...p, hasPage: true, tg: tableGroup(p), _i: list.length });
  const groups = TABLE_GROUPS.map((n, i) => [slugify(n), n, list.filter((x) => x.tg === i).length]).filter(([, , n]) => n > 0);
  let gi = -1;
  if (g) { gi = TABLE_GROUPS.findIndex((n) => slugify(n) === g); if (gi < 0) return null; list = list.filter((x) => x.tg === gi); }
  const qs = slugify(String(q || "").trim());
  if (qs) list = list.filter((x) => slugify(x.name).includes(qs));
  list.sort((a, b) => (b.hasPage - a.hasPage) || (a.tg - b.tg) || (a._i - b._i));
  return { list, groups, total: list.length, withPage: list.filter((x) => x.hasPage).length, all: all.length, gi };
}
