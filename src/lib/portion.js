// Khẩu phần theo ĐƠN VỊ (16/10, bản vẽ 81/88): món có thể hiện "1,5 bát", "2 quả", "250 ml" thay vì chỉ gram.
// Gram vẫn là số gốc để tính macro; đơn vị chỉ là cách hiển thị + bước −/+.
//  - item.unit_g: số gram của 1 đơn vị (VD bát = 166 g). Có unit_g + unit (≠ g/ml) → chế độ đơn vị.
//  - item.unit === "ml": đồ uống, hiện số gram như ml (1 ml ≈ 1 g).
//  - item.unit_mode === "g": người dùng chọn xem theo gram dù món có đơn vị.
import { scaleItem } from "./mobileView.js";

const SOLID = (u) => u && u !== "g" && u !== "ml" && u !== "gram" && u !== "gr";
const fmt = (q) => String(Math.round(q * 10) / 10).replace(".", ",");

export function hasUnit(item) { return SOLID(item?.unit) && Number(item?.unit_g) > 0; }

// Cách hiển thị số lượng: { mode: "unit"|"g"|"ml", qty, label, unit, approxG }
export function portionOf(item) {
  const g = Math.round(Number(item?.gram) || 0);
  if (hasUnit(item) && item.unit_mode !== "g") {
    const q = Math.round((g / item.unit_g) * 2) / 2 || 0.5; // làm tròn ½ đơn vị
    return { mode: "unit", qty: q, label: fmt(q), unit: item.unit, approxG: g };
  }
  if (item?.unit === "ml") return { mode: "ml", qty: g, label: String(g), unit: "ml", approxG: null };
  return { mode: "g", qty: g, label: String(g), unit: "g", approxG: null };
}

const gStep = (g) => (g >= 200 ? 20 : g >= 60 ? 10 : 5);

// Bấm −/+ : chế độ đơn vị nhảy ½ đơn vị (khi ≤ 1) hoặc 1 đơn vị; gram/ml nhảy 5/10/20 g
export function stepPortion(item, dir) {
  const p = portionOf(item);
  if (p.mode === "unit") {
    const step = (dir < 0 ? p.qty <= 1 : p.qty < 1) ? 0.5 : 1;
    const nq = Math.max(0.5, p.qty + dir * step);
    return { ...scaleItem(item, Math.round(nq * item.unit_g)), unit: item.unit, unit_g: item.unit_g, unit_mode: item.unit_mode };
  }
  const g = Math.round(Number(item.gram) || 0);
  const ng = Math.max(1, Math.min(3000, g + dir * gStep(dir < 0 ? g - 1 : g)));
  return keepUnit(item, scaleItem(item, ng));
}

// Gõ số trực tiếp (theo đơn vị đang hiện)
export function setPortion(item, value) {
  const v = Number(String(value).replace(",", "."));
  if (!(v > 0)) return item;
  const p = portionOf(item);
  const g = p.mode === "unit" ? Math.round(v * item.unit_g) : Math.round(v);
  return keepUnit(item, scaleItem(item, Math.max(1, Math.min(3000, g))));
}

// Đổi qua lại đơn vị ↔ gram
export function toggleUnit(item) {
  if (!hasUnit(item)) return item;
  return { ...item, unit_mode: item.unit_mode === "g" ? undefined : "g" };
}

function keepUnit(from, to) {
  const out = { ...to };
  for (const k of ["unit", "unit_g", "unit_mode"]) if (from[k] !== undefined) out[k] = from[k];
  return out;
}
