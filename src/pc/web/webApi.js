// Đọc / ghi bảng web_* cho Quản trị web (RLS: chỉ admin ghi — is_web_admin()).
import { supabase } from "../../lib/supabase";
import { slugify, wordCount, seoChecks, toWebp } from "./webLib";

const LIST_COLS = "id,kind,title,slug,status,cover_url,primary_term,pinned,published_at,updated_at,author_id,seo,word_count";
const must = ({ data, error }) => { if (error) throw error; return data; };

export async function listPosts(kind = "post") {
  const [posts, links] = await Promise.all([
    supabase.from("web_posts").select(LIST_COLS).eq("kind", kind).order("updated_at", { ascending: false }).limit(1000).then(must),
    supabase.from("web_post_terms").select("post_id,term_id").limit(10000).then(must),
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
  const rows = await supabase.from("web_post_terms").select("term_id").limit(20000).then(must);
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
export async function freeSlug(want, selfId) {
  const base = slugify(want) || "bai-viet";
  const rows = await supabase.from("web_posts").select("id,slug").like("slug", `${base}%`).then(must);
  const taken = new Set(rows.filter((r) => r.id !== selfId).map((r) => r.slug));
  let s = base, n = 2;
  while (taken.has(s)) s = `${base}-${n++}`;
  return s;
}

// Lưu bài: ghi bài + chuyên mục/thẻ + 1 bản trong lịch sử (DB tự giữ 30 bản gần nhất)
export async function savePost(post, { reason = "update", uid } = {}) {
  const sc = seoChecks(post);
  const row = {
    kind: post.kind || "post", title: post.title.trim() || "Bài chưa có tiêu đề", slug: post.slug, status: post.status, blocks: post.blocks || [],
    excerpt: post.excerpt || null, cover_url: post.cover_url || null, cover_alt: post.cover_alt || null,
    author_id: post.author_id || null, primary_term: post.primary_term || null, template: post.template || null, parent_id: post.parent_id || null,
    pinned: !!post.pinned, related: post.related || { mode: "auto", ids: [] }, seo: { ...(post.seo || {}), score: sc.score },
    word_count: wordCount(post.blocks), published_at: post.published_at || (post.status === "published" ? new Date().toISOString() : null),
    updated_at: new Date().toISOString(), updated_by: uid || null,
  };
  const saved = post.id
    ? await supabase.from("web_posts").update(row).eq("id", post.id).select().single().then(must)
    : await supabase.from("web_posts").insert(row).select().single().then(must);
  const terms = [...new Set(post.terms || [])];
  await supabase.from("web_post_terms").delete().eq("post_id", saved.id).then(must);
  if (terms.length) await supabase.from("web_post_terms").insert(terms.map((term_id) => ({ post_id: saved.id, term_id }))).then(must);
  await supabase.from("web_revisions").insert({ post_id: saved.id, snapshot: { ...row, terms }, reason, created_by: uid || null }).then(must);
  return { ...saved, terms };
}

export const setStatus = (ids, status) => supabase.from("web_posts").update({ status, updated_at: new Date().toISOString(), ...(status === "published" ? {} : {}) }).in("id", ids).then(must);
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

// Tải ảnh lên kho 'web' (tự đổi WebP, tối đa 1600 px)
export async function uploadImage(file, name = "anh") {
  const isSvg = file.type === "image/svg+xml" || file.type === "image/gif";
  const out = isSvg ? { blob: file, width: null, height: null } : await toWebp(file);
  const d = new Date();
  const path = `img/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${slugify(name).slice(0, 60) || "anh"}-${Date.now().toString(36)}.${isSvg ? file.name.split(".").pop() : "webp"}`;
  const { error } = await supabase.storage.from("web").upload(path, out.blob, { contentType: isSvg ? file.type : "image/webp", cacheControl: "31536000", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("web").getPublicUrl(path);
  return { url: data.publicUrl, width: out.width, height: out.height, size: out.blob.size, orig: file.size, path };
}
