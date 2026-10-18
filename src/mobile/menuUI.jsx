// Mảnh giao diện dùng chung cho Thực đơn (bản vẽ 90–97, chốt 16/10):
// khối tổng kcal (xanh / tím) có 3 ô macro, thẻ bữa có ô icon, chọn thứ trong tuần, sheet đáy, nút phẳng.
import { fmtInt } from "../lib/mobileView";
import { mealLabel, MEAL_ORDER, sumItems } from "../lib/mealMath";
import { WEEK_SHORT } from "../lib/menuView";
import { MealIcon, chipBg } from "./icons";
import { GRAD_BLUE, useLockScroll, useSwipeClose, SheetHandle } from "./ui";
import { hasUnit, portionOf } from "../lib/portion";
import { formatFoodPortion } from "../lib/aiMenuService";
import { getFoodDisplay } from "../lib/localFoodDB";

// Tên + khẩu phần hiển thị: đơn vị của món (bát, quả…) nếu có, không thì theo kho món, cuối cùng là gram
export const foodName = (it) => it.display || getFoodDisplay(it.food) || it.food || it.name || "Món";
export function portionText(it) {
  const g = Math.round(Number(it.gram) || 0);
  if (it.qty_display) return it.qty_display;
  if (hasUnit(it)) { const p = portionOf(it); return `${p.label} ${p.unit}`; }
  if (it.unit === "ml") return `${g} ml`;
  if (!g) return "";
  return formatFoodPortion(it.food, g).replace(/(\d)\.(\d)/g, "$1,$2").replace(/(\d)g/g, "$1 g");
}

export const PURPLE = "linear-gradient(135deg,#7C3AED,#5B21B6)";
export const GREEN = "#059669";
export const DT = { train: "Ngày tập", rest: "Ngày nghỉ" };

