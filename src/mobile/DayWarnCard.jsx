// 31/10 (chủ dự án chốt bản vẽ "Cảnh báo ăn uống"): thẻ "Đã ghi đủ bữa" có cảnh báo. Số + chữ do src/lib/dayWarn.js dựng.
// Thẻ: lề 14 12 0, ltCard bo 20, pad 16, khe 12 (thẻ gọn khe 10); ô icon 48 bo 16; nhãn 12/700; số 16/900.
// Dòng: viền trên 1px #EEF2FA, pad-top 12; ô chữ 32 bo 10 (12/900); tiêu đề 14/800; phụ 12.5 #64748B; số bên phải 12.5/900.
import { ltCard } from "../theme";
import { GRAD_BLUE, Icon } from "./ui";

const TONE = {
  ok: { bg: "rgba(0,200,150,0.12)", fg: "#047857" },
  warn: { bg: "#FEF3C7", fg: "#B45309" },
  bad: { bg: "#FEE2E2", fg: "#B91C1C" },
};
const ROW = {
  red: ["#FEE2E2", "#B91C1C"], amber: ["#FEF3C7", "#B45309"], blue: ["#EEF4FF", "#0062F0"], grey: ["#F1F5F9", "#475569"],
};
const TAG = { kcal: "Kcal", f: "Béo", c: "Bột", p_low: "Đạm", p_high: "Đạm", fiber: "Xơ", next: "Bữa" };
const alert = <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 7v6M12 17h.01" /></svg>;

export function DayWarnCard({ w, onAct }) {
  if (!w) return null;
  const tn = TONE[w.tone] || TONE.ok;
  return (
    <div data-testid="day-card" data-tone={w.tone} data-full={w.full ? "1" : "0"} style={{ margin: "14px 12px 0 12px", ...ltCard, padding: 16, display: "flex", flexDirection: "column", gap: w.full ? 12 : 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 48, height: 48, borderRadius: 16, background: tn.bg, color: tn.fg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{w.tone === "ok" ? Icon.check(24, 2.6) : alert}</span>
        <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <span data-testid="day-card-label" style={{ fontSize: 12, fontWeight: 700, color: tn.fg, letterSpacing: 0.2 }}>{w.label}</span>
          <span style={{ fontSize: 16, fontWeight: 900 }}>{w.value}</span>
        </span>
      </div>
      {w.rows.length > 0 && (
        <div style={{ borderTop: "1px solid #EEF2FA", paddingTop: w.full ? 12 : 10, display: "flex", flexDirection: "column", gap: w.full ? 12 : 10 }}>
          {w.rows.map((r) => {
            const [bg, fg] = ROW[r.tone] || ROW.grey;
            return (
              <div key={r.k} data-testid="day-warn-row" data-k={r.k} data-tone={r.tone} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span aria-hidden="true" style={{ width: 32, height: 32, borderRadius: 10, background: bg, color: fg, fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{TAG[r.k] || "!"}</span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#0F172A" }}>{r.title}</span>
                  <span style={{ fontSize: 12.5, color: "#64748B", lineHeight: 1.4 }}>{r.sub}</span>
                </span>
                {r.val && <span style={{ fontSize: 12.5, fontWeight: 900, color: fg, whiteSpace: "nowrap", paddingTop: 1 }}>{r.val}</span>}
              </div>
            );
          })}
        </div>
      )}
      {w.action && onAct && (
        <button type="button" data-testid="day-warn-act" onClick={() => onAct(w.action.act)} className="tap" style={{ height: 40, borderRadius: 12, border: "none", background: GRAD_BLUE, color: "#FFFFFF", fontSize: 14, fontWeight: 800, fontFamily: "inherit" }}>{w.action.label}</button>
      )}
    </div>
  );
}
