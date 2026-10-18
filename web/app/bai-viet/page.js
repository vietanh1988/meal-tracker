// Blog (139a/b)
import PageHead from "@/components/PageHead";
import Sticky from "@/components/Sticky";
import { PostList, Pager } from "@/components/PostCard";
import { getSettings, alt } from "@/lib/site";
import { latestPosts, countPosts, allTerms } from "@/lib/content";

export const revalidate = 60;
export async function generateMetadata({ searchParams }) {
  const page = Math.max(1, +searchParams?.trang || 1);
  return { title: "Bài viết về giảm cân bằng món Việt", description: "Calo từng món, thực đơn mẫu và kiến thức ăn uống — viết dễ hiểu, áp dụng được ngay.", alternates: alt(page > 1 ? `/bai-viet?trang=${page}` : "/bai-viet") };
}
export default async function Blog({ searchParams }) {
  const s = await getSettings();
  const per = s.site.posts_per_page || 12;
  const page = Math.max(1, +searchParams?.trang || 1);
  const [posts, total, cats] = await Promise.all([latestPosts({ limit: per, offset: (page - 1) * per }), countPosts(), allTerms("category")]);
  return (
    <main>
      <PageHead eye="Blog Fipilot AI" h1="Bài viết về giảm cân bằng món Việt" sub="Calo từng món, thực đơn mẫu và kiến thức ăn uống — viết dễ hiểu, áp dụng được ngay." crumb={[{ name: "Trang chủ", path: "/" }, { name: "Bài viết", path: "/bai-viet" }]} />
      <div className="wrap blogw" style={{ paddingTop: 40 }}>
        <style>{`@media(max-width:720px){.blogw{padding-top:28px!important}.blogw>.chips{margin-bottom:20px!important}}`}</style>
        <div className="chips" style={{ marginBottom: 32 }}><span className="chip on">Tất cả</span>{[...cats.filter((c) => !c.parent_id), ...cats.filter((c) => c.parent_id)].map((c) => <a key={c.id} className="chip" href={`/chu-de/${c.slug}`}>{c.name}</a>)}</div>
        <PostList posts={posts} firstBig={page === 1} variant="list" />
        <Pager page={page} total={total} per={per} base="/bai-viet" />
      </div>
      <Sticky s={s} ref_="blog" />
    </main>
  );
}
