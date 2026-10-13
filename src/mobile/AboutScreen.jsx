// Tôi › Giới thiệu (bản vẽ 38, chốt 14/10) + Điều khoản (bản vẽ 39).
// Giới thiệu: phần đầu xanh có logo + phiên bản, 4 ô tính năng (số món đếm từ kho thật), người làm,
// liên hệ (chỉ hiện mục admin đã nhập), Pháp lý = danh sách trang điều khoản thật (app_settings.terms_content).
// Nội dung giới thiệu lấy từ app_settings.about_page (admin sửa).
import { useState } from "react";
import { getFoodStats } from "../lib/localFoodDB";
import { fmtInt } from "../lib/mobileView";
import { parseContent, stripEmptyParagraphs } from "../TermsPage";
import { Icon, GRAD_BLUE, DkIcon } from "./ui";
import { DK, dkCard } from "../theme";

// Nền tối (bản vẽ 48): thẻ kính mờ, ô icon đặc màu. Nội dung điều khoản vẫn là "trang giấy" trắng cho dễ đọc văn bản dài.
const sec = { display: "block", padding: "18px 16px 6px 16px", fontSize: 11, fontWeight: 700, color: DK.t3, letterSpacing: "0.08em" };
const group = { ...dkCard, margin: "0 12px", borderRadius: 16, padding: "0 14px" };
const rowSt = (last) => ({ display: "flex", alignItems: "center", gap: 12, minHeight: 54, width: "100%", padding: 0, border: "none", borderBottom: last ? "none" : `1px solid ${DK.line}`, background: "transparent", textDecoration: "none", color: DK.t1, fontFamily: "inherit", textAlign: "left" });
const svg = (d, s = 18) => <svg aria-hidden="true" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const P = {
  db: <><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" /></>,
  spark: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  calc: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 12h2M12 12h2M8 16h2M12 16h2" /></>,
  chat: <path d="M5 5h14v10H9l-4 4z" />,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M4 7l8 6 8-6" /></>,
  fb: <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z" />,
  doc: <><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4M9 12h7M9 16h5" /></>,
  shield: <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" />,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  card: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></>,
  alert: <><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17v.5" /></>,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16z" /></>,
};
const ico = (d, c, bg, size = 32, s = 18) => <DkIcon color={c} size={size}>{svg(d, s)}</DkIcon>;

// Nhãn trang pháp lý: sửa "Ai" → "AI"; icon theo nội dung nhãn
export const termLabel = (l) => String(l || "").replace(/\bAi\b/g, "AI");
const termIcon = (l) => (/AI/i.test(l) ? P.spark : /riêng tư/i.test(l) ? P.lock : /bảo mật/i.test(l) ? P.shield : /thanh toán|hoàn/i.test(l) ? P.card : /miễn trừ/i.test(l) ? P.alert : P.doc);

