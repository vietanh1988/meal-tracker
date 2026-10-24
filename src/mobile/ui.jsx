// Thành phần dùng chung cho giao diện mobile (theo canvas "Fipilot mobile – bản sửa").
// Số đo chép từ bản vẽ: nền #F8FAFC, card viền 1,5px #E2E8F0, bo 14–20, Inter.
import { useEffect, useRef } from "react";
import { C, DK, LT } from "../theme";
import { Glyph, chipBg, IC_COLOR } from "./icons";

export const FONT = "-apple-system, 'system-ui', Inter, 'Inter Fallback', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'";
export const GRAD_BLUE = "linear-gradient(135deg,#1A7CFF,#0062F0,#0050E6)";
export const GRAD_ORANGE = "linear-gradient(135deg,#EA580C,#C2410C)";
export const SR = { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" };

// CSS chung: trạng thái nhấn / focus / hover cho mọi nút trong khung mobile
export const MOBILE_CSS = `
.fpm input[type=search]::-webkit-search-cancel-button,.fpm input[type=search]::-webkit-search-decoration{-webkit-appearance:none;appearance:none;display:none}
.fpm button,.fpm a,.fpm [role=button]{-webkit-tap-highlight-color:transparent;cursor:pointer;touch-action:manipulation}
.fpm [role=dialog]{overscroll-behavior:contain}
.fpm main.fpm-pull::before{content:"";position:absolute;left:50%;width:100vw;transform:translateX(-50%);bottom:100%;height:100vh;background:var(--pull-top,transparent);pointer-events:none}
.fpm button:disabled{cursor:default;opacity:.55}
.fpm button:not(:disabled):active,.fpm a:active,.fpm .tap:active{transform:scale(.97)}
.fpm button,.fpm a,.fpm .tap{transition:transform .08s ease,background-color .15s ease,box-shadow .15s ease}
.fpm :focus-visible{outline:2px solid #007AFF;outline-offset:2px}
.fpm input:focus{border-color:#007AFF !important;background:#FFFFFF !important}
@media (hover:hover){.fpm .row-hover:hover{background:#F8FAFC}.fpm .chip-hover:hover{border-color:#CBD5E1}}
@keyframes fpmSheetUp{from{transform:translateY(24px);opacity:.6}to{transform:none;opacity:1}}
@keyframes fpmFade{from{opacity:0}to{opacity:1}}
@keyframes fpmSlideIn{from{transform:translateX(100%)}to{transform:none}}
@keyframes fpmTabIn{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion: reduce){.fpm [data-anim]{animation:none !important}}
@keyframes fpmToast{from{transform:translate(-50%,12px);opacity:0}to{transform:translate(-50%,0);opacity:1}}
.fpm .hatch{background:repeating-linear-gradient(45deg,#E2E8F0 0,#E2E8F0 4px,#FFFFFF 4px,#FFFFFF 8px)}
@keyframes fpmShimmer{0%{background-position:100% 0}100%{background-position:0 0}}
.fpm .skel{background:linear-gradient(90deg,#E8EEF9 0%,#F4F7FD 40%,#E8EEF9 80%);background-size:250% 100%;animation:fpmShimmer 1.2s ease-in-out infinite}
@media (prefers-reduced-motion: reduce){.fpm .skel{animation:none}}
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
  calendar: (s = 18) => <svg {...svgP} width={s} height={s} viewBox="0 0 24 24" strokeWidth="2.2"><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>,
  calc: (s = 18) => <svg {...svgP} width={s} height={s} viewBox="0 0 24 24" strokeWidth="2.2"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 12h2M12 12h2M8 16h2M12 16h2" /></svg>,
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
// 17/10 (bản vẽ 116): nút + giữa mở menu 3 lựa chọn (addOpen = đang mở → nút thành × nền tối).
export function BottomNav({ tab, onTab, onAdd, hidden, dark, addOpen = false }) {
  return (
    <nav data-testid="bottom-nav" aria-label="Điều hướng chính" aria-hidden={hidden ? true : undefined} style={{ position: "fixed", left: 0, right: 0, bottom: NAV_BOTTOM, zIndex: 90, padding: "0 12px", pointerEvents: "none" }}>
      <div style={{ maxWidth: 536, margin: "0 auto", height: 64, borderRadius: 32, display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", alignItems: "center", boxSizing: "border-box", pointerEvents: "auto",
        background: "rgba(255,255,255,0.94)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: dark ? "0 12px 30px rgba(0,10,40,0.35)" : "0 12px 30px rgba(30,64,175,0.18), 0 0 0 1px rgba(15,23,42,0.04)",
        /* 18/10: bỏ làm mờ nền (blur) — nền đã 94% trắng nên nhìn như cũ, nhưng iPhone không phải tính mờ lại mỗi khung hình khi cuộn */ }}>
        {NAV.map((n) => {
          if (n.id === "add") return (
            <button key="add" data-testid="nav-add" onClick={onAdd} aria-label={addOpen ? "Đóng menu" : "Ghi bữa"} aria-expanded={addOpen} aria-haspopup="menu" style={{ display: "flex", justifyContent: "center", border: "none", background: "transparent", padding: 0, marginTop: -22 }}>
              <span style={{ width: 54, height: 54, borderRadius: 27, background: addOpen ? "#0F172A" : "linear-gradient(135deg,#EA580C,#C2410C)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: addOpen ? "0 8px 18px rgba(15,23,42,0.35)" : "0 8px 18px rgba(234,88,12,0.4)", border: "4px solid #FFFFFF", boxSizing: "border-box", transition: "background .15s ease" }}>{addOpen ? Icon.close(22) : Icon.plus(24, 2.8)}</span>
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
// 18/10: iPhone (Safari) bỏ qua overflow:hidden → màn phía sau vẫn kéo / nảy khi đang mở sheet.
// Ghim body (position:fixed, giữ vị trí cuộn) rồi trả lại đúng chỗ khi đóng; đếm số lớp đang mở để sheet chồng sheet không mở khoá sớm.
let lockN = 0, lockY = 0;
export function useLockScroll(on = true) {
  useEffect(() => {
    if (!on) return;
    const b = document.body;
    if (lockN++ === 0) {
      lockY = window.scrollY || 0;
      Object.assign(b.style, { position: "fixed", top: `-${lockY}px`, left: "0", right: "0", width: "100%", overflow: "hidden" });
    }
    return () => {
      if (--lockN > 0) return;
      lockN = 0;
      Object.assign(b.style, { position: "", top: "", left: "", right: "", width: "", overflow: "" });
      window.scrollTo(0, lockY);
    };
  }, [on]);
}

// Màn phụ toàn màn hình có thanh tiêu đề (nút quay lại 44×44)
// LƯU Ý: chỉ dùng "background" (không kèm backgroundColor: undefined) — React 18 gán chuỗi rỗng cho giá trị undefined
// và xoá màu nền của shorthand → màn phụ trong suốt, lộ màn bên dưới (lỗi 14/10 ở Quản trị, Góp ý admin, trang Thực đơn).
// Màn phụ sáng (16/10): nền xanh nhạt LT như 3 tab sáng (bản vẽ 77), thanh tiêu đề kính mờ trắng; thẻ bên trong trắng phẳng.
// 18/10 (mượt như app): màn phụ trượt vào từ phải; nút ‹ hoặc vuốt từ mép trái → đóng, kèm hiệu ứng trượt ra phải.
// Vuốt mép: chỉ bắt đầu trong 24 px sát mép trái, kéo ngang (không lẫn cuộn dọc); thả quá 35% bề ngang hoặc vuốt nhanh thì đóng.
export function useEdgeBack(onBack) {
  const ref = useRef(null);
  const st = useRef(null);
  const reduce = () => typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Đóng NGAY (trạng thái lớp luôn đúng, bấm nhanh không lệch), còn hiệu ứng trượt ra chạy trên 1 bản chụp tĩnh của màn
  // (bản chụp: không bấm được, ẩn với trình đọc màn hình, bỏ data-testid) — tự xoá sau 0,26 s.
  const back = () => {
    const el = ref.current;
    if (el && !reduce() && typeof document !== "undefined") {
      try {
        const c = el.cloneNode(true);
        c.removeAttribute("data-testid");
        c.querySelectorAll("[data-testid]").forEach((n) => n.removeAttribute("data-testid"));
        c.setAttribute("aria-hidden", "true");
        Object.assign(c.style, { pointerEvents: "none", animation: "none", zIndex: "130" });
        const sc = el.querySelector("div[style*='overflow-y']"), cs = c.querySelector("div[style*='overflow-y']");
        document.body.appendChild(c);
        if (sc && cs) cs.scrollTop = sc.scrollTop;
        requestAnimationFrame(() => { c.style.transition = "transform .22s cubic-bezier(.2,.8,.2,1)"; c.style.transform = "translateX(100%)"; });
        setTimeout(() => c.remove(), 260);
      } catch (e) { /* không có hiệu ứng cũng được */ }
    }
    onBack && onBack();
    // màn chưa đóng (VD hỏi lưu trước khi thoát) → trả về chỗ cũ sau khi vuốt
    requestAnimationFrame(() => { if (ref.current) { ref.current.style.transition = "none"; ref.current.style.transform = ""; } });
  };
  const onTouchStart = (e) => {
    const t = e.touches[0];
    if (e.touches.length !== 1 || !t || t.clientX > 24) { st.current = null; return; }
    st.current = { x: t.clientX, y: t.clientY, t: Date.now(), dx: 0, lock: null };
  };
  const onTouchMove = (e) => {
    const s = st.current, el = ref.current, t = e.touches[0];
    if (!s || !el || !t) return;
    const dx = t.clientX - s.x, dy = t.clientY - s.y;
    if (s.lock == null) { if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; s.lock = Math.abs(dx) > Math.abs(dy) ? "x" : "y"; }
    if (s.lock !== "x") { st.current = null; return; }
    s.dx = Math.max(0, dx);
    el.style.transition = "none";
    el.style.transform = s.dx ? `translateX(${s.dx}px)` : "";
  };
  const onTouchEnd = () => {
    const s = st.current, el = ref.current;
    st.current = null;
    if (!s || !el || s.lock !== "x") return;
    const v = s.dx / Math.max(1, Date.now() - s.t);
    if (s.dx > el.offsetWidth * 0.35 || (s.dx > 40 && v > 0.5)) back();
    else { el.style.transition = "transform .2s ease"; el.style.transform = ""; }
  };
  return { ref, back, edge: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd } };
}

// 24/10 (chủ dự án: "vuốt hết màn nó nảy như app iOS"): nảy cao su khi kéo quá đầu / cuối vùng cuộn của màn phụ.
// Trang ngoài đã khoá nảy (16/10, tránh lộ dải nền) → tự làm: dịch nội dung theo công thức cao su iOS (1 − 1/(x·0,55/h + 1))·h,
// thả tay thì bật về; cuộn quán tính chạm đầu / cuối cũng nảy nhẹ. Chỉ transform lúc đang nảy, xong xoá hẳn (không xô phần tử cố định).
export const rubber = (x, h) => Math.sign(x) * (1 - 1 / ((Math.abs(x) * 0.55) / Math.max(1, h) + 1)) * h;
// Lõi nảy dùng chung: src = nơi nghe chạm / cuộn (vùng cuộn hoặc window), el = khối được dịch, top / end / h = đang ở đầu / cuối, chiều cao.
function bindRubber(src, el, { top, end, h, skip, scrollTop }) {
  if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  let y0 = null, x0 = 0, off = 0, touching = false, lastT = 0, lastY = scrollTop(), v = 0, anim = null, dir = null;
  const set = (y, ease) => {
    el.style.transition = ease ? `transform ${ease}` : "none";
    el.style.transform = y ? `translateY(${y.toFixed(1)}px)` : "";
    el.dataset.rubber = y ? "1" : "";
  };
  const settle = () => {
    if (!off) return;
    off = 0; set(0, ".5s cubic-bezier(.2,.9,.25,1)");
    clearTimeout(anim); anim = setTimeout(() => { el.style.transition = ""; el.style.transform = ""; }, 520);
  };
  const start = (e) => {
    if (e.touches.length !== 1 || (skip && skip(e.target))) { y0 = null; return; }
    touching = true; clearTimeout(anim); y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; dir = null;
  };
  const move = (e) => {
    if (y0 == null || e.touches.length !== 1) return;
    const y = e.touches[0].clientY, d = y - y0;
    if (!dir) { const ax = Math.abs(e.touches[0].clientX - x0), ay = Math.abs(d); if (ax < 6 && ay < 6) return; dir = ax > ay ? "x" : "y"; }
    if (dir !== "y") return;                                          // vuốt ngang (lướt thẻ, vuốt mép quay lại) → không nảy
    if ((d > 0 && top()) || (d < 0 && end())) { off = rubber(d, h()); set(off); }
    else { if (off) { off = 0; set(0); } y0 = y; }
  };
  const fin = () => { touching = false; y0 = null; settle(); };
  const scroll = () => {
    const t = performance.now(), dt = t - lastT || 16, st = scrollTop();
    v = (st - lastY) / dt; lastT = t; lastY = st;
    if (touching || off) return;
    if ((v < -0.4 && top()) || (v > 0.4 && end())) {   // quán tính chạm mép → nảy nhẹ theo tốc độ
      const a = Math.min(48, Math.abs(v) * 22) * (v < 0 ? 1 : -1);
      off = a; set(a, ".14s ease-out"); clearTimeout(anim); anim = setTimeout(settle, 140);
    }
  };
  const ev = [["touchstart", start], ["touchmove", move], ["touchend", fin], ["touchcancel", fin], ["scroll", scroll]];
  for (const [k, f] of ev) src.addEventListener(k, f, { passive: true });
  return () => { clearTimeout(anim); el.style.transform = ""; el.style.transition = ""; for (const [k, f] of ev) src.removeEventListener(k, f); };
}
export function useRubberBand(scRef, inRef) {
  useEffect(() => {
    const sc = scRef.current, el = inRef.current;
    if (!sc || !el) return;
    return bindRubber(sc, el, { top: () => sc.scrollTop <= 0, end: () => sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 1, h: () => sc.clientHeight, scrollTop: () => sc.scrollTop });
  }, [scRef, inRef]);
}
// 24/10: 4 tab chính cuộn cả trang (window) → nảy khối <main>; bỏ qua chạm trong hộp thoại / màn phụ / tấm trượt (chúng tự cuộn).
// Khoảng hở phía trên khi kéo xuống được tô màu header của tab (main::before, biến --pull-top) → không lộ dải nền nhạt (lỗi 16/10).
export function useWindowRubber(mainRef, on = true, key) {
  useEffect(() => {
    const el = mainRef.current;
    if (!on || !el || typeof window === "undefined") return;
    const de = document.documentElement;
    return bindRubber(window, el, {
      top: () => (window.scrollY || 0) <= 0, end: () => (window.scrollY || 0) + window.innerHeight >= de.scrollHeight - 1, h: () => window.innerHeight,
      scrollTop: () => window.scrollY || 0, skip: (t) => !!(t && t.closest && t.closest('[role=dialog],[data-testid=subpage],[data-no-rubber]')) || !el.contains(t),
    });
  }, [mainRef, on, key]);
}

export function SubPage({ title, subtitle, onBack, right, children, footer, bg = LT.bg, dark }) {
  useLockScroll(true);
  const eb = useEdgeBack(onBack);
  const scRef = useRef(null), inRef = useRef(null);
  useRubberBand(scRef, inRef);
  return (
    <div ref={eb.ref} {...eb.edge} data-anim="1" data-testid="subpage" className={dark ? "fpm fpd" : "fpm"} data-dark={dark ? "1" : undefined} style={{ position: "fixed", inset: 0, zIndex: 120, background: dark ? DK.bg : bg, display: "flex", flexDirection: "column", fontFamily: FONT, color: dark ? DK.t1 : "#0F172A", animation: "fpmSlideIn .28s cubic-bezier(.2,.8,.2,1)", boxShadow: "-10px 0 30px rgba(0,0,0,0.18)" }}>
      <div style={{ flexShrink: 0, background: dark ? "transparent" : "rgba(255,255,255,0.6)", WebkitBackdropFilter: dark ? undefined : "blur(14px)", backdropFilter: dark ? undefined : "blur(14px)", borderBottom: dark ? `1px solid ${DK.line}` : "1px solid rgba(30,64,175,0.08)", paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", alignItems: "center", gap: 6, padding: "10px 8px 10px 4px" }}>
          <button onClick={eb.back} aria-label="Quay lại" style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", color: dark ? "#FFFFFF" : "#007AFF", border: "none", background: "transparent", padding: 0 }}>{Icon.back(22)}</button>
          <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 17, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
            {subtitle && <span style={{ fontSize: 12, fontWeight: 600, color: dark ? DK.t2 : "#64748B" }}>{subtitle}</span>}
          </span>
          {right}
        </div>
      </div>
      <div ref={scRef} data-testid="subpage-scroll" style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "none" }}>
        <div ref={inRef} style={{ maxWidth: 560, margin: "0 auto" }}>{children}</div>
      </div>
      {footer}
    </div>
  );
}

// Thông báo nhỏ nổi phía trên thanh dưới, có nút hành động (Hoàn tác / Sửa)
export function Toast({ toast, bottom = 90 }) {
  if (!toast) return null;
  return (
    <div role="status" data-testid="toast" style={{ position: "fixed", left: "50%", bottom: `calc(${bottom}px + env(safe-area-inset-bottom, 0px))`, transform: "translate(-50%,0)", zIndex: 300, width: "calc(100% - 24px)", maxWidth: 520, background: "#0F172A", color: "#FFFFFF", borderRadius: 14, padding: "10px 8px 10px 14px", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 8px 24px rgba(15,23,42,0.25)", animation: "fpmToast .18s ease", boxSizing: "border-box", fontFamily: FONT }}>
      {/^Đã /.test(toast.text || "") && <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 11, background: "#00C896", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Icon.check(13, 3)}</span>}
      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{toast.text}</span>
      {toast.action && <button data-testid="toast-action" onClick={toast.action.onClick} style={{ height: 36, padding: "0 12px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.14)", color: "#FFFFFF", fontSize: 13, fontWeight: 800, fontFamily: "inherit" }}>{toast.action.label}</button>}
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
  // 18/10: đóng (nút ×, chạm nền tối, vuốt) có hiệu ứng trượt xuống + nền mờ dần, thay vì biến mất ngay
  const closing = useRef(false);
  const close = () => {
    const el = ref.current;
    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!el || reduce) { onClose(); return; }
    if (closing.current) return;
    closing.current = true;
    reset(el, "translateY(100%)");
    const ov = el.parentNode;
    if (ov && ov.style) { ov.style.transition = "opacity .18s ease"; ov.style.opacity = "0"; ov.style.pointerEvents = "none"; }
    setTimeout(() => {
      closing.current = false; onClose();
      requestAnimationFrame(() => { // khối có thể được dùng lại cho lớp kế tiếp → trả kiểu về như cũ
        if (ref.current) { ref.current.style.transition = "none"; ref.current.style.transform = ""; }
        if (ov && ov.style) { ov.style.transition = ""; ov.style.opacity = ""; ov.style.pointerEvents = ""; }
      });
    }, 170);
  };
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
    if (s.dy > 110 || (s.dy > 40 && v > 0.6)) close(); else reset(el);
  };
  return { ref, close, swipe: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd } };
}
// Thanh nắm của sheet: vùng chạm cao 20 px cho dễ kéo
export const SheetHandle = () => <span aria-hidden="true" style={{ alignSelf: "center", width: 56, height: 20, margin: "-6px 0 -8px 0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ width: 40, height: 5, borderRadius: 3, background: "#CBD5E1" }} /></span>;

// Nút phân đoạn thanh thoát (16/10, chủ dự án: "làm thanh thoát lên"): rãnh bo tròn rất nhạt, 1 viên trắng
// trượt mượt sang mục đang chọn, chữ 13 nét vừa; không đổi màu chữ sặc sỡ. opts: [{ value, label, testid }]
// mode "tab" → role tab + aria-selected; mặc định nút bật/tắt aria-pressed. size "sm" cho chỗ hẹp (tiêu đề nhóm).
// dark: dùng trên nền Blue Dark (Tôi, trang con, đăng nhập, onboarding) — rãnh trắng 8%, viên trắng, chữ xanh đậm.
// opts[i].disabled: mục không chọn được (mờ).
export function Seg({ opts, value, onChange, size = "md", mode = "group", ariaLabel, accent, dark = false, style }) {
  const acc = accent || (dark ? "#0040E0" : "#0F172A");
  const n = opts.length || 1;
  const i = Math.max(0, opts.findIndex((o) => o.value === value));
  const h = size === "sm" ? 30 : 36;
  return (
    <div role={mode === "tab" ? "tablist" : "group"} aria-label={ariaLabel}
      style={{ position: "relative", display: "grid", gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, padding: 3, borderRadius: 999, background: dark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)", flexShrink: 0, ...style }}>
      <span aria-hidden="true" style={{ position: "absolute", top: 3, bottom: 3, left: 3, width: `calc((100% - 6px) / ${n})`, borderRadius: 999, background: "#FFFFFF", boxShadow: dark ? "0 2px 10px rgba(0,0,0,0.18)" : "0 1px 2px rgba(15,23,42,0.06), 0 2px 8px rgba(30,64,175,0.08)", transform: `translateX(${i * 100}%)`, transition: "transform .24s cubic-bezier(.2,.8,.2,1)" }} />
      {opts.map((o) => {
        const on = o.value === value;
        const a11y = mode === "tab" ? { role: "tab", "aria-selected": on } : { "aria-pressed": on };
        return (
          <button key={String(o.value)} type="button" data-testid={o.testid} {...a11y} disabled={!!o.disabled} onClick={() => !on && !o.disabled && onChange(o.value)}
            style={{ position: "relative", zIndex: 1, height: h, padding: "0 10px", border: "none", borderRadius: 999, background: "transparent", fontFamily: "inherit", fontSize: size === "sm" ? 12 : 13, fontWeight: on ? 700 : 500, color: on ? acc : dark ? "rgba(255,255,255,0.72)" : "#64748B", opacity: o.disabled ? 0.4 : 1, whiteSpace: "nowrap", transition: "color .2s ease" }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Khung xương lúc đang tải (16/10, bản vẽ 65 – trạng thái chung): khối bo tròn, ánh sáng chạy nhẹ
export const Skel = ({ w = "100%", h = 12, r = 6, style }) => <span aria-hidden="true" className="skel" style={{ display: "block", width: w, height: h, borderRadius: r, flexShrink: 0, ...style }} />;
// Thẻ trống (chưa có dữ liệu): ô icon nhạt + tiêu đề + mô tả + nút hành động (tuỳ chọn)
export function EmptyCard({ icon, title, sub, action, onAction, testid, style }) {
  return (
    <div data-testid={testid} style={{ background: "#FFFFFF", borderRadius: 20, padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center", ...style }}>
      {icon && <span style={{ width: 48, height: 48, borderRadius: 16, background: LT.soft, color: "#0062F0", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>}
      <span style={{ fontSize: 15, fontWeight: 900, color: "#0F172A" }}>{title}</span>
      {sub && <span style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5, maxWidth: 300 }}>{sub}</span>}
      {action && <button onClick={onAction} style={{ marginTop: 4, height: 40, padding: "0 16px", borderRadius: 20, border: "none", background: LT.soft, color: "#0062F0", fontFamily: "inherit", fontSize: 14, fontWeight: 800 }}>{action}</button>}
    </div>
  );
}
