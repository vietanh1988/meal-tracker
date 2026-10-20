// Đọc / ghi bảng web_* cho Quản trị web (RLS: chỉ admin ghi — is_web_admin()).
import { supabase } from "../../lib/supabase";
import { slugify, wordCount, seoChecks, toWebp, IMG_RULE } from "./webLib";
import { todayVN } from "../../lib/dateVN";

const LIST_COLS = "id,kind,title,slug,status,cover_url,primary_term,pinned,published_at,updated_at,author_id,seo,word_count,template";
const must = ({ data, error }) => { if (error) throw error; return data; };
// Supabase trả tối đa 1000 dòng / lần (max_rows) → đọc theo trang tới hết. mk = () => query mới (chưa .range)
export async function readAll(mk, { page = 1000, max = 100000 } = {}) {
  const out = [];
  for (let from = 0; from < max; from += page) {
    const { data, error } = await mk().range(from, from + page - 1);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < page) break;
  }
  return out;
}

export async function listPosts(kind = "post") {
  const [posts, links] = await Promise.all([
    readAll(() => supabase.from("web_posts").select(LIST_COLS).eq("kind", kind).order("updated_at", { ascending: false }).order("id")),
    readAll(() => supabase.from("web_post_terms").select("post_id,term_id").order("post_id").order("term_id")),
  ]);
  const by = {};
  for (const l of links) (by[l.post_id] ||= []).push(l.term_id);
  return posts.map((p) => ({ ...p, terms: by[p.id] || [] }));
}

export async function getPost(id) {
  const p = await supabase.from("web_posts").select("*").eq("id", id).single().then(must);
  const t = await supabase.from("web_post_terms").select("term_id").eq("post_id", id).then(must);
  return { ...p, terms: t.map((x) => x.term_id) };
}

export const listTerms = (kind) => supabase.from("web_terms").select("*").eq("kind", kind).order("sort").order("name").then(must);
export async function termCounts() {
  const rows = await readAll(() => supabase.from("web_post_terms").select("term_id,post_id").order("post_id").order("term_id"));
  const c = {}; for (const r of rows) c[r.term_id] = (c[r.term_id] || 0) + 1; return c;
}
export async function createTerm(kind, name, parent_id = null) {
  const base = slugify(name) || "muc";
  let slug = base, n = 2;
  const taken = new Set((await supabase.from("web_terms").select("slug").eq("kind", kind).like("slug", `${base}%`).then(must)).map((x) => x.slug));
  while (taken.has(slug)) slug = `${base}-${n++}`;
  return supabase.from("web_terms").insert({ kind, name: name.trim(), slug, parent_id }).select().single().then(must);
}

export const listAuthors = () => supabase.from("web_authors").select("*").order("created_at").then(must);
// Chưa có tác giả nào → tạo từ trang Giới thiệu của app (tên, vai trò, giới thiệu, ảnh, Facebook)
export async function ensureAuthor(appSettings, uid) {
  const list = await listAuthors();
  if (list.length) return list;
  let a = {};
  try { a = JSON.parse(appSettings?.about_page || "{}"); } catch (e) { /* */ }
  const name = a.devName || "Fipilot AI";
  await supabase.from("web_authors").insert({ name, slug: slugify(name), job_title: a.devRole || null, bio: a.devBio || null, avatar_url: a.devAvatar || null, same_as: a.facebook ? [a.facebook] : [], profile_id: uid || null }).then(must);
  return listAuthors();
}

// Đường dẫn chưa ai dùng (bài và trang dùng chung 1 kho đường dẫn)
// Lưu Cài đặt web: chỉ ghi các ô đã đổi so với lúc mở màn, gộp vào bản mới nhất trên máy chủ
// → 2 tab / 2 người cùng sửa (Cài đặt web và Cài đặt SEO cùng sửa "site") không đè ô của nhau. Trả về bản đã lưu.
export async function saveSettings(local, orig) {
  const keys = Object.keys(local).filter((k) => JSON.stringify(local[k] ?? {}) !== JSON.stringify(orig?.[k] ?? {}));
  if (!keys.length) return {};
  const now = await supabase.from("web_settings").select("key,value").in("key", keys).then(must);
  const cur = Object.fromEntries(now.map((r) => [r.key, r.value || {}]));
  const rows = keys.map((k) => {
    const a = local[k] || {}, o = orig?.[k] || {};
    const changed = Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(o)])].filter((f) => JSON.stringify(a[f]) !== JSON.stringify(o[f])).map((f) => [f, a[f]]));
    return { key: k, value: { ...(cur[k] || {}), ...changed }, updated_at: new Date().toISOString() };
  });
  await supabase.from("web_settings").upsert(rows, { onConflict: "key" }).then(must);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
