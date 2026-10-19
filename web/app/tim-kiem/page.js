// Tìm kiếm (139s/t) — không cho Google lập chỉ mục
import { PostList } from "@/components/PostCard";
import { searchPosts } from "@/lib/content";
import { caloFoods } from "@/lib/calo";
import { mainPortion, porName } from "@/lib/foods";
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
      <section className="phead sh">
        <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h1 className="sh-h1" style={{ fontSize: 36, fontWeight: 900 }}>{qs ? `Kết quả cho “${qs}”` : "Tìm món ăn, bài viết"}</h1>
          <form action="/tim-kiem" role="search" style={{ display: "flex", gap: 8, maxWidth: 640 }}><span style={{ position: "relative", flex: 1, display: "flex" }}><input name="q" defaultValue={qs} className="inp" style={{ height: 56, fontSize: 17, fontWeight: 600, padding: qs ? "0 40px 0 12px" : "0 12px" }} placeholder="Ví dụ: phở, cơm tấm, giảm cân…" aria-label="Từ khoá" autoFocus={!qs} data-testid="search-input" />{qs && <a href="/tim-kiem" aria-label="Xoá từ khoá" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#64748B", fontWeight: 500 }}>✕</a>}</span><button className="btn b1" style={{ height: 56, width: 56, padding: 0, borderRadius: 14 }} aria-label="Tìm"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg></button></form>
          {qs && <span style={{ fontSize: 15, color: "#64748B" }}>{foods.length} món · {posts.length} bài viết</span>}
        </div>
      </section>
      {qs && (
        <div className="wrap sw" style={{ paddingTop: 48, display: "flex", flexDirection: "column", gap: 16 }}>
          <style dangerouslySetInnerHTML={{ __html: `.sh{padding:48px 0 40px!important}@media(max-width:720px){.sh{padding:28px 0!important}.sh-h1{font-size:28px!important}.sw{padding-top:28px!important}.sw-h2{font-size:22px!important}.sw-h2b{margin-top:24px!important}.sw-g{grid-template-columns:1fr!important}}` }} />
          {foods.length > 0 && <><h2 className="sw-h2" style={{ fontSize: 26, fontWeight: 800 }}>Món ăn</h2><div className="grid2 sw-g" style={{ gap: 12 }}>{foods.map((f, i) => { const p = mainPortion(f); return <a key={f.key} href={`/calo/${f.slug}`} className="card" style={{ padding: "16px 18px", display: "flex", gap: 14, alignItems: "center" }}><img className="th" src={f.page?.image_url || ["/img/bowl-1.jpg", "/img/bowl-2.jpg", "/img/bowl-3.jpg"][i % 3]} alt="" width={56} height={56} loading="lazy" style={{ width: 56, height: 56 }} /><span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}><b style={{ fontSize: 17 }}>{f.name}</b><span style={{ fontSize: 14, color: "#64748B" }}>{p ? `${porName(p, true)} ${p.gram} g · ` : ""}{f.per100.cal} kcal/100 g</span></span><b style={{ fontSize: 20, color: "#0062F0" }}>{p ? p.cal : f.per100.cal} kcal</b></a>; })}</div></>}
          <h2 className={`sw-h2${foods.length ? " sw-h2b" : ""}`} style={{ fontSize: 26, fontWeight: 800, marginTop: foods.length ? 32 : 0 }}>Bài viết</h2>
          <PostList posts={posts} variant="list" mCard={false} />
        </div>
      )}
    </main>
  );
}
