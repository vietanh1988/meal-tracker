// Chuyển hướng 301/302/410 (Quản trị › Cài đặt SEO › Chuyển hướng) + chế độ bảo trì (503).
import { NextResponse } from "next/server";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://veodsvojxjmjhtrlaieq.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
let cache = { t: 0, rules: [], maint: false };

async function load() {
  if (Date.now() - cache.t < 60_000 || !KEY) return cache;
  try {
    const h = { apikey: KEY, Authorization: `Bearer ${KEY}` };
    const [r, m] = await Promise.all([
      fetch(`${URL_}/rest/v1/web_redirects?enabled=eq.true&select=id,src,dest,code,match&limit=5000`, { headers: h }).then((x) => (x.ok ? x.json() : [])),
      fetch(`${URL_}/rest/v1/web_settings?key=eq.maintenance&select=value`, { headers: h }).then((x) => (x.ok ? x.json() : [])),
    ]);
    cache = { t: Date.now(), rules: Array.isArray(r) ? r : [], maint: !!m?.[0]?.value?.enabled };
  } catch { cache.t = Date.now(); }
  return cache;
}

export async function middleware(req) {
  const { pathname, search } = req.nextUrl;
  const c = await load();
  if (c.maint && !pathname.startsWith("/api/")) {
    return new NextResponse("<!doctype html><meta charset=utf-8><title>Đang nâng cấp</title><body style='font-family:sans-serif;text-align:center;padding:80px 16px'><h1>Fipilot AI đang nâng cấp</h1><p>Quay lại sau ít phút nhé.</p>", { status: 503, headers: { "content-type": "text/html; charset=utf-8", "retry-after": "1800" } });
  }
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (path !== pathname) return NextResponse.redirect(new URL(path + search, req.url), 308);
  const lower = decodeURIComponent(path).toLowerCase();
  const hit = c.rules.find((r) => r.match === "exact" && r.src.toLowerCase() === lower) || c.rules.find((r) => r.match === "prefix" && lower.startsWith(r.src.toLowerCase().replace(/\*$/, "")));
  if (!hit) return NextResponse.next();
  if (KEY) fetch(`${URL_}/rest/v1/rpc/hit_web_redirect`, { method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_id: hit.id }) }).catch(() => {});
  if (hit.code === 410) return new NextResponse("Trang này đã bị xoá.", { status: 410, headers: { "content-type": "text/plain; charset=utf-8" } });
  let dest = hit.dest || "/";
  if (hit.match === "prefix" && /\*$/.test(hit.src) && /\*$/.test(dest)) dest = dest.replace(/\*$/, "") + path.slice(hit.src.length - 1);
  return NextResponse.redirect(new URL(dest + search, req.url), hit.code === 302 ? 302 : 301);
}

export const config = { matcher: ["/((?!_next/|api/|img/|anh/|favicon|icon-|logo-|og-image|sitemap.xml|robots.txt).*)"] };