function parseAbout(raw) { try { return raw ? JSON.parse(raw) : {}; } catch (e) { return {}; } }
const safeHttp = (u) => (/^https?:\/\//i.test(u || "") ? u : null);
const fbHandle = (u) => String(u || "").replace(/^https?:\/\/(www\.|m\.)?(facebook|fb)\.com\//i, "").replace(/\/$/, "");

export function AboutScreen({ appSettings, openTerms, openEdit }) {
  const a = parseAbout(appSettings?.about_page);
  const stats = getFoodStats();
  const version = appSettings?.app_version || a.version || "";
  const devName = a.devName || "Việt Anh Seoer";
  const initials = devName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const contacts = [
    a.zalo && ["Zalo", a.zalo, `https://zalo.me/${String(a.zalo).replace(/\D/g, "")}`, P.chat, "#0068FF", "rgba(0,104,255,0.1)"],
    a.hotline && ["Hotline", a.hotline, `tel:${String(a.hotline).replace(/[^\d+]/g, "")}`, P.phone, "#00A67E", "rgba(0,200,150,0.12)"],
    a.contact && ["Email", a.contact, `mailto:${a.contact}`, P.mail, "#0891B2", "rgba(8,145,178,0.1)"],
    safeHttp(a.facebook) && ["Facebook", fbHandle(a.facebook), a.facebook, P.fb, "#1877F2", "rgba(24,119,242,0.1)"],
  ].filter(Boolean);
  const pages = parseContent(appSettings).filter((p) => p && p.label);
  const feats = [
    [P.db, "#00A67E", "rgba(0,200,150,0.12)", `${fmtInt(stats.total)} món`, `${fmtInt(stats.vn)} món Việt`, "about-foods"],
    [P.spark, "#7C3AED", "rgba(124,58,237,0.1)", "AI lên thực đơn", "đúng kcal & macro"],
    [P.camera, "#EA580C", "rgba(249,115,22,0.12)", "Chụp ảnh", "nhận món, tính calo"],
    [P.calc, "#007AFF", "rgba(0,122,255,0.1)", "Công thức chuẩn", "Mifflin-St Jeor · ISSN"],
  ];

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Bản vẽ 49: thẻ kính + quầng sáng xanh sau logo (thay khối xanh sáng, cho đồng bộ nền tối) */}
      <div data-testid="about-hero" style={{ ...dkCard, borderRadius: 24, margin: "12px 12px 0 12px", padding: "22px 18px", color: "#FFFFFF", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center", position: "relative", overflow: "hidden" }}>
        <span aria-hidden="true" style={{ position: "absolute", left: "50%", top: -60, width: 220, height: 160, marginLeft: -110, background: "radial-gradient(closest-side, rgba(77,163,255,0.45), rgba(77,163,255,0))", pointerEvents: "none" }} />
        <img src="/icon-192.png" alt="Fipilot AI" style={{ position: "relative", width: 72, height: 72, borderRadius: 20, objectFit: "cover", boxShadow: "0 0 0 1px rgba(255,255,255,0.3), 0 10px 24px rgba(0,30,120,0.45)", background: "#FFFFFF" }} />
        <span style={{ position: "relative", fontSize: 22, fontWeight: 900 }}>{a.appName || "Fipilot AI"}</span>
        <span style={{ position: "relative", fontSize: 13, color: DK.t2, lineHeight: 1.5 }}>{(a.tagline || "Trợ lý bữa ăn thông minh cho người Việt").replace(/^AI Nutrition Coach\s*[│|·]\s*/i, "")}</span>
        {version && <span data-testid="about-version" style={{ position: "relative", fontSize: 11, fontWeight: 800, color: "#0040E0", background: "#FFFFFF", padding: "4px 10px", borderRadius: 999 }}>Phiên bản {version}</span>}
      </div>

      <span style={sec}>CÓ GÌ TRONG APP</span>
      <div style={{ margin: "0 12px", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        {feats.map(([d, c, bg, t, s, tid]) => (
          <div key={t} data-testid={tid} style={{ ...dkCard, borderRadius: 16, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {ico(d, c, bg, 36, 20)}
            <span style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: 14, fontWeight: 800 }}>{t}</span><span style={{ fontSize: 12, color: DK.t3 }}>{s}</span></span>
          </div>
        ))}
      </div>

      <span style={sec}>NGƯỜI LÀM</span>
      <div style={{ ...dkCard, margin: "0 12px", borderRadius: 16, padding: 14, display: "flex", gap: 12 }}>
        {a.devAvatar && safeHttp(a.devAvatar)
          ? <img src={a.devAvatar} alt="" style={{ width: 48, height: 48, borderRadius: 24, objectFit: "cover", flexShrink: 0 }} />
          : <span style={{ width: 48, height: 48, borderRadius: 24, background: GRAD_BLUE, color: "#FFFFFF", fontSize: 16, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{initials}</span>}
        <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>{devName}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: DK.link }}>{a.devRole || "Founder & Developer"}</span>
          {a.devBio && <span style={{ fontSize: 13, color: DK.t2, lineHeight: 1.5, marginTop: 4 }}>{a.devBio}</span>}
        </span>
      </div>

      {contacts.length > 0 && <>
        <span style={sec}>LIÊN HỆ</span>
        <div style={group}>
          {contacts.map(([k, v, href, d, c, bg], i) => (
            <a key={k} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" style={rowSt(i === contacts.length - 1)}>
              {ico(d, c, bg)}
              <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{k}</span>
              <span style={{ fontSize: 13, color: DK.t2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "55%" }}>{v}</span>
            </a>
          ))}
        </div>
      </>}

      <span style={sec}>PHÁP LÝ</span>
      <div style={group}>
        {pages.map((pg, i) => (
          <button key={pg.id} data-testid={i === 0 ? "about-terms" : `about-term-${pg.id}`} onClick={() => openTerms(pg.id)} style={rowSt(i === pages.length - 1 && !openEdit)}>
            {ico(termIcon(pg.label), "#64748B", "rgba(71,85,105,0.1)")}
            <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{termLabel(pg.label)}</span>{Icon.chev(16, DK.chev)}
          </button>
        ))}
        {openEdit && (
          <button data-testid="about-edit" onClick={openEdit} style={rowSt(true)}>
            {ico(P.edit, "#DC2626", "rgba(220,38,38,0.1)")}
            <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>Sửa nội dung giới thiệu</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#FFFFFF", background: "rgba(255,255,255,0.16)", padding: "3px 8px", borderRadius: 6 }}>Admin</span>
            {Icon.chev(16, DK.chev)}
          </button>
        )}
      </div>
      <p style={{ margin: "16px 16px 0 16px", fontSize: 12, color: DK.t3, textAlign: "center" }}>© {new Date().getFullYear()} Fipilot AI · app.fipilotai.com</p>
    </div>
  );
}

// ---------------- Điều khoản & chính sách (bản vẽ 39) ----------------
const TERMS_CSS = `
.fp-terms h1{font-size:20px;font-weight:900;line-height:1.3;margin:0 0 10px 0}
.fp-terms h2,.fp-terms h3{font-size:16px;font-weight:800;line-height:1.4;margin:18px 0 6px 0}
.fp-terms p{margin:0 0 10px 0}
.fp-terms ul,.fp-terms ol{margin:0 0 10px 0;padding-left:20px}
.fp-terms li{margin:0 0 4px 0}
.fp-terms a{color:#007AFF}
`;
export function TermsScreen({ appSettings, initialId }) {
  const pages = parseContent(appSettings).filter((p) => p && p.label);
  const [id, setId] = useState(initialId && pages.some((p) => p.id === initialId) ? initialId : pages[0]?.id);
  const page = pages.find((p) => p.id === id) || pages[0];
  return (
    <div style={{ paddingBottom: 32 }}>
      <style>{TERMS_CSS}</style>
      <div role="tablist" aria-label="Chọn trang" style={{ display: "flex", gap: 6, overflowX: "auto", padding: "12px 12px 2px 12px", scrollbarWidth: "none" }}>
        {pages.map((p) => {
          const on = page && p.id === page.id;
          return (
            <button key={p.id} role="tab" aria-selected={on} data-testid={`terms-tab-${p.id}`} onClick={() => setId(p.id)}
              style={{ flexShrink: 0, height: 36, padding: "0 14px", borderRadius: 999, border: on ? "none" : `1px solid ${DK.chipLine}`, background: on ? "#FFFFFF" : DK.chip, color: on ? "#0040E0" : DK.t1, fontFamily: "inherit", fontSize: 13, fontWeight: on ? 800 : 600, whiteSpace: "nowrap" }}>{termLabel(p.label)}</button>
          );
        })}
      </div>
      <div data-testid="terms-content" className="fp-terms" style={{ margin: "12px 12px 0 12px", background: "#FFFFFF", border: "1.5px solid #E2E8F0", borderRadius: 18, padding: "18px 16px", fontSize: 15, lineHeight: 1.7, color: "#334155", overflowWrap: "anywhere" }}>
        {page && page.html
          ? <div dangerouslySetInnerHTML={{ __html: stripEmptyParagraphs(page.html) }} />
          : <p style={{ margin: 0, color: "#64748B" }}>Chưa có nội dung.</p>}
      </div>
    </div>
  );
}
