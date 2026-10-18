// AI tính calo cho món chưa có trong kho (Kiểm tra calo). Gọi ai-proxy feature "macro_lookup"
// (trừ 1 lượt "AI tính macro" theo tháng, chặn ở server).
import { DEFAULT_MODEL } from "./aiModels.js";
import { authFetch } from "./authFetch";
import { pickAiModel } from "./aiProvider";
import { CALC_PROMPT, parseCalcAI } from "./calcCheck.js";

export async function aiCalc(entries, appSettings) {
  const provider = appSettings?.ai_provider || "claude";
  const model = pickAiModel(provider, { claudeModel: appSettings?.ai_model || DEFAULT_MODEL.claude, geminiModel: appSettings?.gemini_model || DEFAULT_MODEL.gemini, gptModel: appSettings?.gpt_model || DEFAULT_MODEL.gpt });
  const list = entries.map((e, i) => `${i + 1}. ${e.raw}`).join("\n");
  const res = await authFetch("ai-proxy", { foodDesc: `${CALC_PROMPT}\n\nDanh sách món:\n${list}`, provider, model, feature: "macro_lookup" });
  if (res?.quotaExceeded) { const e = new Error(res.message || "Bạn đã hết lượt AI tính macro tháng này."); e.quota = true; throw e; }
  if (res?.error) throw new Error(res.error);
  return { items: parseCalcAI(res?.text || res?.result || "", entries), provider };
}
