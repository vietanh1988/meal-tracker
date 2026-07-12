// supabase/functions/ai-macro/index.ts + JWT AUTH
// Deploy: supabase functions deploy ai-macro
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const ALLOWED_ORIGINS = [
  "https://fipilotai.com",
  "https://www.fipilotai.com",
  "https://app.fipilotai.com",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
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

const PROMPT = `Bạn là chuyên gia dinh dưỡng. Phân tích dinh dưỡng cho thức ăn dưới đây.
Trả lời CHÍNH XÁC bằng JSON, không markdown:
{"items":[{"name":"tên","gram":số,"protein":số,"carb":số,"fat":số,"fiber":số,"cal":số}],"tip":"1 câu gợi ý cho người gym tăng cơ"}`;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // ---- Verify JWT ----
  const user = await verifyUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

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
