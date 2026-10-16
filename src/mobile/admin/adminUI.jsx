// Bộ khối dùng chung cho 10 trang con Quản trị trên điện thoại (bản vẽ 98–108, nền tối DK, chốt 16/10).
// Mọi trang con admin mobile chỉ dùng các khối ở đây + Seg/Toggle/DkIcon của ../ui để đồng bộ:
//  - Sec: nhãn nhóm chữ hoa · Card: thẻ kính · Tile: ô số · Pill: nhãn nhỏ · Btn: nút (blue/green/ghost/red)
//  - ReadOnly: 1 dòng vàng "Chế độ chỉ xem" (admin thường) — thay cho nút xám / công tắc bấm không lưu
//  - useConfirm(): hộp thoại xác nhận trong app (thay window.confirm/alert của trình duyệt)
//  - Search, Field, NumInput, ErrorBox (lỗi + Thử lại), Loading (khung xương), Empty
import { useState, useCallback } from "react";
import { DK, dkCard, dkInp } from "../../theme";
import { Icon, Skel } from "../ui";

export const GREEN_G = "linear-gradient(135deg,#16A34A,#059669)";
export const BLUE_G = "linear-gradient(135deg,#1A7CFF,#0062F0,#0050E6)";
export const VIOLET = "#C4B5FD";
export const fmtVND = (n) => `${Math.round(Number(n) || 0).toLocaleString("vi-VN")}đ`;
export const fmtUSD = (n) => `$${(Number(n) || 0).toFixed(2).replace(".", ",")}`;

export const Sec = ({ children, right }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 16px 8px 16px" }}>
    <span style={{ fontSize: 11, fontWeight: 800, color: DK.t3, letterSpacing: "0.08em", textTransform: "uppercase" }}>{children}</span>
    {right}
  </div>
);

export const Card = ({ children, pad = "0 14px", style, testid }) => (
  <div data-testid={testid} style={{ ...dkCard, margin: "0 12px", borderRadius: 18, padding: pad, ...style }}>{children}</div>
);

// Dòng trong Card (có kẻ dưới trừ dòng cuối)
export const Row = ({ children, last, style, onClick, testid }) => {
  const st = { display: "flex", alignItems: "center", gap: 10, minHeight: 54, borderBottom: last ? "none" : `1px solid ${DK.line}`, ...style };
  return onClick
    ? <button data-testid={testid} onClick={onClick} className="tap" style={{ ...st, width: "100%", border: "none", borderBottom: st.borderBottom, background: "transparent", padding: 0, fontFamily: "inherit", color: DK.t1, textAlign: "left" }}>{children}</button>
    : <div data-testid={testid} style={st}>{children}</div>;
};

export const Tile = ({ n, label, color = DK.t1, sub, testid }) => (
  <div data-testid={testid} style={{ ...dkCard, flex: 1, minWidth: 0, borderRadius: 16, padding: 12, display: "flex", flexDirection: "column", gap: 2 }}>
    <span style={{ fontSize: 22, fontWeight: 900, color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n == null ? "–" : n}</span>
    <span style={{ fontSize: 12, color: DK.t2 }}>{label}</span>
    {sub && <span style={{ fontSize: 11, color: DK.t3 }}>{sub}</span>}
  </div>
);
export const Tiles = ({ children, grid }) => (
  <div style={grid ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "12px 12px 0 12px" } : { display: "flex", gap: 8, margin: "12px 12px 0 12px" }}>{children}</div>
);

