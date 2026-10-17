// Ô chọn Tốc độ giảm (bản vẽ 126, 17/10): Chậm / Vừa / Nhanh = 0,25 / 0,5 / 0,75% cân nặng mỗi tuần.
// Dùng ở Tôi › Mục tiêu & macro và bước Mục tiêu của onboarding (nền tối).
import { PACE_PCT } from "../calcMacro";
import { fmtDec } from "../lib/mobileView";
import { addDays, todayVN } from "../lib/dateVN";

export const PACES = [["slow", "Chậm"], ["mid", "Vừa"], ["fast", "Nhanh"]];
export const paceKg = (kg, id) => Math.round((Number(kg) || 0) * PACE_PCT[id] * 10) / 10;

// "tháng 4/2027" — ngày dự kiến đạt cân mục tiêu
export function etaMonth(weeks, today = todayVN()) {
  if (!weeks) return null;
  const [y, m] = addDays(today, weeks * 7).split("-");
  return `tháng ${Number(m)}/${y}`;
}

export function PacePicker({ kg, value, onChange, testid = "pace" }) {
  const cur = PACE_PCT[value] ? value : "mid";
  return (
    <div role="group" aria-label="Tốc độ giảm" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 4, padding: 4, borderRadius: 16, background: "rgba(255,255,255,0.08)" }}>
      {PACES.map(([id, label]) => {
        const on = id === cur;
        return (
          <button key={id} type="button" data-testid={`${testid}-${id}`} aria-pressed={on} onClick={() => !on && onChange(id)}
            style={{ minHeight: 52, borderRadius: 12, border: "none", padding: "6px 4px", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
              background: on ? "#FFFFFF" : "transparent", color: on ? "#0040E0" : "rgba(255,255,255,0.78)", boxShadow: on ? "0 2px 10px rgba(0,0,0,0.18)" : "none" }}>
            <span style={{ fontSize: 15, fontWeight: on ? 900 : 700 }}>{label}</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, opacity: on ? 0.85 : 0.7, whiteSpace: "nowrap" }}>−{fmtDec(paceKg(kg, id))} kg/tuần</span>
          </button>
        );
      })}
    </div>
  );
}