// Đổi đường dẫn chuyên mục / thẻ / tác giả → tự thêm 301 từ link cũ (trigger DB chỉ lo bài viết). Lỗi thì bỏ qua.
export async function slugRedirect(from, to) {
  if (!from || !to || from === to) return;
  try {
    await supabase.from("web_redirects").upsert({ src: from, dest: to, code: 301, match: "exact", source: "slug_change", enabled: true }, { onConflict: "src" });
    await supabase.from("web_redirects").update({ dest: to }).eq("dest", from).eq("source", "slug_change"); // gộp chuỗi A→B→C thành A→C
    await supabase.from("web_redirects").delete().eq("src", to).eq("source", "slug_change"); // đường dẫn mới đang có chuyển hướng cũ → bỏ (tránh vòng)
  } catch (e) { /* */ }
}
// Gõ đường dẫn: bỏ dấu, chữ thường nhưng giữ "-" ở cuối để gõ tiếp được ("pho-" → "pho-bo"); lưu thì slugify hẳn
export const slugType = (v) => (String(v || "").trim() ? slugify(String(v).replace(/\s/g, "-") + "x").slice(0, -1) : "");
export async function freeSlug(want, selfId) {
  const base = slugify(want) || "bai-viet";
  const rows = await supabase.from("web_posts").select("id,slug").like("slug", `${base}%`).then(must);
  const taken = new Set(rows.filter((r) => r.id !== selfId).map((r) => r.slug));
  let s = base, n = 2;
  while (taken.has(s)) s = `${base}-${n++}`;
  return s;
}

// Lưu bài: ghi bài + chuyên mục/thẻ + 1 bản trong lịch sử (DB tự giữ 30 bản gần nhất)
// Cài đặt "site" (tên web + mẫu tiêu đề) cho điểm SEO — đọc 1 lần mỗi phiên
let siteP = null;
export const getSite = () => (siteP ||= supabase.from("web_settings").select("value").eq("key", "site").maybeSingle().then((r) => r.data?.value || {}, () => ({})));
export async function savePost(post, { reason = "update", uid } = {}) {
  const sc = seoChecks(post, await getSite());
  const row = {
    kind: post.kind || "post", title: post.title.trim() || "Bài chưa có tiêu đề", slug: post.slug, status: post.status, blocks: post.blocks || [],
    excerpt: post.excerpt || null, cover_url: post.cover_url || null, cover_alt: post.cover_alt || null,
    author_id: post.author_id || null, reviewer_id: post.reviewer_id || null, primary_term: post.primary_term || null, template: post.template || null, parent_id: post.parent_id || null,
    pinned: !!post.pinned, related: post.related || { mode: "auto", ids: [] }, seo: { ...(post.seo || {}), score: sc.score },
    word_count: wordCount(post.blocks), published_at: post.published_at || (post.status === "published" ? new Date().toISOString() : null),
    updated_at: new Date().toISOString(), updated_by: uid || null,
  };
  const saved = post.id
    ? await supabase.from("web_posts").update(row).eq("id", post.id).select().single().then(must)
    : await supabase.from("web_posts").insert(row).select().single().then(must);
  const terms = [...new Set(post.terms || [])];
  await supabase.from("web_post_terms").delete().eq("post_id", saved.id).then(must);
  if (terms.length) await supabase.from("web_post_terms").upsert(terms.map((term_id) => ({ post_id: saved.id, term_id })), { onConflict: "post_id,term_id", ignoreDuplicates: true }).then(must);
  await supabase.from("web_revisions").insert({ post_id: saved.id, snapshot: { ...row, terms }, reason, created_by: uid || null }).then(must);
  if (saved.status === "published" && reason !== "autosave") pingIndexNow([`/${saved.slug}`]);
  return { ...saved, terms };
}

// IndexNow: báo Bing / Cốc Cốc link mới (bật ở Cài đặt SEO › Sitemap & robots). Không chờ, lỗi thì bỏ qua.
export async function pingIndexNow(paths) {
  try {
    const { data } = await supabase.from("web_settings").select("value").eq("key", "seo").maybeSingle();
    const k = data?.value?.indexnow && !data.value.block_all && data.value.indexnow_key;
    if (!k || typeof fetch !== "function") return;
    for (const p of paths.slice(0, 20)) fetch(`https://api.indexnow.org/indexnow?url=${encodeURIComponent("https://fipilotai.com" + p)}&key=${k}&keyLocation=${encodeURIComponent("https://fipilotai.com/indexnow-key.txt")}`, { mode: "no-cors" }).catch(() => {});
  } catch (e) { /* */ }
}

// Đăng: bài chưa có ngày đăng / đang hẹn giờ tương lai → ngày đăng = bây giờ (RLS web chỉ hiện published_at <= now)
export async function setStatus(ids, status) {
  const now = new Date().toISOString();
  await supabase.from("web_posts").update({ status, updated_at: now }).in("id", ids).then(must);
  if (status === "published") {
    await supabase.from("web_posts").update({ published_at: now }).in("id", ids).is("published_at", null).then(must);
    await supabase.from("web_posts").update({ published_at: now }).in("id", ids).gt("published_at", now).then(must);
  }
}
export const deleteForever = (ids) => supabase.from("web_posts").delete().in("id", ids).then(must);

