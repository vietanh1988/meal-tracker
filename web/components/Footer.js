// Chân trang — chép đúng bản vẽ 137 (footer v3, rr/web137b.py › footer). Chỉ thay chữ mẫu bằng dữ liệu thật:
// cột link = Menu chân trang (Quản trị › Menu), món phổ biến + kcal = kho món app, liên hệ = Cài đặt web.
import Logo from "./Logo";
import Phone from "./Phone";
import { safeUrl } from "@/lib/sanitize";
import Icon from "./Icon";
import { appLink } from "@/lib/site";
import { getFood, mainPortion, porName } from "@/lib/foods";

export const DISCLAIMER = "Fipilot AI là trang blog tin tức và chia sẻ kiến thức, không phải trang web y tế. Nội dung chỉ mang tính tham khảo, không thay thế chẩn đoán, điều trị hay tư vấn của bác sĩ. Số calo và dinh dưỡng là ước tính từ kho món của Fipilot AI, có thể chênh lệch tuỳ cách nấu và khẩu phần. Người có bệnh lý, đang mang thai, cho con bú, dưới 18 tuổi hoặc muốn thay đổi chế độ ăn lớn nên hỏi ý kiến bác sĩ / chuyên gia dinh dưỡng trước khi áp dụng.";
const COLS = [["footer_1", "Chủ đề", "grid", "#38BDF8"], ["footer_2", "Fipilot AI", "star", "#FBBF24"], ["footer_3", "Chính sách", "shield", "#4ADE80"]];
const head = { display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 800, letterSpacing: ".1em", color: "rgba(255,255,255,.55)" };
const sq = (bg, col) => ({ width: 24, height: 24, borderRadius: 7, background: bg, color: col, display: "inline-flex", alignItems: "center", justifyContent: "center" });