const PILL = { amber: ["rgba(252,211,77,0.18)", DK.amber], green: ["rgba(74,222,155,0.16)", DK.green], red: ["rgba(255,180,180,0.16)", DK.red], blue: ["rgba(124,194,255,0.16)", DK.link], violet: ["rgba(196,181,253,0.18)", VIOLET], grey: ["rgba(255,255,255,0.10)", DK.t2] };
export const Pill = ({ children, tone = "grey", h = 24, testid }) => {
  const [bg, c] = PILL[tone] || PILL.grey;
  return <span data-testid={testid} style={{ height: h, padding: "0 9px", borderRadius: h / 2, background: bg, color: c, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", flexShrink: 0 }}>{children}</span>;
};

const BTN = {
  blue: { background: BLUE_G, color: "#FFFFFF" },
  green: { background: GREEN_G, color: "#FFFFFF" },
  ghost: { background: "rgba(255,255,255,0.10)", color: "#FFFFFF" },
  red: { background: "rgba(239,68,68,0.16)", color: DK.red },
  redSolid: { background: "linear-gradient(135deg,#EF4444,#DC2626)", color: "#FFFFFF" },
};
export function Btn({ children, kind = "blue", h = 44, flex = 1, disabled, onClick, testid, style, ariaLabel }) {
  return (
    <button data-testid={testid} aria-label={ariaLabel} disabled={disabled} onClick={onClick} className="tap"
      style={{ flex, height: h, borderRadius: 12, border: "none", ...(disabled ? { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" } : BTN[kind]), display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit", fontSize: 14, fontWeight: 800, whiteSpace: "nowrap", padding: "0 12px", minWidth: 0, ...style }}>
      {children}
    </button>
  );
}
export const BtnRow = ({ children, style }) => <div style={{ display: "flex", gap: 8, ...style }}>{children}</div>;

// Chế độ chỉ xem (admin thường) — 1 kiểu cho mọi trang
export const ReadOnly = () => (
  <div data-testid="admin-readonly" style={{ margin: "12px 12px 0 12px", borderRadius: 14, padding: "10px 12px", background: "rgba(252,211,77,0.14)", border: "1px solid rgba(252,211,77,0.35)", display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: DK.amber, fontWeight: 700 }}>
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
    Chế độ chỉ xem — chỉ Super Admin thay đổi được
  </div>
);

export const Note = ({ children, tone = "amber" }) => (
  <div style={{ margin: "10px 12px 0 12px", borderRadius: 14, padding: "10px 12px", background: tone === "amber" ? "rgba(252,211,77,0.14)" : "rgba(255,255,255,0.06)", fontSize: 12, color: tone === "amber" ? DK.amber : DK.t2, lineHeight: 1.5 }}>{children}</div>
);

export function Search({ value, onChange, placeholder, testid }) {
  return (
    <label style={{ margin: "12px 12px 0 12px", height: 46, borderRadius: 23, background: DK.field, border: `1.5px solid ${DK.fieldLine}`, display: "flex", alignItems: "center", gap: 8, padding: "0 14px", color: DK.t3, boxSizing: "border-box" }}>
      {Icon.search(18)}
      <input data-testid={testid} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        style={{ flex: 1, minWidth: 0, height: 40, border: "none", background: "transparent", color: "#FFFFFF", fontFamily: "inherit", fontSize: 16, outline: "none" }} />
    </label>
  );
}

export function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: DK.t2 }}>{label}</span>
      {children}
    </label>
  );
}
export const inp = { ...dkInp };
export const area = { ...dkInp, height: "auto", minHeight: 88, padding: "12px 14px", lineHeight: 1.5, resize: "vertical" };

export function NumInput({ value, onChange, disabled, testid, ariaLabel, dec = true, h = 40 }) {
  return <input data-testid={testid} aria-label={ariaLabel} disabled={disabled} type="text" inputMode={dec ? "decimal" : "numeric"} value={value ?? ""}
    onChange={(e) => onChange(e.target.value.replace(dec ? /[^\d.,]/g : /[^\d]/g, "").slice(0, 8))}
    style={{ ...dkInp, height: h, padding: "0 10px", fontWeight: 700, opacity: disabled ? 0.6 : 1 }} />;
}

// Chip lọc / chọn (trắng khi chọn)
export const Chip = ({ on, children, onClick, testid }) => (
  <button data-testid={testid} aria-pressed={!!on} onClick={onClick} style={{ height: 32, padding: "0 12px", borderRadius: 16, border: "none", background: on ? "#FFFFFF" : DK.chip, color: on ? "#0040E0" : DK.t2, fontFamily: "inherit", fontSize: 13, fontWeight: on ? 800 : 700, whiteSpace: "nowrap", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4 }}>{children}</button>
);
export const ChipRow = ({ children }) => <div style={{ display: "flex", gap: 6, margin: "10px 12px 0 12px", overflowX: "auto", scrollbarWidth: "none" }}>{children}</div>;

