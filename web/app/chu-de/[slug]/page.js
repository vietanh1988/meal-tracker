// Chuyên mục (139c/d)
import { notFound } from "next/navigation";
import PageHead from "@/components/PageHead";
import JsonLd from "@/components/JsonLd";
import Sticky from "@/components/Sticky";
import PostCard, { PostList, Pager } from "@/components/PostCard";
import { getSettings, alt, withOg } from "@/lib/site";
import { fmtDate, readMin } from "@/lib/content";
import { getTerm, allTerms, latestPosts, countPosts, catIndexable } from "@/lib/content";
import { breadcrumb, ld, schemaOn } from "@/lib/schema";

export const revalidate = 60;
export async function generateMetadata({ params, searchParams }) {
  const t = await getTerm("category", params.slug);
  if (!t) return {};
  const page = Math.max(1, +searchParams?.trang || 1);
  const n = await countPosts(t.id);
  return withOg({ title: t.seo?.title || t.name, description: t.seo?.desc || t.description?.slice(0, 158), alternates: alt(`/chu-de/${t.slug}${page > 1 ? `?trang=${page}` : ""}`), robots: { index: catIndexable(t, n), follow: true } }, typeof s !== "undefined" ? s : undefined);
}

export default async function Cat({ params, searchParams }) {
  const t = await getTerm("category", params.slug);
  if (!t) notFound();
  const s = await getSettings();
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
