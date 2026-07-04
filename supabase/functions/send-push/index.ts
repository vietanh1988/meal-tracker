// Supabase Edge Function: send-push
// Gửi Web Push notification thật tới 1 user (tất cả thiết bị/trình duyệt họ đã bật)
//
// Gọi function này (từ cron job hoặc admin action khác) với body:
// { "secret": "...", "user_id": "...", "title": "...", "body": "...", "url": "/" }
//
// "secret" phải khớp với PUSH_SECRET đã set qua `supabase secrets set` — để chặn
// người ngoài gọi bừa function này gửi spam tới user bất kỳ.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const PUSH_SECRET = Deno.env.get("PUSH_SECRET")!;

webpush.setVapidDetails("mailto:admin@fipilotai.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

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

  const { secret, user_id, title, body, url } = payload;

  if (!secret || secret !== PUSH_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  if (!user_id || !title) {
    return new Response(JSON.stringify({ error: "Thiếu user_id hoặc title" }), { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth_key")
    .eq("user_id", user_id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  if (!subs || subs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: "User chưa bật thông báo đẩy" }), { status: 200 });
  }

  const payloadStr = JSON.stringify({ title, body: body || "", url: url || "/" });

  let sent = 0;
  const deadIds = [];

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        },
        payloadStr
      );
      sent++;
    } catch (e) {
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

  return new Response(JSON.stringify({ sent, total: subs.length, cleaned: deadIds.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
