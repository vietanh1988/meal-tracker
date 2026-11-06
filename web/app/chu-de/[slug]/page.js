// Chuyên mục (139c/d)
import { notFound } from "next/navigation";
import PageHead from "@/components/PageHead";
import JsonLd from "@/components/JsonLd";
import Sticky from "@/components/Sticky";
import PostCard, { PostList, Pager } from "@/components/PostCard";
import { getSettings, alt, withOg, appLink } from "@/lib/site";
import Icon from "@/components/Icon";
import { CLUSTERS, CLUSTER_ORDER, TOOLS, groupPosts } from "@/lib/clusters";
import { caloFoods } from "@/lib/calo";
import { EXERCISES } from "@/lib/workout";
import { fmtDate, readMin } from "@/lib/content";
import { getTerm, allTerms, latestPosts, countPosts, catIndexable } from "@/lib/content";
import { breadcrumb, ld, schemaOn } from "@/lib/schema";

export const revalidate = 60;
export async function generateMetadata({ params, searchParams }) {
  const t = await getTerm("category", params.slug);
  if (!t) return {};
  const page = Math.max(1, +searchParams?.trang || 1);
  const n = await countPosts(t.id);
  return withOg({ title: t.seo?.title || t.name, description: t.seo?.desc || t.description?.slice(0, 158), alternates: alt(`/chu-de/${t.slug}${page > 1 && !CLUSTERS[t.slug] ? `?trang=${page}` : ""}`), robots: { index: catIndexable(t, n), follow: true } }, typeof s !== "undefined" ? s : undefined);
}

export default async function Cat({ params, searchParams }) {
  const t = await getTerm("category", params.slug);
  if (!t) notFound();
  const s = await getSettings();
  if (CLUSTERS[t.slug]) return <Cluster t={t} s={s} />;
  const per = s.site.posts_per_page || 12;
  const page = Math.max(1, +searchParams?.trang || 1);
  const [subs, total] = [(await allTerms("category")).filter((x) => x.parent_id === t.id), await countPosts(t.id)];
  // ô số liệu 139c: số bài + (nếu có mục con "Calo món ăn") số món có bảng calo
  const caloSub = subs.find((x) => x.slug === "calo-mon-an");
  const caloN = caloSub ? await countPosts(caloSub.id) : 0;
  const posts = await latestPosts({ termId: t.id, limit: per, offset: (page - 1) * per });
  if (page > 1 && !posts.length) notFound();
  const pin = page === 1 ? posts[0] : null;
  const rest = pin ? posts.slice(1) : posts;
  const crumbs = [{ name: "Trang chủ", path: "/" }, { name: "Chuyên mục", path: "/bai-viet" }, { name: t.name, path: `/chu-de/${t.slug}` }];
  return (
    <main>
      <JsonLd data={ld(breadcrumb(s, crumbs), schemaOn(s, "cat") && { "@type": "CollectionPage", name: t.name, description: t.description || undefined })} />
      <PageHead eye="Chuyên mục" h1={t.name} sub={t.description} crumb={crumbs} right={<div className="card only-pc" style={{ padding: "18px 22px", flexShrink: 0 }}><div style={{ display: "flex", gap: 28 }}>{[[total, "bài viết"], ...(caloN ? [[caloN, "món có bảng calo"]] : [])].map(([n, l]) => <span key={l} style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 26 }}>{n}</b><span style={{ fontSize: 13.5, color: "#64748B" }}>{l}</span></span>)}</div></div>} />
      <div className="wrap catw" style={{ paddingTop: 40 }}>
        {subs.length > 0 && <div className="chips" style={{ marginBottom: 32 }}><span className="chip on">Tất cả trong {t.name}</span>{subs.map((x) => <a key={x.id} className="chip" href={`/chu-de/${x.slug}`}>{x.name}</a>)}</div>}
        {pin && (
          <a href={`/${pin.slug}`} className="card catpin" style={{ display: "flex", overflow: "hidden", marginBottom: 56 }}>
            {pin.cover_url && <img src={pin.cover_url} alt={pin.cover_alt || ""} width={480} height={280} fetchPriority="high" className="pin-img" style={{ width: 480, height: 280, objectFit: "cover", flexShrink: 0 }} />}
            <span style={{ padding: 32, display: "flex", flexDirection: "column", gap: 12, justifyContent: "center" }}><span className="pill" style={{ alignSelf: "flex-start" }}>{pin.pinned ? "📌 Bài nên đọc trước" : "Mới nhất"}</span><b style={{ fontSize: 28, lineHeight: 1.3 }}>{pin.title}</b>{pin.excerpt && <span className="catpin-ex" style={{ fontSize: 16, color: "#64748B", lineHeight: 1.6 }}>{pin.excerpt}</span>}<span style={{ fontSize: 13.5, color: "#64748B" }}>{fmtDate(pin.published_at)} · {readMin(pin.word_count)} phút đọc</span></span>
          </a>
        )}
        {rest.length > 0 && <h2 className="cat-h2" style={{ fontSize: 28, fontWeight: 800, marginBottom: 24 }}>Mới nhất trong {t.name}</h2>}
        <PostList posts={rest} variant="list" mCard={false} />
        {!posts.length && <p className="lead">Chưa có bài trong chuyên mục này.</p>}
        <Pager page={page} total={total} per={per} base={`/chu-de/${t.slug}`} />
      </div>
      <Sticky s={s} ref_={`cat-${t.slug}`} />
      <style dangerouslySetInnerHTML={{ __html: `@media(max-width:720px){.catpin{flex-direction:column;margin-bottom:40px!important}.catpin img{width:100%!important;height:200px!important}.catpin>span{padding:20px!important}.catpin b{font-size:22px!important}.catpin-ex{font-size:15px!important}.catw{padding-top:24px!important}.catw>.chips{margin-bottom:20px!important}.cat-h2{font-size:22px!important;margin-bottom:16px!important}}` }} />
    </main>
  );
}

