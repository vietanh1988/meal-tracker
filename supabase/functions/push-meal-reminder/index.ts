// Supabase Edge Function: push-meal-reminder — gửi thông báo đẩy nhắc nhở.
// Gọi bởi pg_cron (net.http_post) với body { secret: PUSH_SECRET, type }:
//   type "tick"   — cron MỖI PHÚT: đọc profiles.reminder_settings từng user (dạng trong reminders.js),
//                   gửi nhắc ghi bữa (bữa chưa đánh dấu đã ăn), nhắc cân (chưa cân hôm nay), nhắc uống nước (chưa đủ mục tiêu)
//   type "streak" — 20:00 VN: sắp mất chuỗi ngày ghi
//   type "weekly" — 20:00 CN: báo cáo tuần
//   type "sang" | "trua" | … — kiểu cũ (giờ cố định cho mọi người), giữ để tương thích, cron không còn gọi
// Deploy: supabase functions deploy push-meal-reminder --no-verify-jwt   (cùng thư mục có reminders.js — bản chép của src/lib/reminders.js)
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";
import { dueReminders } from "./reminders.js";

const SU = Deno.env.get("SUPABASE_URL")!, SK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VPU = Deno.env.get("VAPID_PUBLIC_KEY")!, VPR = Deno.env.get("VAPID_PRIVATE_KEY")!, PS = Deno.env.get("PUSH_SECRET")!;
webpush.setVapidDetails("mailto:admin@fipilotai.com", VPU, VPR);

// Giờ VN (UTC+7, không có giờ mùa hè)
function vnNow() {
  const d = new Date(Date.now() + 7 * 3600000);
  const iso = d.toISOString();
  return { date: iso.slice(0, 10), hhmm: iso.slice(11, 16), weekday: (d.getUTCDay() + 6) % 7 }; // 0 = T2 … 6 = CN
}
const json = (o: unknown) => new Response(JSON.stringify(o), { status: 200, headers: { "Content-Type": "application/json" } });

async function sp(ep: string, p: string, a: string, pl: object) {
  try { await webpush.sendNotification({ endpoint: ep, keys: { p256dh: p, auth: a } }, JSON.stringify(pl)); return { ok: true, dead: false }; }
  catch (e: any) { return { ok: false, dead: e?.statusCode === 404 || e?.statusCode === 410 }; }
}

const MEAL_LABEL: Record<string, string> = { sang: "sáng", phu_sang: "phụ sáng", trua: "trưa", phu_chieu: "phụ chiều", pre: "trước tập", post: "sau tập", toi: "tối" };
const MEAL_ICON: Record<string, string> = { sang: "🍳", phu_sang: "🥐", trua: "☀️", phu_chieu: "🍎", pre: "💪", post: "🏋️", toi: "🌙" };
const MEAL_MSG = [
  (b: string) => `Sắp đến giờ ăn ${b} rồi, nhớ ăn đầy đủ nhé!`,
  (b: string) => `Đến giờ ăn ${b} rồi, ăn xong nhớ đánh dấu Đã ăn nhé!`,
  (b: string) => `Nhấc mông lên và đi ăn ${b} đi, đừng lười!`,
];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

