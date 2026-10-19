// Quản trị trên máy tính (bản vẽ 117–119, chốt 16/10).
//  - Thanh bên cố định 232 px nền navy, 4 nhóm: TỔNG QUAN · BÁN HÀNG · NỘI DUNG · HỆ THỐNG; số chờ (đơn, góp ý, món AI) hiện ngay trên thanh bên.
//  - Thanh trên 64 px trắng: tiêu đề + dòng phụ + nút bên phải ("Xem app ›" quay lại khung điện thoại).
//  - Nội dung nền #F4F7FC, thẻ trắng bo 14. Mọi mục đều là trang PC riêng src/pc/Pc*.jsx (cùng kiểu 117–119), không còn tab cũ.
//  - Chỉ App render khung này khi isAdmin (user thường không bao giờ tới đây).
import { useCallback, useEffect, useState } from "react";
import { PC } from "../theme";
import { PC_CSS, Btn } from "./pcUI";
import { loadAdminCounts } from "../mobile/AdminHomeScreen";
import { appConfirm } from "../lib/dialog";
import { PcOrders } from "./PcOrders";
import { PcReport } from "./PcReport";
import { PcSubscription } from "./PcSubscription";
import { PcFeedback } from "./PcFeedback";
import { PcNotify } from "./PcNotify";
import { PcTemplates } from "./PcTemplates";
import { PcPending } from "./PcPending";
import { PcVersion } from "./PcVersion";
import { PcFlags } from "./PcFlags";
import { PcAi } from "./PcAi";
import { PcAiCost } from "./PcAiCost";
import { PcHealth } from "./PcHealth";
import { PcAudit } from "./PcAudit";
import { PcBackup } from "./PcBackup";
import { PcHome } from "./PcHome";
import { PcUsers } from "./PcUsers";
import { PcFood } from "./PcFood";
import { PcBehavior } from "./PcBehavior";
import { PcWebPosts } from "./web/PcWebPosts";
import { PcWebTerms } from "./web/PcWebTerms";
import { PcWebMenu } from "./web/PcWebMenu";
import { PcWebAuthors } from "./web/PcWebAuthors";
import { PcWebSettings } from "./web/PcWebSettings";
import { PcWebSeo } from "./web/PcWebSeo";
import { PcWebCalo } from "./web/PcWebCalo";

const SEC_KEY = "fp_pc_admin_sec";

