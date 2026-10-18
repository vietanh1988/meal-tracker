// Bài viết (137c/d) hoặc Trang (Giới thiệu, Liên hệ, Chính sách…) — cùng 1 kiểu đường dẫn /<ten>
import { notFound } from "next/navigation";
import Crumb from "@/components/Crumb";
import Blocks from "@/components/Blocks";
import JsonLd from "@/components/JsonLd";
import Sticky from "@/components/Sticky";
import PostCard from "@/components/PostCard";
import { getSettings, siteUrl, appLink } from "@/lib/site";
import { getPostBySlug, latestPosts, catOf, fmtDate, readMin } from "@/lib/content";
import { prepare, toc as mkToc, faqs } from "@/lib/blocks";
import { textOf } from "@/lib/sanitize";
import { articleGraph, breadcrumb, faqGraph, foodGraph, ld } from "@/lib/schema";

export const revalidate = 60;
export const dynamicParams = true;
export async function generateStaticParams() { return []; }

export async function generateMetadata({ params }) {
  const p = await getPostBySlug(params.slug);
  if (!p) return {};
  const seo = p.seo || {};
  const desc = seo.desc || p.excerpt || textOf((p.blocks || []).find((b) => b.type === "p")?.html).slice(0, 158);
  const robots = { index: !seo.noindex, follow: !seo.nofollow };
  return {
    title: seo.title ? { absolute: seo.title } : p.title,
    description: desc,
    alternates: { canonical: seo.canonical || `/${p.slug}` },
    robots,
    openGraph: { type: p.kind === "post" ? "article" : "website", title: seo.og_title || seo.title || p.title, description: desc, url: `/${p.slug}`, images: seo.og_image || p.cover_url ? [{ url: seo.og_image || p.cover_url }] : undefined, publishedTime: p.published_at, modifiedTime: p.updated_at },
  };
}

