// AI Service - gọi qua Supabase Edge Function để ẩn API keys
// Edge Function url: https://your-project.supabase.co/functions/v1/ai-macro

import { supabase } from "../lib/supabase";

const PROMPT = `Bạn là chuyên gia dinh dưỡng. Phân tích dinh dưỡng cho thức ăn dưới đây.
Lưu ý đơn vị: trứng tính theo "quả", sữa tính theo "ml" hoặc "hộp", bánh mì tính theo "ổ/lát", chuối tính theo "quả", thức ăn khác tính theo "g".
Trả lời CHÍNH XÁC bằng JSON, không markdown:
{"items":[{"name":"tên","gram":tổng_gram,"unit":"đơn vị gốc (quả/ml/hộp/lát/g)","qty_display":"số lượng theo đơn vị gốc","protein":số,"carb":số,"fat":số,"fiber":số,"cal":số}],"tip":"1 câu gợi ý cho người gym tăng cơ"}`;

export async function calcMacroAI({ foods, provider = "claude", model }) {
  const foodDesc = foods
    .filter(f => f.name.trim())
    .map(f => `${f.qty > 1 ? f.qty + " " : ""}${f.name} ${f.gram}g`)
    .join(", ");

  // Gọi qua Supabase Edge Function (keys nằm ở server, không lộ ra client)
  const { data, error } = await supabase.functions.invoke("ai-macro", {
    body: { foodDesc, provider, model },
  });

  if (error) throw new Error(error.message);
  return data;
}

// ---- DEV ONLY: gọi thẳng nếu có key trong .env ----
// Chỉ dùng khi dev local, KHÔNG deploy lên production
export async function calcMacroAIDirect({ foods, provider, model, keys }) {
  const foodDesc = foods
    .filter(f => f.name.trim())
    .map(f => `${f.qty > 1 ? f.qty + " " : ""}${f.name} ${f.gram}g`)
    .join(", ");

  let text = "";

  if (provider === "claude") {
    const headers = { "Content-Type": "application/json", "anthropic-version": "2023-06-01" };
    if (keys.claude) headers["x-api-key"] = keys.claude;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers,
      body: JSON.stringify({
        model: model || "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: `${PROMPT}\nThức ăn: ${foodDesc}` }]
      })
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error.message);
    text = (d.content || []).filter(b => b.type === "text").map(b => b.text).join("");

  } else if (provider === "gemini") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys.gemini}`,
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: `${PROMPT}\nThức ăn: ${foodDesc}` }] }] }) }
    );
    const d = await res.json();
    if (d.error) throw new Error(d.error.message);
    text = d.candidates?.[0]?.content?.parts?.[0]?.text || "";

  } else if (provider === "gpt") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${keys.gpt}` },
      body: JSON.stringify({ model, messages: [{ role: "user", content: `${PROMPT}\nThức ăn: ${foodDesc}` }], max_tokens: 1000 })
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error.message);
    text = d.choices?.[0]?.message?.content || "";
  }

  return JSON.parse(text.replace(/```json|```/g, "").trim());
}
