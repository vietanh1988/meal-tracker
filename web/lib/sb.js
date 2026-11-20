// Đọc Supabase qua REST (khoá anon công khai, RLS chỉ cho thấy nội dung đã đăng). Dùng fetch để Next tự cache (ISR).
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://veodsvojxjmjhtrlaieq.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const H = () => ({ apikey: KEY, Authorization: `Bearer ${KEY}` });

// 20/11: lưu đệm 7 ngày (14/11 là 1 giờ: bot quét lại mỗi giờ = dựng lại cả web, CPU không giảm); sửa trong Quản trị → Supabase gọi /api/revalidate làm mới ngay (~1 phút)
export const REVALIDATE = 604800;

export async function q(path, { revalidate = REVALIDATE } = {}) {
  if (!KEY) return null;
  try {
    const r = await fetch(`${URL_}/rest/v1/${path}`, { headers: H(), next: { revalidate, tags: ["web"] } });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

// 19/11 (chủ dự án: "vẫn còn 1 số món không có ảnh"): Supabase trả tối đa 1.000 dòng mỗi lần → bảng lớn (web_calo_pages 1.364 dòng)
// phải đọc theo trang. `path` phải có order=… để các trang không trùng / sót dòng.
export async function qAll(path, opts) {
  const out = [];
  for (let off = 0; off < 20000; off += 1000) {
    const rows = await q(`${path}${path.includes("?") ? "&" : "?"}limit=1000&offset=${off}`, opts);
    if (!Array.isArray(rows)) return off ? out : null;
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
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