export default async function Page({ params }) {
  const p = await getPostBySlug(params.slug);
  if (!p) notFound();
  const s = await getSettings();
  const blocks = await prepare(p.blocks);
  const t = mkToc(blocks);
  const fq = faqs(blocks);
  const cat = catOf(p);
  const path = `/${p.slug}`;
  const crumbs = [{ name: "Trang chủ", path: "/" }, ...(p.kind === "post" && cat ? [{ name: cat.name, path: `/${s.seo.cat_base}/${cat.slug}` }] : []), { name: p.title, path }];
  const firstCalo = blocks.find((b) => b.type === "calo" && b._food);
  const custom = p.seo?.schema && typeof p.seo.schema === "object" ? p.seo.schema : null;
  const graphs = [breadcrumb(s, crumbs), p.kind === "post" ? articleGraph(s, p, path) : null, faqGraph(fq), firstCalo ? foodGraph(s, firstCalo._food, firstCalo._portion, path) : null, ...(custom ? [].concat(custom["@graph"] || custom) : [])];

  if (p.kind === "page") {
    const long = p.template === "legal";
    return (
      <main>
        <JsonLd data={ld(...graphs)} />
        <section className="phead"><div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 14 }}><Crumb items={crumbs} /><h1 className="h1">{p.title}</h1>{long && <span className="mut">Cập nhật {fmtDate(p.updated_at)}</span>}</div></section>
        <div className="wrap" style={{ paddingTop: 40, display: "flex", gap: 32, alignItems: "flex-start" }}>
          <article className="card art" style={{ flex: 1, minWidth: 0, padding: 48, maxWidth: long ? 860 : undefined }}><Blocks blocks={blocks} s={s} toc={t} /></article>
          {long && t.length > 0 && <aside className="only-pc" style={{ width: 300, position: "sticky", top: 90 }}><TocBox t={t} /></aside>}
        </div>
        <Sticky s={s} ref_={`page-${p.slug}`} />
        <style>{`@media(max-width:720px){.art{padding:20px!important}}`}</style>
      </main>
    );
  }

  const ids = p.related?.mode === "manual" ? p.related.ids || [] : [];
  let rel = [];
  if (ids.length) rel = (await latestPosts({ limit: 6 })).filter((x) => ids.includes(x.id));
  if (rel.length < 3) rel = [...rel, ...(await latestPosts({ limit: 4, termId: cat?.id || null, exclude: [p.id, ...rel.map((x) => x.id)] }))].slice(0, 3);
  const a = p.author;
  return (
    <main>
      <JsonLd data={ld(...graphs)} />
      <div className="wrap" style={{ paddingTop: 40, paddingBottom: 0, display: "flex", gap: 32, alignItems: "flex-start" }}>
        <div className="card art" style={{ flex: 1, minWidth: 0, padding: 48 }}>
          <article style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <Crumb items={crumbs} />
            <h1 className="h1">{p.title}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#64748B", flexWrap: "wrap" }}>
              {a && <><Avatar a={a} size={32} /><a href={`/tac-gia/${a.slug}`} style={{ color: "#0F172A", fontWeight: 700 }}>{a.name}</a><span>·</span></>}
              {p.reviewer && <><span>Kiểm duyệt: <a href={`/tac-gia/${p.reviewer.slug}`} style={{ color: "#0F172A", fontWeight: 600 }}>{p.reviewer.name}</a></span><span>·</span></>}
              <time dateTime={p.updated_at || p.published_at}>Cập nhật {fmtDate(p.updated_at || p.published_at)}</time><span>·</span><span>{readMin(p.word_count)} phút đọc</span>
            </div>
            {p.cover_url && <figure><img src={p.cover_url} alt={p.cover_alt || p.title} fetchPriority="high" style={{ width: "100%", height: "auto", maxHeight: 460, objectFit: "cover", borderRadius: 16, display: "block" }} /></figure>}
            {t.length > 1 && <div className="only-m"><TocBox t={t} /></div>}
            <Blocks blocks={blocks} s={s} toc={t} />
            {a?.show_box !== false && a && (
              <div style={{ borderRadius: 16, border: "1px solid #E6ECF5", background: "#F8FBFF", padding: 20, display: "flex", gap: 14, marginTop: 8 }}>
                <Avatar a={a} size={56} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><span className="eye" style={{ fontSize: 12 }}>Viết bởi</span><b style={{ fontSize: 17 }}>{a.name}</b>{a.job_title && <span className="mut" style={{ fontSize: 14 }}>{a.job_title}</span>}{a.bio && <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.6 }}>{a.bio}</p>}<a href={`/tac-gia/${a.slug}`} style={{ color: "#0062F0", fontWeight: 700, fontSize: 14.5 }}>Xem các bài của {a.name} →</a></div>
              </div>
            )}
            {(p.terms || []).filter((x) => x.kind === "tag").length > 0 && <div className="chips">{p.terms.filter((x) => x.kind === "tag").map((x) => <a key={x.id} className="chip" href={`/${s.seo.tag_base}/${x.slug}`}># {x.name}</a>)}</div>}
            {rel.length > 0 && (
              <section style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 24, paddingTop: 32, borderTop: "1px solid #EEF2F7" }}>
                <h2 style={{ fontSize: 24, fontWeight: 800 }}>Bài liên quan</h2>
                <div className="grid3 only-pc">{rel.map((x) => <PostCard key={x.id} p={x} />)}</div>
                <div className="only-m">{rel.map((x) => <PostCard key={x.id} p={x} row />)}</div>
              </section>
            )}
          </article>
        </div>
        <aside className="only-pc" style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 20, position: "sticky", top: 90 }}>
          {t.length > 1 && <TocBox t={t} />}
          <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, background: "linear-gradient(180deg,#EEF4FF,#FFFFFF)", borderColor: "#DCE7FF" }}>
            <b style={{ fontSize: 18, color: "#0B3B91" }}>Thực đơn giảm cân món Việt</b>
            <span style={{ fontSize: 14, color: "#475569", lineHeight: 1.5 }}>App tự lên mỗi ngày, đúng calo cho bạn.</span>
            <img src="/img/app-today.png" alt="Màn Hôm nay của app Fipilot AI" loading="lazy" style={{ width: 120, alignSelf: "center", borderRadius: 18, border: "5px solid #0F172A" }} />
            <a className="btn b1" href={appLink(s, `post-${p.slug}`)}>Dùng thử miễn phí</a>
          </div>
        </aside>
      </div>
      <Sticky s={s} ref_={`post-${p.slug}`} />
      <style>{`@media(max-width:720px){.art{padding:20px!important}}`}</style>
    </main>
  );
}

function TocBox({ t }) {
  return (
    <nav aria-label="Mục lục" className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 4 }}>
      <b style={{ fontSize: 16, padding: "0 8px 8px" }}>Mục lục</b>
      {t.map((x, i) => <a key={x.id} href={`#${x.id}`} style={{ fontSize: 14.5, lineHeight: 1.4, padding: "8px 10px", paddingLeft: x.level === 3 ? 24 : 10, borderRadius: 8, color: "#475569" }}>{x.level === 2 ? `${t.filter((y, k) => k <= i && y.level === 2).length}. ` : ""}{x.text}</a>)}
    </nav>
  );
}
function Avatar({ a, size }) {
  return a.avatar_url ? <img src={a.avatar_url} alt={a.name} width={size} height={size} style={{ width: size, height: size, borderRadius: size / 2, objectFit: "cover", flexShrink: 0 }} /> : <span style={{ width: size, height: size, borderRadius: size / 2, background: "#0062F0", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size / 2.6, flexShrink: 0 }}>{(a.name || "?").split(/\s+/).map((w) => w[0]).slice(-2).join("").toUpperCase()}</span>;
}