export default async function Footer({ s, menus }) {
  const f = s.footer || {};
  const c = s.contact || {};
  const foods = [];
  for (const k of f.popular_foods || []) { const fd = await getFood(k); if (fd) foods.push({ fd, por: mainPortion(fd) }); }
  const pho = mainPortion(await getFood("phở bò")); // số trên khung trang trí = số kho món app (khớp bài viết, trang /calo)
  const year = new Date().getFullYear();
  const zalo = c.zalo || (c.phone ? `https://zalo.me/${c.phone.replace(/\s/g, "")}` : "");
  const social = [["Facebook", "f", "#1877F2", c.facebook && safeUrl(c.facebook)], ["Zalo", "Z", "#0068FF", zalo]].filter((x) => x[3]);
  return (
    <div className="fwrap" style={{ position: "relative", marginTop: 56 }}>
      {f.show_app_card !== false && (
        <div className="wrap fcardwrap" style={{ position: "relative", zIndex: 2, marginBottom: -110 }}>
          <div className="fx">
            <span className="fx-dots" aria-hidden="true" /><span className="fx-glow" aria-hidden="true" />
            <div className="fx-l">
              {s.plan?.trial ? <span className="fx-pill">Miễn phí {s.plan.trial} ngày · không cần thẻ</span> : null}
              <b className="fx-t">{f.cta_title || "Tối nay ăn gì để vẫn giảm cân?"}<br /><span>{f.cta_hl || "Để app lo."}</span></b>
              <span className="fx-s">{f.cta_sub || "Nhập cân nặng 30 giây — app lên sẵn thực đơn món Việt đúng calo cho cả tuần."}</span>
              <div className="fx-b"><a className="btn fx-b1" href={appLink(s, "footer")}>{f.cta_btn1 || "Dùng thử miễn phí →"}</a>{(f.cta_btn2 ?? "Tra calo món ăn") && <a className="btn fx-b2" href={safeUrl(f.cta_btn2_url || "/bang-calo")}>{f.cta_btn2 ?? "Tra calo món ăn"}</a>}</div>
            </div>
            <div className="fx-r">
              <span className="fx-ring" aria-hidden="true" />
              <Phone className="fx-ph" dark src="/img/app-today.webp" alt="Màn Hôm nay của app Fipilot AI: calo còn lại, bữa sắp tới" />
              <img className="fx-bowl" src="/img/bowl-pho.jpg" alt="Tô phở bò tái — món Việt vẫn ăn được khi giảm cân" width={150} height={150} loading="lazy" decoding="async" />
              <span className="fx-chip"><img src="/img/bowl-pho.jpg" alt="" aria-hidden="true" width={36} height={36} loading="lazy" decoding="async" /><span><b>Phở bò</b><i>Bữa sáng · {pho?.cal ?? 340} kcal</i></span><em>✓</em></span>
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
              {(menus[loc] || []).map((it, ix) => <a key={ix + it.url} href={it.url} className="flink" {...(it.new_tab ? { target: "_blank" } : {})} {...([it.new_tab && "noopener", it.nofollow && "nofollow"].filter(Boolean).length ? { rel: [it.new_tab && "noopener", it.nofollow && "nofollow"].filter(Boolean).join(" ") } : {})} {...(it.title ? { title: it.title } : {})} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, color: "rgba(255,255,255,.82)", fontWeight: 500 }}><span style={{ color: col, opacity: 0.85, display: "inline-flex" }}><Icon name={it.icon || "doc"} size={15} /></span>{it.label}</a>)}
            </nav>
          ))}
        </div>
        {/* 25/10 (chủ dự án chốt): khối Lưu ý — web là blog tin tức, không phải trang y tế (Cài đặt › Chân trang › disclaimer để trống = chữ mặc định) */}
        {f.show_disclaimer !== false && (
          <div className="wrap" style={{ position: "relative", marginTop: 28 }}>
            <div data-testid="web-disclaimer" style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", display: "flex", gap: 12, fontSize: 13, lineHeight: 1.65, color: "rgba(255,255,255,.72)" }}>
              <span aria-hidden="true" style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 8, background: "rgba(251,191,36,.16)", color: "#FBBF24", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>!</span>
              <span><b style={{ color: "#fff" }}>Lưu ý:</b> {f.disclaimer || DISCLAIMER}</span>
            </div>
          </div>
        )}
        {/* 25/10 (chủ dự án: "footer thừa dưới nhiều"): chữ chìm 168 → 112px, dòng 0.86 → phần đáy thấp ~45% */}
        <div aria-hidden="true" className="watermark" style={{ position: "relative", marginTop: 22, marginBottom: -4, textAlign: "center", fontSize: 112, fontWeight: 900, lineHeight: 0.86, background: "linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,0))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", whiteSpace: "nowrap", userSelect: "none" }}>Fipilot AI</div>
        <div style={{ position: "relative", background: "rgba(0,0,0,.18)" }}>
          <div className="wrap fbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, fontSize: 12, color: "rgba(255,255,255,.55)" }}>
            <span>{(f.copyright || "© %year% Fipilot AI").replace(/%(year|nam)%/g, year)} · fipilotai.com · <a href="/phuong-phap-du-lieu" style={{ color: "inherit", textDecoration: "underline" }}>Cách tính calo</a></span><span>{f.note}</span>
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
.fx{position:relative;overflow:hidden;border-radius:28px;display:flex;align-items:stretch;min-height:300px;background:linear-gradient(115deg,#0047D6 0%,#0062F0 42%,#2B8CFF 100%);box-shadow:0 30px 70px -20px rgba(0,50,160,.55),0 12px 24px -10px rgba(10,26,58,.35)}
.fx-dots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.12) 1px,transparent 1px);background-size:22px 22px;-webkit-mask-image:linear-gradient(90deg,transparent 30%,#000 75%);mask-image:linear-gradient(90deg,transparent 30%,#000 75%)}
.fx-glow{position:absolute;right:-120px;top:-160px;width:520px;height:520px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.28),rgba(255,255,255,0))}
.fx-l{position:relative;flex:1;padding:44px 48px;display:flex;flex-direction:column;gap:14px;justify-content:center;color:#fff}
.fx-pill{align-self:flex-start;height:30px;padding:0 12px;border-radius:15px;display:inline-flex;align-items:center;font-size:13px;font-weight:700;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.28)}
.fx-t{font-size:34px;line-height:1.18;font-weight:800;letter-spacing:-.02em}.fx-t span{color:#BFE0FF}
.fx-s{font-size:16px;line-height:1.6;color:rgba(255,255,255,.86);max-width:460px}
.fx-b{display:flex;gap:12px;margin-top:8px}
.fx-b1{height:50px;padding:0 22px;border-radius:14px;background:#fff;color:#0052E0;font-size:15.5px;font-weight:800;box-shadow:0 10px 24px -8px rgba(0,20,80,.45)}
.fx-b1:hover{background:#EEF5FF}
.fx-b2{height:50px;padding:0 20px;border-radius:14px;background:rgba(255,255,255,.08);color:#fff;font-size:15.5px;font-weight:700;border:1.5px solid rgba(255,255,255,.55)}
.fx-b2:hover{background:rgba(255,255,255,.16)}
.fx-r{position:relative;width:420px;flex-shrink:0}
.fx-ring{position:absolute;right:40px;top:34px;width:300px;height:300px;border-radius:50%;border:1px solid rgba(255,255,255,.22);box-shadow:0 0 0 46px rgba(255,255,255,.05),0 0 0 92px rgba(255,255,255,.035)}
.fx .fx-ph{--w:200px;right:92px;top:38px;transform:rotate(-7deg);z-index:2;-webkit-box-reflect:unset}
.fx-bowl{position:absolute;left:22px;bottom:-26px;width:150px;height:150px;border-radius:50%;object-fit:cover;border:5px solid rgba(255,255,255,.95);box-shadow:0 20px 40px -10px rgba(0,20,80,.5);z-index:3}
.fx-chip{position:absolute;right:24px;bottom:34px;z-index:4;display:flex;align-items:center;gap:10px;padding:9px 12px 9px 9px;border-radius:16px;background:rgba(255,255,255,.94);box-shadow:0 14px 30px -8px rgba(0,20,80,.45)}
.fx-chip img{width:36px;height:36px;border-radius:10px;object-fit:cover}
.fx-chip span{display:flex;flex-direction:column;gap:1px}.fx-chip b{font-size:13.5px;color:#0F172A}.fx-chip i{font-style:normal;font-size:12px;color:#64748B}
.fx-chip em{font-style:normal;width:24px;height:24px;border-radius:12px;background:#16A34A;color:#fff;font-size:13px;font-weight:900;display:flex;align-items:center;justify-content:center;margin-left:4px}
@media(max-width:720px){
 .fwrap{margin-top:36px!important}.fcardwrap{margin-bottom:-90px!important}
 .fx{flex-direction:column;border-radius:22px;min-height:0}
 .fx-l{padding:28px 22px 6px;gap:12px}.fx-t{font-size:26px}.fx-s{font-size:15px}
 .fx-b{flex-direction:column}.fx-b .btn{width:100%}
 .fx-r{width:auto!important;height:250px}
 .fx-ring{right:50%;margin-right:-150px;top:30px}
 .fx .fx-ph{--w:170px;right:auto;left:50%;margin-left:-60px;top:36px}
 .fx-bowl{left:16px;bottom:-30px;width:120px;height:120px}
 .fx-chip{right:14px;bottom:22px}
 .foot{padding-top:120px!important}
 .fchips{display:grid!important;grid-template-columns:1fr 1fr}
 .fchip{flex-direction:column;align-items:flex-start;gap:2px;height:auto;padding:9px 11px;border-radius:12px}
 .fc-ic{display:none}.fc-n{font-size:13px;display:flex;align-items:center;gap:6px}.fc-n::before{content:"";width:13px;height:13px;background:#FB923C;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M3 11h18a9 9 0 01-18 0z'/%3E%3Cpath d='M8 7c0-2 2-2 2-4M13 7c0-2 2-2 2-4'/%3E%3C/svg%3E") center/contain no-repeat}
 .fc-d{font-size:11.5px;gap:0}.fc-u::after{content:" · "}
 .fchip-all{justify-content:center;border-radius:12px;border:1px dashed rgba(124,194,255,.4);height:48px}
 .fcols{margin-top:26px!important;padding-top:24px!important;grid-template-columns:1fr 1fr!important;gap:24px!important}.fbrand{grid-column:1/-1}
 .watermark{margin-top:16px!important;font-size:56px!important}
 .fbar{flex-direction:column;align-items:flex-start!important;gap:6px;height:auto!important;padding:14px 16px!important}
}` }} />
    </div>
  );
}
