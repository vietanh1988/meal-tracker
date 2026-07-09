import { supabase } from "../lib/supabase";

const PROMPT = `Bạn là chuyên gia dinh dưỡng. Tính CHÍNH XÁC macro cho thực phẩm.

QUY TẮC:

1. CÁCH CHẾ BIẾN (nhận diện từ tên):
   - "luộc/hấp" → không cộng dầu mỡ
   - "rán/chiên" → cộng thêm dầu (~5ml = ~45kcal, ~5g fat mỗi phần)
   - "xào" → cộng thêm dầu (~3ml = ~27kcal, ~3g fat mỗi phần)
   - "nướng" → giảm nhẹ fat (mỡ chảy ra)
   - Không ghi cách chế biến + thịt/cá/trứng/rau → mặc định luộc
   - Trái cây/sữa/bánh/nước → ăn sống/uống trực tiếp
   - Rán/chiên BẮT BUỘC phải có calo CAO HƠN luộc/hấp cùng loại

2. TRỌNG LƯỢNG:
   - Nếu user cung cấp GRAM → dùng CHÍNH XÁC gram đó
   - Nếu user cung cấp quả/hộp/lát → tự ước tính trọng lượng hợp lý

3. ĐỘ CHÍNH XÁC:
   - Tham khảo dữ liệu dinh dưỡng chuẩn (USDA, Viện Dinh dưỡng VN, hoặc nguồn uy tín)
   - KHÔNG đoán bừa, phải dựa trên data thực tế
   - TỰ KIỂM TRA: cal PHẢI ≈ protein×4 + carb×4 + fat×9 (sai lệch tối đa 5%)
   - Nếu không khớp → tính lại cho đúng
   - VÍ DỤ CHUẨN: 1 quả trứng gà luộc (~50g) ≈ P:6g, C:0.6g, F:5g, Cal:72kcal
   - VÍ DỤ CHUẨN: 1 quả trứng gà rán (~60g với dầu) ≈ P:6g, C:0.6g, F:10g, Cal:115kcal

Trả JSON CHÍNH XÁC, KHÔNG markdown:
{"items":[{"name":"tên","gram":tổng_gram,"unit":"đơn vị gốc","qty":số_lượng,"qty_display":"VD: 3 quả","protein":số,"carb":số,"fat":số,"fiber":số,"cal":số}],"tip":"1 câu gợi ý ngắn"}`;

function buildFoodDesc(foods) {
  return foods
    .filter(f => f.name.trim())
    .map(f => {
      const unit = f.unit || "g";
      const isWeight = unit === "g" || unit === "ml";
      if (isWeight) {
        return `${f.name} — ${f.gram}${unit}`;
      } else {
        return `${f.qty} ${unit} ${f.name}`;
      }
    })
    .join("\n");
}

export async function calcMacroAI({ foods, provider = "claude", model }) {
  const foodDesc = buildFoodDesc(foods);
  const { data, error } = await supabase.functions.invoke("ai-macro", {
    body: { foodDesc, provider, model },
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function calcMacroAIDirect({ foods, provider, model, keys }) {
  const foodDesc = buildFoodDesc(foods);
  let text = "";

  if (provider === "claude") {
    // Gọi qua Supabase Edge Function proxy (tránh CORS)
    const res = await fetch("https://veodsvojxjmjhtrlaieq.supabase.co/functions/v1/ai-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        foodDesc: `${PROMPT}\n\nThức ăn cần phân tích:\n${foodDesc}`,
        provider: "claude",
        model: model || "claude-sonnet-5",
        apiKey: keys.claude,
      }),
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error);
    text = d.text || "";

  } else if (provider === "gemini") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys.gemini}`,
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: `${PROMPT}\n\nThức ăn cần phân tích:\n${foodDesc}` }] }] }) }
    );
    const d = await res.json();
    if (d.error) throw new Error(d.error.message);
    text = d.candidates?.[0]?.content?.parts?.[0]?.text || "";

  } else if (provider === "gpt") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${keys.gpt}` },
      body: JSON.stringify({ model, messages: [{ role: "user", content: `${PROMPT}\n\nThức ăn cần phân tích:\n${foodDesc}` }], max_tokens: 1000 })
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error.message);
    text = d.choices?.[0]?.message?.content || "";
  }

  return JSON.parse(text.replace(/```json|```/g, "").trim());
}
