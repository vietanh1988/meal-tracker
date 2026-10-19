// Thống kê web tự đếm: trình duyệt gửi lượt xem / lượt bấm sang app → hàm web_hit (gộp theo ngày, không lưu IP)
import { rpc } from "@/lib/sb";

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|curl|wget|python|axios/i;
export async function POST(req) {
  try {
    if (BOT.test(req.headers.get("user-agent") || "")) return new Response(null, { status: 204 });
    const b = JSON.parse((await req.text()) || "{}");
    const path = String(b.path || "").slice(0, 300);
    if (!path.startsWith("/")) return new Response(null, { status: 204 });
    await rpc("web_hit", { p_path: path, p_src: String(b.src || "other"), p_kind: b.kind === "app" ? "app" : "view", p_new: !!b.new });
  } catch { /* bỏ qua */ }
  return new Response(null, { status: 204 });
}
