// Chân trang — chép đúng bản vẽ 137 (footer v3, rr/web137b.py › footer). Chỉ thay chữ mẫu bằng dữ liệu thật:
// cột link = Menu chân trang (Quản trị › Menu), món phổ biến + kcal = kho món app, liên hệ = Cài đặt web.
import Logo from "./Logo";
import Icon from "./Icon";
import { appLink } from "@/lib/site";
import { getFood, mainPortion, porName } from "@/lib/foods";

const COLS = [["footer_1", "Chủ đề", "grid", "#38BDF8"], ["footer_2", "Fipilot AI", "star", "#FBBF24"], ["footer_3", "Chính sách", "shield", "#4ADE80"]];
const head = { display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 800, letterSpacing: ".1em", color: "rgba(255,255,255,.55)" };
const sq = (bg, col) => ({ width: 24, height: 24, borderRadius: 7, background: bg, color: col, display: "inline-flex", alignItems: "center", justifyContent: "center" });

export default async function Footer({ s, menus }) {
  const f = s.footer || {};
  const c = s.contact || {};
  const foods = [];
  for (const k of f.popular_foods || []) { const fd = await getFood(k); if (fd) foods.push({ fd, por: mainPortion(fd) }); }
  const year = new Date().getFullYear();
  const zalo = c.zalo || (c.phone ? `https://zalo.me/${c.phone.replace(/\s/g, "")}` : "");
  const social = [["Facebook", "f", "#1877F2", c.facebook], ["Zalo", "Z", "#0068FF", zalo]].filter((x) => x[3]);
  return (
    <div className="fwrap" style={{ position: "relative", marginTop: 56 }}>
      {f.show_app_card !== false && (
        <div className="wrap fcardwrap" style={{ position: "relative", zIndex: 2, marginBottom: -110 }}>
          <div className="fcard" style={{ position: "relative", zIndex: 2, borderRadius: 24, overflow: "hidden", background: "#FFFFFF", boxShadow: "0 24px 60px rgba(10,26,58,.22)", display: "flex", alignItems: "stretch" }}>
            <div className="fcard-l" style={{ flex: 1, padding: "30px 32px", display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
              <span className="pill" style={{ alignSelf: "flex-start" }}>Miễn phí 7 ngày · không cần thẻ</span>
              <b className="fcard-t" style={{ fontSize: 28, lineHeight: 1.2, color: "#0F172A" }}>Tối nay ăn gì để vẫn giảm cân?<br /><span style={{ color: "#0062F0" }}>Để app lo.</span></b>
              <span style={{ fontSize: 14, color: "#475569", lineHeight: 1.55 }}>Nhập cân nặng 30 giây — app lên sẵn thực đơn món Việt đúng calo cho cả tuần.</span>
              <div className="fbtns" style={{ display: "flex", gap: 10, marginTop: 6 }}><a className="btn b1" href={appLink(s, "footer")} style={{ height: 46 }}>Dùng thử miễn phí</a><a className="btn b2" href="/bang-calo" style={{ height: 46 }}>Tra calo món ăn</a></div>
            </div>
            <div className="fart" style={{ position: "relative", width: 380, flexShrink: 0, background: "radial-gradient(circle at 70% 40%,#D6E6FF,#EEF4FF 60%,#F5F9FF)", overflow: "hidden" }}>
              <span aria-hidden="true" style={{ position: "absolute", right: -40, bottom: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(26,124,255,.12)" }} />
              <img src="/img/bowl-pho.jpg" alt="" className="th fbowl" style={{ position: "absolute", left: 26, bottom: 26, width: 130, height: 130, border: "5px solid #fff" }} />
              <img src="/img/bowl-2.jpg" alt="" className="th fbowl2" style={{ position: "absolute", left: 120, top: 26, width: 62, height: 62, border: "4px solid #fff" }} />
              <div className="fphone" style={{ position: "absolute", right: 36, top: 24, width: 128, transform: "rotate(6deg)", borderRadius: 30, background: "#0F172A", padding: 7, boxShadow: "0 24px 48px rgba(15,23,42,.22)" }}>
                <img src="/img/app-today.webp" alt="Màn Hôm nay của app Fipilot AI" style={{ display: "block", width: "100%", borderRadius: 24 }} />
              </div>
            </div>
          </div>
        </div>
      )}
      <footer className="foot" style={{ position: "relative", overflow: "hidden", background: "radial-gradient(circle at 15% 20%,rgba(26,124,255,.30),transparent 38%),radial-gradient(circle at 90% 85%,rgba(22,163,74,.18),transparent 34%),linear-gradient(180deg,#0B1F45,#081631)", color: "#fff", padding: f.show_app_card !== false ? "150px 0 0 0" : "48px 0 0 0" }}>
        <span aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,.07) 1px,transparent 1px)", backgroundSize: "24px 24px", pointerEvents: "none" }} />
        {foods.length > 0 && f.show_calo !== false && (
          <div className="wrap" style={{ position: "relative", display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={head}><span style={sq("#F9731622", "#FB923C")}><Icon name="bowl" size={13} stroke={2.4} /></span>CALO MÓN PHỔ BIẾN</span>
            <div className="fchips" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {foods.map(({ fd, por }) => (
                <a key={fd.key} href={`/calo/${fd.slug}`} className="fchip">
                  <span className="fc-ic"><Icon name="bowl" size={13} /></span>
                  <b className="fc-n">{fd.name}</b>
                  {por && <span className="fc-d"><span className="fc-u">{porName(por)}</span><b className="fc-k">{por.cal} kcal</b></span>}
                </a>
              ))}
              <a href="/bang-calo" className="fchip-all">Xem cả bảng calo →</a>
            </div>
          </div>
        )}
        <div className="wrap fcols" style={{ position: "relative", marginTop: 34, paddingTop: 30, borderTop: "1px solid rgba(255,255,255,.1)", display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: 32 }}>
          <div className="fbrand" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}><Logo label={false} src={s.site.logo_url} /><b style={{ fontSize: 18 }}>{s.site.name}</b></span>
            <span style={{ fontSize: 13.5, color: "rgba(255,255,255,.72)", lineHeight: 1.65, maxWidth: 320 }}>{f.about}</span>
            <span style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "rgba(255,255,255,.8)" }}>
              {c.email && <a href={`mailto:${c.email}`} style={{ display: "flex", gap: 10, alignItems: "center" }}><span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,.08)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#7CC2FF" }}><Icon name="mail" size={15} /></span>{c.email}</a>}
              {c.phone && <a href={`tel:${c.phone.replace(/\s/g, "")}`} style={{ display: "flex", gap: 10, alignItems: "center" }}><span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,.08)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#7CC2FF" }}><Icon name="call" size={15} /></span>{c.phone}{c.zalo_phone && c.zalo_phone !== c.phone ? "" : " · Zalo"}</a>}{c.zalo_phone && c.zalo_phone !== c.phone && <a href={zalo} target="_blank" rel="noopener" style={{ display: "flex", gap: 10, alignItems: "center" }}><span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,.08)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#7CC2FF" }}><Icon name="chat" size={15} /></span>Zalo {c.zalo_phone}</a>}
            </span>
            {social.length > 0 && <div style={{ display: "flex", gap: 8 }}>{social.map(([n, t, col, u]) => (
              <a key={n} href={u} aria-label={n} rel="noopener" target="_blank" style={{ height: 36, padding: "0 12px", borderRadius: 12, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.14)", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, color: "#fff" }}><span style={{ width: 20, height: 20, borderRadius: 6, background: col, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900 }}>{t}</span>{n}</a>
            ))}</div>}
          </div>
          {COLS.map(([loc, h, ic, col]) => (
            <nav key={loc} aria-label={h} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={head}><span style={sq(`${col}22`, col)}><Icon name={ic} size={13} stroke={2.4} /></span>{h.toUpperCase()}</span>
              {(menus[loc] || []).map((it) => <a key={it.url} href={it.url} className="flink" {...(it.new_tab ? { target: "_blank" } : {})} {...([it.new_tab && "noopener", it.nofollow && "nofollow"].filter(Boolean).length ? { rel: [it.new_tab && "noopener", it.nofollow && "nofollow"].filter(Boolean).join(" ") } : {})} {...(it.title ? { title: it.title } : {})} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, color: "rgba(255,255,255,.82)", fontWeight: 500 }}><span style={{ color: col, opacity: 0.85, display: "inline-flex" }}><Icon name={it.icon || "doc"} size={15} /></span>{it.label}</a>)}
            </nav>
          ))}
        </div>
        <div aria-hidden="true" className="watermark" style={{ position: "relative", marginTop: 10, textAlign: "center", fontSize: 168, fontWeight: 900, lineHeight: 1, background: "linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,0))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", whiteSpace: "nowrap", userSelect: "none" }}>Fipilot AI</div>
        <div style={{ position: "relative", background: "rgba(0,0,0,.18)" }}>
          <div className="wrap fbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, fontSize: 12, color: "rgba(255,255,255,.55)" }}>
            <span>{(f.copyright || "© %year% Fipilot AI").replace(/%(year|nam)%/g, year)} · fipilotai.com</span><span>{f.note}</span>
            <a href="#top" className="only-pc" style={{ height: 32, padding: "0 12px", borderRadius: 10, background: "rgba(255,255,255,.08)", display: "inline-flex", alignItems: "center", gap: 6, color: "#fff", fontWeight: 700 }}>↑ Lên đầu trang</a>
          </div>
        </div>
      </footer>
      <style dangerouslySetInnerHTML={{ __html: `
.fchip{display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 12px 0 6px;border-radius:17px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);font-size:12.5px;color:#E2E8F0;white-space:nowrap;transition:background .12s}
.fchip:hover{background:rgba(255,255,255,.12)}
.fc-ic{width:24px;height:24px;border-radius:12px;background:rgba(26,124,255,.25);display:inline-flex;align-items:center;justify-content:center;color:#7CC2FF}
.fc-n{font-weight:700;color:#fff}.fc-d{display:inline-flex;align-items:center;gap:8px}.fc-u{color:rgba(255,255,255,.55)}.fc-k{color:#7CC2FF}
.fchip-all{display:inline-flex;align-items:center;height:34px;padding:0 12px;font-size:12.5px;font-weight:700;color:#7CC2FF}
.flink:hover{color:#fff!important}
@media(max-width:720px){
 .fwrap{margin-top:36px!important}.fcardwrap{margin-bottom:-90px!important}.fcard{flex-direction:column!important}
 .fcard-l{padding:22px 20px!important}.fcard-t{font-size:22px!important}.fbtns{flex-direction:column}
 .fart{width:auto!important;height:190px}.fbowl{left:8%!important;bottom:14px!important;width:110px!important;height:110px!important}.fbowl2{left:36%!important;top:16px!important}.fphone{right:8%!important;top:18px!important;width:108px!important}
 .foot{padding-top:120px!important}
 .fchips{display:grid!important;grid-template-columns:1fr 1fr}
 .fchip{flex-direction:column;align-items:flex-start;gap:2px;height:auto;padding:9px 11px;border-radius:12px}
 .fc-ic{display:none}.fc-n{font-size:13px;display:flex;align-items:center;gap:6px}.fc-n::before{content:"";width:13px;height:13px;background:#FB923C;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M3 11h18a9 9 0 01-18 0z'/%3E%3Cpath d='M8 7c0-2 2-2 2-4M13 7c0-2 2-2 2-4'/%3E%3C/svg%3E") center/contain no-repeat}
 .fc-d{font-size:11.5px;gap:0}.fc-u::after{content:" · "}
 .fchip-all{justify-content:center;border-radius:12px;border:1px dashed rgba(124,194,255,.4);height:48px}
 .fcols{margin-top:26px!important;padding-top:24px!important;grid-template-columns:1fr 1fr!important;gap:24px!important}.fbrand{grid-column:1/-1}
 .watermark{margin-top:18px!important;font-size:64px!important}
 .fbar{flex-direction:column;align-items:flex-start!important;gap:6px;height:auto!important;padding:14px 16px!important}
}` }} />
    </div>
  );
}
