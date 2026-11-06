// 06/11 (chủ dự án chốt bản vẽ "Màn Tin giảm cân"): đọc bài web ngay trong app, mở từ nút Pi › Tin giảm cân.
// Web tính sẵn (fipilotai.com/api/app-news, /api/app-post/<slug> — web/lib/appnews.js), app chỉ hiện. Không Hạt, không nhắc.
// "Đã đọc" chỉ để đánh dấu (✓), lưu trong máy (localStorage) — mất cũng không sao.
import { toVNDate } from "../lib/dateVN.js";

export const WEB = "https://fipilotai.com";
const READ_KEY = "fp_news_read";
const CACHE_KEY = "fp_news_list";

const ls = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* chế độ riêng tư / đầy bộ nhớ: bỏ qua */ } },
};

/** tập slug đã đọc */
export function readSet() { try { const a = JSON.parse(ls.get(READ_KEY) || "[]"); return new Set(Array.isArray(a) ? a : []); } catch { return new Set(); } }
export function markRead(slug) { if (!slug) return; const s = readSet(); if (s.has(slug)) return; s.add(slug); ls.set(READ_KEY, JSON.stringify([...s].slice(-500))); }

let mem = null; // { at, data }
/** danh sách bài + cụm; giữ 10 phút trong bộ nhớ, bản cũ trong máy dùng khi mất mạng */
export async function loadNews({ fresh = false, fetcher = fetch } = {}) {
  if (!fresh && mem && Date.now() - mem.at < 600_000) return mem.data;
  try {
    const r = await fetcher(`${WEB}/api/app-news`);
    if (!r.ok) throw new Error(String(r.status));
    const data = await r.json();
    mem = { at: Date.now(), data };
    ls.set(CACHE_KEY, JSON.stringify(data));
    return data;
  } catch (e) {
    const old = ls.get(CACHE_KEY);
    if (old) { try { return JSON.parse(old); } catch { /* hỏng thì báo lỗi */ } }
    throw e;
  }
}
const posts = new Map();
export async function loadPost(slug, { fetcher = fetch } = {}) {
  if (posts.has(slug)) return posts.get(slug);
  const r = await fetcher(`${WEB}/api/app-post/${encodeURIComponent(slug)}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(String(r.status));
  const d = await r.json();
  posts.set(slug, d);
  return d;
}
export const _reset = () => { mem = null; posts.clear(); };

/** ngày đăng dd/mm theo giờ VN */
export const ddmm = (iso) => { if (!iso) return ""; const d = new Date(iso); if (Number.isNaN(+d)) return ""; const [, m, dd] = toVNDate(d).split("-"); return `${dd}/${m}`; };

const strip = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
/** tìm theo tên bài, bỏ dấu ("pho" khớp "phở"); mọi chữ gõ đều phải có */
export function searchPosts(list = [], q = "") {
  const words = strip(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return list.filter((p) => { const t = strip(p.title); return words.every((w) => t.includes(w)); });
}

/** link trong bài → việc trong app: bài khác mở tiếp trong app, /calo/ mở Ghi bữa tìm món, /bai-tap/ mở Tập luyện, còn lại mở trình duyệt */
export function routeOf(href, slugs) {
  let u;
  try { u = new URL(href, WEB); } catch { return { k: "none" }; }
  if (!/(^|\.)fipilotai\.com$/.test(u.hostname)) return /^https?:$/.test(u.protocol) ? { k: "out", url: u.href } : { k: "none" };
  const parts = u.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (parts[0] === "calo" && parts[1]) return { k: "food", slug: parts[1] };
  if (parts[0] === "bang-calo") return { k: "food" };
  if (parts[0] === "bai-tap") return parts[1] === "giao-an" ? { k: "plan" } : parts[1] ? { k: "ex", slug: parts[1] } : { k: "lib" };
  if (parts[0] === "tinh-calo") return { k: "goals" };
  if (parts[0] === "pi" && !parts[1]) return { k: "pi" };
  if (parts.length === 1 && (!slugs || slugs.has(parts[0]))) return { k: "post", slug: parts[0] };
  return { k: "out", url: u.href };
}

// Bài gợi ý trên thanh nghỉ giữa hiệp: bài cụm Tập luyện, ưu tiên bài nói đúng chuyện đang làm, bài chưa đọc trước
export const REST_FIRST = ["nghi-giua-hiep-bao-lau", "tang-ta-the-nao-cho-dung", "dau-co-sau-khi-tap-co-sao-khong", "khoi-dong-va-gian-co-truoc-sau-khi-tap", "tap-gym-may-buoi-mot-tuan-la-du", "nguoi-moi-di-tap-gym-buoi-dau-tap-gi", "cardio-hay-tap-ta-de-giam-mo"];
export function restPick(data, read = new Set(), seed = 0) {
  const list = (data?.posts || []).filter((p) => p.cat === "tap-luyen");
  if (!list.length) return null;
  const rank = (p) => { const i = REST_FIRST.indexOf(p.slug); return i < 0 ? 100 : i; };
  const sorted = [...list].sort((a, b) => (read.has(a.slug) - read.has(b.slug)) || rank(a) - rank(b));
  const unread = sorted.filter((p) => !read.has(p.slug));
  const pool = unread.length ? unread : sorted;
  return pool[Math.abs(seed) % Math.min(pool.length, 3)];
}

/** bài theo cụm: { star, groups: [{ name, posts }] } — thứ tự nhóm do web tính */
export function catView(data, slug) {
  const c = (data?.cats || []).find((x) => x.slug === slug);
  if (!c) return null;
  const by = Object.fromEntries((data.posts || []).map((p) => [p.slug, p]));
  return { ...c, starPost: c.star ? by[c.star] || null : null, groups: c.groups.map((g) => ({ name: g.name, posts: g.slugs.map((s) => by[s]).filter(Boolean) })).filter((g) => g.posts.length) };
}