const sv = { "aria-hidden": "true", fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" };
export const MI = {
  layers: (s = 18) => <svg {...sv} width={s} height={s} viewBox="0 0 24 24" strokeWidth="2.2"><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></svg>,
  trash: (s = 16) => <svg {...sv} width={s} height={s} viewBox="0 0 24 24" strokeWidth="2.2"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>,
  alert: (s = 15) => <svg {...sv} width={s} height={s} viewBox="0 0 24 24" strokeWidth="2.4"><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></svg>,
  food: (s = 20) => <svg {...sv} width={s} height={s} viewBox="0 0 24 24" strokeWidth="2.2"><path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 3-3 6s1 4 3 4v8" /></svg>,
  target: (s = 20) => <svg {...sv} width={s} height={s} viewBox="0 0 24 24" strokeWidth="2.2"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /></svg>,
  bolt: (s = 20) => <svg {...sv} width={s} height={s} viewBox="0 0 24 24" strokeWidth="2.2"><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>,
};

// Ô icon gradient (giống AppIcon) cho glyph riêng của Thực đơn
export function Chip({ color, size = 36, children }) {
  return <span aria-hidden="true" style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), background: chipBg(color), color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 10px ${color}4D` }}>{children}</span>;
}

export const pill = (bg = "rgba(255,255,255,0.18)", color = "#FFFFFF") => ({ height: 30, padding: "0 10px", borderRadius: 15, border: "none", background: bg, color, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", fontFamily: "inherit" });

// Nút phẳng: primary (xanh), purple, soft (xanh nhạt), grey, danger (đỏ nhạt), white
export const fbtn = (kind = "primary", disabled = false, h = 52) => {
  const map = {
    primary: [GRAD_BLUE, "#FFFFFF"], purple: [PURPLE, "#FFFFFF"], soft: ["#EEF4FF", "#0062F0"], grey: ["#F1F5F9", "#0F172A"],
    danger: ["#FEF2F2", "#DC2626"], white: ["#FFFFFF", "#6D28D9"],
  };
  const [bg, c] = disabled ? ["#E2E8F0", "#64748B"] : map[kind] || map.primary;
  return { height: h, borderRadius: 14, border: "none", background: bg, color: c, fontFamily: "inherit", fontSize: kind === "soft" || kind === "grey" || kind === "danger" ? 14 : 15, fontWeight: kind === "soft" || kind === "grey" || kind === "danger" ? 800 : 900, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "0 12px", boxSizing: "border-box" };
};

export function MacroTiles({ p, c, f }) {
  const t = (l, v) => (
    <span style={{ flex: 1, borderRadius: 12, background: "rgba(255,255,255,0.16)", padding: "6px 8px", display: "flex", flexDirection: "column" }}>
      <span style={{ fontSize: 10, opacity: 0.85 }}>{l}</span>
      <span style={{ fontSize: 15, fontWeight: 900 }}>{fmtInt(v)}<span style={{ fontSize: 10, opacity: 0.8 }}> g</span></span>
    </span>
  );
  return <div style={{ display: "flex", gap: 6 }}>{t("Đạm", p)}{t("Tinh bột", c)}{t("Béo", f)}</div>;
}

// Khối tổng kcal (bản vẽ 93/95): số to / mục tiêu, thanh tiến (tuỳ chọn), 3 ô macro, dòng phụ / cảnh báo
export function SumCard({ grad = GRAD_BLUE, title, cal, target, macros, sub, warn, warnAction, bar, testid, dataCal, pct }) {
  return (
    <div data-testid={testid} data-cal={dataCal} style={{ borderRadius: 22, padding: 16, background: grad, color: "#FFFFFF", display: "flex", flexDirection: "column", gap: 10 }}>
      {title && <span style={{ fontSize: 13, fontWeight: 800, opacity: 0.9 }}>{title}</span>}
      <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span><span style={{ fontSize: 32, fontWeight: 900 }}>{fmtInt(cal)}</span>{target ? <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}> / {fmtInt(target)} kcal</span> : <span style={{ fontSize: 13, fontWeight: 700 }}> kcal</span>}</span>
        {pct != null && <span style={{ fontSize: 12, fontWeight: 800, opacity: 0.9 }}>{pct}%</span>}
      </span>
      {bar != null && <span style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.22)", overflow: "hidden", display: "block" }}><span style={{ display: "block", width: `${Math.max(2, Math.min(100, bar))}%`, height: 8, background: "#FFFFFF" }} /></span>}
      {macros && <MacroTiles {...macros} />}
      {sub && <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.92, lineHeight: 1.4 }}>{sub}</span>}
      {warn && (
        <span style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 10px", borderRadius: 12, background: "rgba(250,204,21,0.22)", fontSize: 12, fontWeight: 700, lineHeight: 1.35 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>{MI.alert(15)}<span>{warn}</span></span>
          {warnAction}
        </span>
      )}
    </div>
  );
}

export const totalsOf = (meals) => (meals || []).reduce((a, m) => { const t = sumItems(m.items); return { cal: a.cal + t.cal, p: a.p + t.p, c: a.c + t.c, f: a.f + t.f }; }, { cal: 0, p: 0, c: 0, f: 0 });

export const Warn = ({ children }) => (
  <span style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 14, background: "#FFF7E6", color: "#92400E", fontSize: 12, fontWeight: 700, lineHeight: 1.4 }}>{MI.alert(15)}<span>{children}</span></span>
);

// Thẻ 1 bữa (bản vẽ 95/96): ô icon bữa + tên + kcal, các món: tên · khẩu phần, kcal; right(it) = nút đổi (93)
export function MealCard({ meal, portion, name, right, testid, kcalColor = "#0062F0" }) {
  const items = (meal.items || []).filter((i) => (Number(i.gram) || 0) > 0 || (Number(i.cal) || 0) > 0);
  const cal = Math.round(items.reduce((s, i) => s + (Number(i.cal) || 0), 0));
  return (
    <div data-testid={testid} style={{ background: "#FFFFFF", borderRadius: 20, padding: "4px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, height: 54, borderBottom: items.length ? "1px solid #EEF2FA" : "none" }}>
        <MealIcon id={meal.meal_id} size={32} />
        <span style={{ flex: 1, fontSize: 15, fontWeight: 900 }}>{mealLabel(meal.meal_name, meal.meal_id)}</span>
        <span style={{ fontSize: 14, fontWeight: 900, color: kcalColor }}>{fmtInt(cal)} kcal</span>
      </div>
      {items.map((it, i) => (
        <div key={`${it.food || it.name}-${i}`} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: right ? 48 : 40, borderBottom: i === items.length - 1 ? "none" : "1px solid #EEF2FA" }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis" }}>{name(it)}{portion(it) ? <span style={{ fontWeight: 500, color: "#64748B" }}> · {portion(it)}</span> : null}</span>
          <span style={{ fontSize: 13, color: "#64748B", fontWeight: right ? 700 : 500 }}>{fmtInt(it.cal)}</span>
          {right && right(it)}
        </div>
      ))}
    </div>
  );
}
export const sortedMeals = (meals) => (meals || []).filter((m) => (m.items || []).length > 0).sort((a, b) => MEAL_ORDER.indexOf(a.meal_id) - MEAL_ORDER.indexOf(b.meal_id));

// Chọn thứ (bản vẽ 96/97): ô to kèm Tập/Nghỉ; khác loại ngày = nét đứt, không bấm được
export function DayPicker({ isOk, days, onToggle, dayTypeOf, testid = "save-week" }) {
  return (
    <div role="group" aria-label="Chọn thứ" style={{ display: "flex", gap: 5 }}>
      {WEEK_SHORT.map((d, i) => {
        const ok = isOk(i), on = days.includes(i);
        const st = on ? { background: "#0062F0", color: "#FFFFFF", border: "none" } : ok ? { background: "#EEF4FF", color: "#0F172A", border: "none" } : { background: "transparent", color: "#CBD5E1", border: "1.5px dashed #E2E8F0" };
        return (
          <button key={d} data-testid={`${testid}-${i}`} disabled={!ok} aria-pressed={on} onClick={() => onToggle(i)}
            style={{ flex: 1, minWidth: 0, height: 56, borderRadius: 14, boxSizing: "border-box", padding: 0, fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, opacity: 1, ...st }}>
            <span style={{ fontSize: 14, fontWeight: 900 }}>{d}</span>
            {dayTypeOf && <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.8 }}>{dayTypeOf(i) === "train" ? "Tập" : "Nghỉ"}</span>}
          </button>
        );
      })}
    </div>
  );
}

// Sheet đáy dùng chung (91 / 94 / 97)
export function Sheet({ testid, onClose, children, max = "88vh", z = 220 }) {
  useLockScroll(true);
  const { ref, swipe, close: swClose } = useSwipeClose(onClose);
  return (
    <div onClick={swClose} style={{ position: "fixed", inset: 0, zIndex: z, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "fpmFade .15s ease" }}>
      <div ref={ref} {...swipe} data-testid={testid} onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, maxHeight: max, overflowY: "auto", overscrollBehavior: "contain", background: "#FFFFFF", borderRadius: "24px 24px 0 0", padding: "8px 16px calc(env(safe-area-inset-bottom, 0px) + 16px) 16px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 12, animation: "fpmSheetUp .2s ease", color: "#0F172A" }}>
        <SheetHandle />
        {children}
      </div>
    </div>
  );
}
export const CloseX = ({ onClick }) => (
  <button onClick={onClick} aria-label="Đóng" style={{ width: 34, height: 34, borderRadius: 17, border: "none", background: "#F1F5F9", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, padding: 0, flexShrink: 0, fontFamily: "inherit" }}>×</button>
);
export const Lbl = ({ children }) => <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", color: "#64748B" }}>{children}</span>;

// Ô chọn trong sheet (91 / 94): nền xám nhạt, chọn = nền màu nhạt + dấu tick (không viền)
export function OptRow({ on, color = "#0062F0", soft = "#EEF4FF", icon, title, sub, right, onClick, testid }) {
  return (
    <button data-testid={testid} aria-pressed={on} onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 62, padding: "0 12px", borderRadius: 16, border: "none", background: on ? soft : "#F8FAFC", fontFamily: "inherit", textAlign: "left", color: "#0F172A", flexShrink: 0, width: "100%" }}>
      {icon}
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 15, fontWeight: on ? 900 : 800 }}>{title}</span>
        {sub && <span style={{ fontSize: 12, color: "#64748B" }}>{sub}</span>}
      </span>
      {right}
      {on ? <span style={{ width: 24, height: 24, borderRadius: 12, background: color, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg {...sv} width="13" height="13" viewBox="0 0 24 24" strokeWidth="3"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
        : <span style={{ width: 24, height: 24, borderRadius: 12, border: "2px solid #CBD5E1", boxSizing: "border-box", flexShrink: 0 }} />}
    </button>
  );
}

// Thanh nút dính đáy trong trang con (95/96)
export const StickyFoot = ({ children }) => (
  <div style={{ position: "sticky", bottom: 0, marginTop: 14, background: "rgba(255,255,255,0.92)", WebkitBackdropFilter: "blur(14px)", backdropFilter: "blur(14px)", borderTop: "1px solid rgba(30,64,175,0.08)", padding: "10px 12px calc(env(safe-area-inset-bottom, 0px) + 12px) 12px", display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
);
