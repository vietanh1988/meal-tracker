// Tiến độ › Kết quả (bản vẽ 131e, flow giảm cân): đo bằng thứ khách cảm nhận — kg đã giảm, còn bao nhiêu,
// ngày dự kiến đạt, vòng eo (chỉ khi có đo), chuỗi ngày ghi, mốc ăn mừng. Ảnh trước/sau: để sau.
import { AppIcon, IC_COLOR } from "./icons";
import { ltCard, LT } from "../theme";
import { fmtDec } from "../lib/mobileView";
import { etaMonth } from "./PacePicker";
import { milestones } from "../lib/lossPlan";

const card = { margin: "0 12px", ...ltCard };
const secHead = { padding: "20px 18px 10px 18px", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 };
const secTitle = { fontSize: 17, fontWeight: 900, letterSpacing: -0.2 };

export function LossResult({ weight, macro, measures = [], streak = 0, onWeigh, onMeasure }) {
  const w = weight || {};
  const lost = Math.round(((Number(w.startKg) || 0) - (Number(w.curKg) || 0)) * 10) / 10;
  const left = Math.max(0, Math.round(((Number(w.curKg) || 0) - (Number(w.goalKg) || 0)) * 10) / 10);
  const span = (Number(w.startKg) || 0) - (Number(w.goalKg) || 0);
  const pct = span > 0 ? Math.max(2, Math.min(100, Math.round((lost / span) * 100))) : 0;
  const eta = etaMonth(macro?.etaWeeks);
  const wm = (measures || []).filter((r) => r.waist != null);
  const waistFrom = wm.length >= 2 ? Number(wm[0].waist) : null, waistTo = wm.length >= 2 ? Number(wm[wm.length - 1].waist) : null;
  const miles = milestones({ startKg: w.startKg, curKg: w.curKg, goalKg: w.goalKg, waistFrom, waistTo });
  const weeks = Math.max(0, Math.round(Number(w.weeks) || 0));
  const head = lost > 0 ? `ĐÃ GIẢM${weeks >= 1 ? ` SAU ${weeks} TUẦN` : ""}` : "BẮT ĐẦU HÀNH TRÌNH";
  return (
    <div data-testid="loss-result">
      <div style={{ margin: "4px 12px 0 12px", borderRadius: 22, padding: 16, background: "linear-gradient(135deg,#10B981,#047857)", color: "#FFFFFF", display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 800, opacity: 0.9 }}>{head}</span>
        <span data-testid="loss-lost"><span style={{ fontSize: 40, fontWeight: 900 }}>{lost > 0 ? `−${fmtDec(lost)}` : fmtDec(w.curKg)}</span><span style={{ fontSize: 16, fontWeight: 800 }}> kg</span></span>
        <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.92 }}>{left > 0 ? `Còn ${fmtDec(left)} kg nữa là tới ${fmtDec(w.goalKg)} kg 💪` : `Đã tới ${fmtDec(w.goalKg)} kg — chúc mừng! 🎉`}</span>
      </div>
      <button onClick={onWeigh} className="tap" style={{ ...card, marginTop: 14, width: "calc(100% - 24px)", padding: 16, display: "flex", flexDirection: "column", gap: 10, border: "none", fontFamily: "inherit", textAlign: "left", color: "#0F172A", boxSizing: "border-box" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
          <AppIcon name="scale" color={IC_COLOR.weight} size={44} />
          <span style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <span style={{ fontSize: 20, fontWeight: 900 }}>{fmtDec(w.curKg)} kg <span style={{ fontSize: 13, fontWeight: 700, color: "#64748B" }}>→ {fmtDec(w.goalKg)} kg</span></span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#047857" }}>{eta ? `Dự kiến đạt ${eta}` : "Cân mỗi tuần để app tính ngày đạt"}</span>
          </span>
        </span>
        <span style={{ height: 8, width: "100%", borderRadius: 4, background: LT.soft, overflow: "hidden", display: "block" }}><span style={{ display: "block", width: `${pct}%`, height: 8, borderRadius: 4, background: "linear-gradient(90deg,#34D399,#059669)" }} /></span>
        <span style={{ display: "flex", width: "100%", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "#94A3B8" }}><span>Bắt đầu {fmtDec(w.startKg)} kg</span><span>Còn {fmtDec(left)} kg</span></span>
      </button>
      <div style={{ margin: "12px 12px 0 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {waistFrom != null ? (
          <div data-testid="loss-waist" style={{ ...ltCard, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}><AppIcon name="progress" color="#0D9488" size={36} /><span style={{ fontSize: 12, color: "#64748B", fontWeight: 700 }}>Vòng eo</span><span style={{ fontSize: 22, fontWeight: 900, color: waistTo <= waistFrom ? "#047857" : "#B45309" }}>{waistTo <= waistFrom ? "−" : "+"}{fmtDec(Math.abs(waistTo - waistFrom))} cm</span><span style={{ fontSize: 12, color: "#64748B" }}>{fmtDec(waistFrom)} → {fmtDec(waistTo)} cm</span></div>
        ) : (
          <button onClick={onMeasure} data-testid="loss-waist-empty" style={{ ...ltCard, padding: 14, display: "flex", flexDirection: "column", gap: 8, border: "none", fontFamily: "inherit", textAlign: "left", color: "#0F172A" }}><AppIcon name="progress" color="#0D9488" size={36} /><span style={{ fontSize: 12, color: "#64748B", fontWeight: 700 }}>Vòng eo</span><span style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.35 }}>Đo eo để thấy mỡ giảm rõ hơn</span><span style={{ fontSize: 12, color: "#0062F0", fontWeight: 800 }}>+ Đo</span></button>
        )}
        <div data-testid="loss-streak" style={{ ...ltCard, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}><AppIcon name="bolt" color="#EA580C" size={36} /><span style={{ fontSize: 12, color: "#64748B", fontWeight: 700 }}>Chuỗi ngày ghi</span><span style={{ fontSize: 22, fontWeight: 900 }}>{streak} ngày</span><span style={{ fontSize: 12, color: "#64748B" }}>{streak > 0 ? "liên tục" : "ghi bữa hôm nay để bắt đầu"}</span></div>
      </div>
      <div style={secHead}><span style={secTitle}>Mốc của bạn</span></div>
      <div style={{ ...card, padding: 12, display: "flex", gap: 6 }}>
        {miles.map((m) => (
          <span key={m.k} data-testid={`loss-mile-${m.k}`} data-done={m.done ? "1" : "0"} style={{ flex: 1, borderRadius: 12, padding: "10px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 800, textAlign: "center", background: m.done ? "#ECFDF5" : LT.soft, color: m.done ? "#047857" : "#94A3B8" }}>
            <span style={{ width: 26, height: 26, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", background: m.done ? "#059669" : "#FFFFFF", color: "#FFFFFF", fontSize: 14 }}>{m.done ? "✓" : ""}</span>{m.label}
          </span>
        ))}
      </div>
    </div>
  );
}
