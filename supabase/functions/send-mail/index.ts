// 06/11 (chủ dự án: "soạn mail toàn bộ update, gửi cho tất cả user"): gửi thư qua Resend.
// POST (JWT admin): { action: "test", to? }  → gửi 1 thư thử (mặc định tới email của admin đang gọi)
//                   { action: "all", dry?: true, limit? } → gửi cho mọi tài khoản đã xác nhận email, bỏ người đã huỷ nhận và người đã nhận đợt này
// GET ?e=<email>&t=<chữ ký> → huỷ nhận thư (link "Không nhận thư như này nữa" trong thư)
// Secret cần: RESEND_API_KEY (chủ dự án tự dán trong Supabase › Edge Functions › Secrets). Không in key ra log.
import { createClient } from "npm:@supabase/supabase-js@2";
import { HTML, SUBJECT, PREHEADER } from "./template.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM = "Fipilot AI <hello@fipilotai.com>";
const CAMPAIGN = "2026-11-update";
const FN_URL = `${SUPABASE_URL}/functions/v1/send-mail`;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// chữ ký huỷ nhận: HMAC-SHA256(email) bằng khoá dịch vụ (không đoán được, không cần lưu)
async function sign(email: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SERVICE_ROLE_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email.toLowerCase()));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" }[c] as string)).slice(0, 32);
}
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
async function render(email: string, name: string) {
  const huy = `${FN_URL}?e=${encodeURIComponent(email)}&t=${await sign(email)}`;
  const html = HTML.replaceAll("{{ten}}", esc(name || "bạn")).replaceAll("{{email}}", esc(email)).replaceAll("{{huy}}", huy).replaceAll("{{pre}}", esc(PREHEADER));
  return { html, huy };
}
async function mailOne(email: string, name: string, tag = CAMPAIGN) {
  const { html, huy } = await render(email, name);
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [email], subject: SUBJECT, html, headers: { "List-Unsubscribe": `<${huy}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }, tags: [{ name: "campaign", value: tag.replace(/[^\w-]/g, "_") }] }),
  });
  const d = await r.json().catch(() => ({}));
  return r.ok ? { ok: true, id: (d as { id?: string }).id || null } : { ok: false, error: `${r.status} ${(d as { message?: string }).message || ""}`.slice(0, 200) };
}
async function callerAdmin(req: Request) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  if (!token || token === SUPABASE_ANON_KEY) return null;
  const u = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await u.auth.getUser();
  if (!user) return null;
  const { data: p } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  return p?.is_admin ? user : null;
}
const page = (title: string, text: string) => new Response(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;background:#E9EEF6;font-family:-apple-system,Segoe UI,Roboto,sans-serif"><div style="max-width:440px;margin:60px auto;background:#fff;border-radius:20px;padding:28px 24px;text-align:center;color:#0F172A"><div style="font-size:20px;font-weight:900;margin-bottom:8px">${title}</div><div style="font-size:15px;line-height:1.6;color:#475569">${text}</div><a href="https://app.fipilotai.com" style="display:inline-block;margin-top:18px;background:#0062F0;color:#fff;text-decoration:none;font-weight:800;padding:12px 22px;border-radius:14px">Mở Fipilot AI</a></div></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  // huỷ nhận thư (GET từ link trong thư, hoặc POST một chạm từ Gmail)
  if (url.searchParams.get("e")) {
    const email = String(url.searchParams.get("e")).toLowerCase();
    if (url.searchParams.get("t") !== (await sign(email))) return page("Link không hợp lệ", "Link huỷ nhận thư không đúng hoặc đã bị sửa.");
    await admin.from("email_optout").upsert({ email });
    return page("Đã huỷ nhận thư", `Fipilot AI sẽ không gửi thư như này tới ${esc(email)} nữa. Thư về tài khoản (đặt lại mật khẩu) vẫn gửi bình thường.`);
  }
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const me = await callerAdmin(req);
  if (!me) return json({ error: "Chỉ quản trị viên được gửi thư" }, 403);
  if (!RESEND_API_KEY) return json({ error: "Chưa có RESEND_API_KEY trong Secrets" }, 500);
  const body = await req.json().catch(() => ({}));

  if (body.action === "test") {
    const to = String(body.to || me.email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return json({ error: "Email nhận không hợp lệ" }, 400);
    const r = await mailOne(to, String(body.name || "bạn"), `${CAMPAIGN}-test`);
    return json({ to, ...r });
  }

  if (body.action === "all") {
    const users: { id: string; email: string }[] = [];
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return json({ error: error.message }, 500);
      for (const u of data.users) if (u.email && u.email_confirmed_at && !u.banned_until) users.push({ id: u.id, email: u.email.toLowerCase() });
      if (data.users.length < 1000) break;
    }
    const [{ data: out }, { data: sent }, { data: prof }] = await Promise.all([
      admin.from("email_optout").select("email"),
      admin.from("email_sends").select("email").eq("campaign", CAMPAIGN).is("error", null),
      admin.from("profiles").select("id, username"),
    ]);
    const skip = new Set([...(out || []), ...(sent || [])].map((x: { email: string }) => x.email.toLowerCase()));
    const nameOf = new Map((prof || []).map((p: { id: string; username: string | null }) => [p.id, (p.username || "").trim()]));
    const todo = users.filter((u) => !skip.has(u.email) && !/@(local\.test|example\.(com|org))$/.test(u.email)).slice(0, Math.min(Number(body.limit) || 90, 90)); // Resend miễn phí 100 thư / ngày
    if (body.dry) return json({ total: users.length, skip: skip.size, will_send: todo.length, sample: todo.slice(0, 5).map((u) => u.email.replace(/^(.).*(@.*)$/, "$1***$2")) });
    let ok = 0, fail = 0;
    for (const u of todo) {
      const r = await mailOne(u.email, nameOf.get(u.id) || "bạn");
      await admin.from("email_sends").upsert({ campaign: CAMPAIGN, email: u.email, user_id: u.id, resend_id: r.ok ? r.id : null, error: r.ok ? null : r.error }, { onConflict: "campaign,email" });
      if (r.ok) ok++; else fail++;
      await new Promise((x) => setTimeout(x, 600)); // Resend: tối đa 2 thư / giây
    }
    return json({ sent: ok, failed: fail, left: Math.max(0, users.length - skip.size - todo.length) });
  }
  return json({ error: "action" }, 400);
});
