// Kiểm tra calo: gõ danh sách món ("1 tô phở bò, 2 quả trứng luộc, 200g ức gà") →
// tách từng món, tính bằng kho món trong app / food_cache (không tốn lượt AI).
// Món không có trong kho → trả về "unknown" để màn hình mời AI tính (1 lượt macro).
// Hàm thuần (trừ aiCalc), có test: tests/calc-check.test.mjs
import { lookupLocalFood, LOCAL_FOODS, UNIT_MAP, getFoodDisplay } from "./localFoodDB.js";
import { estimateGram } from "./usdaService.js";
import { stripVN, defaultPortion, scaleItem } from "./mobileView.js";

const NUM_WORDS = { "một": 1, "hai": 2, "ba": 3, "bốn": 4, "năm": 5, "sáu": 6, "nửa": 0.5, "rưỡi": 1.5 };
const UNITS = ["ổ", "tô", "bát", "chén", "quả", "trái", "ly", "cốc", "cái", "chiếc", "miếng", "lát", "đĩa", "dĩa", "phần", "suất", "hộp", "gói", "chai", "lon", "xiên", "cuốn", "củ", "nắm", "muỗng", "thìa", "kg", "gram", "gr", "g", "ml", "lít", "l"];
const UNIT_RE = UNITS.map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
const r1 = (x) => Math.round((Number(x) || 0) * 10) / 10;

function normUnit(u) {
  const x = String(u || "").toLowerCase();
  if (x === "gram" || x === "gr") return "g";
  if (x === "kg") return "kg";
  if (x === "lít" || x === "l") return "lít";
  if (x === "chiếc") return "cái";
  if (x === "dĩa") return "đĩa";
  if (x === "suất") return "phần";
  return x;
}

// "1 tô phở bò" → {qty:1, unit:"tô", name:"phở bò"}; "ức gà 200g" → {qty:200, unit:"g", name:"ức gà"}
export function parseFoodLine(raw) {
  let s = String(raw || "").replace(/\s+/g, " ").trim();
  if (!s) return null;
  let qty = null, unit = null;
  const num = "(\\d+(?:[.,]\\d+)?|" + Object.keys(NUM_WORDS).join("|") + ")";
  // đầu câu: "2 quả trứng", "200g ức gà", "nửa ổ bánh mì", "1 tô"
  let m = s.match(new RegExp(`^${num}\\s*(${UNIT_RE})?(?=\\s|$)\\s*(.*)$`, "i"));
  // Chữ số lượng ("ba", "năm", "nửa"…) chỉ tính khi có đơn vị theo sau — tránh "ba chỉ nướng" → 3 × "chỉ nướng"
  if (m && !/^\d/.test(m[1]) && !m[2]) m = null;
  if (m && m[3]) {
    qty = NUM_WORDS[m[1].toLowerCase()] ?? Number(m[1].replace(",", "."));
    unit = m[2] ? normUnit(m[2]) : null;
    s = m[3].trim();
  } else {
    // cuối câu: "ức gà 200g", "cơm 1 chén"
    m = s.match(new RegExp(`^(.*?)\\s+${num}\\s*(${UNIT_RE})?$`, "i"));
    if (m && !/^\d/.test(m[2]) && !m[3]) m = null;
    if (m && m[1]) {
      qty = NUM_WORDS[m[2].toLowerCase()] ?? Number(m[2].replace(",", "."));
      unit = m[3] ? normUnit(m[3]) : null;
      s = m[1].trim();
    }
  }
  // "1 tô" chưa có đơn vị đứng sau số nhưng có ở đầu tên: "tô phở" (VD "một tô phở")
  if (!unit) {
    const u = s.match(new RegExp(`^(${UNIT_RE})\\s+(.*)$`, "i"));
    if (u && u[2]) { unit = normUnit(u[1]); s = u[2].trim(); }
  }
  if (unit === "kg") { unit = "g"; qty = (qty || 1) * 1000; }
  if (unit === "lít") { unit = "ml"; qty = (qty || 1) * 1000; }
  const name = s.replace(/^(của|các|mấy)\s+/i, "").trim().toLowerCase();
  if (!name) return null;
  return { raw: String(raw).trim(), qty: qty && qty > 0 ? qty : null, unit, name };
}

export function parseFoodText(text) {
  return String(text || "").split(/[,\n;+]|\s+và\s+|\s+với\s+/i).map(parseFoodLine).filter(Boolean).slice(0, 20);
}

