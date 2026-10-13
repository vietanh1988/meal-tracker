import { useState, useRef, useEffect } from "react";
import { waterGoalMl } from "./lib/dayPlan";

// Ô "Nước" theo bản vẽ Hôm nay (Main): cao 56, bo 16, nền xanh nhạt, nút + 40×40 thêm 1 ly 250 ml.
// Sau khi thêm, hiện "Hoàn tác" 4 giây để bấm nhầm thì trừ lại.
const fmtL = (ml) => (Math.round(ml / 10) / 100).toLocaleString("vi-VN", { maximumFractionDigits: 2 });

export function WaterTile({ waterMl = 0, addWater, kg, isTrainDay, goalOverride, style }) {
  const goal = waterGoalMl(kg, isTrainDay, goalOverride);
  const [undo, setUndo] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const pct = Math.min(100, Math.round((waterMl / goal) * 100));
  const done = waterMl >= goal;

  const add = async (ml) => {
    if (!addWater || busy) return;
    setBusy(true);
    await addWater(ml);
    setBusy(false);
    clearTimeout(timer.current);
    if (ml > 0) { setUndo(true); timer.current = setTimeout(() => setUndo(false), 4000); }
    else setUndo(false);
  };

  return (
    <div style={{ position: "relative", height: 56, borderRadius: 16, overflow: "hidden", background: "linear-gradient(135deg,rgba(90,200,250,0.16),rgba(90,200,250,0.06))", padding: "0 6px 0 12px", display: "flex", alignItems: "center", gap: 8, boxSizing: "border-box", ...style }}>
      <div aria-hidden="true" style={{ position: "absolute", left: 0, bottom: 0, height: 3, width: `${pct}%`, background: done ? "#00C896" : "#5AC8FA", transition: "width .3s" }} />
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0891B2" strokeWidth="2.2" strokeLinejoin="round"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" /></svg>
      <span style={{ flex: 1, display: "flex", flexDirection: "column", lineHeight: 1.2, minWidth: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#0E7490" }}>{done ? "Nước · đủ rồi 👍" : "Nước"}</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#0F172A" }}>{fmtL(waterMl)} / {fmtL(goal)} L</span>
      </span>
      {undo && <button onClick={() => add(-250)} disabled={busy} style={{ height: 32, padding: "0 10px", borderRadius: 10, border: "none", background: "rgba(255,255,255,0.7)", color: "#0E7490", fontSize: 12, fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }}>Hoàn tác</button>}
      <button aria-label="Thêm 1 ly nước 250 ml" onClick={() => add(250)} disabled={busy} style={{ width: 40, height: 40, borderRadius: 12, border: "none", background: "#FFFFFF", color: "#0891B2", fontSize: 20, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", opacity: busy ? 0.6 : 1, flexShrink: 0 }}>+</button>
    </div>
  );
}
