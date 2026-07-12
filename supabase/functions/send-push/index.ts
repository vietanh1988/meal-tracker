// Supabase Edge Function: send-push — Hỗ trợ 2 cách auth:
// 1) Bearer JWT → verify admin (dùng từ client mới)
// 2) PUSH_SECRET trong body (backward compat cho Postgres RPC function)
// Deploy: supabase functions deploy send-push

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const PUSH_SECRET = Deno.env.get("PUSH_SECRET")!;

webpush.setVapidDetails("mailto:admin@fipilotai.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// ---- Auth: JWT admin HOẶC PUSH_SECRET (backward compat) ----
async function verifyAuth(req: Request, bodySecret?: string): Promise<boolean> {
  // Path 1: JWT admin
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (token && token !== SUPABASE_ANON_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) {
        const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
        const { data: profile } = await adminClient
          .from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
        if (profile?.is_admin) return true;
      }
    } catch (e) { /* fall through to secret check */ }
  }
  // Path 2: PUSH_SECRET (cho Postgres RPC gọi qua net.http_post)
  if (bodySecret && bodySecret === PUSH_SECRET) return true;
  return false;
}

async function sendToUser(supabase: any, user_id: string, payloadStr: string) {
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth_key")
    .eq("user_id", user_id);

  if (error || !subs) return { sent: 0, total: 0, cleaned: 0 };
  if (subs.length === 0) return { sent: 0, total: 0, cleaned: 0 };

  let sent = 0;
  const deadIds: string[] = [];

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        payloadStr
      );
      sent++;
    } catch (e: any) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        deadIds.push(sub.id);
      } else {
        console.error("Push send error:", sub.id, e.message);
      }
    }
  }

  if (deadIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", deadIds);
  }

  return { sent, total: subs.length, cleaned: deadIds.length };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  let payload;
  try {
    payload = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const { secret, user_id, batch_id, user_ids, title, body, url } = payload;

  // ---- Verify auth (JWT hoặc secret) ----
  const authorized = await verifyAuth(req, secret);
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  if (!title) {
    return new Response(JSON.stringify({ error: "Thiếu title" }), { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const payloadStr = JSON.stringify({ title, body: body || "", url: url || "/" });

  if (batch_id && Array.isArray(user_ids)) {
    try {
      let totalSent = 0;
      let totalFailed = 0;
      for (const uid of user_ids) {
        const r = await sendToUser(supabase, uid, payloadStr);
        totalSent += r.sent;
        totalFailed += Math.max(0, r.total - r.sent);
      }
      const { error: updateErr } = await supabase.from("notification_batches").update({
        push_sent_count: totalSent,
        push_failed_count: totalFailed,
        status: "done",
        completed_at: new Date().toISOString(),
      }).eq("id", batch_id);
      if (updateErr) console.error("Cập nhật notification_batches thất bại:", updateErr.message);

      return new Response(JSON.stringify({ sent: totalSent, failed: totalFailed, recipients: user_ids.length, update_error: updateErr?.message || null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e: any) {
      await supabase.from("notification_batches").update({
        status: "error",
        error_message: String(e?.message || e),
        completed_at: new Date().toISOString(),
      }).eq("id", batch_id);
      return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 });
    }
  }

  if (!user_id) {
    return new Response(JSON.stringify({ error: "Thiếu user_id" }), { status: 400 });
  }
  const result = await sendToUser(supabase, user_id, payloadStr);
  if (result.total === 0) {
    return new Response(JSON.stringify({ sent: 0, message: "User chưa bật thông báo đẩy" }), { status: 200 });
  }
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
