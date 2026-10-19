// Thống kê web tự đếm: trình duyệt gửi lượt xem / lượt bấm sang app → hàm web_hit (gộp theo ngày, không lưu IP)
import { rpc } from "@/lib/sb";
import { sameSite, allow, ipOf } from "@/lib/guard";

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|curl|wget|python|axios/i;
export async function POST(req) {
  try {
    if (BOT.test(req.headers.get("user-agent") || "") || !sameSite(req)) return new Response(null, { status: 204 });
    if (!allow("hit:" + ipOf(req), 120, 600000)) return new Response(null, { status: 204 }); // 1 IP tối đa 120 lượt / 10 phút
    const b = JSON.parse((await req.text()) || "{}");
    const path = String(b.path || "").slice(0, 300);
    if (!path.startsWith("/")) return new Response(null, { status: 204 });
    await rpc("web_hit", { p_path: path, p_src: String(b.src || "other"), p_kind: b.kind === "app" ? "app" : "view", p_new: !!b.new });
  } catch { /* bỏ qua */ }
  return new Response(null, { status: 204 });
}