// Gram ước lượng cho 1 dòng đã tách. key = món trong kho (nếu đã biết).
export function gramOf(entry, key) {
  const { qty, unit } = entry;
  if (unit === "g" || unit === "ml") return Math.round(qty || 100);
  const portions = key ? UNIT_MAP[key] : null;
  if (unit && portions) {
    // "tô" → ưu tiên đúng "tô", rồi "tô vừa", rồi "1 tô…", rồi bất kỳ tên có chữ "tô"
    const u = stripVN(unit);
    const words = (p) => stripVN(p.name).split(" ");
    const hit = portions.find((p) => stripVN(p.name) === u || stripVN(p.name) === `1 ${u}`)
      || portions.find((p) => words(p).includes(u) && words(p).includes("vua"))
      || portions.find((p) => words(p).includes(u));
    if (hit) return Math.round(hit.gram * (qty || 1));
  }
  if (unit) {
    const g = estimateGram(key || entry.name, unit, qty || 1);
    if (g > 0) return g;
  }
  if (key) return Math.round(defaultPortion(key).gram * (qty || 1));
  return Math.round(100 * (qty || 1));
}

function portionLabel(entry, gram) {
  if (entry.unit && entry.unit !== "g" && entry.unit !== "ml") return `${fmtQty(entry.qty || 1)} ${entry.unit}`;
  return null;
}
const fmtQty = (q) => String(Math.round(q * 10) / 10).replace(".", ",");

// Các từ trong tên gõ vào phải nằm trong tên món tìm được (tránh "bánh bao xá xíu" → "bánh bao")
function covers(query, matchedName) {
  const have = new Set(stripVN(matchedName).split(/[\s()]+/).filter(Boolean));
  return stripVN(query).split(" ").filter(Boolean).every((w) => have.has(w));
}

// 1 dòng → món định dạng daily_logs (source localDB/cache) hoặc {unknown:true, near}
// Tên chung chung hay gõ → món cụ thể trong kho
const ALIAS = { "cơm": "cơm trắng", "sữa": "sữa tươi", "trứng": "trứng gà luộc", "trứng gà": "trứng gà luộc", "thịt lợn": "thịt heo", "thịt lợn luộc": "thịt heo luộc" };

// Từ miền Bắc/Nam cùng nghĩa: không thấy thì thử "rán"→"chiên", "lợn"→"heo" (VD "trứng rán" = "trứng chiên")
const SYN = [[/\brán\b/g, "chiên"], [/\blợn\b/g, "heo"], [/\bluộc\b/g, "hấp"]];

export function resolveEntry(entry0, foodCache) {
  const r = resolveEntry1(entry0, foodCache);
  if (!r.unknown && r.source !== "estimate") return r;
  for (const [re, to] of SYN) {
    if (!re.test(entry0.name)) continue;
    re.lastIndex = 0;
    const alt = resolveEntry1({ ...entry0, name: entry0.name.replace(re, to) }, foodCache);
    re.lastIndex = 0;
    if (!alt.unknown && alt.source !== "estimate") return { ...alt, display: entry0.name.charAt(0).toUpperCase() + entry0.name.slice(1) };
  }
  return r;
}

