// Lỗi 404 (139u/v) — ghi nhật ký đường dẫn lỗi (Quản trị › Cài đặt SEO › Lỗi 404)
import Log404 from "@/components/Log404";
import SecHead from "@/components/SecHead";
import { PostList } from "@/components/PostCard";
import { latestPosts } from "@/lib/content";

export const metadata = { title: "Không tìm thấy trang", robots: { index: false } };
export default async function NotFound() {
  const posts = await latestPosts({ limit: 3 });
  return (
    <main>
      <Log404 />
      <div className="wrap" style={{ paddingTop: 96, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 18 }}>
        <b style={{ fontSize: 96, fontWeight: 900, color: "#0062F0", lineHeight: 1 }}>404</b>
        <h1 className="h1">Tô phở này hết mất rồi</h1>
        <p className="lead" style={{ maxWidth: 560 }}>Trang bạn tìm không còn hoặc đã đổi địa chỉ. Thử tìm món hay bài khác nhé.</p>
        <form action="/tim-kiem" role="search" style={{ display: "flex", gap: 8, width: "100%", maxWidth: 520 }}><input name="q" className="inp" placeholder="Tìm món hoặc bài viết…" aria-label="Tìm" /><button className="btn b1" style={{ height: 52, width: 52, padding: 0 }} aria-label="Tìm">⌕</button></form>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}><a className="btn b2" href="/">Về trang chủ</a><a className="btn b2" href="/bang-calo">Bảng calo món</a></div>
      </div>
      {posts.length > 0 && <section className="wrap sec"><SecHead eye="Gợi ý" title="Có thể bạn đang tìm" /><PostList posts={posts} /></section>}
    </main>
  );
}