// Mục tiêu nước — giống waterGoalMl trong src/lib/dayPlan.js
function waterGoalMl(kg: number, isTrain: boolean, override?: number | null) {
  if (override && override >= 500 && override <= 8000) return Math.round(override);
  const raw = 35 * (Number(kg) || 60) + (isTrain ? 500 : 0);
  return Math.min(5000, Math.max(1500, Math.round(raw / 50) * 50));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const body = await req.json().catch(() => null);
  if (!body) return new Response("bad", { status: 400 });
  const { secret, type } = body;
  if (!PS || secret !== PS) return new Response("auth", { status: 401 });
  const sb = createClient(SU, SK);
  const now = vnNow(), today = now.date;

  const { data: subs } = await sb.from("push_subscriptions").select("user_id,endpoint,p256dh,auth_key,id");
  if (!subs || !subs.length) return json({ v: 9, type, sent: 0, today });
  const uids = [...new Set(subs.map((s: any) => s.user_id))] as string[];
  const uSubs: Record<string, any[]> = {};
  for (const s of subs) (uSubs[s.user_id] ||= []).push(s);
  let sent = 0, skip = 0;
  const dead: string[] = [];
  const sendTo = async (uid: string, payload: object) => {
    for (const sub of uSubs[uid] || []) { const r = await sp(sub.endpoint, sub.p256dh, sub.auth_key, payload); if (r.ok) sent++; if (r.dead) dead.push(sub.id); }
  };
  let names: Record<string, string> | null = null;
  const nameOf = async (uid: string) => {
    if (!names) {
      names = {};
      const { data } = await sb.auth.admin.listUsers({ perPage: 1000 });
      for (const u of data?.users || []) names[u.id] = (u.user_metadata as any)?.username || u.email?.split("@")[0] || "bạn";
    }
    return names[uid] || "bạn";
  };

  // ===== NHẮC THEO CÀI ĐẶT TỪNG NGƯỜI (cron mỗi phút) =====
  if (type === "tick") {
    const { data: profs } = await sb.from("profiles").select("id,reminder_settings,kg,gym_days,exercise_type,water_goal_ml").in("id", uids);
    // Ai có nhắc đúng phút này (chưa xét đã ăn/đã cân) — đa số phút không có ai → thoát sớm
    const cands = (profs || []).map((p: any) => ({ p, due: dueReminders(p.reminder_settings, { hhmm: now.hhmm, weekday: now.weekday }) })).filter((x) => x.due.length);
    if (!cands.length) return json({ v: 9, type, at: now.hhmm, sent: 0 });
    const ids = cands.map((x) => x.p.id);
    const [{ data: dl }, { data: wl }] = await Promise.all([
      sb.from("daily_logs").select("user_id,eaten_meals,water_ml").eq("log_date", today).in("user_id", ids),
      sb.from("weight_logs").select("user_id").eq("logged_date", today).in("user_id", ids),
    ]);
    const day: Record<string, any> = {};
    for (const d of dl || []) day[d.user_id] = d;
    const weighed = new Set((wl || []).map((w: any) => w.user_id));
    for (const { p } of cands) {
      const eaten = day[p.id]?.eaten_meals || [];
      const due = dueReminders(p.reminder_settings, { hhmm: now.hhmm, weekday: now.weekday, loggedMeals: eaten });
      const name = await nameOf(p.id);
      for (const r of due) {
        if (r.type === "meal") {
          await sendTo(p.id, { title: `${MEAL_ICON[r.meal] || "🍽️"} ${name} ơi!`, body: pick(MEAL_MSG)(MEAL_LABEL[r.meal] || r.meal), url: "/" });
        } else if (r.type === "weigh") {
          if (weighed.has(p.id)) { skip++; continue; }
          await sendTo(p.id, { title: `⚖️ ${name} ơi, đến giờ cân rồi!`, body: "Cân lúc mới ngủ dậy, trước khi ăn uống để số chuẩn nhất.", url: "/" });
        } else if (r.type === "water") {
          const isTrain = (p.exercise_type || "gym") !== "none" && (p.gym_days || []).includes(now.weekday);
          const goal = waterGoalMl(p.kg, isTrain, p.water_goal_ml);
          const drank = Number(day[p.id]?.water_ml) || 0;
          if (drank >= goal) { skip++; continue; }
          const left = Math.ceil((goal - drank) / 250);
          await sendTo(p.id, { title: `💧 ${name} ơi, uống nước nào!`, body: `Còn khoảng ${left} ly nữa là đủ ${(goal / 1000).toLocaleString("vi-VN")} L hôm nay.`, url: "/" });
        }
      }
    }
  }

  // ===== KIỂU CŨ: nhắc 1 bữa cho mọi người (không còn cron gọi) =====
  if (MEAL_LABEL[type]) {
    const { data: dl } = await sb.from("daily_logs").select("user_id,eaten_meals").eq("log_date", today).in("user_id", uids);
    const em: Record<string, string[]> = {};
    for (const d of dl || []) em[d.user_id] = d.eaten_meals || [];
    for (const uid of uids) {
      if ((em[uid] || []).includes(type)) { skip++; continue; }
      await sendTo(uid, { title: `${MEAL_ICON[type]} ${await nameOf(uid)} ơi!`, body: pick(MEAL_MSG)(MEAL_LABEL[type]), url: "/" });
    }
  }

  // ===== SẮP MẤT CHUỖI =====
  if (type === "streak") {
    const d7 = new Date(); d7.setDate(d7.getDate() - 7);
    const { data: rl } = await sb.from("daily_logs").select("user_id,log_date,eaten_meals,total_cal").gte("log_date", d7.toISOString().slice(0, 10)).in("user_id", uids).order("log_date", { ascending: false });
    const ul: Record<string, any[]> = {};
    for (const l of rl || []) (ul[l.user_id] ||= []).push(l);
    for (const uid of uids) {
      const logs = ul[uid] || [];
      let streak = 0;
      const dd = new Date(); dd.setDate(dd.getDate() - 1);
      for (let i = 0; i < 7; i++) { const ds = dd.toISOString().slice(0, 10); const log = logs.find((l: any) => l.log_date === ds); if (log && (log.eaten_meals?.length > 0 || log.total_cal > 0)) streak++; else break; dd.setDate(dd.getDate() - 1); }
      if (streak < 3) { skip++; continue; }
      const tl = logs.find((l: any) => l.log_date === today);
      if (tl?.eaten_meals?.length > 0) { skip++; continue; }
      await sendTo(uid, { title: `🔥 ${await nameOf(uid)} ơi, chuỗi ${streak} ngày sắp mất!`, body: "Mở app đánh dấu Đã ăn để giữ chuỗi", url: "/" });
    }
  }

  // ===== BÁO CÁO TUẦN =====
  if (type === "weekly") {
    const d7 = new Date(); d7.setDate(d7.getDate() - 7);
    const { data: wl } = await sb.from("daily_logs").select("user_id,log_date,eaten_meals,total_cal").gte("log_date", d7.toISOString().slice(0, 10)).in("user_id", uids);
    const uw: Record<string, { ok: number; cal: number; d: number }> = {};
    for (const l of wl || []) { const w = (uw[l.user_id] ||= { ok: 0, cal: 0, d: 0 }); if (l.eaten_meals?.length > 0 || l.total_cal > 0) { w.ok++; w.cal += l.total_cal || 0; w.d++; } }
    for (const uid of uids) {
      const w = uw[uid], name = await nameOf(uid);
      const payload = !w || w.d === 0
        ? { title: `📊 ${name}, tuần này chưa có dữ liệu`, body: "Mở app tạo thực đơn và bắt đầu theo dõi!", url: "/" }
        : { title: `📊 Báo cáo tuần của ${name}`, body: `Ăn đúng ${w.ok}/7 ngày · TB ${Math.round(w.cal / w.d)} kcal. Xem chi tiết!`, url: "/" };
      await sendTo(uid, payload);
    }
  }

  if (dead.length) await sb.from("push_subscriptions").delete().in("id", dead);
  return json({ v: 9, type, today, at: now.hhmm, sent, skipped: skip, cleaned: dead.length });
});