function resolveEntry1(entry0, foodCache) {
  const entry = ALIAS[entry0.name] ? { ...entry0, name: ALIAS[entry0.name] } : entry0;
  const plain = stripVN(entry.name);
  const cacheKey = Object.keys(foodCache || {}).find((k) => stripVN(k) === plain);
  const localKey = LOCAL_FOODS[entry.name] ? entry.name : Object.keys(LOCAL_FOODS).find((k) => stripVN(k) === plain);
  if (localKey) {
    const gram = gramOf(entry, localKey);
    const r = lookupLocalFood(localKey, gram);
    // Gõ đúng tên mã trong kho → hiện đúng tên đó (DISPLAY_MAP có chỗ gộp "ức gà luộc" thành "Gà luộc")
    if (r) return toItem(entry, localKey, stripVN(entry0.name) === stripVN(localKey) ? localKey : getFoodDisplay(localKey), gram, r, "localDB");
  }
  if (cacheKey) {
    const v = foodCache[cacheKey];
    const base = Number(v.gram) || 100;
    // Bản ghi lưu theo 1 khẩu phần thật (gram ≠ 100, VD món AI vừa tính) → nhân số phần.
    // Bản ghi theo 100 g → đổi đơn vị (tô, cái…) ra gram trước, không có thì 1 khẩu phần = 100 g.
    const isW = entry.unit === "g" || entry.unit === "ml";
    const gram = isW ? Math.round(entry.qty || base)
      : base !== 100 ? Math.round(base * (entry.qty || 1))
      : Math.round((entry.unit && estimateGram(cacheKey, entry.unit, entry.qty || 1)) || 100 * (entry.qty || 1));
    const k = gram / base;
    return { food: cacheKey, display: getFoodDisplay(cacheKey), gram, unit: "g", ...(portionLabel(entry) ? { qty_display: portionLabel(entry) } : {}), p: r1(v.p * k), c: r1(v.c * k), f: r1(v.f * k), fiber: r1((v.fiber || 0) * k), cal: Math.round((v.cal || 0) * k), source: "cache", _raw: entry.raw };
  }
  const gram = gramOf(entry, null);
  const r = lookupLocalFood(entry.name, gram);
  if (r) {
    const matched = r.name.replace(/\s*\(.*\)$/, "");
    if (covers(entry.name, r.name)) {
      const g2 = gramOf(entry, matched);
      const r2 = lookupLocalFood(entry.name, g2) || r;
      // Không có đúng món trong kho, tính từ món gốc + cách chế biến ("thịt lợn" + xào): giữ ĐÚNG tên người dùng gõ
      // (trước đây ghép tên hiển thị → "Thịt lợn luộc xào", "Trứng luộc rán") và đánh dấu Ước tính, không phải "Kho món"
      const estimated = stripVN(matched) !== plain;
      if (estimated) return { ...toItem(entry, entry.name, entry.name, g2, r2, "estimate"), base: matched, cook: r2.cook || null };
      return toItem(entry, entry.name, getFoodDisplay(matched), g2, r2, "localDB");
    }
    return { unknown: true, entry, near: toItem(entry, matched, getFoodDisplay(matched), gramOf(entry, matched), lookupLocalFood(matched, gramOf(entry, matched)) || r, "localDB") };
  }
  return { unknown: true, entry, near: null };
}

function toItem(entry, food, display, gram, r, source) {
  const lbl = portionLabel(entry);
  return { food, display: display.charAt(0).toUpperCase() + display.slice(1), gram, unit: "g", ...(lbl ? { qty_display: lbl } : {}), p: r.protein, c: r.carb, f: r.fat, fiber: r.fiber, cal: r.cal, source, _raw: entry.raw };
}

export function resolveAll(text, foodCache) {
  return parseFoodText(text).map((e) => resolveEntry(e, foodCache));
}

export function sumCheck(items) {
  const t = items.reduce((a, it) => ({ cal: a.cal + (Number(it.cal) || 0), p: a.p + (Number(it.p) || 0), c: a.c + (Number(it.c) || 0), f: a.f + (Number(it.f) || 0), fiber: a.fiber + (Number(it.fiber) || 0) }), { cal: 0, p: 0, c: 0, f: 0, fiber: 0 });
  return { cal: Math.round(t.cal), p: Math.round(t.p), c: Math.round(t.c), f: Math.round(t.f), fiber: Math.round(t.fiber) };
}

// Đổi khẩu phần 1 món: bước ×0,5 phần (món có số lượng) hoặc ±25% gram
export function stepItem(item, dir) {
  const g = Number(item.gram) || 100;
  const m = String(item.qty_display || "").match(/^([\d,]+)\s+(.*)$/);
  if (m) {
    const q = Number(m[1].replace(",", "."));
    const step = q <= 1 ? 0.5 : 1;
    const nq = Math.max(0.5, q + dir * step);
    if (nq === q) return item;
    return { ...scaleItem(item, Math.round((g / q) * nq)), qty_display: `${fmtQty(nq)} ${m[2]}` };
  }
  const ng = Math.max(10, Math.round((g * (1 + dir * 0.25)) / 5) * 5);
  return scaleItem(item, ng);
}

// Prompt AI tính macro món lạ (dùng chung feature "macro_lookup" của ai-proxy)
export const CALC_PROMPT = `Bạn là chuyên gia dinh dưỡng Việt Nam. Tính dinh dưỡng cho từng món ăn dưới đây (món đã chế biến, ăn liền).
Mỗi dòng là 1 món, có thể kèm số lượng/đơn vị. Nếu không ghi số lượng, lấy 1 khẩu phần thường gặp ở Việt Nam.
Đồ uống tính theo ml (1 ml ≈ 1 g).
Mảng trả về PHẢI có ĐÚNG số món và ĐÚNG THỨ TỰ như danh sách.
Trả lời ĐÚNG JSON, không markdown: [{"name":"tên món tiếng Việt","gram":số,"cal":số,"p":số,"c":số,"f":số,"fiber":số}]`;

