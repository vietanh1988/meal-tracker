import { supabase } from "./supabase";

// Kiểm tra + trừ 1 lượt dùng AI — MỌI tier đều có trần (không tier nào
// vô hạn tuyệt đối). Free = hạn mức thấp, hiện rõ cho user. Trial/Premium
// = hạn mức cao (gần như không đụng tới khi dùng bình thường) — đóng vai
// trò lưới an toàn chống bug loop/lạm dụng, không phải giới hạn thương mại.
// kind: "macro" (AI tính macro món ăn, theo THÁNG) | "chat" (Fipilot AI Chat, theo NGÀY)
//     | "menu" (AI tạo/tạo lại thực đơn, theo NGÀY)
// Fail-open: nếu lỗi mạng/DB thì cho phép luôn, không chặn user vì sự cố kỹ thuật.
export async function checkAndConsumeAiQuota(userId, kind) {
  if (!userId) return { allowed: true };
  try {
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("tier,ai_macro_count_this_month,ai_macro_count_reset_at,ai_chat_count_today,ai_chat_count_reset_at,ai_menu_count_today,ai_menu_count_reset_at")
      .eq("id", userId)
      .single();
    if (pErr || !profile) return { allowed: true };

    const tier = profile.tier || "free";

    const { data: settings } = await supabase
      .from("subscription_settings")
      .select("free_ai_macro_limit,free_ai_chat_limit,free_ai_menu_limit,trial_ai_macro_limit,trial_ai_chat_limit,trial_ai_menu_limit,premium_ai_macro_limit,premium_ai_chat_limit,premium_ai_menu_limit")
      .eq("id", 1)
      .single();

    // Hạn mức theo tier — admin tự chỉnh trong Cài đặt gói cước.
    // Trial/Premium mặc định cao gấp nhiều lần Free, không phải để user
    // chạm tới trong dùng bình thường, chỉ chặn spam/bug loop cực đoan.
    const LIMITS = {
      free:    { macro: settings?.free_ai_macro_limit ?? 100, chat: settings?.free_ai_chat_limit ?? 20, menu: settings?.free_ai_menu_limit ?? 5 },
      trial:   { macro: settings?.trial_ai_macro_limit ?? 500, chat: settings?.trial_ai_chat_limit ?? 100, menu: settings?.trial_ai_menu_limit ?? 30 },
      premium: { macro: settings?.premium_ai_macro_limit ?? 1000, chat: settings?.premium_ai_chat_limit ?? 150, menu: settings?.premium_ai_menu_limit ?? 50 },
    };
    const lim = LIMITS[tier] || LIMITS.free;
    const upgradeHint = tier === "free" ? " Nâng cấp Premium để có hạn mức cao hơn." : "";

    const today = new Date().toISOString().slice(0, 10);
    const thisMonth = today.slice(0, 7);

    if (kind === "macro") {
      const resetMonth = (profile.ai_macro_count_reset_at || "").slice(0, 7);
      const sameMonth = resetMonth === thisMonth;
      const count = sameMonth ? (profile.ai_macro_count_this_month || 0) : 0;
      if (count >= lim.macro) {
        return { allowed: false, message: `Bạn đã dùng hết ${lim.macro} lượt AI tính macro trong tháng này.${upgradeHint}` };
      }
      await supabase.from("profiles").update({
        ai_macro_count_this_month: count + 1,
        ai_macro_count_reset_at: sameMonth ? profile.ai_macro_count_reset_at : today,
      }).eq("id", userId);
      return { allowed: true };
    } else if (kind === "menu") {
      const sameDay = profile.ai_menu_count_reset_at === today;
      const count = sameDay ? (profile.ai_menu_count_today || 0) : 0;
      if (count >= lim.menu) {
        return { allowed: false, message: `Bạn đã dùng hết ${lim.menu} lượt AI tạo thực đơn hôm nay.${upgradeHint}` };
      }
      await supabase.from("profiles").update({
        ai_menu_count_today: count + 1,
        ai_menu_count_reset_at: sameDay ? profile.ai_menu_count_reset_at : today,
      }).eq("id", userId);
      return { allowed: true };
    } else {
      const sameDay = profile.ai_chat_count_reset_at === today;
      const count = sameDay ? (profile.ai_chat_count_today || 0) : 0;
      if (count >= lim.chat) {
        return { allowed: false, message: `Bạn đã dùng hết ${lim.chat} tin nhắn AI Chat hôm nay.${upgradeHint}` };
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
