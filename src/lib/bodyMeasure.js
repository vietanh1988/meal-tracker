// Số đo cơ thể (bản vẽ 123a–d, 17/10) — hàm thuần, có test (tests/body-measure.test.mjs).
// Bảng body_measurements: 1 dòng / user / ngày VN (log_date), mỗi số cm (1 chữ số thập phân) hoặc null.
// Màu mũi tên theo mục tiêu: cut/maintain → eo, bụng, mông, đùi nhỏ lại là tốt; bulk → ngực, bắp tay, đùi, mông to lên là tốt,
// eo/bụng to lên khi bulk = cảnh báo nhẹ (tăng mỡ). Ngực/bắp tay nhỏ đi khi cut = trung tính (bình thường khi giảm cân).

import { addDays } from "./dateVN.js";

export const FIELDS = [
  { k: "chest", n: 1, label: "Ngực", hint: "Ngang núm vú, thước song song mặt đất", color: "#2563EB" },
  { k: "waist", n: 2, label: "Eo", hint: "Chỗ nhỏ nhất, trên rốn ~2 cm, thở ra bình thường", color: "#0062F0" },
  { k: "belly", n: 3, label: "Bụng", hint: "Ngang rốn", color: "#0891B2" },
  { k: "hip", n: 4, label: "Mông", hint: "Chỗ to nhất của mông", color: "#7C3AED" },
  { k: "arm", n: 5, label: "Bắp tay", hint: "Giữa bắp tay, tay thả lỏng", color: "#DB2777" },
  { k: "thigh", n: 6, label: "Đùi", hint: "Chỗ to nhất, dưới mông ~5 cm", color: "#EA580C" },
];
export const FIELD_KEYS = FIELDS.map((f) => f.k);
export const ALL_KEYS = [...FIELD_KEYS, "body_fat"];

const r1 = (n) => Math.round(n * 10) / 10;

// "82,5" / "82.5" → 82.5 ; ngoài 10–250 cm → null
export function parseCm(v) {
  const n = Number(String(v ?? "").trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 10 || n > 250) return null;
  return r1(n);
}
// % mỡ 3–60
export function parseFat(v) {
  const n = Number(String(v ?? "").trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 3 || n > 60) return null;
  return r1(n);
}

// Lấy các số hợp lệ từ form (chuỗi) → { chest: 98, …, body_fat: 18.5 } (bỏ ô trống / sai)
export function cleanValues(form) {
  const out = {};
  FIELD_KEYS.forEach((k) => { const v = parseCm(form?.[k]); if (v != null) out[k] = v; });
  const bf = parseFat(form?.body_fat);
  if (bf != null) out.body_fat = bf;
  return out;
}
export const countValues = (row) => ALL_KEYS.filter((k) => row && row[k] != null).length;

// Danh sách dòng (thứ tự bất kỳ) → sắp theo ngày tăng dần, bỏ dòng rỗng
export function sortRows(rows) {
  return (rows || []).filter((r) => r && r.log_date && countValues(r) > 0).sort((a, b) => (a.log_date < b.log_date ? -1 : a.log_date > b.log_date ? 1 : 0));
}

// Số mới nhất của từng ô (có thể từ các ngày khác nhau) + số lần trước để so
// → { waist: { v, date, prev, prevDate, delta } … }
export function latestByField(rows) {
  const s = sortRows(rows);
  const out = {};
  ALL_KEYS.forEach((k) => {
    const has = s.filter((r) => r[k] != null);
    if (!has.length) return;
    const last = has[has.length - 1], prev = has.length > 1 ? has[has.length - 2] : null;
    out[k] = { v: Number(last[k]), date: last.log_date, prev: prev ? Number(prev[k]) : null, prevDate: prev?.log_date || null, delta: prev ? r1(Number(last[k]) - Number(prev[k])) : null };
  });
  return out;
}

const goalDir = (goalType) => (goalType === "bulk" ? "bulk" : goalType === "cut" ? "cut" : "maintain");
// "good" | "bad" | "neutral" | null (không có thay đổi)
export function deltaTone(k, delta, goalType) {
  if (delta == null || Math.abs(delta) < 0.05) return null;
  const up = delta > 0, g = goalDir(goalType);
  if (k === "body_fat") return up ? "bad" : "good";
  if (k === "waist" || k === "belly") return up ? (g === "bulk" ? "neutral" : "bad") : "good";
  if (k === "chest" || k === "arm") return up ? "good" : (g === "cut" ? "neutral" : "bad");
  // hip, thigh
  if (g === "bulk") return up ? "good" : "neutral";
  return up ? "bad" : "good";
}

// Tỉ lệ eo / chiều cao (≥ 0,5 = mỡ bụng cao)
export function waistHeight(waist, cm) {
  const w = Number(waist), h = Number(cm);
  if (!(w > 0) || !(h > 100)) return null;
  return Math.round((w / h) * 100) / 100;
}

