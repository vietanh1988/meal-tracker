// Hàm thuần cho Quản trị web (bản vẽ 138): đường dẫn, chữ trong bài, điểm SEO, dán từ Word / Google Docs.
// Dùng chung bộ đổi đường dẫn + bộ lọc HTML với web (web/lib/*) để admin và web ra cùng 1 kết quả.
import { slugify } from "../../../web/lib/slug.js";
import { clean } from "../../../web/lib/sanitize.js";
export { slugify, clean };

export const STATUS = { published: ["Đã đăng", "green"], scheduled: ["Hẹn giờ", "blue"], draft: ["Bản nháp", "gray"], trash: ["Thùng rác", "red"] };

const strip = (h) => String(h || "").replace(/<\/?(b|strong|i|em|u|s|a|span|mark|sup|sub|code|small)\b[^>]*>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
export const textOf = strip;

// Toàn bộ chữ đọc được của bài (để đếm chữ, tìm từ khoá)
export function blocksText(blocks) {
  const out = [];
  for (const b of blocks || []) {
    if (!b) continue;
    if (b.type === "p" || b.type === "quote" || b.type === "tip" || b.type === "html") out.push(strip(b.html));
    else if (b.type === "h") out.push(strip(b.text));
    else if (b.type === "list") out.push(...(b.items || []).map(strip));
    else if (b.type === "table") out.push(...(b.head || []).map(strip), ...(b.rows || []).flat().map(strip));
    else if (b.type === "faq") out.push(strip(b.title), ...(b.items || []).flatMap((x) => [strip(x.q), strip(x.a)]));
    else if (b.type === "cols") out.push(...(b.cols || []).map(strip));
  }
  return out.filter(Boolean).join(" ");
}
export const wordCount = (blocks) => { const t = blocksText(blocks); return t ? t.split(/\s+/).length : 0; };
export const readMin = (w) => Math.max(1, Math.round((w || 0) / 220));
export const headings = (blocks) => (blocks || []).filter((b) => b?.type === "h").map((b) => ({ level: b.level || 2, text: strip(b.text) }));
export const images = (blocks, cover) => [...(cover ? [{ url: cover.url, alt: cover.alt, cover: true }] : []), ...(blocks || []).flatMap((b) => (b?.type === "img" ? [{ url: b.url, alt: b.alt }] : b?.type === "gallery" ? (b.images || []) : []))].filter((x) => x.url);
export function links(blocks, host = "fipilotai.com") {
  const html = (blocks || []).map((b) => [b?.html, b?.text, ...(b?.items || []), ...((b?.rows || []).flat()), ...(b?.cols || [])].filter(Boolean).join(" ")).join(" ");
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  const internal = hrefs.filter((h) => h.startsWith("/") || h.includes(host)).length + (blocks || []).filter((b) => b?.type === "calo" || b?.type === "calo_table").length;
  return { internal, external: hrefs.filter((h) => /^https?:/.test(h) && !h.includes(host)).length };
}

// So khớp không dấu (người viết hay gõ thiếu dấu)
const norm = (s) => slugify(s).replace(/-/g, " ");
const has = (hay, kw) => !!kw && norm(hay).includes(norm(kw));

// Điểm SEO kiểu Rank Math (bản vẽ 138b): mỗi mục [đạt?, câu đời thường]; điểm = phần trăm mục đạt
export function seoChecks(post) {
  const seo = post.seo || {};
  const kw = String(seo.keyword || "").trim();
  const title = seo.title || post.title || "";
  const desc = seo.desc || post.excerpt || "";
  const text = blocksText(post.blocks);
  const words = wordCount(post.blocks);
  const hs = headings(post.blocks);
  const h2 = hs.filter((h) => h.level === 2).length;
  const order = hs.every((h, i) => i === 0 || h.level <= hs[i - 1].level + 1);
  const imgs = images(post.blocks, post.cover_url ? { url: post.cover_url, alt: post.cover_alt } : null);
  const noAlt = imgs.filter((x) => !String(x.alt || "").trim());
  const ln = links(post.blocks);
  const first100 = text.split(/\s+/).slice(0, 100).join(" ");
  const L = [];
  if (!kw) L.push([0, "Chưa đặt từ khoá chính"]);
  else {
    L.push([has(title, kw) && has(post.title, kw), "Từ khoá có trong tiêu đề SEO và tiêu đề bài"]);
    L.push([has(first100, kw), "Từ khoá có trong 100 chữ đầu"]);
    L.push([has(post.slug, kw), "Từ khoá có trong đường dẫn"]);
    L.push([has(desc, kw), "Từ khoá có trong mô tả"]);
  }
  L.push([title.length >= 30 && title.length <= 60, `Tiêu đề SEO dài ${title.length} ký tự (nên 30–60)`]);
  L.push([desc.length >= 120 && desc.length <= 160, `Mô tả dài ${desc.length} ký tự (nên 120–160)`]);
  L.push([words >= 800, `Độ dài bài ${words.toLocaleString("vi-VN")} chữ (nên ≥ 800)`]);
  L.push([h2 >= 2 && order, h2 < 2 ? `Mới có ${h2} tiêu đề H2 (nên ≥ 2)` : order ? `Thứ tự H2 → H3 đúng, có ${h2} H2` : "Tiêu đề nhảy cấp (H2 rồi H4) — sửa lại thứ tự"]);
  L.push([noAlt.length === 0 && imgs.length > 0, imgs.length === 0 ? "Bài chưa có ảnh" : noAlt.length ? `${noAlt.length} ảnh chưa có mô tả (alt)` : `${imgs.length} ảnh đều có mô tả (alt)`]);
  L.push([ln.internal >= 2, `${ln.internal} link nội bộ (nên ≥ 2)`]);
  L.push([ln.external >= 1, ln.external ? `${ln.external} link ra nguồn bên ngoài` : "Chưa có link ra nguồn uy tín bên ngoài"]);
  L.push([!!(seo.og_image || post.cover_url), seo.og_image || post.cover_url ? "Có ảnh chia sẻ" : "Chưa có ảnh đại diện / ảnh chia sẻ"]);
  const ok = L.filter((x) => x[0]).length;
  return { list: L.map(([o, t]) => ({ ok: !!o, text: t })), ok, total: L.length, score: Math.round((ok / L.length) * 100) };
}
export const scoreLabel = (n) => (n >= 80 ? "Tốt" : n >= 50 ? "Tạm được" : "Cần sửa");

// Dán từ Word / Google Docs: HTML → các khối (giữ đậm / nghiêng / gạch chân / link; tách tiêu đề, danh sách, trích dẫn, bảng, ảnh)
export function htmlToBlocks(html, parse) {
  const doc = parse(String(html || ""));
  doc.querySelectorAll("script,style,meta,link,title,noscript").forEach((e) => e.remove());
  const out = [];
  const inline = (el) => clean(el.innerHTML).replace(/<\/?(p|div|h[1-6]|ul|ol|li|table|thead|tbody|tr|th|td|figure|figcaption|blockquote|hr)[^>]*>/gi, " ").replace(/\s+/g, " ").trim();
  const walk = (node) => {
    for (const el of node.children) {
      const t = el.tagName.toLowerCase();
      if (/^h[1-6]$/.test(t)) { const s = inline(el); if (s) out.push({ type: "h", level: Math.min(4, Math.max(2, +t[1] === 1 ? 2 : +t[1])), text: s }); }
      else if (t === "ul" || t === "ol") { const items = [...el.querySelectorAll(":scope > li")].map(inline).filter(Boolean); if (items.length) out.push({ type: "list", ordered: t === "ol", items }); }
      else if (t === "blockquote") { const s = inline(el); if (s) out.push({ type: "quote", html: s }); }
      else if (t === "table") {
        const rows = [...el.querySelectorAll("tr")].map((tr) => [...tr.children].map(inline));
        if (rows.length) out.push({ type: "table", head: rows[0], rows: rows.slice(1) });
      }
      else if (t === "img") { if (el.getAttribute("src") && !/^data:/.test(el.getAttribute("src"))) out.push({ type: "img", url: el.getAttribute("src"), alt: el.getAttribute("alt") || "" }); }
      else if (t === "hr") out.push({ type: "hr" });
      else if (t === "p") { const img = el.querySelector("img"); const s = inline(el); if (s) out.push({ type: "p", html: s }); else if (img) walk(el); }
      else if (el.children.length && [...el.children].some((c) => /^(p|h[1-6]|ul|ol|table|blockquote|div)$/i.test(c.tagName))) walk(el);
      else { const s = inline(el); if (s) out.push({ type: "p", html: s }); }
    }
  };
  walk(doc.body);
  return out;
}

// Ảnh → WebP (cạnh dài tối đa 1600 px) ngay trên trình duyệt trước khi tải lên
export async function toWebp(file, max = 1600, q = 0.82) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  cv.getContext("2d").drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise((r) => cv.toBlob(r, "image/webp", q));
  return { blob, width: w, height: h };
}
export const youtubeId = (s) => { const m = String(s || "").match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{6,20})/); return m ? m[1] : /^[\w-]{6,20}$/.test(String(s || "").trim()) ? String(s).trim() : ""; };
