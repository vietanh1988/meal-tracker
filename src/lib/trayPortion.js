// 31/10 (bản vẽ "Giỏ món theo đơn vị", chủ dự án chốt): khẩu phần theo đơn vị tự nhiên trong giỏ Ghi bữa — hàm thuần, có test (tests/tray-portion.test.mjs).
// Đơn vị lấy từ UNIT_MAP (src/lib/localFoodDB.js): "1 quả / 2 quả / 3 quả" → 1 đơn vị đếm "quả" (50 g / quả);
// "chén nhỏ / chén vừa / chén đầy / bát" → 4 cỡ, mỗi cỡ 1 số gram. Món: qty_display = "2 quả" | "1 chén vừa" | "½ quả", gram = số × gram mỗi đơn vị.
import { UNIT_MAP } from "./localFoodDB.js";
import { scaleItem } from "./mobileView.js";

const num = (s) => Number(String(s).replace(",", "."));
/** số khẩu phần → chữ: 0,5 → "½", 1,5 → "1,5", 2 → "2" */
export const fmtQty = (n) => (n === 0.5 ? "½" : String(Math.round(n * 10) / 10).replace(".", ","));
const parseQty = (s) => (s === "½" ? 0.5 : num(s));

/** các khẩu phần của món: [{ u: "quả", g: 50 }] hoặc [{ u: "chén nhỏ", g: 100 }, …]; không có → [] */
export function portionOptions(food) {
  const key = String(food || "").toLowerCase().trim();
  const list = UNIT_MAP[food] || UNIT_MAP[key] || [];
  const out = [];
  for (const x of list) {
    const m = String(x.name).match(/^([\d,.]+)\s+(.+)$/);
    const u = m ? m[2].trim() : String(x.name).trim();
    const g = m ? x.gram / num(m[1]) : x.gram;
    if (!(g > 0) || out.some((o) => o.u === u)) continue;
    out.push({ u, g: Math.round(g * 10) / 10 });
  }
  return out;
}

// món từ Chụp ảnh / AI có sẵn unit + unit_g (src/lib/portion.js) mà kho không có đơn vị → dùng đơn vị đó
const SOLID = (u) => u && !["g", "ml", "gram", "gr"].includes(u);
/** khẩu phần của 1 món trong giỏ (kho món trước, rồi unit/unit_g của món) */
export function optionsFor(item) {
  const o = portionOptions(item?.food);
  if (o.length) return o;
  return SOLID(item?.unit) && Number(item?.unit_g) > 0 ? [{ u: item.unit, g: Number(item.unit_g) }] : [];
}

/** khẩu phần đang dùng của món trong giỏ → { n, u, g } hoặc null (đang tính theo gram) */
export function readPortion(item, opts = optionsFor(item)) {
  if (!opts.length || item?.unit_mode === "g") return null;
  if (!item?.qty_display) {
    const o = opts.find((x) => x.u === item?.unit);
    return o && Number(item.gram) > 0 ? { n: Math.max(0.5, Math.round((item.gram / o.g) * 2) / 2), u: o.u, g: o.g } : null;
  }
  const s = String(item.qty_display).trim();
  const m = s.match(/^([\d,.]+|½)\s+(.+)$/);
  const n = m ? parseQty(m[1]) : 1;
  const u = m ? m[2].trim() : s;
  const o = opts.find((x) => x.u === u);
  return o && n > 0 ? { n, u: o.u, g: o.g } : null;
}

/** đặt khẩu phần (n đơn vị u) → món mới, calo / đạm… tính lại theo gram */
export function applyPortion(item, { n, u, g }) {
  const { unit_mode, ...it } = scaleItem(item, Math.round(n * g)); void unit_mode;
  return { ...it, qty_display: `${fmtQty(n)} ${u}` };
}

/** − / +: theo khẩu phần (≥ 1 bước 1, dưới 1 bước ½, nhỏ nhất ½); món tính gram: bước 25 % (làm tròn 5 g, nhỏ nhất 10 g) */
export function stepPortion(item, dir, opts = optionsFor(item)) {
  const p = readPortion(item, opts);
  if (p) {
    const step = dir > 0 ? (p.n < 1 ? 0.5 : 1) : (p.n <= 1 ? 0.5 : 1);
    const n = Math.max(0.5, Math.round((p.n + dir * step) * 2) / 2);
    return n === p.n ? item : applyPortion(item, { ...p, n });
  }
  const g = Number(item.gram) || 100;
  return scaleItem(item, Math.max(10, Math.round((g * (1 + dir * 0.25)) / 5) * 5));
}

/** chọn cỡ khác: giữ số lượng (2 chén vừa → Bát → 2 bát) */
export function pickPortion(item, opt, opts = optionsFor(item)) {
  const p = readPortion(item, opts);
  return applyPortion(item, { n: p ? p.n : 1, u: opt.u, g: opt.g });
}

/** nhập gram: bỏ khẩu phần, tính theo gram (tối đa 3000 g) */
export function gramPortion(item, g) {
  const out = scaleItem(item, Math.min(3000, Math.max(0, Math.round(Number(g) || 0))));
  return optionsFor(item).length ? { ...out, unit_mode: "g" } : out;
}
