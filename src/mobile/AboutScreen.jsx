// Màn Tôi › Giới thiệu (bản vẽ GioiThieu): logo + phiên bản, thẻ tính năng (số món đếm từ kho món thật),
// người làm, liên hệ (Zalo / Hotline / Email / Facebook), Điều khoản. Nội dung lấy từ app_settings.about_page (admin sửa).
import { getFoodStats } from "../lib/localFoodDB";
import { fmtInt } from "../lib/mobileView";
import { Icon, GRAD_BLUE } from "./ui";

const box = { margin: "12px 12px 0 12px", background: "#FFFFFF", border: "1.5px solid #E2E8F0", borderRadius: 16, padding: "0 14px" };
const row = (last) => ({ display: "flex", alignItems: "center", gap: 10, minHeight: 48, width: "100%", padding: 0, border: "none", borderBottom: last ? "none" : "1px solid #F1F5F9", background: "transparent", textDecoration: "none", color: "#0F172A", fontFamily: "inherit", textAlign: "left" });

function parseAbout(raw) {
  try { return raw ? JSON.parse(raw) : {}; } catch (e) { return {}; }
}
const safeHttp = (u) => (/^https?:\/\//i.test(u || "") ? u : null);
const fbHandle = (u) => String(u || "").replace(/^https?:\/\/(www\.|m\.)?(facebook|fb)\.com\//i, "").replace(/\/$/, "");

export function AboutScreen({ appSettings, openTerms, openEdit }) {
  const a = parseAbout(appSettings?.about_page);
  const stats = getFoodStats();
  const foodTag = `${fmtInt(stats.total)} món · ${fmtInt(stats.vn)} món Việt`;
  // Thẻ tính năng do admin nhập; thẻ nào nói số món thì thay bằng số đếm thật
  let tags = String(a.features || "Fipilot AI Chat 24/7|3 AI tích hợp|USDA database|Công thức ISSN").split("|").map((s) => s.trim()).filter(Boolean);
  let replaced = false;
  tags = tags.map((t) => (/\d[\d.,]*\s*món/i.test(t) ? (replaced ? null : ((replaced = true), foodTag)) : t)).filter(Boolean);
  if (!replaced) tags.splice(1, 0, foodTag);

  const version = appSettings?.app_version || a.version || "";
  const devName = a.devName || "Việt Anh Seoer";
  const initials = devName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const contacts = [
    a.zalo && ["Zalo", a.zalo, `https://zalo.me/${String(a.zalo).replace(/\D/g, "")}`],
    a.hotline && ["Hotline", a.hotline, `tel:${String(a.hotline).replace(/[^\d+]/g, "")}`],
    a.contact && ["Email", a.contact, `mailto:${a.contact}`],
    safeHttp(a.facebook) && ["Facebook", fbHandle(a.facebook), a.facebook],
  ].filter(Boolean);

  return (
    <div style={{ paddingBottom: 32 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "20px 20px 4px 20px", textAlign: "center" }}>
        <img src="/icon-192.png" alt="Fipilot AI" style={{ width: 64, height: 64, borderRadius: 16, objectFit: "cover" }} />
        <span style={{ fontSize: 20, fontWeight: 900 }}>{a.appName || "Fipilot AI"} {version && <span data-testid="about-version" style={{ fontSize: 13, fontWeight: 700, color: "#64748B" }}>v{version}</span>}</span>
        <span style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{a.tagline || "AI Nutrition Coach · Trợ lý bữa ăn thông minh cho người Việt Nam"}</span>
      </div>

      <div style={{ margin: "12px 12px 0 12px", display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
        {tags.map((t) => (
          <span key={t} data-testid={t === foodTag ? "about-foods" : undefined} style={{ fontSize: 12, fontWeight: 700, color: "#0057FF", background: "rgba(0,122,255,0.08)", padding: "5px 10px", borderRadius: 999 }}>{t}</span>
        ))}
      </div>

      <div style={{ margin: "14px 12px 0 12px", background: "#FFFFFF", border: "1.5px solid #E2E8F0", borderRadius: 16, padding: 14, display: "flex", gap: 12 }}>
        {a.devAvatar && safeHttp(a.devAvatar)
          ? <img src={a.devAvatar} alt="" style={{ width: 44, height: 44, borderRadius: 22, objectFit: "cover", flexShrink: 0 }} />
          : <span style={{ width: 44, height: 44, borderRadius: 22, background: GRAD_BLUE, color: "#FFFFFF", fontSize: 15, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{initials}</span>}
        <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>{devName}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#007AFF" }}>{a.devRole || "Founder & Developer"}</span>
          {a.devBio && <span style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, marginTop: 4 }}>{a.devBio}</span>}
        </span>
      </div>

      {contacts.length > 0 && (
        <div style={box}>
          {contacts.map(([k, v, href], i) => (
            <a key={k} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" style={row(i === contacts.length - 1)}>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{k}</span>
              <span style={{ fontSize: 13, color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "65%" }}>{v}</span>
            </a>
          ))}
        </div>
      )}

      <div style={box}>
        <button data-testid="about-terms" onClick={openTerms} style={row(!openEdit)}>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>Điều khoản & chính sách bảo mật</span>{Icon.chev(16)}
        </button>
        {openEdit && (
          <button data-testid="about-edit" onClick={openEdit} style={row(true)}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>Sửa nội dung giới thiệu</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#475569", background: "#F1F5F9", padding: "3px 8px", borderRadius: 6 }}>Admin</span>
            {Icon.chev(16)}
          </button>
        )}
      </div>
    </div>
  );
}
