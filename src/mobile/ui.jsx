// Thành phần dùng chung cho giao diện mobile (theo canvas "Fipilot mobile – bản sửa").
// Số đo chép từ bản vẽ: nền #F8FAFC, card viền 1,5px #E2E8F0, bo 14–20, Inter.
import { useEffect } from "react";
import { C } from "../theme";

export const FONT = "Inter, Roboto, -apple-system, 'Segoe UI', sans-serif";
export const GRAD_BLUE = "linear-gradient(135deg,#36A3FF,#007AFF,#0057FF)";
export const GRAD_ORANGE = "linear-gradient(135deg,#F97316,#EA580C)";
export const SR = { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" };

// CSS chung: trạng thái nhấn / focus / hover cho mọi nút trong khung mobile
export const MOBILE_CSS = `
.fpm button,.fpm a,.fpm [role=button]{-webkit-tap-highlight-color:transparent;cursor:pointer}
.fpm button:disabled{cursor:default;opacity:.55}
.fpm button:not(:disabled):active,.fpm a:active,.fpm .tap:active{transform:scale(.97)}
.fpm button,.fpm a,.fpm .tap{transition:transform .08s ease,background-color .15s ease,box-shadow .15s ease}
.fpm :focus-visible{outline:2px solid #007AFF;outline-offset:2px}
.fpm input:focus{border-color:#007AFF !important;background:#FFFFFF !important}
@media (hover:hover){.fpm .row-hover:hover{background:#F8FAFC}.fpm .chip-hover:hover{border-color:#CBD5E1}}
@keyframes fpmSheetUp{from{transform:translateY(24px);opacity:.6}to{transform:none;opacity:1}}
@keyframes fpmFade{from{opacity:0}to{opacity:1}}
@keyframes fpmToast{from{transform:translate(-50%,12px);opacity:0}to{transform:translate(-50%,0);opacity:1}}
.fpm .hatch{background:repeating-linear-gradient(45deg,#E2E8F0 0,#E2E8F0 4px,#FFFFFF 4px,#FFFFFF 8px)}
`;

const svgP = { "aria-hidden": "true", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" };
export const Icon = {
  sparkle: (s = 18) => <svg {...svgP} width={s} height={s} viewBox="0 0 24 24" strokeWidth="2"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></svg>,
  camera: (s = 18) => <svg {...svgP} width={s} height={s} viewBox="0 0 24 24" strokeWidth="2"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>,
  search: (s = 18, color = "currentColor") => <svg {...svgP} stroke={color} width={s} height={s} viewBox="0 0 24 24" strokeWidth="2.2"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.3-4.3" /></svg>,
  redo: (s = 16) => <svg {...svgP} width={s} height={s} viewBox="0 0 24 24" strokeWidth="2.2"><path d="M4 12a8 8 0 0 1 14-5.3L20 9" /><path d="M20 4v5h-5" /><path d="M20 12a8 8 0 0 1-14 5.3L4 15" /><path d="M4 20v-5h5" /></svg>,
  plus: (s = 24, w = 2.6) => <svg {...svgP} width={s} height={s} viewBox="0 0 24 24" strokeWidth={w}><path d="M12 5v14M5 12h14" /></svg>,
  close: (s = 18) => <svg {...svgP} width={s} height={s} viewBox="0 0 24 24" strokeWidth="2.4"><path d="M6 6l12 12M18 6L6 18" /></svg>,
  back: (s = 22) => <svg {...svgP} width={s} height={s} viewBox="0 0 24 24" strokeWidth="2.4"><path d="M15 6l-6 6 6 6" /></svg>,
  next: (s = 18) => <svg {...svgP} width={s} height={s} viewBox="0 0 24 24" strokeWidth="2.4"><path d="M9 6l6 6-6 6" /></svg>,
  chev: (s = 16) => <svg {...svgP} stroke="#94A3B8" width={s} height={s} viewBox="0 0 24 24" strokeWidth="2.2"><path d="M9 6l6 6-6 6" /></svg>,
  down: (s = 14) => <svg {...svgP} width={s} height={s} viewBox="0 0 24 24" strokeWidth="2.4"><path d="M6 9l6 6 6-6" /></svg>,
  check: (s = 14, w = 2.8) => <svg {...svgP} width={s} height={s} viewBox="0 0 24 24" strokeWidth={w}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
  more: (s = 20) => <svg aria-hidden="true" width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>,
  drop: (s = 20) => <svg {...svgP} stroke="#0891B2" width={s} height={s} viewBox="0 0 24 24" strokeWidth="2.2"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" /></svg>,
};

// Thanh điều hướng dưới: Hôm nay · Thực đơn · (+) Ghi bữa · Tiến độ · Tôi
const NAV = [
  { id: "today", label: "Hôm nay", icon: "/icons/nav_dashboard.png" },
  { id: "menu", label: "Thực đơn", icon: "/icons/nav_meal.png" },
  { id: "add" },
  { id: "progress", label: "Tiến độ", icon: "/icons/nav_progress.png" },
  { id: "me", label: "Tôi", icon: "/icons/nav_profile.png" },
];
export function BottomNav({ tab, onTab, onAdd, hidden }) {
  return (
    <nav aria-label="Điều hướng chính" aria-hidden={hidden ? true : undefined} style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 90, background: "#FFFFFF", borderTop: "1px solid #E2E8F0", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", height: 74, display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", alignItems: "start", paddingTop: 8, boxSizing: "border-box" }}>
        {NAV.map((n) => {
          if (n.id === "add") return (
            <button key="add" onClick={onAdd} aria-label="Ghi bữa" style={{ display: "flex", flexDirection: "column", alignItems: "center", border: "none", background: "transparent", padding: 0, marginTop: -20 }}>
              <span style={{ width: 52, height: 52, borderRadius: 26, background: GRAD_ORANGE, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(234,88,12,0.35)", border: "3px solid #FFFFFF" }}>{Icon.plus(24)}</span>
            </button>
          );
          const a = tab === n.id;
          return (
            <button key={n.id} onClick={() => onTab(n.id)} aria-current={a ? "page" : undefined} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, border: "none", background: "transparent", padding: 0, minHeight: 44, color: a ? "#007AFF" : "#64748B", fontFamily: "inherit" }}>
              <img src={n.icon} alt="" style={{ width: 24, height: 24, objectFit: "contain", opacity: a ? 1 : 0.55 }} />
              <span style={{ fontSize: 11, fontWeight: a ? 800 : 600 }}>{n.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// Khoá cuộn nền khi mở lớp phủ
export function useLockScroll(on = true) {
  useEffect(() => {
    if (!on) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [on]);
}

// Màn phụ toàn màn hình có thanh tiêu đề (nút quay lại 44×44)
export function SubPage({ title, subtitle, onBack, right, children, footer, bg = "#F8FAFC" }) {
  useLockScroll(true);
  return (
    <div className="fpm" style={{ position: "fixed", inset: 0, zIndex: 120, background: bg, display: "flex", flexDirection: "column", fontFamily: FONT, color: "#0F172A", animation: "fpmFade .15s ease" }}>
      <div style={{ flexShrink: 0, background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", alignItems: "center", gap: 6, padding: "10px 8px 10px 4px" }}>
          <button onClick={onBack} aria-label="Quay lại" style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", color: "#007AFF", border: "none", background: "transparent", padding: 0 }}>{Icon.back(22)}</button>
          <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 17, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
            {subtitle && <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>{subtitle}</span>}
          </span>
          {right}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>{children}</div>
      </div>
      {footer}
    </div>
  );
}

// Thông báo nhỏ nổi phía trên thanh dưới, có nút hành động (Hoàn tác / Sửa)
export function Toast({ toast, bottom = 90 }) {
  if (!toast) return null;
  return (
    <div role="status" style={{ position: "fixed", left: "50%", bottom: `calc(${bottom}px + env(safe-area-inset-bottom, 0px))`, transform: "translate(-50%,0)", zIndex: 300, width: "calc(100% - 24px)", maxWidth: 520, background: "#0F172A", color: "#FFFFFF", borderRadius: 14, padding: "10px 8px 10px 14px", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 8px 24px rgba(15,23,42,0.25)", animation: "fpmToast .18s ease", boxSizing: "border-box", fontFamily: FONT }}>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{toast.text}</span>
      {toast.action && <button onClick={toast.action.onClick} style={{ height: 36, padding: "0 12px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.14)", color: "#FFFFFF", fontSize: 13, fontWeight: 800, fontFamily: "inherit" }}>{toast.action.label}</button>}
    </div>
  );
}

export const cardBox = { background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 14 };

// Công tắc bật/tắt 52×32 (xanh #00C896 khi bật)
export function Toggle({ on, onClick, label, testid }) {
  return (
    <button data-testid={testid} onClick={onClick} aria-label={label} aria-pressed={on}
      style={{ width: 52, height: 32, borderRadius: 16, border: "none", background: on ? "#00C896" : "#CBD5E1", position: "relative", padding: 0, flexShrink: 0, cursor: "pointer", transition: "background .15s" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 26, height: 26, borderRadius: 13, background: "#FFFFFF", transition: "left .15s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
    </button>
  );
}
