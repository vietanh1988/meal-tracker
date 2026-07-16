// src/lib/aiProvider.js
// Nguồn DUY NHẤT chọn model theo provider — MỌI nơi gọi AI phải dùng hàm
// này, KHÔNG tự định nghĩa modelByProvider/object literal riêng lẻ nữa.
// Lý do: từng có bug thật — 1 nơi quên đổi model theo provider, gửi
// provider="gpt" kèm model="claude-sonnet-5" (model của Claude), bị
// OpenAI từ chối thẳng 400. Code trùng lặp ở 5 chỗ khác nhau khiến lỗi
// dễ lặp lại (1 chỗ còn hardcode "claude-sonnet-5" không đọc setting).

// Dùng khi đã có 3 giá trị model cụ thể trong tay (từ appSettings đã lưu,
// hoặc từ state form đang sửa — không quan trọng nguồn gốc).
export function pickAiModel(provider, { claudeModel, geminiModel, gptModel } = {}) {
  if (provider === "gemini") return geminiModel || "gemini-2.5-flash";
  if (provider === "gpt") return gptModel || "gpt-4o-mini";
  return claudeModel || "claude-sonnet-5";
}

// Tiện ích cho nơi đọc trực tiếp appSettings đã lưu (AICoachPanel,
// WeightSuggestion...) — tự lấy đúng provider + 3 model field liên quan.
export function pickAiModelFromSettings(appSettings, providerOverride) {
  const provider = providerOverride || appSettings?.ai_provider || "claude";
  return pickAiModel(provider, {
    claudeModel: appSettings?.ai_model,
    geminiModel: appSettings?.gemini_model,
    gptModel: appSettings?.gpt_model,
  });
}

export function pickAiProvider(appSettings) {
  return appSettings?.ai_provider || "claude";
}
