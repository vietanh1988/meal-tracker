// Thành phần dùng chung cho giao diện mobile (theo canvas "Fipilot mobile – bản sửa").
// Số đo chép từ bản vẽ: nền #F8FAFC, card viền 1,5px #E2E8F0, bo 14–20, Inter.
import { useEffect, useRef } from "react";
import { C, DK, LT } from "../theme";
import { Glyph, chipBg, IC_COLOR } from "./icons";

export const FONT = "Inter, Roboto, -apple-system, 'Segoe UI', sans-serif";
export const GRAD_BLUE = "linear-gradient(135deg,#1A7CFF,#0062F0,#0050E6)";
export const GRAD_ORANGE = "linear-gradient(135deg,#EA580C,#C2410C)";
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
  chev: (s = 16, color = "#94A3B8") => <svg {...svgP} stroke={color} width={s} height={s} viewBox="0 0 24 24" strokeWidth="2.2"><path d="M9 6l6 6-6 6" /></svg>,
  down: (s = 14) => <svg {...svgP} width={s} height={s} viewBox="0 0 24 24" strokeWidth="2.4"><path d="M6 9l6 6 6-6" /></svg>,
  check: (s = 14, w = 2.8) => <svg {...svgP} width={s} height={s} viewBox="0 0 24 24" strokeWidth={w}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
  more: (s = 20) => <svg aria-hidden="true" width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>,
  drop: (s = 20) => <svg {...svgP} stroke="#0891B2" width={s} height={s} viewBox="0 0 24 24" strokeWidth="2.2"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" /></svg>,
};

