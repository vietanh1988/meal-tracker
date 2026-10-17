// Thực đơn tự lên cho khách giảm cân (bản vẽ 133a–e, 18/10) — hàm thuần, có test (tests/loss-menu.test.mjs).
// Món không ăn lưu chung ô "avoid" của tab Thực đơn (fp_menu_prefs, từng tài khoản) — cùng bộ lọc với thực đơn AI / gợi ý món.

// Chip món không ăn: chỉ những từ bộ lọc (lib/allergy) hiểu được
export const AVOID_CHIPS = ["Hải sản", "Thịt bò", "Thịt lợn", "Thịt gà", "Trứng", "Sữa", "Đậu phộng", "Ăn chay"];

const key = (s) => String(s || "").trim().toLowerCase();
export const avoidList = (text) => String(text || "").split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
export const hasAvoid = (text, word) => avoidList(text).some((w) => key(w) === key(word));
export function addAvoid(text, word) {
  const w = String(word || "").trim();
  if (!w || hasAvoid(text, w)) return avoidList(text).join(", ");
  return [...avoidList(text), w].join(", ");
}
export function toggleAvoid(text, word) {
  return hasAvoid(text, word) ? avoidList(text).filter((w) => key(w) !== key(word)).join(", ") : addAvoid(text, word);
}

// Tự lên thực đơn cho 1 ngày khi: chế độ giảm cân, đã tải xong ngày đó, ngày chưa có bữa nào có món, chưa tự lên lần nào cho ngày đó
// (khách xoá hết món sau khi app tự lên → không lên lại, tôn trọng lựa chọn của khách)
export function shouldAutoPlan({ lossMode, date, day, done = [] }) {
  if (!lossMode || !date || !day) return false;
  if ((done || []).includes(date)) return false;
  return !(day.meals || []).some((m) => Array.isArray(m?.items) && m.items.length > 0);
}
// Ghi nhớ ngày đã tự lên (giữ 7 ngày gần nhất)
export const markPlanned = (done, date) => [...(done || []).filter((d) => d !== date), date].slice(-7);
