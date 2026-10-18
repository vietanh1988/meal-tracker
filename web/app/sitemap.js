// sitemap.xml — tự cập nhật; chỉ trang cho Google lập chỉ mục (Cài đặt SEO › Sitemap)
import { q } from "@/lib/sb";
import { getSettings, siteUrl } from "@/lib/site";
import { caloFoods } from "@/lib/calo";

export const revalidate = 600;
export default async function sitemap() {
  const s = await getSettings();
  const on = s.seo?.sitemap || {};
  const u = (p) => siteUrl(s, p);
  const out = [{ url: u("/"), changeFrequency: "daily", priority: 1 }, { url: u("/bai-viet"), changeFrequency: "daily", priority: 0.8 }, { url: u("/bang-calo"), changeFrequency: "weekly", priority: 0.8 }, { url: u("/tinh-calo"), changeFrequency: "monthly", priority: 0.7 }, { url: u("/bang-gia"), changeFrequency: "monthly", priority: 0.6 }];
  const posts = (await q("web_posts?status=in.(published,scheduled)&select=slug,kind,updated_at,published_at,cover_url,seo&order=published_at.desc&limit=5000")) || [];
  for (const p of posts) {
    if (p.seo?.noindex || p.seo?.canonical) continue;
    if ((p.kind === "post" && on.post === false) || (p.kind === "page" && on.page === false)) continue;
    const e = { url: u(`/${p.slug}`), lastModified: p.updated_at || p.published_at, changeFrequency: p.kind === "post" ? "weekly" : "monthly", priority: p.kind === "post" ? 0.7 : 0.5 };
    if (on.images !== false && p.cover_url) e.images = [p.cover_url];
    out.push(e);
  }
  if (on.category !== false) for (const t of (await q("web_terms?kind=eq.category&select=slug,seo")) || []) if (!t.seo?.noindex) out.push({ url: u(`/chu-de/${t.slug}`), changeFrequency: "weekly", priority: 0.6 });
  if (on.tag === true) for (const t of (await q("web_terms?kind=eq.tag&select=slug")) || []) out.push({ url: u(`/the/${t.slug}`), priority: 0.3 });
  if (on.author !== false) for (const a of (await q("web_authors?select=slug")) || []) out.push({ url: u(`/tac-gia/${a.slug}`), priority: 0.4 });
  if (on.calo !== false) for (const f of await caloFoods()) if (!f.page?.noindex) out.push({ url: u(`/calo/${f.slug}`), lastModified: f.page?.updated_at, changeFrequency: "monthly", priority: 0.6 });
  return out;
}