// Đọc câu trả lời AI → items (bỏ số vô lý). Hàm thuần.
export function parseCalcAI(text, entries) {
  const m = String(text || "").match(/\[[\s\S]*\]/);
  if (!m) throw new Error("AI không trả đúng định dạng, thử lại giúp mình nhé.");
  let arr;
  try { arr = JSON.parse(m[0]); } catch (e) { throw new Error("AI không trả đúng định dạng, thử lại giúp mình nhé."); }
  return entries.map((e, i) => {
    const d = (Array.isArray(arr) ? arr : [])[i];
    const gram = Math.round(Number(d?.gram) || 0), cal = Math.round(Number(d?.cal) || 0);
    if (!d || gram <= 0 || gram > 3000 || cal < 0 || cal > 5000) return { unknown: true, entry: e, near: null, failed: true };
    const nm = String(d.name || e.name).trim();
    const lbl = e.unit && e.unit !== "g" && e.unit !== "ml" ? `${fmtQty(e.qty || 1)} ${e.unit}` : null;
    return { food: e.name, display: nm.charAt(0).toUpperCase() + nm.slice(1), gram, unit: "g", ...(lbl ? { qty_display: lbl } : {}), p: r1(d.p), c: r1(d.c), f: r1(d.f), fiber: r1(d.fiber), cal, source: "ai", _raw: e.raw };
  });
}

// Lưu theo ĐÚNG khẩu phần AI đã tính cho 1 đơn vị (VD 1 tô = 500 g), để lần sau gõ "2 tô" nhân đúng.
export function cacheEntryOf(item, qty = 1) {
  const g = Number(item.gram) || 0;
  if (!g) return null;
  const q = Number(qty) > 0 ? Number(qty) : 1;
  return { p: r1(item.p / q), c: r1(item.c / q), f: r1(item.f / q), fiber: r1((item.fiber || 0) / q), cal: Math.round(item.cal / q), gram: Math.round(g / q) };
}

// Tự nhập calo cho món lạ (16/10): khi AI tắt / hết lượt / không có món gần đúng. Trả item hoặc null nếu số vô lý.
export function manualItem(entry, { gram, cal, p, c, f } = {}) {
  const g = Math.round(Number(gram) || 0), k = Math.round(Number(cal) || 0);
  if (g <= 0 || g > 3000 || k <= 0 || k > 5000) return null;
  const n = (x) => Math.max(0, r1(String(x ?? "").replace(",", ".")));
  const nm = String(entry?.name || "").trim();
  if (!nm) return null;
  const lbl = entry.unit && entry.unit !== "g" && entry.unit !== "ml" ? `${fmtQty(entry.qty || 1)} ${entry.unit}` : null;
  return { food: nm, display: nm.charAt(0).toUpperCase() + nm.slice(1), gram: g, unit: "g", ...(lbl ? { qty_display: lbl } : {}), p: n(p), c: n(c), f: n(f), fiber: 0, cal: k, source: "manual", _raw: entry.raw };
}

// Ô tìm Ghi bữa (17/10, bản vẽ 113b): chữ gõ trông như CẢ BỮA (≥ 2 món, hoặc 1 món kèm số + đơn vị "1 tô", "200g")
// → hiện thẻ "≈ X kcal cho N món · Xem & ghi". Trả danh sách dòng đã tách, hoặc null nếu chỉ là tên 1 món để tìm.
export function mealEntries(text) {
  const e = parseFoodText(text);
  if (e.length >= 2) return e;
  if (e.length === 1 && e[0].qty && e[0].unit) return e;
  return null;
}

// Món tự nhập (source "manual") → bản ghi lưu riêng cho tài khoản (fp_my_foods), theo 1 đơn vị
// ("2 cái" → lưu 1 cái) để lần sau gõ "3 cái" nhân đúng. Dùng chung Kiểm tra calo + giỏ Ghi bữa.
export function mineEntries(rows) {
  const out = {};
  (rows || []).forEach((r) => {
    if (!r || r.source !== "manual") return;
    const m = String(r.qty_display || "").match(/^([\d,]+)\s/);
    const ce = cacheEntryOf(r, m ? Number(m[1].replace(",", ".")) || 1 : 1);
    if (ce) out[r.food] = ce;
  });
  return out;
}
