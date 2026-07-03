import { supabase } from "./supabase";

// Kiểm tra + trừ 1 lượt dùng AI cho user Free. Trial/Premium luôn được phép (không giới hạn).
// kind: "macro" (AI tính macro món ăn) | "chat" (Fipilot AI Chat)
// Fail-open: nếu lỗi mạng/DB thì cho phép luôn, không chặn user vì sự cố kỹ thuật.
export async function checkAndConsumeAiQuota(userId, kind) {
  if (!userId) return { allowed: true };
  try {
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("tier,ai_macro_count_this_month,ai_macro_count_reset_at,ai_chat_count_today,ai_chat_count_reset_at")
      .eq("id", userId)
      .single();
    if (pErr || !profile) return { allowed: true };
    if ((profile.tier || "free") !== "free") return { allowed: true };

    const { data: settings } = await supabase
      .from("subscription_settings")
      .select("free_ai_macro_limit,free_ai_chat_limit")
      .eq("id", 1)
      .single();
    const macroLimit = settings?.free_ai_macro_limit ?? 100;
    const chatLimit = settings?.free_ai_chat_limit ?? 20;

    const today = new Date().toISOString().slice(0, 10);
    const thisMonth = today.slice(0, 7);

    if (kind === "macro") {
      const resetMonth = (profile.ai_macro_count_reset_at || "").slice(0, 7);
      const sameMonth = resetMonth === thisMonth;
      const count = sameMonth ? (profile.ai_macro_count_this_month || 0) : 0;
      if (count >= macroLimit) {
        return { allowed: false, message: `Bạn đã dùng hết ${macroLimit} lượt AI tính macro trong tháng này. Nâng cấp Premium để dùng không giới hạn.` };
      }
      await supabase.from("profiles").update({
        ai_macro_count_this_month: count + 1,
        ai_macro_count_reset_at: sameMonth ? profile.ai_macro_count_reset_at : today,
      }).eq("id", userId);
      return { allowed: true };
    } else {
      const sameDay = profile.ai_chat_count_reset_at === today;
      const count = sameDay ? (profile.ai_chat_count_today || 0) : 0;
      if (count >= chatLimit) {
        return { allowed: false, message: `Bạn đã dùng hết ${chatLimit} tin nhắn AI Chat hôm nay. Nâng cấp Premium để chat không giới hạn.` };
      }
      await supabase.from("profiles").update({
        ai_chat_count_today: count + 1,
        ai_chat_count_reset_at: sameDay ? profile.ai_chat_count_reset_at : today,
      }).eq("id", userId);
      return { allowed: true };
    }
  } catch (e) {
    console.error("AI quota check error:", e);
    return { allowed: true };
  }
}
