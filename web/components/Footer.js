import Logo from "./Logo";
import Icon from "./Icon";
import { appLink } from "@/lib/site";
import { getFood, mainPortion } from "@/lib/foods";

const COLS = [["footer_1", "Chủ đề", "grid", "#38BDF8"], ["footer_2", "Fipilot AI", "star", "#FBBF24"], ["footer_3", "Chính sách", "shield", "#4ADE80"]];

export default async function Footer({ s, menus }) {
  const f = s.footer || {};
  const foods = [];
  for (const k of f.popular_foods || []) { const fd = await getFood(k); if (fd) foods.push({ fd, por: mainPortion(fd) }); }
  const c = s.contact || {};
  const year = new Date().getFullYear();
  return (
    <div style={{ position: "relative", marginTop: 80 }}>
      {f.show_app_card !== false && (
        <div className="wrap" style={{ position: "relative", zIndex: 2, marginBottom: -110 }}>
          <div className="fcard" style={{ borderRadius: 24, overflow: "hidden", background: "#fff", boxShadow: "0 24px 60px rgba(10,26,58,.22)", display: "flex" }}>
            <div style={{ flex: 1, padding: "30px 32px", display: "flex", flexDirection: "column", gap: 12, justifyContent: "center" }}>
              <span className="pill" style={{ alignSelf: "flex-start" }}>Miễn phí 7 ngày · không cần thẻ</span>
              <b style={{ fontSize: 28, lineHeight: 1.2, letterSpacing: "-.02em" }}>Tối nay ăn gì để vẫn giảm cân?<br /><span style={{ color: "#0062F0" }}>Để app lo.</span></b>
              <span style={{ fontSize: 15, color: "#475569", lineHeight: 1.55 }}>Nhập cân nặng 30 giây — app lên sẵn thực đơn món Việt đúng calo cho cả tuần.</span>
              <div className="fbtns" style={{ display: "flex", gap: 10, marginTop: 6 }}><a className="btn b1" href={appLink(s, "footer")}>Dùng thử miễn phí</a><a className="btn b2" href="/bang-calo">Tra calo món ăn</a></div>
            </div>
            <div className="fart" style={{ position: "relative", width: 380, flexShrink: 0, background: "radial-gradient(circle at 70% 40%,#D6E6FF,#EEF4FF 60%,#F5F9FF)", overflow: "hidden" }}>
              <span aria-hidden="true" style={{ position: "absolute", right: -40, bottom: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(26,124,255,.12)" }} />
              <img src="/img/bowl-pho.jpg" alt="" loading="lazy" className="th fbowl" style={{ position: "absolute", left: 26, bottom: 26, width: 130, height: 130, border: "5px solid #fff" }} />
              <img src="/img/bowl-2.jpg" alt="" loading="lazy" className="th fbowl2" style={{ position: "absolute", left: 120, top: 26, width: 62, height: 62, border: "4px solid #fff" }} />
              <img src="/img/app-today.png" alt="Màn Hôm nay của app Fipilot AI" loading="lazy" className="fphone" style={{ position: "absolute", right: 36, top: 24, width: 128, height: "auto", borderRadius: 20, border: "6px solid #0F172A", boxShadow: "0 24px 48px rgba(15,23,42,.22)", transform: "rotate(6deg)" }} />
            </div>
          </div>
        </div>
      )}
      <footer className="foot">
        <span className="dots" aria-hidden="true" />
        {foods.length > 0 && (
          <div className="wrap" style={{ position: "relative", display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 800, letterSpacing: ".1em", color: "rgba(255,255,255,.55)" }}><span style={{ width: 26, height: 26, borderRadius: 8, background: "#F9731622", color: "#FB923C", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name="bowl" size={14} stroke={2.4} /></span>CALO MÓN PHỔ BIẾN</span>
            <div className="fchips" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {foods.map(({ fd, por }) => (
                <a key={fd.key} href={`/calo/${fd.slug}`} className="fchip">
                  <span className="fc-n"><span style={{ color: "#FB923C", display: "inline-flex" }}><Icon name="bowl" size={14} /></span><b style={{ color: "#fff" }}>{fd.name}</b></span>
                  {por && <span className="fc-d"><span style={{ color: "rgba(255,255,255,.55)" }}>{por.name}</span><b style={{ color: "#7CC2FF" }}>{por.cal} kcal</b></span>}
                </a>
              ))}
              <a href="/bang-calo" className="fchip-all">Xem cả bảng calo →</a>
            </div>
          </div>
        )}
        <div className="wrap fcols" style={{ position: "relative", marginTop: 34, paddingTop: 30, borderTop: "1px solid rgba(255,255,255,.1)" }}>
          <div className="fbrand" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Logo />
            <span style={{ fontSize: 14.5, color: "rgba(255,255,255,.75)", lineHeight: 1.65, maxWidth: 340 }}>{f.about}</span>
            {c.email && <a href={`mailto:${c.email}`} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, color: "rgba(255,255,255,.85)" }}><span style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,.08)", color: "#7CC2FF", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name="mail" size={15} /></span>{c.email}</a>}
            {c.phone && <a href={`tel:${c.phone.replace(/\s/g, "")}`} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, color: "rgba(255,255,255,.85)" }}><span style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,.08)", color: "#7CC2FF", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name="call" size={15} /></span>{c.phone} · Zalo</a>}
            <div style={{ display: "flex", gap: 8 }}>
              {[["Facebook", "f", "#1877F2", c.facebook], ["Zalo", "Z", "#0068FF", c.zalo || (c.phone ? `https://zalo.me/${c.phone.replace(/\s/g, "")}` : "")]].filter((x) => x[3]).map(([n, t, col, u]) => (
                <a key={n} href={u} rel="noopener" target="_blank" style={{ height: 38, padding: "0 12px", borderRadius: 12, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.14)", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 700 }}><span style={{ width: 20, height: 20, borderRadius: 6, background: col, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900 }}>{t}</span>{n}</a>
              ))}
            </div>
          </div>
          {COLS.map(([loc, h, ic, col]) => (
            <nav key={loc} aria-label={h} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 800, letterSpacing: ".1em", color: "rgba(255,255,255,.55)" }}><span style={{ width: 26, height: 26, borderRadius: 8, background: `${col}22`, color: col, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name={ic} size={14} stroke={2.4} /></span>{h.toUpperCase()}</span>
              {(menus[loc] || []).map((it) => <a key={it.url} href={it.url} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14.5, color: "rgba(255,255,255,.82)", fontWeight: 500 }}><span style={{ color: col, opacity: 0.85, display: "inline-flex" }}><Icon name={it.icon || "doc"} size={16} /></span>{it.label}</a>)}
            </nav>
          ))}
        </div>
        <div aria-hidden="true" className="watermark" style={{ position: "relative", marginTop: 10 }}>Fipilot AI</div>
        <div style={{ position: "relative", background: "rgba(0,0,0,.18)" }}>
          <div className="wrap fbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 54, fontSize: 13, color: "rgba(255,255,255,.6)" }}>
            <span>{(f.copyright || "© %year% Fipilot AI").replace("%year%", year)} · fipilotai.com</span><span>{f.note}</span>
            <a href="#top" className="only-pc" style={{ height: 34, padding: "0 12px", borderRadius: 10, background: "rgba(255,255,255,.08)", display: "inline-flex", alignItems: "center", gap: 6, color: "#fff", fontWeight: 700 }}><Icon name="up" size={14} />Lên đầu trang</a>
          </div>
        </div>
      </footer>
      <style>{`.fcard{min-height:250px}.fchip{display:inline-flex;align-items:center;gap:8px;min-height:36px;padding:6px 14px 6px 10px;border-radius:18px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);font-size:13.5px;color:#E2E8F0;transition:background .12s}.fchip:hover{background:rgba(255,255,255,.12)}.fc-n,.fc-d{display:inline-flex;align-items:center;gap:8px;white-space:nowrap}.fchip-all{display:inline-flex;align-items:center;min-height:36px;padding:0 12px;font-size:13.5px;font-weight:700;color:#7CC2FF}@media(max-width:720px){.fcard{flex-direction:column}.fart{width:auto!important;height:190px}.fbowl{left:8%!important;bottom:14px!important;width:110px!important;height:110px!important}.fbowl2{left:36%!important;top:16px!important}.fphone{right:8%!important;top:18px!important;width:108px!important}.fcard>div:first-child{padding:22px 20px!important}.fcard b{font-size:22px!important}.fbtns{flex-direction:column}.fbar{flex-direction:column;align-items:flex-start!important;padding:14px 16px!important}.fchips{display:grid!important;grid-template-columns:1fr 1fr}.fchip{flex-direction:column;align-items:flex-start;gap:2px;border-radius:12px;padding:9px 11px}.fc-n{gap:6px;font-size:13px}.fc-d{gap:4px;font-size:11.5px}.fchip-all{justify-content:center;border-radius:12px;border:1px dashed rgba(124,194,255,.4);min-height:48px}}`}</style>
    </div>
  );
}
