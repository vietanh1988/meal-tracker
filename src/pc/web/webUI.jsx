// Mảnh giao diện riêng nhóm WEB & BÀI VIẾT (bản vẽ 138, cùng token PC). Số đo chép từ rr/PcWeb.jsx.
import { useEffect, useRef, useState } from "react";
import { PC } from "../../theme";
import { Btn } from "../pcUI";

export const BLUE = "#0062F0";
export const inpStyle = (h = 36) => ({ width: "100%", height: h, borderRadius: 10, border: `1px solid ${PC.field}`, background: "#FFFFFF", padding: "0 12px", fontSize: 13, color: PC.t1, fontFamily: "inherit", boxSizing: "border-box" });

export function Check({ on, onChange, label, testid, disabled, style }) {
  const box = <span aria-hidden="true" style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${on ? BLUE : "#CBD5E1"}`, background: on ? BLUE : "#FFF", color: "#FFF", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, flexShrink: 0 }}>{on ? "✓" : ""}</span>;
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: disabled ? "default" : "pointer", fontSize: 12.5, ...style }}>
      <input type="checkbox" checked={!!on} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} data-testid={testid} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} />
      {box}{label}
    </label>
  );
}
export function Tog({ on, onChange, label, testid }) {
  return (
    <button type="button" role="switch" aria-checked={!!on} data-testid={testid} onClick={() => onChange?.(!on)} style={{ display: "inline-flex", alignItems: "center", gap: 8, border: 0, background: "none", padding: 0, cursor: "pointer", fontSize: 12.5, color: PC.t1, fontFamily: "inherit", textAlign: "left" }}>
      <span style={{ width: 34, height: 20, borderRadius: 10, background: on ? "#16A34A" : "#CBD5E1", position: "relative", display: "inline-block", flexShrink: 0, transition: "background .15s" }}><span style={{ position: "absolute", top: 2, left: on ? 16 : 2, width: 16, height: 16, borderRadius: 8, background: "#FFF", transition: "left .15s" }} /></span>{label}
    </button>
  );
}
export function Radio({ on, onChange, label, testid, name }) {
  return (
    <label style={{ display: "inline-flex", gap: 6, alignItems: "center", cursor: "pointer", fontSize: 12.5 }}>
      <input type="radio" name={name} checked={!!on} onChange={() => onChange?.()} data-testid={testid} style={{ position: "absolute", opacity: 0, width: 1, height: 1 }} />
      <span aria-hidden="true" style={{ width: 16, height: 16, borderRadius: 8, border: `1.5px solid ${on ? BLUE : "#CBD5E1"}`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{on && <span style={{ width: 8, height: 8, borderRadius: 4, background: BLUE }} />}</span>{label}
    </label>
  );
}
export function Score({ n, big }) {
  const c = n >= 80 ? ["#DCFCE7", "#15803D"] : n >= 50 ? ["#FEF3C7", "#B45309"] : ["#FEE2E2", "#B91C1C"];
  return <span style={{ minWidth: big ? 56 : 40, height: big ? 56 : 24, borderRadius: big ? 28 : 12, background: c[0], color: c[1], fontWeight: 900, fontSize: big ? 18 : 12, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 8px" }}>{n ?? "—"}</span>;
}
export function Tabs({ items, on, onChange, testid }) {
  return (
    <div role="tablist" style={{ display: "flex", gap: 2, borderBottom: `1px solid ${PC.headLine}`, padding: "0 12px", whiteSpace: "nowrap", overflowX: "auto" }}>
      {items.map((t, i) => <button key={t} type="button" role="tab" aria-selected={i === on} data-testid={testid ? `${testid}-${i}` : undefined} onClick={() => onChange?.(i)} style={{ padding: "11px 12px", fontSize: 13, fontWeight: i === on ? 800 : 600, color: i === on ? BLUE : PC.t3, border: 0, background: "none", borderBottom: `2px solid ${i === on ? BLUE : "transparent"}`, marginBottom: -1, cursor: "pointer", fontFamily: "inherit" }}>{t}</button>)}
    </div>
  );
}
export const Field = ({ label, children, hint }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <span style={{ fontSize: 12, fontWeight: 800, color: PC.t2 }}>{label}</span>
    {children}
    {hint && <span style={{ fontSize: 11.5, lineHeight: 1.45, color: PC.t4 }}>{hint}</span>}
  </label>
);
export const Count = ({ n, max, min = 0 }) => <span style={{ fontSize: 11.5, fontWeight: 800, color: n >= min && n <= max && n > 0 ? "#15803D" : "#B45309" }}>{n}/{max}</span>;
export function SideBox({ t, children, open: open0 = true, testid }) {
  const [open, setOpen] = useState(open0);
  return (
    <div style={{ borderBottom: `1px solid ${PC.headLine}` }} data-testid={testid}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} style={{ width: "100%", display: "flex", alignItems: "center", padding: "12px 16px", fontSize: 13, fontWeight: 800, border: 0, background: "none", cursor: "pointer", fontFamily: "inherit", color: PC.t1 }}>{t}<span style={{ marginLeft: "auto", color: PC.t4 }}>{open ? "⌃" : "⌄"}</span></button>
      {open && <div style={{ padding: "0 16px 14px 16px", display: "flex", flexDirection: "column", gap: 10, lineHeight: 1.45 }}>{children}</div>}
    </div>
  );
}
export function Modal({ title, onClose, children, width = 640, foot, testid }) {
  // Esc đóng hộp; mở hộp thì đưa con trỏ vào ô đầu tiên
  const box = useRef(null); const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") { e.stopPropagation(); closeRef.current?.(); } };
    window.addEventListener("keydown", h);
    const el = box.current?.querySelector("input:not([type=hidden]),textarea,select"); if (el && !box.current.contains(document.activeElement)) el.focus();
    return () => window.removeEventListener("keydown", h);
  }, []);
  return (
    <div ref={box} role="dialog" aria-modal="true" aria-label={title} data-testid={testid} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 20px", overflowY: "auto" }}>
      <div style={{ width, maxWidth: "100%", background: "#FFF", borderRadius: 16, boxShadow: "0 24px 60px rgba(15,23,42,.3)" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${PC.headLine}` }}><b style={{ fontSize: 15 }}>{title}</b><button type="button" aria-label="Đóng" onClick={onClose} style={{ marginLeft: "auto", border: 0, background: "none", fontSize: 18, cursor: "pointer", color: PC.t3 }}>×</button></div>
        <div style={{ padding: 18 }}>{children}</div>
        {foot && <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 18px", borderTop: `1px solid ${PC.headLine}` }}>{foot}</div>}
      </div>
    </div>
  );
}
export const Lnk = ({ children, red, onClick, testid, href }) => href
  ? <a href={href} target="_blank" rel="noopener" data-testid={testid} style={{ color: red ? PC.danger : BLUE, fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" }}>{children}</a>
  : <button type="button" onClick={onClick} data-testid={testid} style={{ color: red ? PC.danger : BLUE, fontWeight: 700, fontSize: 12, whiteSpace: "nowrap", border: 0, background: "none", padding: 0, cursor: "pointer", fontFamily: "inherit" }}>{children}</button>;
export { Btn };
