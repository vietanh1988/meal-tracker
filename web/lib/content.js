// Lấy bài / trang / chuyên mục / tác giả từ Supabase
import { q, enc } from "./sb.js";

const POST_COLS = "id,kind,title,slug,status,blocks,excerpt,cover_url,cover_alt,template,pinned,related,seo,word_count,published_at,updated_at,primary_term,author:web_authors!web_posts_author_id_fkey(name,slug,avatar_url,bio,job_title,same_as,show_box),reviewer:web_authors!web_posts_reviewer_id_fkey(name,slug),terms:web_terms!web_post_terms(id,kind,name,slug)";
const CARD_COLS = "id,title,slug,excerpt,cover_url,cover_alt,published_at,word_count,primary_term,terms:web_terms!web_post_terms(id,kind,name,slug)";
const LIVE = "status=in.(published,scheduled)";

export const readMin = (w) => Math.max(1, Math.round((w || 0) / 220));

export async function getPostBySlug(slug) {
  const r = await q(`web_posts?slug=eq.${enc(slug)}&${LIVE}&select=${POST_COLS}&limit=1`);
  return r?.[0] || null;
}

export async function latestPosts({ limit = 12, offset = 0, termId = null, authorId = null, exclude = [] } = {}) {
  let path = `web_posts?kind=eq.post&${LIVE}&order=pinned.desc,published_at.desc&limit=${limit}&offset=${offset}&select=${CARD_COLS}`;
  if (termId) path = `web_posts?kind=eq.post&${LIVE}&order=pinned.desc,published_at.desc&limit=${limit}&offset=${offset}&select=${CARD_COLS.replace("terms:web_terms!web_post_terms(", "terms:web_terms!web_post_terms!inner(")}&terms.id=eq.${termId}`;
  if (authorId) path += `&author_id=eq.${authorId}`;
  if (exclude.length) path += `&id=not.in.(${exclude.join(",")})`;
  return (await q(path)) || [];
}

export async function countPosts(termId = null) {
  // chỉ đếm bài đang hiện (không tính nháp / hẹn giờ chưa tới / trang)
  const rows = termId ? await q(`web_posts?kind=eq.post&${LIVE}&select=id,t:web_terms!web_post_terms!inner(id)&t.id=eq.${termId}&limit=10000`) : await q(`web_posts?kind=eq.post&${LIVE}&select=id&limit=10000`);
  return rows?.length || 0;
}

// Bài chọn tay (Bài liên quan) — lấy đúng theo id, giữ thứ tự đã chọn
export async function postsByIds(ids = []) {
  const ok = ids.filter((x) => /^[0-9a-f-]{36}$/i.test(String(x))).slice(0, 12);
  if (!ok.length) return [];
  const r = (await q(`web_posts?id=in.(${ok.join(",")})&kind=eq.post&${LIVE}&select=${CARD_COLS}`)) || [];
  return r.sort((a, b) => ok.indexOf(a.id) - ok.indexOf(b.id));
}
export async function getTerm(kind, slug) {
  const r = await q(`web_terms?kind=eq.${kind}&slug=eq.${enc(slug)}&select=*&limit=1`);
  return r?.[0] || null;
}
export async function allTerms(kind) { return (await q(`web_terms?kind=eq.${kind}&select=id,name,slug,parent_id,sort&order=sort,name`)) || []; }
export async function getAuthor(slug) { const r = await q(`web_authors?slug=eq.${enc(slug)}&select=*&limit=1`); return r?.[0] || null; }
export async function getBlocksById(ids) {
  if (!ids.length) return {};
  const r = (await q(`web_blocks?id=in.(${ids.join(",")})&select=id,blocks`)) || [];
  return Object.fromEntries(r.map((x) => [x.id, x.blocks]));
}
export async function searchPosts(term, limit = 12) {
  const s = String(term || "").replace(/[*,()%]/g, " ").trim();
  if (!s) return [];
  return (await q(`web_posts?kind=eq.post&${LIVE}&or=(title.ilike.*${enc(s)}*,excerpt.ilike.*${enc(s)}*)&order=published_at.desc&limit=${limit}&select=${CARD_COLS}`, { revalidate: 30 })) || [];
}
export const catOf = (p) => (p?.terms || []).find((t) => t.id === p.primary_term) || (p?.terms || []).find((t) => t.kind === "category") || null;
export const fmtDate = (iso) => { if (!iso) return ""; const d = new Date(iso); return d.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" }); };
