// 14/11 (chủ dự án: lịch máy không thấy đã chọn khoảng nào): lịch tháng tự vẽ, tô cả khoảng từ hôm nay → ngày kết thúc.
// Chạm 1 ngày = ngày kết thúc. Chỉ chọn từ hôm nay trở đi. Ngày theo giờ VN (dateVN).
import { useState } from "react";
import { addDays, gymIdxOf } from "../lib/dateVN";

const DOW = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const BLUE = "#0062F0";
const TINT = "#DCE8FF";

function monthStart(s) { return `${s.slice(0, 7)}-01`; }
function nextMonth(s, n) {
  let y = Number(s.slice(0, 4)), m = Number(s.slice(5, 7)) + n;
  while (m > 12) { m -= 12; y += 1; }
  while (m < 1) { m += 12; y -= 1; }
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

export function RangeCal({ start, end, onPick }) {
  const [mon, setMon] = useState(monthStart(end || start));
  const lead = gymIdxOf(mon); // 0 = thứ Hai
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = mon; d.slice(0, 7) === mon.slice(0, 7); d = addDays(d, 1)) cells.push(d);
  while (cells.length % 7) cells.push(null);
  const canPrev = mon > monthStart(start);
  const nav = (on) => ({ width: 34, height: 34, borderRadius: 10, border: "none", background: on ? "#F1F5F9" : "transparent", color: on ? "#0F172A" : "#CBD5E1", fontSize: 18, fontWeight: 800, fontFamily: "inherit" });
  return (
    <div data-testid="mm-cal" style={{ border: "1.5px solid #E2E8F0", borderRadius: 14, padding: "8px 8px 6px" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
        <button type="button" aria-label="Tháng trước" disabled={!canPrev} onClick={() => setMon(nextMonth(mon, -1))} className="tap" style={nav(canPrev)}>‹</button>
        <span data-testid="mm-cal-month" data-month={mon.slice(0, 7)} style={{ flex: 1, textAlign: "center", fontSize: 13.5, fontWeight: 800 }}>Tháng {Number(mon.slice(5, 7))}, {mon.slice(0, 4)}</span>
        <button type="button" aria-label="Tháng sau" onClick={() => setMon(nextMonth(mon, 1))} className="tap" style={nav(true)}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 2 }}>
        {DOW.map((d) => <span key={d} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 800, color: "#94A3B8", padding: "2px 0 4px" }}>{d}</span>)}
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const past = d < start;
          const inR = end && d >= start && d <= end;
          const isS = d === start, isE = d === end;
          const col = i % 7;
          // dải nền liền giữa 2 đầu khoảng (bo ở đầu khoảng, đầu / cuối hàng)
          const band = inR && !(isS && isE);
          const last = addDays(d, 1).slice(0, 7) !== d.slice(0, 7);
          const l = isS || col === 0 || d.endsWith("-01"), r = isE || col === 6 || last;
          return (
            <button key={d} type="button" data-testid={`mm-cal-${d}`} disabled={past} aria-pressed={isE} aria-label={`Đến ngày ${Number(d.slice(8))}/${Number(d.slice(5, 7))}`} onClick={() => onPick(d)}
              style={{ height: 36, padding: 0, border: "none", fontFamily: "inherit", position: "relative", cursor: past ? "default" : "pointer",
                background: !band ? "transparent" : isS ? (col === 6 ? "transparent" : `linear-gradient(90deg, transparent 50%, ${TINT} 50%)`) : isE ? (col === 0 ? "transparent" : `linear-gradient(90deg, ${TINT} 50%, transparent 50%)`) : TINT,
                borderRadius: band && !isS && !isE ? `${l ? 18 : 0}px ${r ? 18 : 0}px ${r ? 18 : 0}px ${l ? 18 : 0}px` : 0 }}>
              <span style={{ width: 34, height: 34, margin: "0 auto", borderRadius: 17, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13.5,
                fontWeight: isS || isE ? 900 : inR ? 800 : 600,
                background: isE ? BLUE : "transparent", color: isE ? "#FFFFFF" : past ? "#CBD5E1" : inR ? "#0B3FA8" : "#0F172A",
                boxShadow: isS && !isE ? `inset 0 0 0 2px ${BLUE}` : "none" }}>{Number(d.slice(8))}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