// 06/11 (chủ dự án chốt bản vẽ "Cụm chủ đề", phần 1): trang cụm = trang trụ cột. Bài trụ ★ · công cụ dữ liệu app · bài chia nhóm theo ý định
// (mỗi nhóm hiện 3 bài, bấm "Xem đủ" mở phần còn lại — mọi link bài đều có sẵn trong HTML) · link sang các cụm khác. Không chia trang.
async function Cluster({ t, s }) {
  const cfg = CLUSTERS[t.slug];
  const [posts, cats, foods] = await Promise.all([latestPosts({ limit: 200, termId: t.id }), allTerms("category"), caloFoods()]);
  const star = posts.find((p) => p.slug === cfg.star) || null;
  const groups = groupPosts(cfg, posts);
  const crumbs = [{ name: "Trang chủ", path: "/" }, { name: "Chuyên mục", path: "/bai-viet" }, { name: t.name, path: `/chu-de/${t.slug}` }];
  const byslug = Object.fromEntries(cats.map((c) => [c.slug, c]));
  const others = CLUSTER_ORDER.filter((x) => x !== t.slug && byslug[x]).map((x) => byslug[x]);
  const tools = cfg.tools.map((k) => ({ k, ...TOOLS[k] })).filter((x) => x.t);
  const fill = (x) => x.replace("%n", foods.length).replace("%e", EXERCISES.length);
  return (
    <main>
      <JsonLd data={ld(breadcrumb(s, crumbs), schemaOn(s, "cat") && { "@type": "CollectionPage", name: t.name, description: t.description || cfg.lead, hasPart: posts.slice(0, 50).map((p) => ({ "@type": "Article", headline: p.title, url: `/${p.slug}` })) })} />
      <PageHead eye="Cụm chủ đề" h1={t.name} sub={t.description || cfg.lead} crumb={crumbs} right={<div className="card only-pc" style={{ padding: "18px 22px", flexShrink: 0 }}><div style={{ display: "flex", gap: 28 }}>{[[posts.length, "bài viết"], ...(cfg.tools.includes("bang-calo") ? [[foods.length, "món có bảng calo"]] : cfg.tools.includes("bai-tap") ? [[EXERCISES.length, "bài tập có ảnh"]] : []), [groups.length, "nhóm"]].map(([n, l]) => <span key={l} style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 26 }}>{n}</b><span style={{ fontSize: 13.5, color: "#64748B" }}>{l}</span></span>)}</div></div>} />
      <div className="wrap catw" style={{ paddingTop: 40 }}>
        {star && (
          <a href={`/${star.slug}`} className="card catpin" data-testid="cum-star" style={{ display: "flex", overflow: "hidden", marginBottom: 32 }}>
            {star.cover_url && <img src={star.cover_url} alt={star.cover_alt || ""} width={480} height={280} fetchPriority="high" className="pin-img" style={{ width: 480, height: 280, objectFit: "cover", flexShrink: 0 }} />}
            <span style={{ padding: 32, display: "flex", flexDirection: "column", gap: 12, justifyContent: "center" }}><span className="pill" style={{ alignSelf: "flex-start" }}>★ Đọc trước</span><b style={{ fontSize: 28, lineHeight: 1.3 }}>{star.title}</b>{star.excerpt && <span className="catpin-ex" style={{ fontSize: 16, color: "#64748B", lineHeight: 1.6 }}>{star.excerpt}</span>}<span style={{ fontSize: 13.5, color: "#64748B" }}>{fmtDate(star.published_at)} · {readMin(star.word_count)} phút đọc</span></span>
          </a>
        )}
        <div className="tools" data-testid="cum-tools">{tools.map((x) => (
          <a key={x.k} className="card tool" href={x.url || appLink(s, `cum-${t.slug}`)}><i><Icon name={x.icon} size={22} color="#0062F0" /></i><span><b>{x.t}</b><span>{fill(x.x)}</span></span></a>
        ))}</div>
        {groups.length > 1 && <nav className="chips chips-wrap" aria-label="Nhóm bài" style={{ marginBottom: 36 }}><span className="chip on">Tất cả {posts.length} bài</span>{groups.map((g, i) => <a key={g.name} className="chip" href={`#nhom-${i + 1}`}>{g.name}<em>{g.posts.length}</em></a>)}</nav>}
        {groups.map((g, i) => (
          <section key={g.name} id={`nhom-${i + 1}`} className="grp" data-testid="cum-group">
            <div className="grp-h"><h2>{g.name}</h2><span>{g.posts.length} bài</span></div>
            <Cards posts={g.posts.slice(0, 3)} />
            {g.posts.length > 3 && <details className="grp-more"><summary>Xem đủ {g.posts.length} bài ›</summary><Cards posts={g.posts.slice(3)} /></details>}
          </section>
        ))}
        {!posts.length && <p className="lead">Chưa có bài trong cụm này.</p>}
        {others.length > 0 && <section className="grp" data-testid="cum-others"><div className="grp-h"><h2>Đọc thêm ở cụm khác</h2></div><div className="chips chips-wrap">{others.map((c) => <a key={c.slug} className="chip" href={`/chu-de/${c.slug}`}>{c.name}</a>)}</div></section>}
      </div>
      <Sticky s={s} ref_={`cat-${t.slug}`} />
      <style dangerouslySetInnerHTML={{ __html: `.tools{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:0 0 40px}.tool{padding:20px;display:flex;gap:14px;align-items:flex-start;transition:box-shadow .15s}.tool:hover{box-shadow:0 12px 28px rgba(15,23,42,.10)}.tool i{width:44px;height:44px;border-radius:12px;background:#E8F0FF;display:flex;align-items:center;justify-content:center;flex-shrink:0}.tool b{display:block;font-size:16.5px;color:#0F172A;margin-bottom:4px}.tool span span{font-size:14px;color:#64748B;line-height:1.5}.grp{margin-bottom:48px;scroll-margin-top:90px}.grp-h{display:flex;align-items:baseline;gap:10px;margin-bottom:18px}.grp-h h2{font-size:24px;font-weight:800}.grp-h span{font-size:14px;color:#64748B}.grp-more{margin-top:14px}.grp-more summary{cursor:pointer;font-weight:700;color:#0062F0;font-size:15px;list-style:none;margin-bottom:16px}.grp-more summary::-webkit-details-marker{display:none}.grp-more[open] summary{display:none}@media(max-width:720px){.catpin{flex-direction:column;margin-bottom:24px!important}.catpin img{width:100%!important;height:200px!important}.catpin>span{padding:20px!important}.catpin b{font-size:22px!important}.catpin-ex{font-size:15px!important}.catw{padding-top:24px!important}.tools{grid-template-columns:1fr;gap:10px;margin-bottom:28px}.tool{padding:16px}.grp{margin-bottom:32px}.grp-h h2{font-size:20px}.grp-h{margin-bottom:6px}}` }} />
    </main>
  );
}
function Cards({ posts }) {
  return <><div className="grid3 only-pc" style={{ gap: 20 }}>{posts.map((p) => <PostCard key={p.id} p={p} />)}</div><div className="only-m">{posts.map((p) => <PostCard key={p.id} p={p} row />)}</div></>;
}
