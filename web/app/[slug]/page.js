// Bài viết (137c/d) hoặc Trang (Giới thiệu, Liên hệ, Chính sách…) — cùng 1 kiểu đường dẫn /<ten>
import { notFound } from "next/navigation";
import { imgAttrs, srcSet } from "@/lib/img";
import { preload } from "react-dom";
import Crumb from "@/components/Crumb";
import Blocks from "@/components/Blocks";
import Landing from "@/components/Landing";
import JsonLd from "@/components/JsonLd";
import Sticky from "@/components/Sticky";
import LegalToc from "@/components/LegalToc";
import PostToc from "@/components/PostToc";
import { legalPages, legalToBlocks, vnDateIso } from "@/lib/appdata";
import PostCard from "@/components/PostCard";
import { getSettings, siteUrl, appLink, alt, ogBase, withOg } from "@/lib/site";
import { getPostBySlug, latestPosts, postsByIds, catOf, fmtDate, readMin } from "@/lib/content";
import { prepare, toc as mkToc, faqs } from "@/lib/blocks";
import { linkTargets, autoLink } from "@/lib/autolink";
import { splitLong } from "@/lib/paras";
import { fixSources } from "@/lib/sources";
import { addInfographics } from "@/lib/infographic";
import { textOf } from "@/lib/sanitize";
import { orgGraph, articleGraph, breadcrumb, faqGraph, foodGraph, ld, schemaOn } from "@/lib/schema";

export const revalidate = 60;
export const dynamicParams = true;
export async function generateStaticParams() { return []; }

// Bài / trang web; chưa có thì lấy trang Điều khoản / Chính sách soạn trong app (app_settings.terms_content)
async function findPage(slug) {
  const p = await getPostBySlug(slug);
  if (p) return p;
  const lp = (await legalPages()).find((x) => x.slug === slug);
  if (!lp) return null;
  const { title, updated, blocks } = legalToBlocks(lp.html);
  const iso = vnDateIso(updated);
  return { id: `legal-${lp.id}`, kind: "page", template: "legal", slug, title: lp.label || title, blocks, seo: { desc: /riêng tư|bảo mật|privacy/i.test(lp.label || "") ? `${lp.label} của Fipilot AI: app và web fipilotai.com thu thập, dùng và bảo vệ dữ liệu của bạn thế nào.` : `${lp.label} của Fipilot AI: quy định khi dùng app và web fipilotai.com.` }, updated_at: iso, published_at: iso };
}

export async function generateMetadata({ params }) {
  const p = await findPage(params.slug);
  if (!p) return {};
  const s = await getSettings();
  const seo = p.seo || {};
  const desc = seo.desc || p.excerpt || textOf((p.blocks || []).find((b) => b.type === "p")?.html).slice(0, 158);
  const robots = { index: !seo.noindex, follow: !seo.nofollow };
  return withOg({
    title: seo.title ? { absolute: seo.title } : p.title,
    description: desc,
    alternates: alt(seo.canonical || `/${p.slug}`),
    robots,
    openGraph: { ...ogBase(s), type: p.kind === "post" ? "article" : "website", title: seo.og_title || seo.title || p.title, description: desc, url: `/${p.slug}`, ...(seo.og_image || p.cover_url ? { images: [{ url: seo.og_image || p.cover_url }] } : {}), publishedTime: p.published_at, modifiedTime: p.updated_at, ...(p.kind === "post" && catOf(p) ? { section: catOf(p).name, tags: (p.terms || []).filter((t) => t.kind === "tag").map((t) => t.name) } : {}) },
  }, s);
}

