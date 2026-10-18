// Đọc Supabase qua REST (khoá anon công khai, RLS chỉ cho thấy nội dung đã đăng). Dùng fetch để Next tự cache (ISR).
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://veodsvojxjmjhtrlaieq.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const H = () => ({ apikey: KEY, Authorization: `Bearer ${KEY}` });

export const REVALIDATE = 60; // giây — sửa trong Quản trị, tối đa 1 phút sau web đổi theo

export async function q(path, { revalidate = REVALIDATE } = {}) {
  if (!KEY) return null;
  try {
    const r = await fetch(`${URL_}/rest/v1/${path}`, { headers: H(), next: { revalidate } });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

export async function rpc(fn, body) {
  if (!KEY) return null;
  try {
    const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { ...H(), "Content-Type": "application/json" }, body: JSON.stringify(body || {}), cache: "no-store" });
    return r.ok ? await r.json().catch(() => null) : null;
  } catch { return null; }
}

export const enc = (v) => encodeURIComponent(v);
