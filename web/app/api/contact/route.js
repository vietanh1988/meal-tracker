// Nhận form Liên hệ → hàm web_contact_submit (Quản trị › Góp ý). Chống spam: ô bẫy ẩn, gửi quá nhanh (< 3 giây), mỗi IP 3 lần / 10 phút.
import { rpc } from "@/lib/sb";
const hits = new Map();
const json = (o, status = 200) => Response.json(o, { status });
export async function POST(req) {
  let b = {};
  try { b = JSON.parse((await req.text()) || "{}"); } catch { return json({ ok: false, err: "bad" }, 400); }
  if (b.website) return json({ ok: true }); // bot điền ô bẫy → giả vờ thành công
  if (!(Number(b.t) >= 3000)) return json({ ok: false, err: "fast" }, 429);
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "?";
  const now = Date.now(), arr = (hits.get(ip) || []).filter((x) => now - x < 600000);
  if (arr.length >= 3) return json({ ok: false, err: "busy" }, 429);
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  const r = await rpc("web_contact_submit", { p_name: String(b.name || "").slice(0, 80), p_contact: String(b.contact || "").slice(0, 120), p_content: String(b.content || "").slice(0, 2000) });
  if (r === "ok") return json({ ok: true });
  return json({ ok: false, err: typeof r === "string" ? r : "fail" }, r ? 400 : 503);
}
