// Khoá AI (Claude / OpenAI / Gemini) CHỈ GHI: trình duyệt không bao giờ tải nguyên khoá về.
// Ghi qua RPC admin_set_ai_key (Super Admin), xem "Đã cài ••••1234" qua admin_ai_key_status.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { keyStatusMap, cleanKey, LOCAL_KEY_COPIES } from "./aiKeysView";

export function clearLocalKeyCopies() {
  try { LOCAL_KEY_COPIES.forEach((k) => localStorage.removeItem(k)); } catch (e) { /* bỏ qua */ }
}

export function useAiKeys(enabled) {
  const [status, setStatus] = useState({});
  const reload = useCallback(async () => {
    if (!enabled) return;
    const { data, error } = await supabase.rpc("admin_ai_key_status");
    if (!error) setStatus(keyStatusMap(data));
  }, [enabled]);
  useEffect(() => { clearLocalKeyCopies(); reload(); }, [reload]);
  // drafts: { gpt_key: "sk-..." } — ô trống bỏ qua. Trả { ok, saved, error }
  const saveKeys = useCallback(async (drafts) => {
    const saved = [];
    for (const [name, raw] of Object.entries(drafts || {})) {
      const v = cleanKey(raw);
      if (v === null) continue;
      if (v === "short") return { ok: false, saved, error: "Khoá có vẻ không đúng (quá ngắn)" };
      const { error } = await supabase.rpc("admin_set_ai_key", { p_name: name, p_value: v });
      if (error) return { ok: false, saved, error: "Không lưu được khoá" };
      saved.push(name);
    }
    if (saved.length) await reload();
    return { ok: true, saved };
  }, [reload]);
  return { status, saveKeys, reload };
}
