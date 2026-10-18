// Quy định mật khẩu (18/10, khớp Supabase Auth: tối thiểu 8 ký tự, có cả chữ và số) — chỉ áp khi ĐĂNG KÝ / ĐẶT LẠI.
// Đăng nhập không kiểm (tài khoản cũ có thể đang dùng mật khẩu 6–7 ký tự).
export const PASSWORD_HINT = "Ít nhất 8 ký tự, có cả chữ và số";
export function passwordError(p) {
  const s = String(p || "");
  if (s.length < 8) return "Mật khẩu cần ít nhất 8 ký tự";
  if (!/\p{L}/u.test(s) || !/\d/.test(s)) return "Mật khẩu cần có cả chữ và số";
  return null;
}
