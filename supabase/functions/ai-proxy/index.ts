import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') ?? ''

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { foodDesc, provider, model, system, messages, maxTokens } = await req.json()

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
          // Chat coach cần trần cao hơn để không bỏ lửng giữa câu; các flow cũ
          // (tính macro) không gửi maxTokens nên vẫn 1000 như trước.
          max_tokens: maxTokens || 1000,
          // Đường mới: messages array role chuẩn + system riêng (chat coach).
          // Đường cũ: foodDesc gói thành 1 user message (ai-macro giữ nguyên).
          ...(system ? { system } : {}),
          messages: (messages && messages.length) ? messages : [{ role: "user", content: foodDesc }],
        }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error.message)
      text = (d.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("")
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