export async function duplicatePost(id, uid) {
  const p = await getPost(id);
  const { id: _, created_at, updated_at, ...rest } = p;
  return savePost({ ...rest, title: `${p.title} (bản sao)`, slug: await freeSlug(`${p.slug}-ban-sao`), status: "draft", published_at: null, pinned: false }, { reason: "draft", uid });
}

export const listRevisions = (postId) => supabase.from("web_revisions").select("id,reason,created_at,created_by,snapshot").eq("post_id", postId).order("created_at", { ascending: false }).limit(30).then(must);
export const redirectsTo = (path) => supabase.from("web_redirects").select("src,code,hits").eq("dest", path).then(must);

// Tìm bài / trang / chuyên mục để chèn link nội bộ
export async function searchLinks(q) {
  const s = String(q || "").trim();
  const like = `%${s}%`;
  const [posts, terms] = await Promise.all([
    supabase.from("web_posts").select("title,slug,kind").neq("status", "trash").ilike("title", like).limit(8).then(must),
    supabase.from("web_terms").select("name,slug,kind").eq("kind", "category").ilike("name", like).limit(4).then(must),
  ]);
  return [...posts.map((p) => ({ icon: p.kind === "page" ? "📄" : "📝", t: p.title, url: `/${p.slug}` })), ...terms.map((t) => ({ icon: "📁", t: `Chuyên mục ${t.name}`, url: `/chu-de/${t.slug}` }))];
}

// Tải ảnh lên kho 'web': tự đổi WebP theo IMG_RULE (webLib) + bản nhỏ 400/800 (cho srcset), tên không dấu <ten>-<ma>_<rong>w.webp; ghi web_media
// (ảnh cũ trước 21/10 còn bản 1200 — SIZES giữ để xoá đủ bản)
export const SIZES = [400, 800, 1200];
const SMALL = Object.keys(IMG_RULE.small).map(Number);
const PUB = "https://fipilotai.com/anh/"; // web chuyển /anh/* → kho 'web'/img/*
export const webUrl = (path) => PUB + String(path).replace(/^img\//, "");
export async function uploadImage(file, name = "anh", { alt = "", uploader = "", uid = null, big = false } = {}) {
  if (file.size > 10 * 1024 * 1024) throw new Error("Ảnh lớn hơn 10 MB.");
  const raw = file.type === "image/svg+xml" || file.type === "image/gif";
  const ym = todayVN().slice(0, 7).split("-"); // năm/tháng giờ VN
  const base = `img/${ym[0]}/${ym[1]}/${slugify(name).slice(0, 60) || "anh"}-${Date.now().toString(36).slice(-5)}`;
  const put = async (path, blob, type) => { const { error } = await supabase.storage.from("web").upload(path, blob, { contentType: type, cacheControl: "31536000", upsert: false }); if (error) throw error; };
  let out, path, sizes = [], orig = { w: null, h: null };
  if (raw) { out = { blob: file, width: null, height: null }; path = `${base}.${file.name.split(".").pop().toLowerCase()}`; await put(path, file, file.type); }
  else {
    const R = big ? IMG_RULE.big : IMG_RULE;
    try { out = await toWebp(file, R.maxW, 0.82, { maxH: R.maxH, maxKB: R.maxKB }); } catch (e) { throw new Error(/heic|heif/i.test(file.type + file.name) ? "Trình duyệt này chưa đọc được ảnh HEIC — mở bằng Safari hoặc đổi sang JPG." : /quá nặng/.test(e.message) ? e.message : "Không đọc được file ảnh."); }
    orig = { w: out.srcW, h: out.srcH };
    path = `${base}_${out.width}w.webp`; await put(path, out.blob, "image/webp");
    for (const w of SMALL) if (w < out.width) { const v = await toWebp(file, w, 0.8, { maxH: 99999, maxKB: IMG_RULE.small[w] }); await put(`${base}_${w}w.webp`, v.blob, "image/webp"); sizes.push(w); }
  }
  const { data } = supabase.storage.from("web").getPublicUrl(path);
  if (!uid || !uploader) { try { const { data: u } = await supabase.auth.getUser(); uid = uid || u?.user?.id || null; uploader = uploader || u?.user?.user_metadata?.full_name || u?.user?.user_metadata?.name || (u?.user?.email || "").split("@")[0]; } catch (e) { /* */ } }
  const row = { path, url: webUrl(path), name: path.split("/").pop(), alt: alt || null, width: out.width, height: out.height, size: out.blob.size, sizes, orig_name: file.name, orig_size: file.size, orig_w: orig.w, orig_h: orig.h, uploader: uploader || null, created_by: uid };
  await supabase.from("web_media").insert(row).then(() => {}, () => {}); // chưa chạy SQL thư viện ảnh thì vẫn tải được ảnh
  return { url: row.url, raw: data.publicUrl, width: out.width, height: out.height, size: out.blob.size, orig: file.size, path };
}
