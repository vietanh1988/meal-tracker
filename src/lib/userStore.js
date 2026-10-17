// Lưu trên máy theo TỪNG tài khoản (14/10): trước đây lựa chọn thực đơn AI (kể cả món không ăn / dị ứng)
// và bản dự phòng chat AI lưu chung 1 khoá → 2 tài khoản dùng chung máy bị lẫn của nhau.
// Khoá = `${tên}:${userId}`. Đăng xuất gọi clearUserStore() xoá hết khoá của app (cả khoá cũ không gắn user).
// 18/10: thêm tab đang mở (fp_mtab — tài khoản mới đăng nhập phải vào Hôm nay, không vào tab Tôi của người trước) và dữ liệu dự phòng vận động / tốc độ.
export const USER_KEYS = ["fp_menu_prefs", "aicoach_backup", "fp_mtab", "fp_act_ask", "fp_activity", "fp_pace"];
export const userKey = (name, uid) => `${name}:${uid || "anon"}`;
export function readUser(name, uid, fallback = null) {
  try { const v = localStorage.getItem(userKey(name, uid)); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
}
export function writeUser(name, uid, value) {
  try { localStorage.setItem(userKey(name, uid), JSON.stringify(value)); } catch (e) { /* bộ nhớ đầy / chế độ riêng tư */ }
}
export function clearUserStore(storage) {
  const s = storage || (typeof localStorage !== "undefined" ? localStorage : null);
  if (!s) return;
  try {
    const keys = [];
    for (let i = 0; i < s.length; i++) keys.push(s.key(i));
    keys.filter((k) => k && USER_KEYS.some((n) => k === n || k.startsWith(n + ":"))).forEach((k) => s.removeItem(k));
  } catch (e) { /* */ }
}
