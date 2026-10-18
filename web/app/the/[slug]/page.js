// Thẻ (139e/f) — mặc định không cho Google lập chỉ mục (trang mỏng)
import { notFound } from "next/navigation";
import PageHead from "@/components/PageHead";
import { PostList } from "@/components/PostCard";
import { getTerm, latestPosts, allTerms } from "@/lib/content";

export const revalidate = 60;
export async function generateMetadata({ params }) {
  const t = await getTerm("tag", params.slug);
  if (!t) return {};
  return { title: `Thẻ: ${t.name}`, robots: { index: t.seo?.index === true, follow: true }, alternates: { canonical: `/the/${t.slug}` } };
}
export default async function Tag({ params }) {
  const t = await getTerm("tag", params.slug);
  if (!t) notFound();
  const posts = await latestPosts({ termId: t.id, limit: 30 });
  const others = (await allTerms("tag")).filter((x) => x.id !== t.id).slice(0, 12);
  return (
    <main>
      <PageHead eye="Thẻ" h1={t.name} sub={`${posts.length} bài có gắn thẻ “${t.name}”.`} crumb={[{ name: "Trang chủ", path: "/" }, { name: "Thẻ", path: "/bai-viet" }, { name: t.name, path: `/the/${t.slug}` }]} />
      <div className="wrap" style={{ paddingTop: 40 }}>
        <PostList posts={posts} />
        {others.length > 0 && <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 14 }}><b style={{ fontSize: 18 }}>Thẻ khác</b><div className="chips">{others.map((x) => <a key={x.id} className="chip" href={`/the/${x.slug}`}>{x.name}</a>)}</div></div>}
      </div>
    </main>
  );
}
