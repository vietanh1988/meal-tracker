// Khoá AI chỉ ghi (18/10) — hàm thuần, có test (tests/aiKeys.test.mjs)
export const AI_KEY_NAMES = ["claude_key", "gpt_key", "gemini_key", "claude_writer_key", "gemini_writer_key", "gpt_writer_key", "fal_key"]; // khoá riêng cho AI viết bài (3 hãng) + vẽ ảnh Flux (fal.ai)
export const LOCAL_KEY_COPIES = ["claudeKey", "geminiKey", "gptKey"];
// rows từ RPC admin_ai_key_status → { gpt_key: { set, last4, at } }
export function keyStatusMap(rows) {
  const out = {};
  (rows || []).forEach((r) => { if (r && AI_KEY_NAMES.includes(r.name)) out[r.name] = { set: !!r.is_set, last4: r.last4 || "", at: r.updated_at || null }; });
  return out;
}
export function keyPlaceholder(st, fallback) {
  return st && st.set ? `Đã cài · ••••${st.last4} — dán khoá mới để thay` : fallback;
}
// Khoá dán vào: bỏ khoảng trắng; null = để trống (giữ khoá cũ); "short" = quá ngắn
export function cleanKey(v) {
  const s = String(v || "").trim();
  if (!s) return null;
  return s.length < 20 || s.length > 400 ? "short" : s;
}
