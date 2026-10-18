import Logo from "./Logo";
import Icon from "./Icon";
import { appLink } from "@/lib/site";

const ext = (u) => /^https?:/.test(u || "");
export default function Nav({ items, s }) {
  const links = (items || []).filter((x) => x.style !== "button");
  const cta = (items || []).find((x) => x.style === "button") || { label: "Dùng thử miễn phí", url: appLink(s, "header") };
  return (
    <header id="top" style={{ background: "#fff", borderBottom: "1px solid #E6ECF5", position: "sticky", top: 0, zIndex: 40 }}>
      <div className="wrap navbar" style={{ height: 64, display: "flex", alignItems: "center", gap: 30 }}>
        <a href="/" aria-label="Fipilot AI — trang chủ"><Logo /></a>
        <nav aria-label="Menu chính" className="only-pc" style={{ display: "flex", gap: 26 }}>
          {links.map((it) => (
            <span key={it.url} style={{ position: "relative" }} className="navi">
              <a href={it.url} style={{ fontSize: 15, fontWeight: 600, color: "#334155" }} {...(it.new_tab ? { target: "_blank", rel: "noopener" } : {})}>{it.label}{it.children?.length ? " ⌄" : ""}</a>
              {it.children?.length ? <span className="navsub">{it.children.map((c) => <a key={c.url} href={c.url}>{c.label}</a>)}</span> : null}
            </span>
          ))}
        </nav>
        <span style={{ flex: 1 }} />
        <a href="/tim-kiem" aria-label="Tìm kiếm" className="only-pc" style={{ color: "#334155", display: "inline-flex" }}><Icon name="search" size={20} /></a>
        <a className="btn b1 navcta" href={cta.url} {...(ext(cta.url) ? { rel: "noopener" } : {})} style={{ height: 38 }}><span className="only-pc">{cta.label}</span><span className="only-m">Dùng app</span></a>
        <details className="only-m mnav" style={{ display: "none" }}>
          <summary aria-label="Mở menu" style={{ listStyle: "none", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="hamb" size={24} /></summary>
          <div style={{ position: "absolute", left: 0, right: 0, top: 64, background: "#fff", borderBottom: "1px solid #E6ECF5", boxShadow: "0 12px 24px rgba(15,23,42,.08)", padding: "8px 16px 16px" }}>
            {links.map((it) => (
              <div key={it.url}>
                <a href={it.url} style={{ display: "block", padding: "14px 4px", fontSize: 17, fontWeight: 700, borderBottom: "1px solid #EEF2F7" }}>{it.label}</a>
                {(it.children || []).map((c) => <a key={c.url} href={c.url} style={{ display: "block", padding: "12px 4px 12px 20px", fontSize: 15.5, color: "#475569", borderBottom: "1px solid #EEF2F7" }}>{c.label}</a>)}
              </div>
            ))}
            <a href="/tim-kiem" style={{ display: "flex", gap: 10, alignItems: "center", padding: "14px 4px", fontSize: 16, fontWeight: 600, color: "#475569" }}><Icon name="search" size={18} />Tìm món, bài viết</a>
          </div>
        </details>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `.navsub{display:none;position:absolute;left:-12px;top:100%;padding:8px;min-width:240px;background:#fff;border:1px solid #E6ECF5;border-radius:12px;box-shadow:0 12px 28px rgba(15,23,42,.14)}.navsub a{display:block;padding:9px 12px;border-radius:8px;font-size:14.5px;font-weight:600;color:#334155}.navsub a:hover{background:#E8F1FF;color:#0062F0}.navi:hover .navsub,.navi:focus-within .navsub{display:block}.navi>a:hover{color:#0062F0}@media(max-width:720px){.navbar{height:56px!important;gap:8px!important}.navcta{height:34px!important;padding:0 12px!important;font-size:13px!important}.navbar b{font-size:16px!important}.mnav{display:block!important}.mnav summary{width:36px!important;height:36px!important}.mnav>div{top:56px!important}.mnav[open] summary{color:#0062F0}}` }} />
    </header>
  );
}
