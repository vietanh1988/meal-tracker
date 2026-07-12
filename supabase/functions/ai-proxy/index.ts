// supabase/functions/ai-proxy/index.ts — BẢN MỞ RỘNG + JWT AUTH
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

    const { foodDesc, provider = "claude", model, system, messages, maxTokens } = await req.json()

    const msgs = (messages && messages.length) ? messages : [{ role: "user", content: foodDesc }]
    let text = ""

    if (provider === "claude") {
      if (!CLAUDE_API_KEY) throw new Error("Server chưa cấu hình CLAUDE_API_KEY")
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          "x-api-key": CLAUDE_API_KEY,
        },
        body: JSON.stringify({
          model: model || "claude-sonnet-5",
          max_tokens: maxTokens || 1000,
          ...(system ? { system } : {}),
          messages: msgs,
        }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error.message)
      text = (d.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("")

    } else if (provider === "gemini") {
      if (!GEMINI_KEY) throw new Error("Server chưa cấu hình GEMINI_KEY")
      const contents = msgs.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }))
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-2.5-flash"}:generateContent?key=${GEMINI_KEY}`,
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

    } else if (provider === "gpt") {
      if (!OPENAI_KEY) throw new Error("Server chưa cấu hình OPENAI_KEY")
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
        body: JSON.stringify({
          model: model || "gpt-4o-mini",
          max_tokens: maxTokens || 1000,
          messages: [...(system ? [{ role: "system", content: system }] : []), ...msgs],
        }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error.message)
      text = d.choices?.[0]?.message?.content || ""
    }

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
