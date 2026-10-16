// Chụp ảnh bữa ăn → AI nhận diện món (gọi ai-proxy, feature "photo_macro"). Dùng chung cho màn Chụp ảnh mobile.
import { authFetch } from "./authFetch";
import { pickAiModel } from "./aiProvider";
import { parsePhotoDishes } from "./photoParse.js";
export { parsePhotoDishes };

export const PHOTO_PROMPT = `Nhìn ảnh bữa ăn này. Liệt kê TẤT CẢ các món ăn/thức uống bạn nhìn thấy.
Với mỗi món, ước lượng khối lượng (gram) và TÍNH LUÔN dinh dưỡng (cal, protein, carb, fat, fiber).
Kèm SỐ LƯỢNG + ĐƠN VỊ quen thuộc của món (qty, unit): bát, tô, đĩa, quả, lát, miếng, cái, cuốn, xiên, ly, cốc, hộp…
VD: cơm 1,5 bát → qty 1.5, unit "bát"; 2 quả trứng → qty 2, unit "quả". Đồ uống dùng unit "ml" (qty = số ml).
Món không có đơn vị quen (thịt kho, rau xào…) thì unit "g", qty = gram.

QUAN TRỌNG: Đây là món ĐÃ CHẾ BIẾN / ĂN LIỀN — KHÔNG phải nguyên liệu thô/khô.
VD: "miến ngan nước 400g" = cả tô miến nấu chín + thịt ngan + nước dùng (~500-600 cal), KHÔNG phải 400g miến khô.
VD: "phở bò 500g" = cả tô phở (~550-650 cal), KHÔNG phải 500g bánh phở khô.

NGUYÊN TẮC TÊN MÓN:
- LUÔN ghi CỤ THỂ loại: "trứng gà luộc" (không ghi "trứng luộc"), "thịt heo kho" (không ghi "thịt kho").
- Ghi đầy đủ cách chế biến: nướng, luộc, chiên, kho, xào, hấp...

NGUYÊN TẮC TÁCH / GIỮ NGUYÊN:
- Thành phần RIÊNG BIỆT trên đĩa: TÁCH ra từng loại. VD: cơm + thịt kho + rau luộc → 3 items.
- Món TRỘN LẪN / có nước (phở, bún, cháo, miến nước, canh, lẩu, xôi): GIỮ NGUYÊN 1 item. VD: phở bò → 1 item "phở bò" 500g.

Tên món viết bằng tiếng Việt.
Trả lời ĐÚNG JSON, không có text trước/sau:
[{"name":"tên tiếng Việt","qty":số,"unit":"bát|quả|ml|g|…","gram":số,"cal":số,"p":số,"c":số,"f":số,"fiber":số}]`;

export async function recognizeMeal(base64DataUrl, appSettings) {
  const fallback = appSettings?.ai_provider || "claude";
  const override = appSettings?.photo_vision_provider;
  const provider = override && override !== "auto" ? override : fallback;
  const model = pickAiModel(provider, { claudeModel: appSettings?.ai_model || "claude-sonnet-5", geminiModel: appSettings?.gemini_model || "gemini-2.5-flash", gptModel: appSettings?.gpt_model || "gpt-4o-mini" });
  const res = await authFetch("ai-proxy", { foodDesc: PHOTO_PROMPT, provider, model, feature: "photo_macro", image: String(base64DataUrl).split(",")[1] });
  if (res?.quotaExceeded) { const e = new Error(res.message || "Bạn đã hết lượt chụp ảnh tháng này."); e.quota = true; throw e; }
  if (res?.error) throw new Error(res.error);
  const items = parsePhotoDishes(res?.text || res?.result || "");
  if (!items.length) throw new Error("Chưa nhận ra món nào. Chụp gần hơn, đủ sáng giúp mình nhé.");
  return items;
}

// Thu ảnh về cạnh dài ≤ maxSize (đỡ tốn token, gửi nhanh)
export function resizeImage(file, maxSize = 1024) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, maxSize / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Không đọc được ảnh")); };
    img.src = url;
  });
}