export default async function Page({ params }) {
  const p = await findPage(params.slug);
  // Ảnh bìa = phần tử lớn nhất màn đầu (LCP): báo trình duyệt tải ngay từ <head>, đúng bản theo cỡ màn
  if (p?.cover_url) preload(p.cover_url, { as: "image", fetchPriority: "high", ...(srcSet(p.cover_url) ? { imageSrcSet: srcSet(p.cover_url), imageSizes: "(max-width: 720px) 100vw, 760px" } : {}) });
  if (!p) notFound();
  const s = await getSettings();
  let blocks = await prepare(p.blocks);
  if (p.kind === "post") blocks = addInfographics(blocks, p); // 23/10: bảng số liệu (cột kcal, ≥ 3 dòng) → ảnh infographic ngay dưới bảng, tối đa 2 / bài
  if (p.kind === "post") blocks = fixSources(blocks); // 23/10: "Nguồn tham khảo" chỉ giữ / thêm đúng tổ chức được trích trong bài
  if (p.kind === "post") blocks = splitLong(blocks); // 23/10: đoạn dài quá 55 chữ chia thành đoạn 2-3 câu cho dễ đọc trên điện thoại
  if (p.kind === "post" && !p.seo?.no_autolink) blocks = autoLink(blocks, await linkTargets(), `/${p.slug}`); // 23/10: link nội bộ tự gắn khi bài đích đã lên
  // Trang Điều khoản / Chính sách (139w): đánh số mục "1. 2. …" nếu chưa gõ số
  if (p.kind === "page" && p.template === "legal") { let n = 0; blocks = blocks.map((b) => (b?.type === "h" && (b.level || 2) === 2 ? (n++, /^\s*\d/.test(textOf(b.text)) ? b : { ...b, text: `${n}. ${b.text}` }) : b)); }
  const t = mkToc(blocks);
  const fq = faqs(blocks);
  const cat = catOf(p);
  const path = `/${p.slug}`;
  const crumbs = [{ name: "Trang chủ", path: "/" }, ...(p.kind === "post" && cat ? [{ name: cat.name, path: `/${s.seo.cat_base}/${cat.slug}` }] : []), { name: p.title, path }];
  const firstCalo = blocks.find((b) => b.type === "calo" && b._food);
  const custom = p.seo?.schema && typeof p.seo.schema === "object" ? p.seo.schema : null;
  // Quản trị › Sửa bài › Schema: tắt từng loại schema tự sinh
  const off = new Set(p.seo?.schema_off || []);
  // 26/10: khối video .mp4 → schema VideoObject (Google hiện video trong kết quả tìm)
  const vids = blocks.filter((b) => b?.type === "video" && b.url && b.poster).map((b) => ({ "@type": "VideoObject", name: b.title || p.title, description: b.caption || p.seo?.desc || p.excerpt || p.title, thumbnailUrl: new URL(b.poster, siteUrl(s)).href, contentUrl: new URL(b.url, siteUrl(s)).href, uploadDate: p.published_at || p.updated_at, ...(b.duration ? { duration: b.duration } : {}) }));
  const graphs = [off.has("BreadcrumbList") ? null : breadcrumb(s, crumbs), p.kind === "post" && !off.has("Article") && schemaOn(s, "post") ? articleGraph(s, p, path) : null, p.kind === "post" && !off.has("Article") && schemaOn(s, "post") ? orgGraph(s) : null, off.has("FAQPage") ? null : faqGraph(fq, s), firstCalo && !off.has("NutritionInformation") && schemaOn(s, "calo") ? foodGraph(s, firstCalo._food, firstCalo._portion, path) : null, ...vids, ...(custom ? [].concat(custom["@graph"] || custom) : [])];

  // 26/10: mẫu "landing" (trang /pi, /huong-dan): khối lp_* hết bề ngang, không khung bài, không tiêu đề trang (H1 nằm trong khối đầu trang)
  if (p.kind === "page" && p.template === "landing") return (
    <main className="lp-page"><JsonLd data={ld(...graphs)} /><Landing blocks={blocks} s={s} toc={t} slug={p.slug} /><Sticky s={s} ref_={`page-${p.slug}`} /></main>
  );
  if (p.kind === "page") {
    const long = p.template === "legal" || p.template === "guide"; // 26/10: "guide" = trang hướng dẫn có mục lục, không đánh số mục
    return (
      <main>
        <JsonLd data={ld(...graphs)} />
        <section className="phead"><div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 14 }}><Crumb items={crumbs} /><h1 className="h1">{p.title}</h1>{long && !p.seo?.hide_updated && p.updated_at && <p className="lg-up" style={{ fontSize: 18, lineHeight: 1.6, color: "#475569" }}>Cập nhật {fmtDate(p.updated_at)}</p>}</div></section>
        <div className={`wrap${long ? " lg-w" : ""}`} style={{ paddingTop: 40, display: "flex", gap: 32, alignItems: "flex-start" }}>
          {long && t.length > 0 && <div className="only-m lg-mt"><LegalToc t={t} /></div>}
          <article className={`card art${long ? " legal" : ""}`} style={{ flex: 1, minWidth: 0, padding: 48 }}><Blocks blocks={blocks} s={s} toc={t} slug={p.slug} /></article>
          {long && t.length > 0 && <aside className="only-pc" style={{ width: 300, flexShrink: 0, position: "sticky", top: 90 }}><LegalToc t={t} /></aside>}
        </div>
        <Sticky s={s} ref_={`page-${p.slug}`} />
        <style dangerouslySetInnerHTML={{ __html: `.legal .prose{gap:20px}.legal .prose h2{font-size:26px;line-height:normal;margin-top:12px}.legal .prose h2:first-child{margin-top:0}.legal .prose p,.legal .prose li{max-width:720px}.legal .prose>div>*+*{margin-top:14px}.legal .prose ul,.legal .prose ol{padding-left:22px;display:flex;flex-direction:column;gap:6px}@media(max-width:720px){.art{padding:20px!important}.art-flat{padding:0!important}.lg-up{font-size:16px!important}.lg-w{flex-direction:column;gap:16px!important;padding-top:24px!important}.lg-w>article{width:100%}.lg-mt{display:block;align-self:flex-start;max-width:100%}.legal .prose h2{font-size:22px}}` }} />
      </main>
    );
  }

  const ids = p.related?.mode === "manual" ? p.related.ids || [] : [];
  let rel = [];
  if (ids.length) rel = (await postsByIds(ids)).filter((x) => x.id !== p.id);
  if (rel.length < 3) rel = [...rel, ...(await latestPosts({ limit: 4, termId: cat?.id || null, exclude: [p.id, ...rel.map((x) => x.id)] }))].slice(0, 3);
  const a = p.author;
  return (
    <main style={{ background: "#FFFFFF" }}>{/* 23/10: thân bài không khung (nền trắng cả trang cho thoáng), chỉ cột bên giữ khung */}
      <JsonLd data={ld(...graphs)} />
      <div className="wrap postwrap" style={{ paddingTop: 40, paddingBottom: 52, display: "flex", gap: 48, alignItems: "flex-start" }}>
        <div className="art art-flat" style={{ flex: 1, minWidth: 0, padding: "8px 0 0 0" }}>
          <article style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <Crumb items={crumbs.slice(0, -1)} last />
            <h1 className="h1">{p.title}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#64748B", flexWrap: "wrap" }}>
              {a && <><Avatar a={a} size={32} /><a href={`/tac-gia/${a.slug}`} style={{ color: "#0F172A", fontWeight: 700 }}>{a.name}</a><span>·</span></>}
              {p.reviewer && <><span>Kiểm duyệt: <a href={`/tac-gia/${p.reviewer.slug}`} style={{ color: "#0F172A", fontWeight: 600 }}>{p.reviewer.name}</a></span><span>·</span></>}
              {p.seo?.hide_updated ? <time dateTime={p.published_at}>Đăng {fmtDate(p.published_at)}</time> : <time dateTime={p.updated_at || p.published_at}>Cập nhật {fmtDate(p.updated_at || p.published_at)}</time>}<span>·</span><span>{readMin(p.word_count)} phút đọc</span>
            </div>
            {p.cover_url && <figure><img {...imgAttrs(p.cover_url)} alt={p.cover_alt || p.title} fetchPriority="high" className="cover" style={{ width: "100%", height: 330, objectFit: "cover", borderRadius: 16, display: "block" }} /></figure>}
            {t.length > 1 && <div className="only-m"><PostToc t={t} mobile /></div>}
            <Blocks blocks={blocks} s={s} toc={t} slug={p.slug} />
            {a?.show_box !== false && a && (
              <div style={{ borderRadius: 16, border: "1px solid #E6ECF5", background: "#F8FBFF", padding: 20, display: "flex", gap: 14, marginTop: 8 }}>
                <Avatar a={a} size={56} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><span className="eye" style={{ fontSize: 12 }}>Viết bởi</span><b style={{ fontSize: 17 }}>{a.name}</b>{a.job_title && <span className="mut" style={{ fontSize: 14 }}>{a.job_title}</span>}{a.bio && <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.6 }}>{a.bio}</p>}<a href={`/tac-gia/${a.slug}`} style={{ color: "#0062F0", fontWeight: 700, fontSize: 14.5 }}>Xem các bài của {a.name} →</a></div>
              </div>
            )}
            {rel.length > 0 && (
              <section className="rel" style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 40, paddingTop: 32, borderTop: "1px solid #EEF2F7" }}>
                <h2 className="rel-h" style={{ fontSize: 24, fontWeight: 800 }}>Bài liên quan</h2>
                <div className="grid3 only-pc" style={{ gap: 12 }}>{rel.map((x) => (
                  <a key={x.id} href={`/${x.slug}`} className="card pcard" style={{ overflow: "hidden" }}>
                    {x.cover_url ? <img {...imgAttrs(x.cover_url, "(max-width: 720px) 50vw, 240px")} alt={x.cover_alt || ""} loading="lazy" decoding="async" style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} /> : <span style={{ display: "block", height: 130, background: "linear-gradient(135deg,#E8F0FF,#F5F9FF)" }} />}
                    <span style={{ display: "block", padding: "14px 16px", fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}>{x.title}</span>
                  </a>))}</div>
                <div className="only-m">{rel.map((x) => { const c = catOf(x); return (
                  <a key={x.id} href={`/${x.slug}`} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderTop: "1px solid #EEF2F7" }}>
                    {x.cover_url ? <img {...imgAttrs(x.cover_url, "72px")} alt={x.cover_alt || ""} loading="lazy" decoding="async" style={{ width: 72, height: 72, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} /> : <span style={{ width: 72, height: 72, borderRadius: 12, background: "#E8F0FF", flexShrink: 0 }} />}
                    <span style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontSize: 12, fontWeight: 800, color: "#0062F0", letterSpacing: ".04em" }}>{(c?.name || "Bài viết").toUpperCase()}</span><b style={{ fontSize: 15.5, lineHeight: 1.4 }}>{x.title}</b></span>
                  </a>); })}</div>
              </section>
            )}
          </article>
        </div>
        <aside className="only-pc" style={{ width: 340, flexShrink: 0, display: "flex", flexDirection: "column", gap: 20, position: "sticky", top: 90 }}>
          {t.length > 1 && <PostToc t={t} />}
          <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, background: "linear-gradient(180deg,#EEF4FF,#FFFFFF)", borderColor: "#DCE7FF" }}>
            <b style={{ fontSize: 18, color: "#0B3B91" }}>Thực đơn giảm cân món Việt</b>
            <span style={{ fontSize: 14, color: "#475569", lineHeight: 1.5 }}>App tự lên mỗi ngày, đúng calo cho bạn.</span>
            <div style={{ position: "relative", height: 170, marginTop: 4 }}>
              <img src="/img/food-cta.jpg" alt="" loading="lazy" style={{ position: "absolute", left: 0, bottom: 0, width: 160, height: 96, objectFit: "cover", borderRadius: 12 }} />
              <img src="/img/app-today.webp" alt="Màn Hôm nay của app Fipilot AI" loading="lazy" style={{ position: "absolute", right: 14, bottom: 0, width: 80, height: "auto", borderRadius: 14, border: "4px solid #0F172A", transform: "rotate(6deg)", boxShadow: "0 12px 24px rgba(15,23,42,.2)" }} />
            </div>
            <a className="btn b1" href={appLink(s, `post-${p.slug}`)}>Dùng thử miễn phí</a>
          </div>
        </aside>
      </div>
      <Sticky s={s} ref_={`post-${p.slug}`} />
      <style dangerouslySetInnerHTML={{ __html: `@media(max-width:720px){.art{padding:20px!important}.art-flat{padding:0!important}.cover{height:230px!important}.postwrap{padding-top:20px!important;padding-bottom:40px!important}.rel{gap:6px!important;margin-top:32px!important;padding-top:28px!important}.rel-h{font-size:22px!important;margin-bottom:8px}}` }} />
    </main>
  );
}

function Avatar({ a, size }) {
  return a.avatar_url ? <img {...imgAttrs(a.avatar_url, `${size}px`)} alt={a.name} width={size} height={size} loading="lazy" decoding="async" style={{ width: size, height: size, borderRadius: size / 2, objectFit: "cover", flexShrink: 0 }} /> : <span style={{ width: size, height: size, borderRadius: size / 2, background: "#0062F0", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size / 2.6, flexShrink: 0 }}>{(a.name || "?").split(/\s+/).map((w) => w[0]).slice(-2).join("").toUpperCase()}</span>;
}
