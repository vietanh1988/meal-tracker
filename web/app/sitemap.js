// sitemap.xml — tự cập nhật; chỉ trang cho Google lập chỉ mục (Cài đặt SEO › Sitemap)
import { q } from "@/lib/sb";
import { getSettings, siteUrl } from "@/lib/site";
import { caloFoods } from "@/lib/calo";
import { legalPages, vnDateIso } from "@/lib/appdata";
import { legalToBlocks } from "@/lib/legal";
import { countPosts, catIndexable } from "@/lib/content";

export const revalidate = 600;
export default async function sitemap() {
  const s = await getSettings();
  if (s.seo?.block_all) return []; // đang chặn công cụ tìm kiếm
  const on = s.seo?.sitemap || {};
  const u = (p) => siteUrl(s, p);
  // lastmod (ngày sửa thật) cho MỌI link — Google dựa vào lastmod để biết trang nào cần đọc lại (changefreq / priority Google bỏ qua)
  const BUILD = process.env.BUILD_DATE || null; // bản web mới nhất: dữ liệu món / trang cố định đi theo code
  const max = (...d) => d.filter(Boolean).map((x) => new Date(x)).filter((x) => !isNaN(x)).sort((a, b) => b - a)[0]?.toISOString();
  const sets = Object.fromEntries(((await q("web_settings?select=key,updated_at")) || []).map((r) => [r.key, r.updated_at]));
  const posts = (await q("web_posts?status=in.(published,scheduled)&select=slug,kind,author_id,updated_at,published_at,cover_url,seo,primary_term&order=published_at.desc&limit=5000")) || [];
  const lastPost = max(...posts.filter((p) => p.kind === "post").map((p) => p.updated_at || p.published_at));
  const base = max(sets.site, sets.footer, BUILD); // đổi tên web / chân trang = mọi trang đổi
  const out = [
    { url: u("/"), lastModified: max(base, sets.page_home, lastPost), changeFrequency: "daily", priority: 1 },
    { url: u("/bai-viet"), lastModified: max(base, lastPost), changeFrequency: "daily", priority: 0.8 },
    { url: u("/bang-calo"), lastModified: max(base, sets.calo), changeFrequency: "weekly", priority: 0.8 },
    { url: u("/tinh-calo"), lastModified: base, changeFrequency: "monthly", priority: 0.7 },
    { url: u("/bang-gia"), lastModified: max(base, sets.pricing), changeFrequency: "monthly", priority: 0.6 },
  ];
  // đường dẫn đã có trang riêng của web → trang web_posts trùng slug không mở được, không khai
  const FIXED = new Set(["bai-viet", "bang-calo", "tinh-calo", "bang-gia", "cai-app", "gioi-thieu", "lien-he", "tim-kiem", "chu-de", "the", "tac-gia", "calo", "api"]);
  for (const p of posts) {
    if (FIXED.has(p.slug)) continue;
    if (p.seo?.noindex || p.seo?.canonical || p.seo?.sitemap_off) continue;
    if ((p.kind === "post" && on.post === false) || (p.kind === "page" && on.page === false)) continue;
    const e = { url: u(`/${p.slug}`), lastModified: max(p.updated_at, p.published_at), changeFrequency: p.kind === "post" ? "weekly" : "monthly", priority: p.kind === "post" ? 0.7 : 0.5 };
    if (on.images !== false && p.cover_url) e.images = [p.cover_url];
    out.push(e);
  }
  const have = new Set(posts.map((p) => p.slug));
  if (on.page !== false) for (const lp of await legalPages()) if (!have.has(lp.slug)) out.push({ url: u(`/${lp.slug}`), lastModified: max(vnDateIso(legalToBlocks(lp.html).updated)) || base, changeFrequency: "yearly", priority: 0.3 });
  out.push({ url: u("/cai-app"), lastModified: base, changeFrequency: "yearly", priority: 0.4 }, { url: u("/gioi-thieu"), lastModified: base, changeFrequency: "monthly", priority: 0.5 }, { url: u("/lien-he"), lastModified: max(base, sets.contact), changeFrequency: "yearly", priority: 0.4 });
  if (on.category !== false) for (const t of (await q("web_terms?kind=eq.category&select=id,slug,seo,created_at")) || []) if (catIndexable(t, await countPosts(t.id))) out.push({ url: u(`/chu-de/${t.slug}`), lastModified: max(t.created_at, ...posts.filter((p) => p.primary_term === t.id).map((p) => p.updated_at || p.published_at)), changeFrequency: "weekly", priority: 0.6 });
  if (on.tag === true) for (const t of (await q("web_terms?kind=eq.tag&select=slug,seo")) || []) if (t.seo?.index === true) out.push({ url: u(`/the/${t.slug}`), lastModified: base, priority: 0.3 });
  if (on.author !== false) { const has = new Set(posts.filter((p) => p.kind === "post").map((p) => p.author_id)); const au = ((await q("web_authors?select=id,slug")) || []).filter((a) => has.has(a.id)); for (const a of au) out.push({ url: u(`/tac-gia/${a.slug}`), lastModified: max(...posts.filter((p) => p.author_id === a.id).map((p) => p.updated_at || p.published_at)), priority: 0.4 }); }
  if (on.calo !== false) for (const f of await caloFoods()) if (!f.page?.noindex) out.push({ url: u(`/calo/${f.slug}`), lastModified: max(f.page?.updated_at, BUILD), changeFrequency: "monthly", priority: 0.6 });
  return out;
}
