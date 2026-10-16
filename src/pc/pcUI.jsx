// Mảnh giao diện dùng chung cho Quản trị PC (bản vẽ 117–119). Số đo chép từ bản vẽ:
//  nút 34 cao · đệm 0 14 · bo 10 · chữ 13/800 | pill 11/800 · đệm 2 8 · bo 999 | ô tìm / bộ lọc 36 cao · bo 10 · viền #E2E8F0
//  bảng: hàng tiêu đề 38 cao · chữ 11/800 #64748B giãn .05em · nền #FAFBFE · kẻ #EEF2FA; dòng ≥ 46 · chữ 12,5 · kẻ #F1F5F9; đệm ngang 16, khe cột 12
import { PC, pcCard } from "../theme";
import { toVNDate, todayVN, nowVNParts, fmtVN } from "../lib/dateVN";

export const PC_CSS = `
.pc-root *{box-sizing:border-box}
.pc-btn{transition:filter .15s ease, background .15s ease}
.pc-btn:hover:not(:disabled){filter:brightness(0.96)}
.pc-btn:disabled{opacity:.5;cursor:default !important}
.pc-btn:focus-visible,.pc-field:focus-within,.pc-row:focus-visible,.pc-nav:focus-visible{outline:2px solid #1A7CFF;outline-offset:2px}
.pc-row{transition:background .12s ease}
.pc-row.pc-click{cursor:pointer}
.pc-row.pc-click:hover{background:${PC.rowSel}}
.pc-nav{transition:background .12s ease, opacity .12s ease}
.pc-nav:hover{background:rgba(255,255,255,0.08)}
.pc-input:focus{border-color:#1A7CFF !important;outline:none}
.pc-num:focus{border-color:#1A7CFF !important;outline:none;box-shadow:0 0 0 3px rgba(26,124,255,0.15)}
`;

const BTN = {
  soft: { background: PC.soft, color: PC.softFg },
  blue: { background: PC.blue, color: "#FFFFFF" },
  green: { background: PC.green, color: "#FFFFFF" },
  danger: { background: PC.dangerBg, color: PC.danger },
  dark: { background: PC.t1, color: "#FFFFFF" },
  light: { background: "#F1F5F9", color: PC.t1 },
};
export function Btn({ kind = "soft", onClick, disabled, testid, children, style, title, type = "button" }) {
  return (
    <button type={type} data-testid={testid} onClick={onClick} disabled={disabled} title={title} className="pc-btn"
      style={{ height: 34, padding: "0 14px", borderRadius: 10, border: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13, fontWeight: 800, fontFamily: "inherit", whiteSpace: "nowrap", cursor: "pointer", ...BTN[kind], ...style }}>
      {children}
    </button>
  );
}

export function Pill({ tone = "gray", children, testid }) {
  const [bg, fg] = PC.pill[tone] || PC.pill.gray;
  return <span data-testid={testid} style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: bg, color: fg, whiteSpace: "nowrap", display: "inline-block", lineHeight: "16px" }}>{children}</span>;
}

export function Card({ children, style, testid }) {
  return <div data-testid={testid} style={{ ...pcCard, ...style }}>{children}</div>;
}

export function SearchBox({ value, onChange, placeholder, width = 200, testid }) {
  return (
    <input data-testid={testid} className="pc-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
      style={{ width, height: 36, borderRadius: 10, background: "#FFFFFF", border: `1px solid ${PC.field}`, padding: "0 12px", fontSize: 13, color: PC.t1, fontFamily: "inherit" }} />
  );
}

// Bộ lọc dạng nút "Gói ▾": chữ hiện trên nút, <select> thật trong suốt phủ lên (bàn phím / trình đọc màn hình dùng được)
export function FilterSelect({ label, value, onChange, options, testid, fontSize = 12 }) {
  const cur = options.find((o) => o.v === value);
  const on = value !== "" && value !== "all" && value != null;
  return (
    <span className="pc-field" style={{ position: "relative", height: 36, padding: "0 12px", borderRadius: 10, background: on ? PC.soft : "#FFFFFF", border: `1px solid ${on ? "#BFD4FF" : PC.field}`, display: "inline-flex", alignItems: "center", gap: 6, fontSize, fontWeight: 700, whiteSpace: "nowrap", color: on ? PC.softFg : PC.t1 }}>
      {on ? `${label}: ${cur?.label ?? value}` : label} ▾
      <select data-testid={testid} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", fontFamily: "inherit" }}>
        {options.map((o) => <option key={o.v} value={o.v}>{o.full || o.label}</option>)}
      </select>
    </span>
  );
}

// Bảng lưới (grid): tiêu đề + dòng dùng chung cột
export const headRow = (cols) => ({ display: "grid", gridTemplateColumns: cols, gap: "0 12px", padding: "0 16px", height: 38, alignItems: "center", fontSize: 11, fontWeight: 800, color: PC.t3, letterSpacing: ".05em", borderBottom: `1px solid ${PC.headLine}`, background: PC.headBg, borderRadius: "14px 14px 0 0" });
export const bodyRow = (cols, sel) => ({ display: "grid", gridTemplateColumns: cols, gap: "0 12px", padding: "0 16px", minHeight: 46, alignItems: "center", fontSize: 13, borderTop: 0, borderLeft: 0, borderRight: 0, borderBottom: `1px solid ${PC.rowLine}`, background: sel ? PC.rowSel : "transparent", width: "100%", fontFamily: "inherit", color: PC.t1, textAlign: "left" });
export const cell = { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12.5 };

export function ErrorBox({ text, onRetry }) {
  return (
    <div data-testid="pc-error" role="alert" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, background: "#FEF2F2", color: PC.danger, fontSize: 13, fontWeight: 600 }}>
      <span style={{ flex: 1, minWidth: 0 }}>{text}</span>
      {onRetry && <Btn kind="danger" onClick={onRetry} testid="pc-retry">Thử lại</Btn>}
    </div>
  );
}

export function Loading({ text = "Đang tải…" }) {
  return <div data-testid="pc-loading" role="status" style={{ padding: 20, textAlign: "center", color: PC.t3, fontSize: 13 }}>{text}</div>;
}

export const secLbl = { fontSize: 11, fontWeight: 800, color: PC.t3, letterSpacing: ".04em" };

// Số kiểu Việt: 1.350.000 · 3,6
export const vnInt = (n) => (Math.round(Number(n) || 0)).toLocaleString("vi-VN");
export const vnDec = (n) => String(Math.round((Number(n) || 0) * 10) / 10).replace(".", ",");
export const vnd = (n) => `${vnInt(n)}đ`;

// Thời điểm (ISO) → "16/10 09:12" theo giờ VN; khác năm nay thì "16/10/2025"
export function fmtDT(iso, { time = true } = {}) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const day = toVNDate(d);
  if (day.slice(0, 4) !== todayVN().slice(0, 4)) return fmtVN(day, true);
  if (!time) return fmtVN(day);
  const { hour, minute } = nowVNParts(d);
  return `${fmtVN(day)} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
