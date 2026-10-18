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
      <div className="wrap nf" style={{ paddingTop: 96, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 18 }}>
        <div className="nf-art" style={{ position: "relative", width: 240, height: 240 }}><img src="/img/bowl-pho.jpg" alt="" width={240} height={240} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", filter: "grayscale(.3)" }} /><b className="nf-n" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 72, fontWeight: 900, color: "#fff", textShadow: "0 4px 18px rgba(0,0,0,.4)" }}>404</b></div>
        <h1 className="nf-h1" style={{ fontSize: 44, fontWeight: 900 }}>Tô phở này hết mất rồi</h1>
        <p className="nf-p" style={{ fontSize: 18, color: "#475569", maxWidth: 560, lineHeight: 1.6 }}>Trang bạn tìm không còn hoặc đã đổi địa chỉ. Thử tìm món hay bài khác nhé.</p>
        <form action="/tim-kiem" role="search" style={{ display: "flex", gap: 8, width: "100%", maxWidth: 520 }}><input name="q" className="inp" style={{ height: 54, fontWeight: 500 }} placeholder="Tìm món hoặc bài viết…" aria-label="Tìm" data-testid="nf-search" /><button className="btn b1" style={{ height: 54, width: 54, padding: 0, borderRadius: 14, border: 0, flexShrink: 0, cursor: "pointer" }} aria-label="Tìm"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg></button></form>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}><a className="btn b2" href="/" style={{ height: 46 }}>Về trang chủ</a><a className="btn b2" href="/bang-calo" style={{ height: 46 }}>Bảng calo món</a></div>
      </div>
      {posts.length > 0 && <section className="wrap sec"><SecHead eye="Gợi ý" title="Có thể bạn đang tìm" /><PostList posts={posts} variant="list" mCard={false} /></section>}
      <style>{`@media(max-width:720px){.nf{padding-top:48px!important}.nf-art{width:180px!important;height:180px!important}.nf-n{font-size:56px!important}.nf-h1{font-size:30px!important}.nf-p{font-size:16px!important}}`}</style>
    </main>
  );
}