export function Loading({ rows = 3 }) {
  return (
    <div data-testid="admin-loading" style={{ display: "flex", flexDirection: "column", gap: 10, margin: "12px 12px 0 12px" }}>
      {Array.from({ length: rows }).map((_, i) => <div key={i} style={{ ...dkCard, borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}><Skel w="45%" h={12} /><Skel w="75%" h={10} /></div>)}
    </div>
  );
}
export function ErrorBox({ text = "Chưa tải được dữ liệu.", onRetry }) {
  return (
    <div data-testid="admin-error" style={{ ...dkCard, margin: "12px 12px 0 12px", borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ fontSize: 14, color: DK.red, fontWeight: 700 }}>{text}</span>
      {onRetry && <Btn kind="ghost" h={40} onClick={onRetry} testid="admin-retry">Thử lại</Btn>}
    </div>
  );
}
export const Empty = ({ children, testid }) => (
  <div data-testid={testid} style={{ ...dkCard, margin: "12px 12px 0 12px", borderRadius: 16, padding: "18px 14px", textAlign: "center", fontSize: 14, color: DK.t2 }}>{children}</div>
);

export const RefreshBtn = ({ onClick, busy }) => (
  <button data-testid="admin-refresh" onClick={onClick} disabled={busy} aria-label="Tải lại" style={{ width: 40, height: 40, borderRadius: 20, border: "none", background: "rgba(255,255,255,0.10)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, opacity: busy ? 0.5 : 1, marginRight: 4 }}>{Icon.redo(18)}</button>
);

// Hộp thoại xác nhận trong app (thay window.confirm). Dùng:
//   const [confirm, dialog] = useConfirm();  ...  if (!(await confirm({ title, text, ok: "Xoá", danger: true }))) return;  ... {dialog}
export function useConfirm() {
  const [st, setSt] = useState(null);
  const confirm = useCallback((o) => new Promise((resolve) => setSt({ ...o, resolve })), []);
  const close = (v) => { st?.resolve(v); setSt(null); };
  const dialog = st ? (
    <div data-testid="admin-confirm" onClick={() => close(false)} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(1,15,35,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 360, borderRadius: 20, background: "#0B2F5C", border: `1px solid ${DK.line}`, boxShadow: "0 20px 50px rgba(0,0,0,0.4)", padding: 18, display: "flex", flexDirection: "column", gap: 10, color: DK.t1 }}>
        <span style={{ fontSize: 17, fontWeight: 900 }}>{st.title}</span>
        {st.text && <span style={{ fontSize: 14, color: DK.t2, lineHeight: 1.5, whiteSpace: "pre-line" }}>{st.text}</span>}
        <BtnRow style={{ marginTop: 6 }}>
          {!st.alert && <Btn kind="ghost" onClick={() => close(false)} testid="admin-confirm-cancel">{st.cancel || "Huỷ"}</Btn>}
          <Btn kind={st.danger ? "redSolid" : "blue"} onClick={() => close(true)} testid="admin-confirm-ok">{st.ok || "Đồng ý"}</Btn>
        </BtnRow>
      </div>
    </div>
  ) : null;
  return [confirm, dialog];
}

// Biểu đồ cột đơn giản (doanh thu 6 tháng, chi phí 14 ngày). bars: [{label, value, hi}]
export function Bars({ bars, h = 120, fmt = (v) => v, showValues = true }) {
  const max = Math.max(1, ...bars.map((b) => Number(b.value) || 0));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: h + (showValues ? 34 : 18), paddingTop: 4 }}>
      {bars.map((b, i) => (
        <span key={i} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          {showValues && <span style={{ fontSize: 10, color: DK.t3, whiteSpace: "nowrap" }}>{fmt(b.value)}</span>}
          <span style={{ width: "72%", height: Math.max(3, Math.round(((Number(b.value) || 0) / max) * h)), borderRadius: "6px 6px 2px 2px", background: b.hi ? "linear-gradient(180deg,#4ADE9B,#16A34A)" : "rgba(124,194,255,0.55)" }} />
          {b.label != null && <span style={{ fontSize: 10, color: b.hi ? DK.t1 : DK.t2, fontWeight: b.hi ? 800 : 600, whiteSpace: "nowrap" }}>{b.label}</span>}
        </span>
      ))}
    </div>
  );
}

// Thanh ngang (chi phí theo tính năng / mô hình)
export const HBar = ({ label, value, pct }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 0" }}>
    <span style={{ display: "flex", justifyContent: "space-between", fontSize: 13, gap: 8 }}><span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span><b>{value}</b></span>
    <span style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)" }}><span style={{ display: "block", width: `${Math.max(2, Math.min(100, pct))}%`, height: 6, borderRadius: 3, background: DK.link }} /></span>
  </div>
);