// Dữ liệu biểu đồ 1 số đo: points [{date, v, x, y}] (x,y 0..1), ticks
export function measureSeries(rows, k, range = "8w", today) {
  let s = sortRows(rows).filter((r) => r[k] != null);
  if (range === "8w" && today) {
    const from = addDays(today, -56);
    s = s.filter((r) => r.log_date >= from);
  }
  if (!s.length) return { points: [], min: null, max: null, change: null };
  const vs = s.map((r) => Number(r[k]));
  let lo = Math.min(...vs), hi = Math.max(...vs);
  const pad = Math.max(0.5, (hi - lo) * 0.2); lo -= pad; hi += pad;
  const n = s.length;
  const points = s.map((r, i) => ({ date: r.log_date, v: Number(r[k]), x: n === 1 ? 0.5 : i / (n - 1), y: 1 - (Number(r[k]) - lo) / (hi - lo) }));
  return { points, min: r1(lo), max: r1(hi), change: n > 1 ? r1(vs[n - 1] - vs[0]) : null, first: s[0].log_date, last: s[n - 1].log_date };
}

const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

// Nhận xét cân + eo (hiện ở Tiến độ › Cân nặng và Số đo). Trả { tone: "good"|"warn", text } hoặc null.
// So 2 lần đo eo gần nhất cách nhau ≥ 10 ngày (trong 60 ngày) với cân nặng cùng khoảng.
export function bodyInsight({ weightLog = [], rows = [], goalType }) {
  const s = sortRows(rows).filter((r) => r.waist != null);
  if (s.length < 2) return null;
  const last = s[s.length - 1];
  const base = [...s].reverse().find((r) => { const d = daysBetween(r.log_date, last.log_date); return d >= 10 && d <= 60; });
  if (!base) return null;
  const dWaist = r1(Number(last.waist) - Number(base.waist));
  const wl = (weightLog || []).filter((w) => w && w.logged_date && Number(w.kg) > 0).sort((a, b) => (a.logged_date < b.logged_date ? -1 : 1));
  const kgAt = (date) => { let v = null; wl.forEach((w) => { if (w.logged_date <= date) v = Number(w.kg); }); return v; };
  const k0 = kgAt(base.log_date) ?? (wl[0] ? Number(wl[0].kg) : null), k1 = kgAt(last.log_date);
  if (k0 == null || k1 == null) return null;
  const dKg = r1(k1 - k0);
  const weeks = Math.max(1, Math.round(daysBetween(base.log_date, last.log_date) / 7));
  const fmt = (n) => String(Math.abs(n)).replace(".", ",");
  const g = goalDir(goalType);
  if (Math.abs(dKg) <= 0.4 && dWaist <= -1) return { tone: "good", text: `Cân gần như đứng yên ${weeks} tuần nhưng eo nhỏ đi ${fmt(dWaist)} cm — bạn đang giảm mỡ, giữ cơ. Cứ giữ cách ăn này 👍` };
  if (dKg < -0.4 && dWaist <= -1) return { tone: "good", text: `${weeks} tuần: giảm ${fmt(dKg)} kg, eo nhỏ đi ${fmt(dWaist)} cm — đang giảm đúng mỡ 👍` };
  if (g === "bulk" && dKg > 0.4 && dWaist >= 2) return { tone: "warn", text: `${weeks} tuần: tăng ${fmt(dKg)} kg nhưng eo to thêm ${fmt(dWaist)} cm — có thể đang tăng mỡ nhiều. Cân nhắc giảm bớt phần dư calo.` };
  if (g !== "bulk" && dKg >= -0.4 && dWaist >= 1.5) return { tone: "warn", text: `${weeks} tuần: eo to thêm ${fmt(dWaist)} cm — xem lại lượng ăn và số bữa đã ghi.` };
  return null;
}

// Dòng tóm tắt cho AI Coach (null nếu chưa đo)
export function measureSummaryForAI(rows, cm) {
  const L = latestByField(rows);
  const parts = FIELDS.filter((f) => L[f.k]).map((f) => `${f.label} ${String(L[f.k].v).replace(".", ",")} cm${L[f.k].delta ? ` (${L[f.k].delta > 0 ? "+" : ""}${String(L[f.k].delta).replace(".", ",")} so với lần trước)` : ""}`);
  if (L.body_fat) parts.push(`% mỡ ${String(L.body_fat.v).replace(".", ",")}%`);
  if (!parts.length) return null;
  const whr = L.waist ? waistHeight(L.waist.v, cm) : null;
  const last = sortRows(rows).slice(-1)[0];
  return `Số đo cơ thể (lần gần nhất ${last ? last.log_date : ""}): ${parts.join(", ")}${whr ? `. Eo/chiều cao ${String(whr).replace(".", ",")}` : ""}`;
}
