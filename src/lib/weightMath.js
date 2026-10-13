// Cân nặng: sắp theo ngày, đánh lại số tuần (T1, T2…) và delta so với lần cân trước.
export function normalizeWeights(rows) {
  const sorted = [...(rows || [])].sort((a, b) =>
    String(a.logged_date || "").localeCompare(String(b.logged_date || "")) ||
    String(a.created_at || "").localeCompare(String(b.created_at || "")));
  return sorted.map((r, i) => {
    const kg = Number(r.kg);
    const prev = i > 0 ? Number(sorted[i - 1].kg) : null;
    const d = prev == null ? null : Math.round((kg - prev) * 10) / 10;
    return { ...r, kg, week: i + 1, delta: d === 0 ? null : d };
  });
}

// Các dòng cần ghi lại DB sau khi chuẩn hoá (week/delta đổi)
export function weightRowsToFix(before, after) {
  const byId = Object.fromEntries((before || []).map(r => [r.id, r]));
  return (after || []).filter(r => {
    const o = byId[r.id];
    if (!o) return false;
    const od = o.delta == null ? null : Number(o.delta);
    return Number(o.week) !== r.week || od !== r.delta;
  });
}

// "64,3" → 64.3 ; trả null nếu không hợp lệ (30–250 kg)
export function parseKg(v) {
  const n = parseFloat(String(v ?? "").replace(",", ".").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 30 || n > 250) return null;
  return Math.round(n * 10) / 10;
}