// Icon thanh bên: cùng hình + màu với Quản trị trên điện thoại (AdminHomeScreen), ô màu 24 px, nét 14 px
const svg = (d) => <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const NAV_IC = {
  home: ["#2563EB", svg(<><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></>)],
  orders: ["#7C3AED", svg(<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>)],
  report_biz: ["#2563EB", svg(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />)],
  behavior: ["#16A34A", svg(<><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></>)],
  users: ["#0EA5E9", svg(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.7 3 2.5 3.5 5.2" /></>)],
  subscription_settings: ["#DB2777", svg(<><path d="M3 7h18v10H3z" /><path d="M3 11h18M7 15h3" /></>)],
  feedback: ["#0891B2", svg(<path d="M5 5h14v10H9l-4 4z" />)],
  notify: ["#F59E0B", svg(<><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 21h4" /></>)],
  templates: ["#00A67E", svg(<><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></>)],
  food_db: ["#EA580C", svg(<path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10M17 3c-2 0-3 2-3 5s1 4 3 4v9" />)],
  food_cache_pending: ["#059669", svg(<path d="M5 12.5l4.5 4.5L19 7.5" />)],
  admin: ["#0891B2", svg(<><path d="M4 4h16v12H4z" /><path d="M8 20h8M12 16v4M8 9l2 2-2 2M12 13h4" /></>)],
  feature_flags: ["#4F46E5", svg(<><rect x="2" y="7" width="20" height="10" rx="5" /><circle cx="16" cy="12" r="3" /></>)],
  ai: ["#007AFF", svg(<><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /></>)],
  ai_cost: ["#D97706", svg(<><circle cx="12" cy="12" r="9" /><path d="M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.7 0-2.8 1-2.8 2.2 0 2.8 5.6 1.5 5.6 4.3 0 1.2-1.1 2.2-2.8 2.2-1.2 0-2.2-.6-2.7-1.6M12 6v2M12 16v2" /></>)],
  health: ["#DC2626", svg(<path d="M3 12h4l2-5 4 10 2-5h6" />)],
  audit_log: ["#475569", svg(<><path d="M6 3h9l4 4v14H6z" /><path d="M9 11h7M9 15h7M9 7h3" /></>)],
  backup: ["#64748B", svg(<><path d="M5 3h11l3 3v15H5z" /><path d="M8 3v6h8V3M8 21v-7h8v7" /></>)],
  web_posts: ["#0062F0", svg(<><path d="M4 20h4l10-10-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>)],
  web_pages: ["#0D9488", svg(<><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5" /></>)],
  web_menu: ["#F59E0B", svg(<path d="M4 6h16M4 12h16M4 18h10" />)],
  web_authors: ["#0EA5E9", svg(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>)],
  web_settings: ["#64748B", svg(<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></>)],
  web_calo: ["#F97316", svg(<><path d="M4 11h16a8 8 0 0 1-16 0z" /><path d="M9 7c0-2 2-2 2-4M13 7c0-2 2-2 2-4" /></>)],
  web_seo: ["#16A34A", svg(<><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5M8.5 11l2 2 3.5-4" /></>)],
  web_terms: ["#7C3AED", svg(<><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>)],
};

// Thứ tự + tên đúng bản vẽ 117. badge = khoá trong loadAdminCounts()
export const PC_NAV = [
  { group: "TỔNG QUAN", items: [{ id: "home", label: "Tổng quan" }] },
  { group: "BÁN HÀNG", items: [{ id: "orders", label: "Đơn hàng", badge: "orders" }, { id: "report_biz", label: "Báo cáo kinh doanh" }, { id: "behavior", label: "Hành vi khách" }, { id: "users", label: "Người dùng" }, { id: "subscription_settings", label: "Gói cước & giới hạn" }] },
  { group: "NỘI DUNG", items: [{ id: "feedback", label: "Góp ý", badge: "feedback" }, { id: "notify", label: "Gửi thông báo" }, { id: "templates", label: "Kho mẫu thực đơn" }, { id: "food_db", label: "Kho thực phẩm" }, { id: "food_cache_pending", label: "Duyệt món AI", badge: "pending" }] },
  // Quản trị web fipilotai.com (bản vẽ 138) — chỉ có trên PC, không thêm vào quản trị điện thoại
  { group: "WEB & BÀI VIẾT", items: [{ id: "web_posts", label: "Bài viết" }, { id: "web_pages", label: "Trang" }, { id: "web_terms", label: "Chuyên mục & thẻ" }, { id: "web_calo", label: "Trang calo món" }, { id: "web_menu", label: "Menu" }, { id: "web_authors", label: "Tác giả" }, { id: "web_seo", label: "Cài đặt SEO" }, { id: "web_settings", label: "Cài đặt web" }] },
  { group: "HỆ THỐNG", items: [{ id: "admin", label: "Phiên bản & thông báo" }, { id: "feature_flags", label: "Quản lý tính năng" }, { id: "ai", label: "Kết nối AI" }, { id: "ai_cost", label: "Chi phí AI" }, { id: "health", label: "Sức khoẻ & lỗi" }, { id: "audit_log", label: "Nhật ký admin" }, { id: "backup", label: "Sao lưu", superOnly: true }] },
];
const SUB = {
  orders: "Duyệt đơn chuyển khoản, kích hoạt gói", report_biz: "Doanh thu, gói cước, người dùng", behavior: "Khách đi tới đâu, dùng gì, bỏ ở đâu", users: "Quản lý tài khoản, gói, quyền",
  subscription_settings: "Giá gói, lượt AI theo gói", feedback: "Góp ý & báo lỗi của người dùng", notify: "Gửi thông báo đẩy tới người dùng",
  templates: "Thực đơn mẫu dùng chung", food_db: "Số trên 100 g · sửa ghi đè số gốc, về gốc được", food_cache_pending: "Món lạ AI đã tính, chờ duyệt vào kho",
  admin: "Số phiên bản, thông báo cập nhật", feature_flags: "Bật / tắt tính năng", ai: "Nhà cung cấp, model, khoá API", ai_cost: "Chi phí gọi AI theo ngày, tính năng, người dùng",
  web_posts: "Viết, sửa, hẹn giờ đăng bài lên fipilotai.com", web_pages: "Trang Giới thiệu, Điều khoản… của web", web_terms: "Chuyên mục = nhóm lớn · Thẻ = nhãn nhỏ gắn bài", web_menu: "Kéo thả để đổi thứ tự · kéo sang phải để thành menu con", web_authors: "Hồ sơ người viết — Google dùng để chấm độ tin cậy", web_settings: "Thông tin chung của fipilotai.com", web_seo: "Áp cho toàn web fipilotai.com", web_calo: "Mỗi món trong kho có thể thành 1 trang /calo/…",
  health: "Chỉ số đo thật + lỗi app gần đây", audit_log: "Thao tác của admin", backup: "Sao lưu / tải dữ liệu (Super Admin)",
};
const LABEL = Object.fromEntries(PC_NAV.flatMap((g) => g.items.map((i) => [i.id, i.label])));
const initials = (name) => (name || "?").trim().split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

function TopBar({ title, sub, right, onOpenApp }) {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 20, height: PC.topH, background: "#FFFFFF", borderBottom: `1px solid ${PC.line}`, display: "flex", alignItems: "center", padding: "0 24px", gap: 12 }}>
      <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <h1 data-testid="pc-title" style={{ margin: 0, fontSize: 18, fontWeight: 900, color: PC.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</h1>
        {sub && <span style={{ fontSize: 12, color: PC.t3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</span>}
      </span>
      {right}
      <Btn kind="soft" onClick={onOpenApp} testid="pc-open-app">Xem app ›</Btn>
    </header>
  );
}

const SIDE_KEY = "fp_pc_side_mini";
const MINI_W = 68;
const chevSvg = (left) => <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">{left ? <path d="M15 6l-6 6 6 6M20 6v12" /> : <path d="M9 6l6 6-6 6M4 6v12" />}</svg>;

// Thanh bên thu gọn (16/10): bấm nút « ở cạnh logo → chỉ còn icon (68 px), rê chuột hiện tên; » để sổ ra. Nhớ theo máy.
// 19/10 (chủ dự án): bấm tên nhóm để thu gọn / mở nhóm, nhớ theo máy (fp_pc_nav_closed). Mặc định mở hết; nhóm chứa trang đang mở luôn mở.
// Nhóm đang thu hiện số mục + tổng số chờ xử lý (đơn, góp ý, món chờ duyệt).
const GROUP_KEY = "fp_pc_nav_closed";
function SideNav({ section, go, counts, isSuperAdmin, user, profile, mini, onToggle }) {
  const [closed, setClosed] = useState(() => { try { const v = JSON.parse(localStorage.getItem(GROUP_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } });
  const toggleGroup = (g) => setClosed((c) => { const n = c.includes(g) ? c.filter((x) => x !== g) : [...c, g]; try { localStorage.setItem(GROUP_KEY, JSON.stringify(n)); } catch (e) { /* */ } return n; });
  const name = user?.user_metadata?.username || user?.email?.split("@")[0] || "admin";
  const w = mini ? MINI_W : PC.sideW;
  return (
    <nav aria-label="Quản trị" data-testid="pc-sidebar" data-mini={mini ? "1" : "0"} style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: w, background: PC.side, color: "#FFFFFF", padding: mini ? "18px 10px" : "18px 12px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", overflowX: "hidden", zIndex: 30, transition: "width .18s ease, padding .18s ease" }}>
      <div style={{ display: "flex", flexDirection: mini ? "column" : "row", alignItems: "center", gap: 10, padding: mini ? "0 0 10px 0" : "0 0 14px 8px" }}>
        <img src="/logo.png" alt="" data-testid="pc-logo" width={34} height={34} style={{ width: 34, height: 34, borderRadius: 10, objectFit: "cover", flexShrink: 0, boxShadow: "0 0 0 1px rgba(255,255,255,0.25), 0 4px 10px rgba(0,10,40,0.35)" }} />
        {!mini && <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}><span style={{ fontSize: 15, fontWeight: 900, whiteSpace: "nowrap" }}>Fipilot AI</span><span style={{ fontSize: 11, opacity: 0.7 }}>Quản trị</span></span>}
        <button type="button" data-testid="pc-side-toggle" onClick={onToggle} className="pc-nav" aria-label={mini ? "Mở rộng thanh bên" : "Thu gọn thanh bên"} title={mini ? "Mở rộng thanh bên" : "Thu gọn thanh bên"} aria-expanded={!mini}
          style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.10)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, padding: 0 }}>{chevSvg(!mini)}</button>
      </div>
      {PC_NAV.map((g) => {
        const items = g.items.filter((i) => !i.superOnly || isSuperAdmin);
        const hasOn = items.some((i) => i.id === section);
        const shut = !mini && closed.includes(g.group) && !hasOn;
        const sum = shut ? items.reduce((a, i) => a + (i.badge ? counts[i.badge] || 0 : 0), 0) : 0;
        const gid = g.group.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return (
        <div key={g.group} data-testid={`pc-group-${gid}`} data-open={shut ? "0" : "1"} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {mini ? <span aria-hidden="true" style={{ height: 1, background: "rgba(255,255,255,0.14)", margin: "8px 8px" }} /> : (
            <button type="button" data-testid={`pc-group-btn-${gid}`} className="pc-nav pc-grp" onClick={() => toggleGroup(g.group)} aria-expanded={!shut} title={hasOn ? "Nhóm đang mở trang hiện tại" : shut ? "Bấm để mở nhóm" : "Bấm để thu gọn nhóm"}
              style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", border: "none", background: "transparent", color: "#FFFFFF", fontFamily: "inherit", cursor: hasOn ? "default" : "pointer", fontSize: 10, fontWeight: 800, letterSpacing: ".1em", padding: "10px 10px 4px 10px", borderRadius: 8, textAlign: "left", whiteSpace: "nowrap" }}>
              <span style={{ opacity: 0.55 }}>{g.group}</span>
              {shut && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0, opacity: 0.55 }}>· {items.length}</span>}
              {sum > 0 && <span data-testid={`pc-group-badge-${gid}`} style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0, background: PC.badge, color: PC.badgeFg, padding: "0 6px", borderRadius: 999, lineHeight: "16px" }}>{sum > 99 ? "99+" : sum}</span>}
              <span aria-hidden="true" style={{ marginLeft: "auto", opacity: hasOn ? 0.25 : 0.6, display: "inline-flex", transform: shut ? "rotate(-90deg)" : "none", transition: "transform .15s ease" }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg></span>
            </button>
          )}
          {!shut && items.map((i) => {
            const on = section === i.id;
            const n = i.badge ? counts[i.badge] : null;
            return (
              <button key={i.id} data-testid={`pc-nav-${i.id}`} aria-current={on ? "page" : undefined} aria-label={mini ? i.label : undefined} title={mini ? (n > 0 ? `${i.label} · ${n}` : i.label) : undefined} onClick={() => go(i.id)} className="pc-nav"
                style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: mini ? "center" : "flex-start", gap: 10, height: mini ? 40 : 32, padding: mini ? 0 : "0 8px", borderRadius: 9, border: "none", fontSize: 13, fontWeight: on ? 800 : 600, opacity: on ? 1 : 0.85, background: on ? "rgba(255,255,255,0.16)" : "transparent", color: "#FFFFFF", fontFamily: "inherit", textAlign: "left", cursor: "pointer", flexShrink: 0 }}>
                <span aria-hidden="true" data-testid={`pc-nav-ic-${i.id}`} style={{ width: mini ? 28 : 22, height: mini ? 28 : 22, borderRadius: mini ? 8 : 7, background: NAV_IC[i.id]?.[0] || "#334155", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)" }}>{NAV_IC[i.id]?.[1]}</span>
                {!mini && <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i.label}</span>}
                {n > 0 && (mini
                  ? <span data-testid={`pc-badge-${i.id}`} style={{ position: "absolute", top: 2, right: 6, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: PC.badge, color: PC.badgeFg, fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 2px #022B57" }}>{n > 99 ? "99+" : n}</span>
                  : <span data-testid={`pc-badge-${i.id}`} style={{ marginLeft: "auto", fontSize: 11, fontWeight: 800, background: PC.badge, color: PC.badgeFg, padding: "1px 7px", borderRadius: 999 }}>{n}</span>)}
              </button>
            );
          })}
        </div>
        );
      })}
      <div style={{ marginTop: "auto", paddingTop: 12 }}>
        <div data-testid="pc-me" title={mini ? `${name} · ${profile?.adminRole === "super" ? "Super Admin" : "Admin"}` : undefined} style={{ display: "flex", alignItems: "center", justifyContent: mini ? "center" : "flex-start", gap: 8, padding: mini ? "8px 0" : 10, borderRadius: 10, background: "rgba(255,255,255,0.08)", fontSize: 12 }}>
          <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 14, background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0 }}>{initials(name)}</span>
          {mini ? <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{name} · {profile?.adminRole === "super" ? "Super Admin" : "Admin"}</span> : (
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <b style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</b>
              <span style={{ opacity: 0.7 }}>{profile?.adminRole === "super" ? "Super Admin" : "Admin"}</span>
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}

export function PcAdminShell({ adminP, user, profile, appSettings, saveSetting, onOpenApp }) {
  const isSuperAdmin = profile?.adminRole === "super";
  const isAdmin = true;
  const [section, setSection] = useState(() => {
    try { const s = localStorage.getItem(SEC_KEY); return s && LABEL[s] ? s : "home"; } catch (e) { return "home"; }
  });
  const sec = section === "backup" && !isSuperAdmin ? "home" : section;
  // Bấm lại mục đang mở (VD đang soạn bài → bấm "Bài viết") = về trang đầu của mục; có bài chưa lưu thì hỏi trước
  const [nonce, setNonce] = useState(0);
  const go = async (id) => {
    if (window.__fpWebDirty && !(await appConfirm("Bài đang soạn có thay đổi chưa lưu. Vẫn rời trang?", { danger: true }))) return;
    window.__fpWebDirty = false;
    if (id === section) setNonce((n) => n + 1);
    setSection(id); try { localStorage.setItem(SEC_KEY, id); } catch (e) { /* */ } window.scrollTo(0, 0);
  };

  const [mini, setMini] = useState(() => { try { return localStorage.getItem(SIDE_KEY) === "1"; } catch (e) { return false; } });
  const toggleSide = () => setMini((v) => { const n = !v; try { localStorage.setItem(SIDE_KEY, n ? "1" : "0"); } catch (e) { /* */ } return n; });
  const sideW = mini ? MINI_W : PC.sideW;

  const [counts, setCounts] = useState({});
  const refreshCounts = useCallback(() => { loadAdminCounts().then(setCounts).catch(() => {}); }, []);
  useEffect(() => { refreshCounts(); }, [refreshCounts, sec]);
  useEffect(() => { const t = setInterval(refreshCounts, 60_000); return () => clearInterval(t); }, [refreshCounts]);

  const top = (right, title = LABEL[sec], sub = SUB[sec]) => <TopBar title={title} sub={sub} right={right} onOpenApp={onOpenApp} />;
  const uid = user?.id;
  // Báo nhanh góc dưới (thay showToast của app điện thoại)
  const [toast, setToast] = useState(null);
  const showToast = useCallback((t, ms = 3000) => {
    const text = typeof t === "string" ? t : t?.text;
    if (!text) return;
    const id = Date.now();
    setToast({ id, text });
    setTimeout(() => setToast((c) => (c && c.id === id ? null : c)), ms);
  }, []);
  const P = { top, isAdmin, isSuperAdmin, user, profile, appSettings, saveSetting, showToast, refreshCounts, adminP };
  const PAGES = { orders: PcOrders, report_biz: PcReport, behavior: PcBehavior, subscription_settings: PcSubscription, feedback: PcFeedback, notify: PcNotify, templates: PcTemplates, food_cache_pending: PcPending, admin: PcVersion, feature_flags: PcFlags, ai: PcAi, ai_cost: PcAiCost, health: PcHealth, audit_log: PcAudit, backup: PcBackup };

  let page;
  if (sec === "home") page = <PcHome top={top} go={go} counts={counts} refreshCounts={refreshCounts} appSettings={appSettings} />;
  else if (sec === "users") page = <PcUsers top={top} currentUserId={uid} isSuperAdmin={isSuperAdmin} />;
  else if (sec === "food_db") page = <PcFood top={top} isSuperAdmin={isSuperAdmin} />;
  else if (sec === "web_posts") page = <PcWebPosts key={`post${nonce}`} top={top} showToast={showToast} user={user} appSettings={appSettings} kind="post" />;
  else if (sec === "web_pages") page = <PcWebPosts key={`page${nonce}`} top={top} showToast={showToast} user={user} appSettings={appSettings} kind="page" />;
  else if (sec === "web_authors") page = <PcWebAuthors key={nonce} top={top} showToast={showToast} user={user} appSettings={appSettings} />;
  else if (sec === "web_settings") page = <PcWebSettings key={nonce} top={top} showToast={showToast} appSettings={appSettings} go={go} />;
  else if (sec === "web_menu") page = <PcWebMenu key={nonce} top={top} showToast={showToast} />;
  else if (sec === "web_calo") page = <PcWebCalo key={nonce} top={top} showToast={showToast} />;
  else if (sec === "web_seo") page = <PcWebSeo key={nonce} top={top} showToast={showToast} />;
  else if (sec === "web_terms") page = <PcWebTerms key={nonce} top={top} showToast={showToast} />;
  else { const Pg = PAGES[sec] || PcHome; page = <Pg key={sec} {...P} go={go} counts={counts} />; }

  return (
    <div className="pc-root" data-testid="pc-admin" style={{ minHeight: "100vh", background: PC.bg, fontFamily: "Inter, Roboto, -apple-system, 'Segoe UI', sans-serif", color: PC.t1 }}>
      <style>{PC_CSS}</style>
      <SideNav section={sec} go={go} counts={counts} isSuperAdmin={isSuperAdmin} user={user} profile={profile} mini={mini} onToggle={toggleSide} />
      <main data-testid={`pc-page-${sec}`} style={{ marginLeft: sideW, minWidth: 0, transition: "margin-left .18s ease" }}>{page}</main>
      {toast && <div data-testid="pc-toast" role="status" style={{ position: "fixed", bottom: 24, left: `calc(50% + ${sideW / 2}px)`, transform: "translateX(-50%)", zIndex: 60, background: PC.t1, color: "#FFFFFF", fontSize: 13, fontWeight: 700, padding: "10px 16px", borderRadius: 12, boxShadow: "0 8px 24px rgba(15,23,42,0.25)", maxWidth: 520 }}>{toast.text}</div>}
    </div>
  );
}
