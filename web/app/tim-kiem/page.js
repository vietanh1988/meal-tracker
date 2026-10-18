// Tìm kiếm (139s/t) — không cho Google lập chỉ mục
import { PostList } from "@/components/PostCard";
import { searchPosts } from "@/lib/content";
import { caloFoods } from "@/lib/calo";
import { mainPortion } from "@/lib/foods";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tìm kiếm", robots: { index: false, follow: true } };

export default async function Search({ searchParams }) {
  const qs = String(searchParams?.q || "").trim().slice(0, 80);
  const key = slugify(qs);
  const foods = key ? (await caloFoods()).filter((f) => f.slug.includes(key)).slice(0, 8) : [];
  const posts = qs ? await searchPosts(qs) : [];
  return (
    <main>
      <section className="phead">
        <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h1 className="h1" style={{ fontSize: 36 }}>{qs ? `Kết quả cho “${qs}”` : "Tìm món ăn, bài viết"}</h1>
          <form action="/tim-kiem" role="search" style={{ display: "flex", gap: 8, maxWidth: 640 }}><input name="q" defaultValue={qs} className="inp" style={{ height: 56, fontSize: 17 }} placeholder="Ví dụ: phở, cơm tấm, giảm cân…" aria-label="Từ khoá" autoFocus={!qs} /><button className="btn b1" style={{ height: 56, width: 56, padding: 0, borderRadius: 14 }} aria-label="Tìm"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg></button></form>
          {qs && <span style={{ fontSize: 15, color: "#64748B" }}>{foods.length} món · {posts.length} bài viết</span>}
        </div>
      </section>
      {qs && (
        <div className="wrap" style={{ paddingTop: 48, display: "flex", flexDirection: "column", gap: 16 }}>
          {foods.length > 0 && <><h2 style={{ fontSize: 26, fontWeight: 800 }}>Món ăn</h2><div className="grid2" style={{ gap: 12 }}>{foods.map((f) => { const p = mainPortion(f); return <a key={f.key} href={`/calo/${f.slug}`} className="card" style={{ padding: "16px 18px", display: "flex", gap: 14, alignItems: "center" }}><span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}><b style={{ fontSize: 17 }}>{f.name}</b><span style={{ fontSize: 14, color: "#64748B" }}>{p ? `${p.name} ${p.gram} g · ` : ""}{f.per100.cal} kcal/100 g</span></span><b style={{ fontSize: 20, color: "#0062F0" }}>{p ? p.cal : f.per100.cal} kcal</b></a>; })}</div></>}
          <h2 style={{ fontSize: 26, fontWeight: 800, marginTop: foods.length ? 32 : 0 }}>Bài viết</h2>
          <PostList posts={posts} />
        </div>
      )}
    </main>
  );
}
