// supabase/functions/ai-proxy/index.ts — BẢN MỞ RỘNG + JWT AUTH + COST LOGGING
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

// ---- Bảng giá USD / 1 TRIỆU token — tra cứu 15/07/2026, xem thêm README_PRICING.md ----
// input/output theo model string thực tế app đang dùng (khớp AiTab.jsx)
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-sonnet-5": { in: 2, out: 10 }, // giá intro đến 31/8/2026, sau đó $3/$15
  "claude-opus-4-6": { in: 5, out: 25 },
  "gemini-2.5-flash": { in: 0.30, out: 2.50 },
  "gemini-3.5-flash": { in: 1.50, out: 9 },
  "gemini-3.1-pro": { in: 2, out: 12 },
  "gpt-4o-mini": { in: 0.15, out: 0.60 },
  "chat-latest": { in: 5, out: 30 }, // GPT-5.5 Instant — chưa có giá API riêng công bố, tạm dùng giá GPT-5.5
  "gpt-5.5": { in: 5, out: 30 },
};

function calcCost(model: string, inputTok: number, outputTok: number) {
  const p = PRICING[model];
  if (!p) return 0; // model lạ/chưa cập nhật giá — không chặn request, chỉ không tính được cost
  return (inputTok / 1e6) * p.in + (outputTok / 1e6) * p.out;
}

// ---- Log cost — KHÔNG BAO GIỜ làm fail request chính nếu log lỗi ----
async function logUsage(userId: string | null, provider: string, model: string, inputTok: number, outputTok: number, feature: string | null) {
  if (!SUPABASE_SERVICE_KEY) {
    console.error("[ai_usage_log] SUPABASE_SERVICE_ROLE_KEY rỗng — bỏ qua log");
    return;
  }
  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { error } = await admin.from("ai_usage_log").insert({
      user_id: userId,
      provider, model, feature,
      input_tokens: inputTok,
      output_tokens: outputTok,
      cost_usd: calcCost(model, inputTok, outputTok),
    });
    if (error) console.error("[ai_usage_log] insert lỗi:", error.message, error.code);
  } catch (e) {
    console.error("[ai_usage_log] exception:", e.message);
  }
}

// ---- JWT Auth helper ----
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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ---- Verify JWT ----
    const user = await verifyUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { foodDesc, provider = "claude", model, system, messages, maxTokens, feature } = await req.json()

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

    // Log usage — await trực tiếp (đơn giản, chắc chắn insert hoàn thành
    // trước khi function đóng). Thêm ~100-200ms, không đáng kể so với
    // AI call vốn đã mất 10-30s.
    await logUsage(user.id, provider, usedModel, inputTok, outputTok, feature || null);

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
