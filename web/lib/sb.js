// Đọc Supabase qua REST (khoá anon công khai, RLS chỉ cho thấy nội dung đã đăng). Dùng fetch để Next tự cache (ISR).
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://veodsvojxjmjhtrlaieq.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const H = () => ({ apikey: KEY, Authorization: `Bearer ${KEY}` });

// 14/11 (Vercel free sắp hết CPU): lưu đệm 1 giờ; sửa trong Quản trị → Supabase gọi /api/revalidate làm mới ngay (~1 phút)
export const REVALIDATE = 3600;

export async function q(path, { revalidate = REVALIDATE } = {}) {
  if (!KEY) return null;
  try {
    const r = await fetch(`${URL_}/rest/v1/${path}`, { headers: H(), next: { revalidate, tags: ["web"] } });
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

// 06/11: gọi hàm đọc (không ghi) mà vẫn để Next cache theo trang (rpc ở trên luôn no-store)
export async function rpcRead(fn, body, { revalidate = REVALIDATE } = {}) {
  if (!KEY) return null;
  try {
    const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { ...H(), "Content-Type": "application/json" }, body: JSON.stringify(body || {}), next: { revalidate, tags: ["web"] } });
    return r.ok ? await r.json().catch(() => null) : null;
  } catch { return null; }
}

export const enc = (v) => encodeURIComponent(v);
