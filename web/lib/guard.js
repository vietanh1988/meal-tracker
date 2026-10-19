// Chống bơm số liệu / spam cho /api/*: chỉ nhận yêu cầu gửi từ chính web (Origin / Referer cùng tên miền)
// + giới hạn số lần theo IP trong bộ nhớ (mỗi máy chủ Vercel đếm riêng — đủ chặn bơm hàng loạt từ 1 máy).
const HOST = /^(?:[a-z0-9-]+\.)*(fipilotai\.com|vercel\.app|localhost)(?::\d+)?$/i;
export function sameSite(req) {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const src = req.headers.get("origin") || req.headers.get("referer") || "";
  try { return HOST.test(new URL(src).host); } catch { return false; }
}
const buckets = new Map();
export const ipOf = (req) => (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "?";
// true = còn được phép; max lần trong ms
export function allow(key, max, ms) {
  const now = Date.now(); const arr = (buckets.get(key) || []).filter((t) => now - t < ms);
  if (arr.length >= max) { buckets.set(key, arr); return false; }
  arr.push(now); buckets.set(key, arr);
  if (buckets.size > 20000) buckets.clear();
  return true;
}