// Thanh điều hướng dưới: Hôm nay · Thực đơn · (+) Ghi bữa · Tiến độ · Tôi
const NAV = [
  { id: "today", label: "Hôm nay", icon: "home" },
  { id: "menu", label: "Thực đơn", icon: "plate" },
  { id: "add" },
  { id: "progress", label: "Tiến độ", icon: "progress" },
  { id: "me", label: "Tôi", icon: "me" },
];
// Thanh nổi kiểu kính (bản vẽ 46/48, chốt 14/10): cách mép 12 px, cao 64, bo 32; mục đang chọn = bong bóng trắng 44 px (không nhãn),
// mục khác icon nét xám + nhãn 10 px. Bộ icon 14/10: mục đang chọn = ô tròn màu riêng của mục (Hôm nay xanh, Thực đơn xanh lá, Tiến độ tím, Tôi xanh ngọc). 14/10 sau soát ảnh: nền thanh trắng 94% (82% còn lộ chữ phía sau),
// bong bóng xanh rất nhạt #EAF2FF để vẫn thấy trên trang nền sáng. Đáy = vùng an toàn iPhone − 14 px (tối thiểu 10 px).
export const NAV_BOTTOM = "max(10px, calc(env(safe-area-inset-bottom, 0px) - 14px))";
export const NAV_SPACE = `calc(64px + ${NAV_BOTTOM} + 14px)`; // chừa chỗ cuối nội dung để không bị thanh che
export function BottomNav({ tab, onTab, onAdd, hidden, dark }) {
  return (
    <nav data-testid="bottom-nav" aria-label="Điều hướng chính" aria-hidden={hidden ? true : undefined} style={{ position: "fixed", left: 0, right: 0, bottom: NAV_BOTTOM, zIndex: 90, padding: "0 12px", pointerEvents: "none" }}>
      <div style={{ maxWidth: 536, margin: "0 auto", height: 64, borderRadius: 32, display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", alignItems: "center", boxSizing: "border-box", pointerEvents: "auto",
        background: "rgba(255,255,255,0.94)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: dark ? "0 12px 30px rgba(0,10,40,0.35)" : "0 12px 30px rgba(30,64,175,0.18), 0 0 0 1px rgba(15,23,42,0.04)",
        WebkitBackdropFilter: "blur(20px)", backdropFilter: "blur(20px)" }}>
        {NAV.map((n) => {
          if (n.id === "add") return (
            <button key="add" onClick={onAdd} aria-label="Ghi bữa" style={{ display: "flex", justifyContent: "center", border: "none", background: "transparent", padding: 0, marginTop: -22 }}>
              <span style={{ width: 54, height: 54, borderRadius: 27, background: "linear-gradient(135deg,#EA580C,#C2410C)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 18px rgba(234,88,12,0.4)", border: "4px solid #FFFFFF", boxSizing: "border-box" }}>{Icon.plus(24, 2.8)}</span>
            </button>
          );
          const a = tab === n.id;
          return (
            <button key={n.id} onClick={() => onTab(n.id)} aria-current={a ? "page" : undefined} aria-label={n.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, border: "none", background: "transparent", padding: 0, minHeight: 56, color: "#475569", fontFamily: "inherit" }}>
              {a
                ? <span style={{ width: 44, height: 44, borderRadius: 22, background: chipBg(IC_COLOR[n.icon]), color: "#FFFFFF", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 12px rgba(0,60,200,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}><Glyph name={n.icon} size={22} stroke={2.2} /></span>
                : <><Glyph name={n.icon} size={22} /><span style={{ fontSize: 10, fontWeight: 600 }}>{n.label}</span></>}
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
// LƯU Ý: chỉ dùng "background" (không kèm backgroundColor: undefined) — React 18 gán chuỗi rỗng cho giá trị undefined
// và xoá màu nền của shorthand → màn phụ trong suốt, lộ màn bên dưới (lỗi 14/10 ở Quản trị, Góp ý admin, trang Thực đơn).
// Màn phụ sáng (16/10): nền xanh nhạt LT như 3 tab sáng (bản vẽ 77), thanh tiêu đề kính mờ trắng; thẻ bên trong trắng phẳng.
export function SubPage({ title, subtitle, onBack, right, children, footer, bg = LT.bg, dark }) {
  useLockScroll(true);
  return (
    <div data-testid="subpage" className={dark ? "fpm fpd" : "fpm"} data-dark={dark ? "1" : undefined} style={{ position: "fixed", inset: 0, zIndex: 120, background: dark ? DK.bg : bg, display: "flex", flexDirection: "column", fontFamily: FONT, color: dark ? DK.t1 : "#0F172A", animation: "fpmFade .15s ease" }}>
      <div style={{ flexShrink: 0, background: dark ? "transparent" : "rgba(255,255,255,0.6)", WebkitBackdropFilter: dark ? undefined : "blur(14px)", backdropFilter: dark ? undefined : "blur(14px)", borderBottom: dark ? `1px solid ${DK.line}` : "1px solid rgba(30,64,175,0.08)", paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", alignItems: "center", gap: 6, padding: "10px 8px 10px 4px" }}>
          <button onClick={onBack} aria-label="Quay lại" style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", color: dark ? "#FFFFFF" : "#007AFF", border: "none", background: "transparent", padding: 0 }}>{Icon.back(22)}</button>
          <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 17, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
            {subtitle && <span style={{ fontSize: 12, fontWeight: 600, color: dark ? DK.t2 : "#64748B" }}>{subtitle}</span>}
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
      {/^Đã /.test(toast.text || "") && <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 11, background: "#00C896", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Icon.check(13, 3)}</span>}
      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{toast.text}</span>
      {toast.action && <button onClick={toast.action.onClick} style={{ height: 36, padding: "0 12px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.14)", color: "#FFFFFF", fontSize: 13, fontWeight: 800, fontFamily: "inherit" }}>{toast.action.label}</button>}
    </div>
  );
}

export const cardBox = { background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 14 };

// Công tắc bật/tắt 52×32 (xanh #00C896 khi bật). Chỉ dùng ở các trang nền tối (Mục tiêu, Lịch tập, Nhắc nhở) → tắt = nền trắng mờ.
export function Toggle({ on, onClick, label, testid }) {
  return (
    <button data-testid={testid} onClick={onClick} aria-label={label} aria-pressed={on}
      style={{ width: 52, height: 32, borderRadius: 16, border: "none", background: on ? "#00C896" : DK.track, boxShadow: on ? "none" : "inset 0 0 0 1px rgba(255,255,255,0.18)", position: "relative", padding: 0, flexShrink: 0, cursor: "pointer", transition: "background .15s" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 26, height: 26, borderRadius: 13, background: "#FFFFFF", transition: "left .15s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
    </button>
  );
}

// Ô icon đặc màu + icon trắng (kiểu Cài đặt iPhone, bản vẽ 48) — dùng trên nền tối
// 14/10 bộ icon 1 style: ô gradient cùng màu + viền sáng trên + bóng mềm (xem mobile/icons.jsx)
export function DkIcon({ color, children, size = 32 }) {
  return <span aria-hidden="true" className="dkic" style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), background: chipBg(color), color: "#FFFFFF", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 3px 8px rgba(0,0,0,0.22)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{children}</span>;
}

// Vuốt xuống để đóng sheet (16/10): kéo từ thanh nắm hoặc bất kỳ chỗ nào khi nội dung đang ở đầu (không cuộn).
// Kéo > 110 px hoặc vuốt nhanh → trượt xuống rồi đóng; kéo ít → bật về. Trả ref gắn vào khung sheet + props chạm.
export function useSwipeClose(onClose) {
  const ref = useRef(null);
  const st = useRef(null);
  const scrolledInside = (target) => {
    for (let el = target; el && el !== ref.current?.parentNode; el = el.parentNode) if (el.scrollTop > 0) return true;
    return false;
  };
  const reset = (el, to = "") => { el.style.transition = "transform .18s ease"; el.style.transform = to; };
  const onTouchStart = (e) => {
    if (!ref.current || e.touches.length !== 1 || scrolledInside(e.target)) { st.current = null; return; }
    st.current = { y: e.touches[0].clientY, t: Date.now(), dy: 0 };
  };
  const onTouchMove = (e) => {
    const s = st.current, el = ref.current;
    if (!s || !el) return;
    const dy = e.touches[0].clientY - s.y;
    s.dy = Math.max(0, dy);
    el.style.transition = "none";
    el.style.transform = s.dy ? `translateY(${s.dy}px)` : "";
  };
  const onTouchEnd = () => {
    const s = st.current, el = ref.current;
    st.current = null;
    if (!s || !el || !s.dy) return;
    const v = s.dy / Math.max(1, Date.now() - s.t);
    if (s.dy > 110 || (s.dy > 40 && v > 0.6)) { reset(el, "translateY(100%)"); setTimeout(onClose, 170); } else reset(el);
  };
  return { ref, swipe: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd } };
}
// Thanh nắm của sheet: vùng chạm cao 20 px cho dễ kéo
export const SheetHandle = () => <span aria-hidden="true" style={{ alignSelf: "center", width: 56, height: 20, margin: "-6px 0 -8px 0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ width: 40, height: 5, borderRadius: 3, background: "#CBD5E1" }} /></span>;
