import { rpc } from "@/lib/sb";
export async function POST(req) {
  try {
    const b = JSON.parse((await req.text()) || "{}");
    const path = String(b.path || "").slice(0, 500);
    if (path.startsWith("/") && !/^\/(_next|api)\//.test(path)) await rpc("log_web_404", { p_path: path, p_ref: b.ref ? String(b.ref).slice(0, 500) : null });
  } catch {}
  return new Response(null, { status: 204 });
}
