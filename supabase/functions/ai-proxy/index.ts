// supabase/functions/ai-proxy/index.ts — JWT AUTH + SERVER-SIDE QUOTA + COST LOGGING
// Deploy: supabase functions deploy ai-proxy
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const ALLOWED_ORIGINS = [
  "https://fipilotai.com",
  "https://www.fipilotai.com",
  "https://app.fipilotai.com",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') ?? ''
const GEMINI_KEY = Deno.env.get('GEMINI_KEY') ?? ''
const OPENAI_KEY = Deno.env.get('OPENAI_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// ---- Bảng giá USD / 1 TRIỆU token — tra cứu 15/07/2026 ----
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-sonnet-5": { in: 2, out: 10 },
  "claude-opus-4-6": { in: 5, out: 25 },
  "gemini-2.5-flash": { in: 0.30, out: 2.50 },
  "gemini-3.5-flash": { in: 1.50, out: 9 },
  "gemini-3.1-pro": { in: 2, out: 12 },
  "gpt-4o-mini": { in: 0.15, out: 0.60 },
  "chat-latest": { in: 5, out: 30 },
  "gpt-5.5": { in: 5, out: 30 },
};

function calcCost(model: string, inputTok: number, outputTok: number) {
  const p = PRICING[model];
  if (!p) return 0;
  return (inputTok / 1e6) * p.in + (outputTok / 1e6) * p.out;
}

async function logUsage(admin: any, userId: string | null, provider: string, model: string, inputTok: number, outputTok: number, feature: string | null) {
  try {
    const { error } = await admin.from("ai_usage_log").insert({
      user_id: userId, provider, model, feature,
      input_tokens: inputTok, output_tokens: outputTok,
      cost_usd: calcCost(model, inputTok, outputTok),
    });
    if (error) console.error("[ai_usage_log] insert lỗi:", error.message, error.code);
  } catch (e) {
    console.error("[ai_usage_log] exception:", e.message);
  }
}

async function verifyUser(req: Request) {
  const authHeader = req.headers.get("authorization") || req.headers.get("apikey") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// ---- SERVER-SIDE quota enforcement — nguồn sự thật DUY NHẤT, client
// không thể bypass (khác aiQuota.js phía client vốn chỉ chạy trong trình
// duyệt user, có thể bị thao túng qua DevTools). Đồng bộ luật với
// aiQuota.js + getAIMenuAccess: free luôn khoá cứng menu_gen bất kể quota;
// feature flag tắt hẳn thì mọi tier đều bị chặn (kể cả Premium).
// feature không thuộc 3 loại có quota (weight_advice, ping_test, null)
// → không chặn, giữ hành vi cũ.
async function checkAndConsumeQuotaServer(admin: any, userId: string, feature: string | null) {
  const FEATURE_TO_KIND: Record<string, string> = {
    menu_gen: "menu", chat: "chat", macro_lookup: "macro",
  };
  const kind = feature ? FEATURE_TO_KIND[feature] : null;
  if (!kind) return { allowed: true }; // ping_test/weight_advice/không rõ — không chặn

  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("tier,is_admin,ai_macro_count_this_month,ai_macro_count_reset_at,ai_chat_count_today,ai_chat_count_reset_at,ai_menu_count_today,ai_menu_count_reset_at")
    .eq("id", userId)
    .single();
  if (pErr || !profile) return { allowed: true }; // fail-open: lỗi hạ tầng không chặn user
  if (profile.is_admin) return { allowed: true }; // admin bypass TẤT CẢ (kể cả feature flag) — cần test bất kỳ lúc nào

  // Công tắc tổng (admin tắt khẩn cấp cho user thường) — check server-side,
  // không chỉ ẩn UI. Trước đây user có thể bypass UI gọi thẳng edge
  // function dù admin đã tắt tính năng để xử lý sự cố.
  const { data: appSet } = await admin.from("app_settings").select("value").eq("key", "feature_flags").single();
  let flags: Record<string, boolean> = {};
  try { flags = JSON.parse(appSet?.value || "{}"); } catch (e) { /* fail-open nếu parse lỗi */ }
  const FLAG_KEY: Record<string, string> = { menu: "ai_menu_gen", chat: "ai_chat", macro: "ai_macro" };
  if (flags[FLAG_KEY[kind]] === false) {
    return { allowed: false, message: "Tính năng này đang tạm khoá để bảo trì." };
  }

  const tier = profile.tier || "free";

  // menu_gen: Free luôn khoá cứng — không liên quan quota, đúng ý định
  // gốc "AI tạo thực đơn là tính năng Premium/Trial độc quyền".
  if (kind === "menu" && tier === "free") {
    return { allowed: false, message: "Tính năng AI tạo thực đơn dành cho gói Premium/Trial. Nâng cấp để mở khoá." };
  }

  const { data: settings } = await admin
    .from("subscription_settings")
    .select("free_ai_macro_limit,free_ai_chat_limit,trial_ai_macro_limit,trial_ai_chat_limit,trial_ai_menu_limit,premium_ai_macro_limit,premium_ai_chat_limit,premium_ai_menu_limit")
    .eq("id", 1)
    .single();

  const LIMITS: Record<string, Record<string, number>> = {
    free:    { macro: settings?.free_ai_macro_limit ?? 100, chat: settings?.free_ai_chat_limit ?? 20, menu: 0 },
    trial:   { macro: settings?.trial_ai_macro_limit ?? 500, chat: settings?.trial_ai_chat_limit ?? 100, menu: settings?.trial_ai_menu_limit ?? 30 },
    premium: { macro: settings?.premium_ai_macro_limit ?? 1000, chat: settings?.premium_ai_chat_limit ?? 150, menu: settings?.premium_ai_menu_limit ?? 50 },
  };
  const lim = (LIMITS[tier] || LIMITS.free)[kind];
  const upgradeHint = tier === "free" ? " Nâng cấp Premium để có hạn mức cao hơn." : "";

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  if (kind === "macro") {
    const sameMonth = (profile.ai_macro_count_reset_at || "").slice(0, 7) === thisMonth;
    const count = sameMonth ? (profile.ai_macro_count_this_month || 0) : 0;
    if (count >= lim) return { allowed: false, message: `Bạn đã dùng hết ${lim} lượt AI tính macro trong tháng này.${upgradeHint}` };
    await admin.from("profiles").update({
      ai_macro_count_this_month: count + 1,
      ai_macro_count_reset_at: sameMonth ? profile.ai_macro_count_reset_at : today,
    }).eq("id", userId);
    return { allowed: true };
  }
  if (kind === "menu") {
    const sameDay = profile.ai_menu_count_reset_at === today;
    const count = sameDay ? (profile.ai_menu_count_today || 0) : 0;
    if (count >= lim) return { allowed: false, message: `Bạn đã dùng hết ${lim} lượt AI tạo thực đơn hôm nay.${upgradeHint}` };
    await admin.from("profiles").update({
      ai_menu_count_today: count + 1,
      ai_menu_count_reset_at: sameDay ? profile.ai_menu_count_reset_at : today,
    }).eq("id", userId);
    return { allowed: true };
  }
  // chat
  const sameDay = profile.ai_chat_count_reset_at === today;
  const count = sameDay ? (profile.ai_chat_count_today || 0) : 0;
  if (count >= lim) return { allowed: false, message: `Bạn đã dùng hết ${lim} tin nhắn AI Chat hôm nay.${upgradeHint}` };
  await admin.from("profiles").update({
    ai_chat_count_today: count + 1,
    ai_chat_count_reset_at: sameDay ? profile.ai_chat_count_reset_at : today,
  }).eq("id", userId);
  return { allowed: true };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const user = await verifyUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { foodDesc, provider = "claude", model, system, messages, maxTokens, feature } = await req.json()

    // ---- Quota check — TRƯỚC khi gọi AI thật, chặn sớm tiết kiệm tiền ----
    // admin client (service role) dùng CHUNG cho cả quota lẫn log — tạo 1
    // lần, tránh làm 2 lần createClient không cần thiết.
    let admin: any = null;
    if (SUPABASE_SERVICE_KEY) {
      admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const quota = await checkAndConsumeQuotaServer(admin, user.id, feature || null);
      if (!quota.allowed) {
        return new Response(JSON.stringify({ error: quota.message, quotaExceeded: true }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const msgs = (messages && messages.length) ? messages : [{ role: "user", content: foodDesc }]
    let text = ""
    let usedModel = model || "";
    let inputTok = 0, outputTok = 0;

    if (provider === "claude") {
      if (!CLAUDE_API_KEY) throw new Error("Server chưa cấu hình CLAUDE_API_KEY")
      usedModel = model || "claude-sonnet-5";
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          "x-api-key": CLAUDE_API_KEY,
        },
        body: JSON.stringify({
          model: usedModel,
          max_tokens: maxTokens || 1000,
          ...(system ? { system } : {}),
          messages: msgs,
        }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error.message)
      text = (d.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("")
      inputTok = d.usage?.input_tokens || 0;
      outputTok = d.usage?.output_tokens || 0;

    } else if (provider === "gemini") {
      if (!GEMINI_KEY) throw new Error("Server chưa cấu hình GEMINI_KEY")
      usedModel = model || "gemini-2.5-flash";
      const contents = msgs.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }))
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${usedModel}:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
            contents,
            generationConfig: { maxOutputTokens: maxTokens || 1000 },
          }),
        }
      )
      const d = await res.json()
      if (d.error) throw new Error(d.error.message)
      text = d.candidates?.[0]?.content?.parts?.[0]?.text || ""
      inputTok = d.usageMetadata?.promptTokenCount || 0;
      outputTok = d.usageMetadata?.candidatesTokenCount || 0;

    } else if (provider === "gpt") {
      if (!OPENAI_KEY) throw new Error("Server chưa cấu hình OPENAI_KEY")
      usedModel = model || "gpt-4o-mini";
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
        body: JSON.stringify({
          model: usedModel,
          max_tokens: maxTokens || 1000,
          messages: [...(system ? [{ role: "system", content: system }] : []), ...msgs],
        }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error.message)
      text = d.choices?.[0]?.message?.content || ""
      inputTok = d.usage?.prompt_tokens || 0;
      outputTok = d.usage?.completion_tokens || 0;
    }

    if (admin) await logUsage(admin, user.id, provider, usedModel, inputTok, outputTok, feature || null);

    return new Response(JSON.stringify({ text, usage: { input_tokens: inputTok, output_tokens: outputTok } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
