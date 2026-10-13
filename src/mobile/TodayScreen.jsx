// Màn 1 · Hôm nay (đã chốt). Header dải ngày + kcal còn lại + thanh tiến độ,
// thẻ "bữa đang đến giờ", dòng thời gian cả ngày, ô Nước + Cân nặng.
import { WaterTile } from "../WaterTile";
import { Icon, GRAD_ORANGE, GRAD_BLUE } from "./ui";
import { MEAL_ICON, weekdayStrip, weekdayFull, weekDates, mealWindowLabel, itemName, fmtInt, fmtDec, focusMeal } from "../lib/mobileView";
import { fmtVN } from "../lib/dateVN";

const MONTHS = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

const roundBtn = { width: 36, height: 36, borderRadius: 18, background: "rgba(255,255,255,0.22)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", border: "none", padding: 0, position: "relative" };
const plusBtn = { width: 36, height: 36, borderRadius: 18, border: "1.5px solid #E2E8F0", background: "#FFFFFF", color: "#007AFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, padding: 0, flexShrink: 0, fontFamily: "inherit" };

export function TodayScreen(p) {
  const { date, today, onDate, rows, eaten, targets, dayType, nowMinutes, name, dayLoaded } = p;
  const isToday = date === today;
  const [y, m] = date.split("-");
  const remain = targets.cal - eaten.cal;
  const pct = targets.cal > 0 ? Math.min(100, Math.max(1, Math.round((eaten.cal / targets.cal) * 100))) : 0;
  const focus = isToday ? focusMeal(rows, nowMinutes) : null;
  // Dòng thời gian luôn hiện ĐỦ các bữa (kể cả bữa đang ở thẻ "đến giờ ăn") —
  // trước đây bỏ bữa đó ra khỏi danh sách nên user tưởng mất bữa (VD bữa tối).
  const timeline = rows;
  const allEaten = isToday && rows.length > 0 && rows.every((r) => r.state === "eaten");
  const w = p.weight;

  return (
    <div>
      {/* ===== Header ===== */}
      <div style={{ backgroundImage: "url('/header-bg.webp'), linear-gradient(135deg,#36A3FF,#007AFF,#0057FF)", backgroundSize: "cover, cover", backgroundPosition: "center, center", padding: "calc(env(safe-area-inset-top, 0px) + 12px) 12px 16px 12px", borderRadius: "0 0 24px 24px", display: "flex", flexDirection: "column", gap: 12, color: "#FFFFFF" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 4 }}>
          <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Chào {name}</span>
            <span style={{ fontSize: 16, fontWeight: 800 }}>{MONTHS[Number(m) - 1]}, {y}</span>
          </span>
          {p.onCoach && <button onClick={p.onCoach} aria-label="Hỏi Fipilot AI" style={roundBtn}>{Icon.sparkle(18)}</button>}
          {p.bell}
        </div>

        <div role="tablist" aria-label="Chọn ngày" style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
          {weekDates(date).map((d) => {
            const sel = d === date, future = d > today;
            const has = (p.weekDots || {})[d];
            return (
              <button key={d} role="tab" aria-selected={sel} disabled={future} onClick={() => onDate(d)} aria-label={`${weekdayStrip(d)} ${fmtVN(d)}`}
                style={{ height: 54, borderRadius: 12, border: "none", padding: 0, fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
                  background: sel ? "#FFFFFF" : future ? "transparent" : "rgba(255,255,255,0.12)", color: sel ? "#007AFF" : "#FFFFFF",
                  opacity: future ? 0.55 : 1, boxShadow: sel ? "0 4px 10px rgba(0,0,0,0.12)" : "none" }}>
                <span style={{ fontSize: 11, fontWeight: sel ? 700 : 600, opacity: sel ? 1 : 0.85 }}>{weekdayStrip(d)}</span>
                <span style={{ fontSize: 16, fontWeight: sel ? 900 : 800 }}>{Number(d.slice(8))}</span>
                <span style={{ width: 5, height: 5, borderRadius: 3, background: has ? (sel ? "#007AFF" : "#FFFFFF") : future ? "transparent" : sel ? "#CBD5E1" : "rgba(255,255,255,0.35)" }} />
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 4px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
            <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span data-testid="kcal-remain" data-value={remain} style={{ fontSize: 34, fontWeight: 900, lineHeight: 1 }}>{fmtInt(Math.abs(remain))}</span>
              <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.9 }}>{remain >= 0 ? "kcal còn lại" : "kcal vượt"}</span>
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.9, whiteSpace: "nowrap" }}>{dayType === "rest" ? "Ngày nghỉ" : "Ngày tập"} · {fmtInt(eaten.cal)} / {fmtInt(targets.cal)}</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.25)", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: 8, background: remain < 0 ? "#FACC15" : "#FFFFFF", transition: "width .3s" }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.9 }}>Đạm {eaten.p}/{targets.p} · Tinh bột {eaten.c}/{targets.c} · Béo {eaten.f}/{targets.f} · Xơ {eaten.fiber}/{targets.fiber} g</span>
        </div>
      </div>

      {p.banner}

      {/* ===== Thẻ bữa đang đến giờ ===== */}
      {focus && <FocusCard r={focus} {...p} />}
      {allEaten && (
        <div style={{ margin: "14px 12px 0 12px", background: "#FFFFFF", borderRadius: 20, padding: 16, boxShadow: "0 6px 20px rgba(0,87,255,0.08)", border: "1.5px solid #E2E8F0", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(0,200,150,0.12)", color: "#047857", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Icon.check(24, 2.6)}</span>
          <span style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#047857" }}>ĐÃ GHI ĐỦ BỮA</span>
            <span style={{ fontSize: 16, fontWeight: 900 }}>{fmtInt(eaten.cal)} / {fmtInt(targets.cal)} kcal hôm nay</span>
          </span>
        </div>
      )}

      {/* ===== Dòng thời gian ===== */}
      <div style={{ padding: "16px 16px 6px 16px", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 800 }}>{isToday ? "Cả ngày" : `${weekdayFull(date)} ${fmtVN(date)}`}</span>
        {p.onAIMenu && date >= today && <button onClick={p.onAIMenu} style={{ border: "none", background: "transparent", padding: "10px 0", margin: "-10px 0", fontSize: 12, fontWeight: 700, color: "#7C3AED", fontFamily: "inherit" }}>AI lên thực đơn cả ngày ›</button>}
      </div>
      <div style={{ margin: "0 12px", position: "relative", paddingLeft: 46, opacity: dayLoaded ? 1 : 0.5 }}>
        {timeline.length > 1 && <div style={{ position: "absolute", left: 21, top: 18, bottom: 18, width: 2, background: "#E2E8F0" }} />}
        {timeline.map((r) => <TimelineRow key={r.id} r={r} {...p} />)}
        {timeline.length === 0 && !focus && <div style={{ height: 48, display: "flex", alignItems: "center", fontSize: 13, color: "#64748B" }}>Chưa bật bữa nào — vào Tôi › Lịch tập để bật.</div>}
      </div>

      {/* ===== Nước + Cân nặng ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, margin: "10px 12px 0 12px" }}>
        <WaterTile waterMl={p.waterMl} addWater={p.addWater} kg={w.curKg} isTrainDay={dayType !== "rest"} goalOverride={p.waterGoalOverride} />
        <button data-testid="weight-tile" onClick={p.onWeight} className="tap" style={{ height: 56, borderRadius: 16, background: "linear-gradient(135deg,rgba(250,204,21,0.2),rgba(250,204,21,0.06))", padding: "0 12px", display: "flex", alignItems: "center", gap: 8, border: "none", color: "#0F172A", fontFamily: "inherit", textAlign: "left" }}>
          <img src="/icons/stat_weight.png" alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
          <span style={{ flex: 1, display: "flex", flexDirection: "column", lineHeight: 1.2, minWidth: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#92400E" }}>{w.weighedToday ? "Đã cân hôm nay" : w.sinceLast == null ? "Chưa cân lần nào" : `${w.sinceLast} ngày chưa cân`}</span>
            <span style={{ fontSize: 14, fontWeight: 800, whiteSpace: "nowrap" }}>{fmtDec(w.curKg)} → {fmtDec(w.goalKg)} kg</span>
          </span>
        </button>
      </div>
      <div style={{ height: 24 }} />
    </div>
  );
}

function FocusCard({ r, onLog, onPhoto, onEdit, onToggleEaten, repeatFor, onRepeat, busy, nowMinutes }) {
  const planned = r.state === "planned";
  const rep = !planned ? repeatFor(r.id) : null;
  const label = r.state === "missed" ? "CHƯA GHI" : (r.minutes ?? 0) > nowMinutes + 60 ? "BỮA TIẾP THEO" : "ĐẾN GIỜ ĂN";
  return (
    <div style={{ margin: "14px 12px 0 12px", background: "#FFFFFF", borderRadius: 20, padding: 16, boxShadow: "0 6px 20px rgba(0,87,255,0.08)", border: "1.5px solid #E2E8F0", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(0,122,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><img src={MEAL_ICON[r.id]} alt="" style={{ width: 34, height: 34, objectFit: "contain" }} /></span>
        <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#007AFF" }}>{label} · {mealWindowLabel(r.id, r.time)}</span>
          <span style={{ fontSize: 18, fontWeight: 900 }}>{planned ? `${r.name} · ${fmtInt(r.cal)} kcal` : `${r.name} hôm nay ăn gì?`}</span>
        </span>
      </div>
      {planned && (
        <button onClick={() => onEdit(r.id)} className="tap" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "#F8FAFC", border: "none", color: "#475569", fontFamily: "inherit", textAlign: "left" }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.items.map(itemName).join(", ")}</span>
          {Icon.chev(16)}
        </button>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        {planned ? <>
          <button data-testid={`focus-eat-${r.id}`} disabled={busy} onClick={() => onToggleEaten(r.id, true)} style={{ height: 48, borderRadius: 14, background: GRAD_BLUE, color: "#FFFFFF", fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "none", boxShadow: "0 4px 12px rgba(0,87,255,0.22)", fontFamily: "inherit" }}>{Icon.check(18, 2.6)}Đã ăn</button>
          <button onClick={() => onEdit(r.id)} style={{ height: 48, borderRadius: 14, background: "#F1F5F9", color: "#0F172A", fontSize: 14, fontWeight: 800, border: "none", fontFamily: "inherit" }}>Sửa món</button>
        </> : <>
          <button onClick={() => onPhoto(r.id)} style={{ height: 48, borderRadius: 14, background: GRAD_ORANGE, color: "#FFFFFF", fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "none", boxShadow: "0 4px 12px rgba(234,88,12,0.25)", fontFamily: "inherit" }}>{Icon.camera(18)}Chụp món</button>
          <button onClick={() => onLog(r.id)} style={{ height: 48, borderRadius: 14, background: "#F1F5F9", color: "#0F172A", fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "none", fontFamily: "inherit" }}>{Icon.search(18, "#007AFF")}Tìm món</button>
        </>}
      </div>
      {rep && (
        <button disabled={busy} onClick={() => onRepeat(rep, r.id)} className="tap" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "rgba(0,122,255,0.05)", border: "none", color: "#0F172A", fontFamily: "inherit", textAlign: "left" }}>
          <span style={{ color: "#007AFF", display: "flex" }}>{Icon.redo(16)}</span>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Ăn lại {rep.meal_name ? rep.meal_name.toLowerCase() : "bữa"} {fmtVN(rep.log_date)} · {rep.items.map((i) => itemName(i).toLowerCase()).join(", ")}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#007AFF" }}>{fmtInt(rep.cal)}</span>
        </button>
      )}
    </div>
  );
}

function TimelineRow({ r, onLog, onEdit, onToggleEaten, busy }) {
  const dim = r.state === "missed";
  const timeEl = <span style={{ position: "absolute", left: -46, width: 44, fontSize: 11, fontWeight: 700, color: "#94A3B8", textAlign: "center" }}>{r.time}</span>;
  const icon = <img src={MEAL_ICON[r.id]} alt="" style={{ width: 26, height: 26, objectFit: "contain", opacity: dim ? 0.7 : 1, flexShrink: 0 }} />;
  if (r.state === "eaten" || r.state === "planned") {
    const eaten = r.state === "eaten";
    return (
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, minHeight: 48 }}>
        {timeEl}
        <button onClick={() => onEdit(r.id)} className="tap" style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, minHeight: 48, border: "none", background: "transparent", padding: 0, fontFamily: "inherit", color: "#0F172A", textAlign: "left" }}>
          {icon}
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
            <span style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>{r.name}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: eaten ? "#047857" : "#B45309", whiteSpace: "nowrap" }}>{fmtInt(r.cal)} kcal · {eaten ? "đã ăn" : "chưa ăn"}</span>
            </span>
            <span data-testid={`meal-foods-${r.id}`} style={{ fontSize: 12, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.items.map(itemName).join(", ")}</span>
          </span>
        </button>
        <button data-testid={`eat-${r.id}`} disabled={busy} onClick={() => onToggleEaten(r.id, !eaten)} aria-label={eaten ? `Bỏ đánh dấu đã ăn ${r.name}` : `Đánh dấu đã ăn ${r.name}`} aria-pressed={eaten}
          style={{ ...plusBtn, background: eaten ? "#00C896" : "#FFFFFF", borderColor: eaten ? "#00C896" : "#E2E8F0", color: eaten ? "#FFFFFF" : "#94A3B8" }}>{Icon.check(16, 2.8)}</button>
      </div>
    );
  }
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, height: 48 }}>
      {timeEl}
      {icon}
      <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: dim ? "#475569" : "#0F172A" }}>{r.name}</span>
      {dim && <span style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8" }}>Đã qua giờ</span>}
      <button onClick={() => onLog(r.id)} aria-label={`Ghi ${r.name.toLowerCase()}`} style={plusBtn}>+</button>
    </div>
  );
}
