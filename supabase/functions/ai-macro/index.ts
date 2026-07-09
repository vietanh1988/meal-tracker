// supabase/functions/ai-macro/index.ts
// Deploy: supabase functions deploy ai-macro
// Set secrets: supabase secrets set ANTHROPIC_KEY=sk-ant-...

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPT = `Bạn là chuyên gia dinh dưỡng. Phân tích dinh dưỡng cho thức ăn dưới đây.
Trả lời CHÍNH XÁC bằng JSON, không markdown:
{"items":[{"name":"tên","gram":số,"protein":số,"carb":số,"fat":số,"fiber":số,"cal":số}],"tip":"1 câu gợi ý cho người gym tăng cơ"}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const { foodDesc, provider = "claude", model } = await req.json();

  let result;
  try {
    if (provider === "claude") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": Deno.env.get("ANTHROPIC_KEY")!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: model || "claude-sonnet-5",
          max_tokens: 1000,
          messages: [{ role: "user", content: `${PROMPT}\nThức ăn: ${foodDesc}` }],
        }),
      });
      const data = await res.json();
      const text = data.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
      result = JSON.parse(text.replace(/```json|```/g, "").trim());

    } else if (provider === "gemini") {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${Deno.env.get("GEMINI_KEY")}`,
        { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: `${PROMPT}\nThức ăn: ${foodDesc}` }] }] }) }
      );
      const data = await res.json();
      const text = data.candidates[0].content.parts[0].text;
      result = JSON.parse(text.replace(/```json|```/g, "").trim());

    } else if (provider === "gpt") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("OPENAI_KEY")}` },
        body: JSON.stringify({ model, messages: [{ role: "user", content: `${PROMPT}\nThức ăn: ${foodDesc}` }], max_tokens: 1000 }),
      });
      const data = await res.json();
      result = JSON.parse(data.choices[0].message.content.replace(/```json|```/g, "").trim());
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
