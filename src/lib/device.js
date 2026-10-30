// 30/10 (mã mời Pi): mã ngẫu nhiên của máy, lưu trên máy — máy chủ so mã máy người mời / người được mời để chặn tự mời chính mình.
const KEY = "fp_dev";
export function deviceId() {
  try {
    let v = localStorage.getItem(KEY);
    if (!v || v.length < 8) { v = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`).replace(/-/g, "").slice(0, 32); localStorage.setItem(KEY, v); }
    return v;
  } catch { return null; }
}
// mã mời lấy từ link (?m=CODE) hoặc khách gõ ở màn Đăng ký — giữ tới khi tài khoản mới nhận xong
const INV = "fp_invite";
export const inviteCode = () => { try { return localStorage.getItem(INV) || ""; } catch { return ""; } };
export const setInviteCode = (c) => { try { if (c) localStorage.setItem(INV, String(c).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12)); else localStorage.removeItem(INV); } catch { /* */ } };
/** đọc ?m=CODE trên link mở app → lưu lại (gọi 1 lần lúc khởi động) */
export function captureInvite(search = typeof location !== "undefined" ? location.search : "") {
  const m = /[?&]m=([A-Za-z0-9]{4,12})\b/.exec(search || "");
  if (m) setInviteCode(m[1]);
  return m ? m[1].toUpperCase() : null;
}
