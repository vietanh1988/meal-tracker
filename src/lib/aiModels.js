// Danh sách mô hình AI cho Quản trị › Kết nối AI (PC + mobile + tab cũ) — 1 nguồn duy nhất.
// Tra cứu 18/10/2026 trên trang chính thức (platform.claude.com, developers.openai.com, ai.google.dev).
// Giá USD / 1 triệu token (vào / ra) ghi ở `price` để admin so; bảng tính chi phí thật ở ai-proxy (PRICING).
export const PROVIDERS = [
  { id: "claude", name: "Claude", desc: "Anthropic", logo: "/icons/claude-logo.svg" },
  { id: "gemini", name: "Gemini", desc: "Google", logo: "/icons/gemini-logo.svg" },
  { id: "gpt", name: "GPT", desc: "OpenAI", logo: "/icons/gpt-logo.svg" },
];
export const MODELS = {
  claude: [
    { id: "claude-haiku-5-5", name: "Haiku 5.5", desc: "Nhanh, rẻ nhất · $0.10 / $0.50", badge: "Tiết kiệm" },
    { id: "claude-sonnet-5-5", name: "Sonnet 5.5", desc: "Chính xác, giá vừa · $2 / $10", badge: "Khuyên dùng" },
    { id: "claude-opus-5-5", name: "Opus 5.5", desc: "Mạnh nhất, chậm hơn · $4 / $20", badge: "Cao cấp" },
  ],
  gemini: [
    { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash-Lite", desc: "Nhanh, rẻ · $0.30 / $2.50", badge: "Tiết kiệm" },
    { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", desc: "Mới nhất · $0.75 / $3.75 (gấp đôi từ 1/2027)", badge: "Khuyên dùng" },
    { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", desc: "Mạnh nhất (bản thử) · $2 / $12", badge: "Cao cấp" },
  ],
  gpt: [
    { id: "gpt-6-luna", name: "GPT-6 Luna", desc: "Rẻ nhất · $0.10 / $0.50", badge: "Tiết kiệm" },
    { id: "gpt-6.1-sol", name: "GPT-6.1 Sol", desc: "Gần mạnh nhất, giá vừa · $2 / $10", badge: "Khuyên dùng" },
    { id: "gpt-6-astra", name: "GPT-6 Astra", desc: "Mạnh nhất, đắt · $10 / $50", badge: "Cao cấp" },
  ],
};
export const MODEL_KEY = { claude: "ai_model", gemini: "gemini_model", gpt: "gpt_model" };
// Mặc định khi chưa chọn (cũng là mô hình "Khuyên dùng")
export const DEFAULT_MODEL = { claude: "claude-sonnet-5-5", gemini: "gemini-3.8-flash", gpt: "gpt-6.1-sol" };

// Danh sách hiển thị: nếu mô hình đang lưu không còn trong danh sách → thêm dòng "Đang dùng · bản cũ" để admin thấy và đổi
export function modelsFor(provider, current) {
  const list = MODELS[provider] || MODELS.claude;
  if (!current || list.some((m) => m.id === current)) return list;
  return [...list, { id: current, name: current, desc: "Bản cũ — nên đổi sang mô hình mới", badge: "Bản cũ", legacy: true }];
}
