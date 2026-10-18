import { catOf, fmtDate, readMin } from "@/lib/content";
export default function PostCard({ p, big = false, row = false }) {
  const c = catOf(p);
  const meta = `${c ? c.name + " · " : ""}${readMin(p.word_count)} phút đọc`;
  if (row) return (
    <a href={`/${p.slug}`} style={{ display: "flex", gap: 14, alignItems: "center", padding: "14px 0", borderTop: "1px solid #EEF2F7" }}>
      {p.cover_url ? <img src={p.cover_url} alt={p.cover_alt || ""} width={92} height={92} loading="lazy" style={{ width: 92, height: 92, borderRadius: 14, objectFit: "cover", flexShrink: 0 }} /> : <span style={{ width: 92, height: 92, borderRadius: 14, background: "#E8F0FF", flexShrink: 0 }} />}
      <span style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}><span style={{ fontSize: 12, fontWeight: 800, color: "#0062F0", letterSpacing: ".04em" }}>{(c?.name || "Bài viết").toUpperCase()}</span><b style={{ fontSize: 16, lineHeight: 1.4 }}>{p.title}</b><span style={{ fontSize: 13, color: "#94A3B8" }}>{fmtDate(p.published_at)} · {readMin(p.word_count)} phút đọc</span></span>
    </a>
  );
  return (
    <a href={`/${p.slug}`} className="card pcard" style={{ overflow: "hidden", display: "flex", flexDirection: "column", gridColumn: big ? "span 2" : undefined }}>
      {p.cover_url ? <img src={p.cover_url} alt={p.cover_alt || ""} loading="lazy" style={{ width: "100%", height: big ? 300 : 190, objectFit: "cover", display: "block" }} /> : <span style={{ height: big ? 300 : 190, background: "linear-gradient(135deg,#E8F0FF,#F5F9FF)" }} />}
      <span style={{ padding: "20px 22px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ fontSize: 13, color: "#0062F0", fontWeight: 700 }}>{meta}</span>
        <b style={{ fontSize: big ? 24 : 18, lineHeight: 1.35 }}>{p.title}</b>
        <span style={{ fontSize: 13.5, color: "#94A3B8" }}>{fmtDate(p.published_at)}</span>
      </span>
      <style>{`.pcard:hover{box-shadow:0 12px 28px rgba(15,23,42,.10)}@media(max-width:720px){.pcard{grid-column:auto!important}}`}</style>
    </a>
  );
}
export function PostList({ posts, firstBig = false }) {
  if (!posts.length) return <p className="lead" style={{ padding: "32px 0" }}>Chưa có bài viết nào.</p>;
  return (
    <>
      <div className="grid3 only-pc">{posts.map((p, i) => <PostCard key={p.id} p={p} big={firstBig && i === 0} />)}</div>
      <div className="only-m">{posts.map((p) => <PostCard key={p.id} p={p} row />)}</div>
    </>
  );
}
export function Pager({ page, total, per, base }) {
  const pages = Math.ceil(total / per);
  if (pages <= 1) return null;
  const href = (n) => (n === 1 ? base : `${base}${base.includes("?") ? "&" : "?"}trang=${n}`);
  const btn = (n, label, on) => <a key={label} href={href(n)} aria-current={on ? "page" : undefined} style={{ minWidth: 44, height: 44, padding: "0 14px", borderRadius: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, ...(on ? { background: "#0062F0", color: "#fff" } : { background: "#fff", border: "1px solid #E6ECF5", color: "#334155" }) }}>{label}</a>;
  const list = [];
  if (page > 1) list.push(btn(page - 1, "← Trước"));
  for (let n = Math.max(1, page - 2); n <= Math.min(pages, page + 2); n++) list.push(btn(n, String(n), n === page));
  if (page < pages) list.push(btn(page + 1, "Sau →"));
  return <nav aria-label="Phân trang" style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 48, flexWrap: "wrap" }}>{list}</nav>;
}
