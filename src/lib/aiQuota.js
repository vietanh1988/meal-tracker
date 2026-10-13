// Lượt AI đã dùng / giới hạn theo hạng — hàm thuần, có test.
// LƯU Ý: bộ đếm do edge function ai-proxy ghi, kỳ "ngày"/"tháng" của nó tính theo ngày UTC
// (reset lúc 7:00 sáng giờ VN). Ở đây phải so cùng mốc UTC để hiện đúng số server đang đếm,
// nên CỐ Ý dùng ngày UTC (không dùng dateVN). Khi ai-proxy chuyển sang giờ VN thì đổi utcDay → todayVN.
export const utcDay = (now = new Date()) => now.toISOString().slice(0, 10);

export const QUOTA_DEFAULTS = {
  chat: { free: 20, trial: 100, premium: 150 },
  menu: { free: 5, trial: 30, premium: 50 },
  photo: { free: 30, trial: 100, premium: 300 },
  macro: { free: 100, trial: 500, premium: 1000 },
};

export const QUOTA_ROWS = [
  { key: "chat", label: "Chat AI", period: "day" },
  { key: "menu", label: "AI thực đơn", period: "day" },
  { key: "photo", label: "Chụp ảnh món", period: "month" },
  { key: "macro", label: "AI tính calo", period: "month" },
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
    const limit = Number.isFinite(lim) && lim > 0 ? lim : QUOTA_DEFAULTS[r.key][tier];
    const u = used[r.key];
    return { ...r, used: u, limit, pct: Math.min(100, Math.round((u / limit) * 100)), out: u >= limit };
  });
}

// Bảng so sánh gói (màn Gói cước khi mở bán): giới hạn từng loại lượt theo hạng.
// menuLockedFree: AI lên thực đơn đang khoá hẳn với Miễn phí (getAIMenuAccess) → hiện "—".
export function limitsTable(settings, { menuLockedFree = true } = {}) {
  return QUOTA_ROWS.map((r) => {
    const v = (tier) => {
      const n = Number(settings?.[`${tier}_ai_${r.key}_limit`]);
      return Number.isFinite(n) && n > 0 ? n : QUOTA_DEFAULTS[r.key][tier];
    };
    return { key: r.key, label: r.label, period: r.period, free: r.key === "menu" && menuLockedFree ? null : v("free"), trial: v("trial"), premium: v("premium") };
  });
}

// Các gói Premium có giá (bỏ gói chưa đặt giá), kèm giá/tháng; "best" = rẻ nhất mỗi tháng
export const PACKAGES = [{ id: "1m", months: 1, short: "1T" }, { id: "3m", months: 3, short: "3T" }, { id: "6m", months: 6, short: "6T" }, { id: "12m", months: 12, short: "12T" }];
export function packagesOf(settings) {
  const list = PACKAGES.map((p) => ({ ...p, price: Number(settings?.[`price_${p.id}`]) || 0 })).filter((p) => p.price > 0)
    .map((p) => ({ ...p, perMonth: Math.round(p.price / p.months) }));
  const min = Math.min(...list.map((p) => p.perMonth));
  return list.map((p) => ({ ...p, best: list.length > 1 && p.perMonth === min }));
}

// Nội dung chuyển khoản (giống màn thanh toán cũ để admin đối chiếu): FIPILOT <TÊN> <3T|6T|12T>
export function transferContent(username, userId, pkgId) {
  const name = String(username || userId || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toUpperCase();
  const p = PACKAGES.find((x) => x.id === pkgId);
  return `FIPILOT ${name} ${p ? p.short : ""}`.trim();
}
