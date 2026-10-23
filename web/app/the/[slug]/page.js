import { alt, getSettings, withOg } from "@/lib/site";
import Sticky from "@/components/Sticky";
// Thẻ (139e/f) — mặc định không cho Google lập chỉ mục (trang mỏng)
import { notFound } from "next/navigation";
import PageHead from "@/components/PageHead";
import { PostList } from "@/components/PostCard";
import { getTerm, latestPosts, allTerms } from "@/lib/content";

export const revalidate = 60;
export async function generateMetadata({ params }) {
  const t = await getTerm("tag", params.slug);
  if (!t) return {};
  // 23/10: thẻ có SEO title / mô tả riêng (Quản trị › Chuyên mục & thẻ) thì dùng, không thì "Thẻ: tên"
  return withOg({ title: t.seo?.title || `Thẻ: ${t.name}`, description: t.seo?.desc || t.description?.slice(0, 158) || undefined, robots: { index: t.seo?.index === true, follow: true }, alternates: alt(`/the/${t.slug}`) }, typeof s !== "undefined" ? s : undefined);
}
export default async function Tag({ params }) {
  const t = await getTerm("tag", params.slug);
  if (!t) notFound();
  const s = await getSettings();
  const posts = await latestPosts({ termId: t.id, limit: 30 });
  const others = (await allTerms("tag")).filter((x) => x.id !== t.id).slice(0, 12);
  return (
    <main>
      <PageHead eye="Thẻ" h1={t.name} sub={`${posts.length} bài có gắn thẻ “${t.name}”.`} crumb={[{ name: "Trang chủ", path: "/" }, { name: "Bài viết", path: "/bai-viet" }, { name: t.name, path: `/the/${t.slug}` }]} />
      <div className="wrap tagw" style={{ paddingTop: 40 }}>
        <style dangerouslySetInnerHTML={{ __html: `@media(max-width:720px){.tagw{padding-top:24px!important}.tag-more{margin-top:32px!important}}` }} />
        <PostList posts={posts} variant="list" mCard={false} />
        {others.length > 0 && <div className="tag-more" style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 14 }}><b style={{ fontSize: 18 }}>Thẻ khác</b><div className="chips">{others.map((x) => <a key={x.id} className="chip" href={`/the/${x.slug}`}>{x.name}</a>)}</div></div>}
      </div>
      <Sticky s={s} ref_={`tag-${t.slug}`} />
    </main>
  );
}
