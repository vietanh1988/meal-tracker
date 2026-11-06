// 06/11 (chủ dự án chốt bản vẽ "Màn Tin giảm cân"): app đọc bài web ngay trong app (nút Pi › Tin giảm cân).
// Web tính sẵn, app chỉ hiển thị: danh sách bài + cụm (/api/app-news) và nội dung 1 bài đã qua đúng các bước như trang bài
// (prepare, infographic, nguồn tham khảo, chia đoạn dài, link nội bộ) rồi đổi sang khối gọn cho app (/api/app-post/<slug>).
// Hàm ở đây thuần (không gọi DB) để test được.
import { clean, textOf } from "./sanitize.js";
import { tidy, tidyText } from "./typo.js";
import { fillTrial } from "./plans.js";
import { CLUSTERS, CLUSTER_ORDER, TOOLS, groupPosts } from "./clusters.js";

export const WEB_ORIGIN = "https://fipilotai.com";
const abs = (u, origin = WEB_ORIGIN) => (typeof u === "string" && u.startsWith("/") && !u.startsWith("//") ? origin + u : u || "");
/** html đã lọc an toàn, link / ảnh trong web thành đường dẫn đầy đủ (app chạy ở tên miền khác) */
// exId: slug trang bài tập trên web → mã bài tập của app (link /bai-tap/<slug> gắn data-ex để app mở thẳng bài tập)
export const appHtml = (h, origin = WEB_ORIGIN, exId = null) => {
  let s = clean(tidy(h)).replace(/(href|src)="\/(?!\/)/g, `$1="${origin}/`);
  if (exId) s = s.replace(/href="https:\/\/fipilotai\.com\/bai-tap\/([a-z0-9-]+)"/g, (m, sl) => { const id = exId(sl); return id ? `${m} data-ex="${id}"` : m; });
  return s;
};
const por = (p, fd) => { const n = p || (fd?.per100 ? { name: "100 g", gram: 100, ...fd.per100 } : null); return n ? { name: n.name, gram: n.gram || null, cal: n.cal, p: n.p, c: n.c, f: n.f } : null; };
const food = (fd, p) => (fd ? { key: fd.key, name: fd.name, slug: fd.slug || null, por: por(p, fd) } : null);

/** khối bài (đã prepare) → khối gọn cho app; bỏ khối chỉ dành cho web (mục lục, hộp mời mở app, nút, video tải lên) */
export function toAppBlocks(blocks = [], { origin = WEB_ORIGIN, plan, exId = null } = {}) {
  const out = [];
  const H = (h) => appHtml(h, origin, exId);
  for (const b of blocks || []) {
    if (!b?.type) continue;
    switch (b.type) {
      case "p": case "html": out.push({ t: "p", html: H(b.html) }); break;
      case "cols": for (const c of b.cols || []) out.push({ t: "p", html: H(c) }); break;
      case "quote": out.push({ t: "quote", html: H(b.html) }); break;
      case "tip": out.push({ t: "tip", html: H(b.html) }); break;
      case "h": out.push({ t: "h", level: Math.min(3, Math.max(2, b.level || 2)), text: textOf(b.text) }); break;
      case "list": out.push({ t: "list", ordered: !!b.ordered, items: (b.items || []).map((x) => H(x)) }); break;
      case "img": if (b.url) out.push({ t: "img", url: abs(b.url, origin), alt: b.alt || b.caption || "", caption: b.caption || "", w: b.width || null, h: b.height || null }); break;
      case "info": if (b.src) out.push({ t: "img", url: `${origin}/_next/image?url=${encodeURIComponent(b.src)}&w=800&q=80`, alt: b.alt || "", caption: b.caption || "", w: 800, h: Math.round(((b.height || 800) * 800) / (b.width || 1200)) }); break;
      case "gallery": { const ims = (b.images || []).filter((x) => x?.url).map((x) => ({ url: abs(x.url, origin), alt: x.alt || x.caption || "", caption: x.caption || "" })); if (ims.length) out.push({ t: "gallery", phone: b.shape === "phone", images: ims }); break; }
      case "table": out.push({ t: "table", head: (b.head || []).map((h) => tidyText(textOf(h))), rows: (b.rows || []).map((r) => (r || []).map((c) => H(c))) }); break;
      case "calo": { const f = food(b._food, b._portion); if (f) out.push({ t: "food", food: f }); break; }
      case "calo_table": { const rows = (b._rows || []).map((r) => food(r.fd, r.por)).filter(Boolean); if (rows.length) out.push({ t: "foods", foods: rows }); break; }
      case "baitap": if (b.ex) out.push({ t: "ex", ex: String(b.ex) }); break;
      case "faq": { const items = (b.items || []).filter((x) => x?.q && x?.a).map((x) => ({ q: tidyText(fillTrial(textOf(x.q), plan)), a: tidyText(fillTrial(textOf(x.a), plan)) })); if (items.length) out.push({ t: "faq", title: b.title ? textOf(b.title) : "", items }); break; }
      case "youtube": if (/^[\w-]{6,20}$/.test(b.id || "")) out.push({ t: "yt", id: b.id, title: b.title || "" }); break;
      case "hr": out.push({ t: "hr" }); break;
      default: break; // toc, app, button, video, lp_*: chỉ trên web
    }
  }
  return out;
}

const catSlugOf = (p) => ((p.terms || []).find((t) => t.id === p.primary_term) || (p.terms || []).find((t) => t.kind === "category"))?.slug || null;
export const readMinOf = (w) => Math.max(1, Math.round((w || 0) / 220));
/** 1 dòng bài cho danh sách app */
export const appCard = (p) => ({ slug: p.slug, title: p.title, cover: abs(p.cover_url || "") || null, cat: catSlugOf(p), at: p.published_at || null, min: readMinOf(p.word_count) });

/** danh sách cho màn Tin giảm cân: bài mới trước + 6 cụm (tên lấy từ chuyên mục, nhóm bài theo lib/clusters) */
export function appNews(posts = [], terms = []) {
  const cards = posts.filter((p) => p?.slug && p?.title).map(appCard).sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  const name = Object.fromEntries((terms || []).map((t) => [t.slug, t.name]));
  const cats = CLUSTER_ORDER.map((slug) => {
    const cfg = CLUSTERS[slug];
    const mine = cards.filter((c) => c.cat === slug);
    const star = mine.some((c) => c.slug === cfg.star) ? cfg.star : null;
    return { slug, name: name[slug] || slug, n: mine.length, lead: cfg.lead, star, tools: cfg.tools.filter((k) => TOOLS[k]), groups: groupPosts(cfg, mine).map((g) => ({ name: g.name, slugs: g.posts.map((x) => x.slug) })) };
  }).filter((c) => c.n > 0);
  return { posts: cards, cats };
}
