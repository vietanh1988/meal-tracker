// Khối "bài viết" dạng thẻ (máy tính: 3 thẻ ảnh 130 · điện thoại: hàng ảnh 72) — dùng chung cuối bài viết và trang bài tập (06/11, bản vẽ "Cụm chủ đề")
import { imgAttrs } from "@/lib/img";
import { catOf } from "@/lib/content";

export default function RelPosts({ posts = [], title, more = null, label = null, testid = "rel" }) {
  if (!posts.length) return null;
  return (
    <section className="rel" data-testid={testid} style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 40, paddingTop: 32, borderTop: "1px solid #EEF2F7" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h2 className="rel-h" style={{ fontSize: 24, fontWeight: 800 }}>{title}</h2>
        {more && <a href={more.url} style={{ fontWeight: 700, color: "#0062F0", fontSize: 15 }}>{more.label} ›</a>}
      </div>
      <div className="grid3 only-pc" style={{ gap: 12 }}>{posts.map((x) => (
        <a key={x.id} href={`/${x.slug}`} className="card pcard" style={{ overflow: "hidden" }}>
          {x.cover_url ? <img {...imgAttrs(x.cover_url, "(max-width: 720px) 50vw, 240px")} alt={x.cover_alt || ""} loading="lazy" decoding="async" style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} /> : <span style={{ display: "block", height: 130, background: "linear-gradient(135deg,#E8F0FF,#F5F9FF)" }} />}
          <span style={{ display: "block", padding: "14px 16px", fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}>{x.title}</span>
        </a>))}</div>
      <div className="only-m">{posts.map((x) => { const c = label || catOf(x)?.name || "Bài viết"; return (
        <a key={x.id} href={`/${x.slug}`} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderTop: "1px solid #EEF2F7" }}>
          {x.cover_url ? <img {...imgAttrs(x.cover_url, "72px")} alt={x.cover_alt || ""} loading="lazy" decoding="async" style={{ width: 72, height: 72, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} /> : <span style={{ width: 72, height: 72, borderRadius: 12, background: "#E8F0FF", flexShrink: 0 }} />}
          <span style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontSize: 12, fontWeight: 800, color: "#0062F0", letterSpacing: ".04em" }}>{c.toUpperCase()}</span><b style={{ fontSize: 15.5, lineHeight: 1.4 }}>{x.title}</b></span>
        </a>); })}</div>
    </section>
  );
}
