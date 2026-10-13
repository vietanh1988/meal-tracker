// Lượt AI đã dùng / giới hạn theo hạng — hàm thuần, có test.
// LƯU Ý: bộ đếm do edge function ai-proxy ghi, kỳ "ngày"/"tháng" của nó tính theo ngày UTC
// (reset lúc 7:00 sáng giờ VN). Ở đây phải so cùng mốc UTC để hiện đúng số server đang đếm,
// nên CỐ Ý dùng ngày UTC (không dùng dateVN). Khi ai-proxy chuyển sang giờ VN thì đổi utcDay → todayVN.
export const utcDay = (now = new Date()) => now.toISOString().slice(0, 10);

const DEFAULTS = {
  chat: { free: 20, trial: 100, premium: 150 },
  menu: { free: 5, trial: 30, premium: 50 },
  photo: { free: 30, trial: 100, premium: 300 },
  macro: { free: 100, trial: 500, premium: 1000 },
};

export const QUOTA_ROWS = [
  { key: "chat", label: "Chat với Fipilot AI", period: "day" },
  { key: "menu", label: "AI tạo thực đơn", period: "day" },
  { key: "photo", label: "Chụp ảnh món ăn", period: "month" },
  { key: "macro", label: "AI tính macro món", period: "month" },
];

// sub: dòng profiles (tier + các cột ai_*_count_*), settings: subscription_settings (có thể null)
export function aiQuota(sub, settings, now = new Date()) {
  const tier = ["free", "trial", "premium"].includes(sub?.tier) ? sub.tier : "free";
  const day = utcDay(now), month = day.slice(0, 7);
  const used = {
    chat: sub?.ai_chat_count_reset_at === day ? Number(sub.ai_chat_count_today) || 0 : 0,
    menu: sub?.ai_menu_count_reset_at === day ? Number(sub.ai_menu_count_today) || 0 : 0,
    photo: String(sub?.ai_photo_count_reset_at || "").slice(0, 7) === month ? Number(sub.ai_photo_count_this_month) || 0 : 0,
    macro: String(sub?.ai_macro_count_reset_at || "").slice(0, 7) === month ? Number(sub.ai_macro_count_this_month) || 0 : 0,
  };
  return QUOTA_ROWS.map((r) => {
    const lim = Number(settings?.[`${tier}_ai_${r.key}_limit`]);
    const limit = Number.isFinite(lim) && lim > 0 ? lim : DEFAULTS[r.key][tier];
    const u = used[r.key];
    return { ...r, used: u, limit, pct: Math.min(100, Math.round((u / limit) * 100)), out: u >= limit };
  });
}
