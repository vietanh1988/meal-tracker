// Đọc câu trả lời AI nhận diện ảnh bữa ăn → items dạng daily_logs (hàm thuần, có test)
const r1 = (x) => Math.round((Number(x) || 0) * 10) / 10;

// Đọc JSON món từ câu trả lời AI → items dạng daily_logs. Bỏ món không tên / số âm / gram vô lý.
export function parsePhotoDishes(text) {
  const m = String(text || "").match(/\[[\s\S]*\]/);
  if (!m) throw new Error("AI không trả đúng định dạng, chụp lại giúp mình nhé.");
  let arr;
  try { arr = JSON.parse(m[0]); } catch (e) { throw new Error("AI không trả đúng định dạng, chụp lại giúp mình nhé."); }
  return (Array.isArray(arr) ? arr : [])
    .map((d) => ({ name: String(d?.name || "").trim(), gram: Math.round(Number(d?.gram) || 0), cal: Math.round(Number(d?.cal) || 0), p: r1(d?.p), c: r1(d?.c), f: r1(d?.f), fiber: r1(d?.fiber), qty: Number(String(d?.qty ?? "").replace(",", ".")) || 0, unit: String(d?.unit || "").trim().toLowerCase() }))
    .filter((d) => d.name && d.gram > 0 && d.gram <= 3000 && d.cal >= 0 && d.cal <= 5000)
    .map((d) => ({ food: d.name, display: d.name.charAt(0).toUpperCase() + d.name.slice(1), gram: d.gram, cal: d.cal, p: d.p, c: d.c, f: d.f, fiber: d.fiber, source: "photo", ...unitOf(d) }));
}

// 16/10: AI trả thêm số lượng + đơn vị → lưu số gram của 1 đơn vị (unit_g) để hiện "1,5 bát", "2 quả"; đồ uống "ml"
function unitOf(d) {
  if (d.unit === "ml" || d.unit === "lít") return { unit: "ml" };
  if (d.unit && !["g", "gr", "gram", "kg"].includes(d.unit) && d.qty > 0 && d.qty <= 50) return { unit: d.unit, unit_g: Math.round((d.gram / d.qty) * 10) / 10 };
  return { unit: "g" };
}

