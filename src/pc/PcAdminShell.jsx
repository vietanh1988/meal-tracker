// Quản trị trên máy tính (bản vẽ 117–119, chốt 16/10).
//  - Thanh bên cố định 232 px nền navy, 4 nhóm: TỔNG QUAN · BÁN HÀNG · NỘI DUNG · HỆ THỐNG; số chờ (đơn, góp ý, món AI) hiện ngay trên thanh bên.
//  - Thanh trên 64 px trắng: tiêu đề + dòng phụ + nút bên phải ("Xem app ›" quay lại khung điện thoại).
//  - Nội dung nền #F4F7FC, thẻ trắng bo 14. Mọi mục đều là trang PC riêng src/pc/Pc*.jsx (cùng kiểu 117–119), không còn tab cũ.
//  - Chỉ App render khung này khi isAdmin (user thường không bao giờ tới đây).
import { useCallback, useEffect, useState } from "react";
import { PC } from "../theme";
import { PC_CSS, Btn } from "./pcUI";
import { loadAdminCounts } from "../mobile/AdminHomeScreen";
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

const SEC_KEY = "fp_pc_admin_sec";

// Thứ tự + tên đúng bản vẽ 117. badge = khoá trong loadAdminCounts()
export const PC_NAV = [
  { group: "TỔNG QUAN", items: [{ id: "home", label: "Tổng quan" }] },
  { group: "BÁN HÀNG", items: [{ id: "orders", label: "Đơn hàng", badge: "orders" }, { id: "report_biz", label: "Báo cáo kinh doanh" }, { id: "users", label: "Người dùng" }, { id: "subscription_settings", label: "Gói cước & giới hạn" }] },
  { group: "NỘI DUNG", items: [{ id: "feedback", label: "Góp ý", badge: "feedback" }, { id: "notify", label: "Gửi thông báo" }, { id: "templates", label: "Kho mẫu thực đơn" }, { id: "food_db", label: "Kho thực phẩm" }, { id: "food_cache_pending", label: "Duyệt món AI", badge: "pending" }] },
  { group: "HỆ THỐNG", items: [{ id: "admin", label: "Phiên bản & thông báo" }, { id: "feature_flags", label: "Quản lý tính năng" }, { id: "ai", label: "Kết nối AI" }, { id: "ai_cost", label: "Chi phí AI" }, { id: "health", label: "Sức khoẻ & lỗi" }, { id: "audit_log", label: "Nhật ký admin" }, { id: "backup", label: "Sao lưu", superOnly: true }] },
];
const SUB = {
  orders: "Duyệt đơn chuyển khoản, kích hoạt gói", report_biz: "Doanh thu, gói cước, người dùng", users: "Quản lý tài khoản, gói, quyền",
  subscription_settings: "Giá gói, lượt AI theo gói", feedback: "Góp ý & báo lỗi của người dùng", notify: "Gửi thông báo đẩy tới người dùng",
  templates: "Thực đơn mẫu dùng chung", food_db: "Số trên 100 g · sửa ghi đè số gốc, về gốc được", food_cache_pending: "Món lạ AI đã tính, chờ duyệt vào kho",
  admin: "Số phiên bản, thông báo cập nhật", feature_flags: "Bật / tắt tính năng", ai: "Nhà cung cấp, model, khoá API", ai_cost: "Chi phí gọi AI theo ngày, tính năng, người dùng",
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

function SideNav({ section, go, counts, isSuperAdmin, user, profile }) {
  const name = user?.user_metadata?.username || user?.email?.split("@")[0] || "admin";
  return (
    <nav aria-label="Quản trị" data-testid="pc-sidebar" style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: PC.sideW, background: PC.side, color: "#FFFFFF", padding: "18px 12px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", zIndex: 30 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 14px 8px" }}>
        <span aria-hidden="true" style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(160deg,#2C8DFF,#0040E0)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18, flexShrink: 0 }}>F</span>
        <span style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: 15, fontWeight: 900 }}>Fipilot AI</span><span style={{ fontSize: 11, opacity: 0.7 }}>Quản trị</span></span>
      </div>
      {PC_NAV.map((g) => (
        <div key={g.group} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".1em", opacity: 0.55, padding: "10px 10px 4px 10px" }}>{g.group}</span>
          {g.items.filter((i) => !i.superOnly || isSuperAdmin).map((i) => {
            const on = section === i.id;
            const n = i.badge ? counts[i.badge] : null;
            return (
              <button key={i.id} data-testid={`pc-nav-${i.id}`} aria-current={on ? "page" : undefined} onClick={() => go(i.id)} className="pc-nav"
                style={{ display: "flex", alignItems: "center", gap: 10, height: 32, padding: "0 10px", borderRadius: 9, border: "none", fontSize: 13, fontWeight: on ? 800 : 600, opacity: on ? 1 : 0.85, background: on ? "rgba(255,255,255,0.16)" : "transparent", color: "#FFFFFF", fontFamily: "inherit", textAlign: "left", cursor: "pointer", flexShrink: 0 }}>
                <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 3, background: on ? "#7CC2FF" : "rgba(255,255,255,0.35)", flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i.label}</span>
                {n > 0 && <span data-testid={`pc-badge-${i.id}`} style={{ marginLeft: "auto", fontSize: 11, fontWeight: 800, background: PC.badge, color: PC.badgeFg, padding: "1px 7px", borderRadius: 999 }}>{n}</span>}
              </button>
            );
          })}
        </div>
      ))}
      <div style={{ marginTop: "auto", paddingTop: 12 }}>
        <div data-testid="pc-me" style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.08)", fontSize: 12 }}>
          <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 14, background: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0 }}>{initials(name)}</span>
          <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <b style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</b>
            <span style={{ opacity: 0.7 }}>{profile?.adminRole === "super" ? "Super Admin" : "Admin"}</span>
          </span>
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
  const go = (id) => { setSection(id); try { localStorage.setItem(SEC_KEY, id); } catch (e) { /* */ } window.scrollTo(0, 0); };

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
  const PAGES = { orders: PcOrders, report_biz: PcReport, subscription_settings: PcSubscription, feedback: PcFeedback, notify: PcNotify, templates: PcTemplates, food_cache_pending: PcPending, admin: PcVersion, feature_flags: PcFlags, ai: PcAi, ai_cost: PcAiCost, health: PcHealth, audit_log: PcAudit, backup: PcBackup };

  let page;
  if (sec === "home") page = <PcHome top={top} go={go} counts={counts} refreshCounts={refreshCounts} appSettings={appSettings} />;
  else if (sec === "users") page = <PcUsers top={top} currentUserId={uid} isSuperAdmin={isSuperAdmin} />;
  else if (sec === "food_db") page = <PcFood top={top} isSuperAdmin={isSuperAdmin} />;
  else { const Pg = PAGES[sec] || PcHome; page = <Pg key={sec} {...P} go={go} counts={counts} />; }

  return (
    <div className="pc-root" data-testid="pc-admin" style={{ minHeight: "100vh", background: PC.bg, fontFamily: "Inter, Roboto, -apple-system, 'Segoe UI', sans-serif", color: PC.t1 }}>
      <style>{PC_CSS}</style>
      <SideNav section={sec} go={go} counts={counts} isSuperAdmin={isSuperAdmin} user={user} profile={profile} />
      <main data-testid={`pc-page-${sec}`} style={{ marginLeft: PC.sideW, minWidth: 0 }}>{page}</main>
      {toast && <div data-testid="pc-toast" role="status" style={{ position: "fixed", bottom: 24, left: `calc(50% + ${PC.sideW / 2}px)`, transform: "translateX(-50%)", zIndex: 60, background: PC.t1, color: "#FFFFFF", fontSize: 13, fontWeight: 700, padding: "10px 16px", borderRadius: 12, boxShadow: "0 8px 24px rgba(15,23,42,0.25)", maxWidth: 520 }}>{toast.text}</div>}
    </div>
  );
}
