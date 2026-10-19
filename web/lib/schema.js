// JSON-LD theo loại trang (Cài đặt SEO › Schema mặc định)
import { siteUrl } from "./site.js";

// Cài đặt SEO › Schema mặc định: tắt theo loại trang (post/faq/calo/price/cat/author)
export const schemaOn = (s, k) => !(s?.seo?.schema_off || []).includes(k);
export function orgGraph(s) {
  const url = siteUrl(s, "/");
  const org = { "@type": s.seo?.org?.type === "Person" ? "Person" : "Organization", "@id": url + "#org", name: s.seo?.org?.name || s.site.name, url, logo: s.site?.logo_url || siteUrl(s, "/logo-512.png") };
  const sameAs = [s.contact?.facebook, s.contact?.zalo, s.contact?.tiktok, s.contact?.youtube].filter(Boolean);
  if (sameAs.length) org.sameAs = sameAs;
  if (s.contact?.email) org.email = s.contact.email;
  return org;
}
export function websiteGraph(s) {
  return { "@type": "WebSite", "@id": siteUrl(s, "/#web"), url: siteUrl(s, "/"), name: s.site.name, inLanguage: "vi", publisher: { "@id": siteUrl(s, "/#org") },
    ...(s.seo?.search_action !== false ? { potentialAction: { "@type": "SearchAction", target: siteUrl(s, "/tim-kiem?q={q}"), "query-input": "required name=q" } } : {}) };
}
export function appGraph(s) {
  return { "@type": "SoftwareApplication", name: s.site.name, applicationCategory: "HealthApplication", operatingSystem: "iOS, Android, Web", url: s.site.app_url, offers: { "@type": "Offer", price: "0", priceCurrency: "VND" } };
}
export function breadcrumb(s, items) {
  return { "@type": "BreadcrumbList", itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: siteUrl(s, it.path) })) };
}
export function articleGraph(s, p, path) {
  const a = { "@type": "BlogPosting", headline: p.title, url: siteUrl(s, path), mainEntityOfPage: siteUrl(s, path), datePublished: p.published_at, dateModified: p.updated_at || p.published_at, inLanguage: "vi", publisher: { "@id": siteUrl(s, "/#org") } };
  if (p.cover_url) a.image = [p.cover_url];
  if (p.excerpt || p.seo?.desc) a.description = p.seo?.desc || p.excerpt;
  if (p.author) a.author = { "@type": "Person", name: p.author.name, url: siteUrl(s, `/tac-gia/${p.author.slug}`) };
  if (p.reviewer) a.reviewedBy = { "@type": "Person", name: p.reviewer.name, url: siteUrl(s, `/tac-gia/${p.reviewer.slug}`) };
  return a;
}
export function faqGraph(items, s) {
  if (s && !schemaOn(s, "faq")) return null;
  return items?.length ? { "@type": "FAQPage", mainEntity: items.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) } : null;
}
export function foodGraph(s, fd, por, path) {
  const n = por || { cal: fd.per100.cal, p: fd.per100.p, c: fd.per100.c, f: fd.per100.f, fiber: fd.per100.fiber, gram: 100, name: "100 g" };
  return { "@type": "MenuItem", name: fd.name, url: siteUrl(s, path), nutrition: { "@type": "NutritionInformation", servingSize: `${n.name} (${n.gram} g)`, calories: `${n.cal} kcal`, proteinContent: `${n.p} g`, carbohydrateContent: `${n.c} g`, fatContent: `${n.f} g`, fiberContent: `${n.fiber} g` } };
}
export const ld = (...graphs) => JSON.stringify({ "@context": "https://schema.org", "@graph": graphs.filter(Boolean) }).replace(/</g, "\\u003c");
