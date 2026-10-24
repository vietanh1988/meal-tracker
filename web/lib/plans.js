// Gói cước dùng chung với app (bảng subscription_settings — Quản trị › Gói cước & giới hạn): giá 1/3/6/12 tháng, số ngày dùng thử, giới hạn AI từng gói.
// Web không tự đặt giá: anh đổi giá trong app là web đổi theo (tối đa 5 phút). Chỉ đọc cột công khai, không đọc thông tin ngân hàng.
import { q } from "./sb.js";

export const vnd = (n) => `${Math.round(Number(n) || 0).toLocaleString("vi-VN")}đ`;
const round100 = (n) => Math.round(n / 100) * 100;
export function shapePlan(r) {
  const x = r || {};
  const durs = [[1, x.price_1m], [3, x.price_3m], [6, x.price_6m], [12, x.price_12m]].filter(([, p]) => Number(p) > 0).map(([m, p]) => ({ m, price: +p, per: round100(p / m) }));
  const base = durs.find((d) => d.m === 1)?.per || durs[0]?.per || 0;
  for (const d of durs) d.save = base && d.m > 1 ? Math.max(0, Math.round((1 - d.per / base) * 100)) : 0;
  const cheapest = durs.reduce((a, d) => (!a || d.per < a.per ? d : a), null);
  const lim = (t, k) => (x[`${t}_ai_${k}_limit`] == null ? null : +x[`${t}_ai_${k}_limit`]);
  return {
    trial: +x.trial_days > 0 ? +x.trial_days : 0, durs, month: durs.find((d) => d.m === 1) || durs[0] || null, cheapest,
    limits: ["macro", "chat", "menu", "photo"].map((k) => ({ k, free: lim("free", k), premium: lim("premium", k) })),
  };
}
// Khách không đọc thẳng được subscription_settings (có thông tin ngân hàng) → hàm web_plan() chỉ trả cột công khai
export async function getPlan() { const r = await q("rpc/web_plan", { revalidate: 300 }); return shapePlan(r && !Array.isArray(r) ? r : r?.[0]); }
// %trial% trong chữ (banner, chân trang, hỏi đáp…) → số ngày dùng thử thật của app
export const fillTrial = (s, plan) => String(s ?? "").replace(/%trial%/g, String(plan?.trial || 7));
export const LIMIT_NAME = { macro: ["AI tính calo món lạ", "tháng"], chat: ["Hỏi AI về ăn uống", "ngày"], menu: ["AI lên thực đơn theo ý", "ngày"], photo: ["Chụp ảnh món, app tính calo", "tháng"] };
export const limitText = (n, per) => (n == null ? "—" : n <= 0 ? null : `${n.toLocaleString("vi-VN")} lần / ${per}`);
// Ý chính gói Premium (trang chủ, bảng giá): số lượt AI thật của app + giá rẻ nhất theo tháng
export function premiumPoints(plan) {
  const L = Object.fromEntries((plan?.limits || []).map((x) => [x.k, x.premium]));
  const out = [plan?.trial ? "Mọi thứ của gói dùng thử" : "Mọi thứ của gói Miễn phí"];
  if (L.photo > 0) out.push(`Chụp ảnh tính calo ${L.photo.toLocaleString("vi-VN")} lần / tháng`);
  if (L.chat > 0) out.push(`Hỏi AI về ăn uống ${L.chat.toLocaleString("vi-VN")} lần / ngày`);
  if (L.menu > 0) out.push(`AI lên thực đơn theo ý ${L.menu.toLocaleString("vi-VN")} lần / ngày`);
  if (plan?.cheapest && plan.cheapest.m > 1) out.push(`Chỉ từ ${vnd(plan.cheapest.per)} / tháng khi mua ${plan.cheapest.m} tháng`);
  return out;
}

// 25/10 (chủ dự án chốt): thẻ gói đầu trên web = gói dùng thử đủ chức năng (có ngày dùng thử) — không có thì về gói Miễn phí
export const trialName = (plan, pr) => (plan?.trial ? `Dùng thử ${plan.trial} ngày` : pr?.free?.name || "Miễn phí");
export const trialSub = (plan) => (plan?.trial ? `Gói trial đủ chức năng · ${plan.trial} ngày · không cần thẻ` : "Cho người mới bắt đầu");
export const trialPoints = (plan) => (plan?.trial
  ? [`Toàn bộ tính năng Premium trong ${plan.trial} ngày`, "Thực đơn món Việt tự lên mỗi ngày, đổi món 1 chạm", "Chụp ảnh tính calo, hỏi AI", "Ghi bữa, nhắc giờ ăn, theo dõi cân, tổng kết tháng", `Hết ${plan.trial} ngày tự về gói Miễn phí, không tự trừ tiền`]
  : ["Thực đơn tự lên mỗi ngày", "Đổi món 1 chạm", "Ghi bữa, nhắc giờ ăn", "Theo dõi cân, tổng kết tháng"]);
