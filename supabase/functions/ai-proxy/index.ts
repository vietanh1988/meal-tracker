// supabase/functions/ai-proxy/index.ts — BẢN MỞ RỘNG
// Thêm nhánh gemini/gpt chạy bằng key SERVER (trước chỉ có claude).
// Secrets: CLAUDE_API_KEY (đã có), GEMINI_KEY (ai-macro đã dùng),
//          OPENAI_KEY (chỉ cần nếu admin chọn GPT).
// Deploy: supabase functions deploy ai-proxy
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') ?? ''
const GEMINI_KEY = Deno.env.get('GEMINI_KEY') ?? ''
const OPENAI_KEY = Deno.env.get('OPENAI_KEY') ?? ''

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { foodDesc, provider = "claude", model, system, messages, maxTokens } = await req.json()

    // Chuẩn hoá: cả 2 đường (foodDesc cũ / messages mới) về 1 mảng messages
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
      // Gemini: system riêng + messages map sang contents (role model/user)
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
