import Logo from "./Logo";
import Icon from "./Icon";
import MobileMenu from "./MobileMenu";
import { appLink } from "@/lib/site";

const ext = (u) => /^https?:/.test(u || "");
// Thuộc tính link theo Quản trị › Menu: mở tab mới, nofollow, chữ khi rê chuột
const la = (it) => { const rel = [it.new_tab && "noopener", it.nofollow && "nofollow"].filter(Boolean).join(" "); return { ...(it.new_tab ? { target: "_blank" } : {}), ...(rel ? { rel } : {}), ...(it.title ? { title: it.title } : {}) }; };
export default function Nav({ items, s, mobile }) {
  const links = (items || []).filter((x) => x.style !== "button");
  const mlinks = (mobile?.length ? mobile : items || []).filter((x) => x.style !== "button");
  const cta = (items || []).find((x) => x.style === "button") || { label: "Dùng thử miễn phí", url: appLink(s, "header") };
  return (
    <header id="top" style={{ background: "#fff", borderBottom: "1px solid #E6ECF5", position: "sticky", top: 0, zIndex: 40 }}>
      <div className="wrap navbar" style={{ height: 64, display: "flex", alignItems: "center", gap: 30 }}>
        <MobileMenu items={mlinks} />{/* 23/10 chủ dự án: nút menu mobile nằm cạnh logo (bên trái) */}
        <a href="/" aria-label="Fipilot AI — trang chủ"><Logo src={s?.site?.logo_url} name={s?.site?.name} /></a>
        <nav aria-label="Menu chính" className="only-pc" style={{ display: "flex", gap: 26 }}>
          {links.map((it, ix) => (
            <span key={ix + it.url} style={{ position: "relative" }} className="navi">
              <a href={it.url} style={{ fontSize: 15, fontWeight: 600, color: "#334155" }} {...la(it)}>{it.label}{it.children?.length ? " ⌄" : ""}</a>
              {it.children?.length ? <span className="navsub">{it.children.map((c, cx) => <a key={cx + c.url} href={c.url} {...la(c)}>{c.label}</a>)}</span> : null}
            </span>
          ))}
        </nav>
        <span style={{ flex: 1 }} />
        <a href="/tim-kiem" aria-label="Tìm kiếm" className="only-pc" style={{ color: "#334155", display: "inline-flex" }}><Icon name="search" size={20} /></a>
        <a className="btn b1 navcta" href={cta.url} {...(ext(cta.url) ? { rel: "noopener" } : {})} style={{ height: 38 }}><span className="only-pc">{cta.label}</span><span className="only-m">Dùng app</span></a>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `.navsub{display:none;position:absolute;left:-12px;top:100%;padding:8px;min-width:240px;background:#fff;border:1px solid #E6ECF5;border-radius:12px;box-shadow:0 12px 28px rgba(15,23,42,.14)}.navsub a{display:block;padding:9px 12px;border-radius:8px;font-size:14.5px;font-weight:600;color:#334155}.navsub a:hover{background:#E8F1FF;color:#0062F0}.navi:hover .navsub,.navi:focus-within .navsub{display:block}.navi>a:hover{color:#0062F0}@media(max-width:720px){.navbar{height:56px!important;gap:8px!important}.navcta{height:34px!important;padding:0 12px!important;font-size:13px!important}.navbar b{font-size:16px!important}.navbar .logo img{width:28px!important;height:28px!important}.navbar .mm{margin-left:-6px}}` }} />
    </header>
  );
}
