// Màn 4 · Tiến độ – Ăn uống và Màn 5 · Tiến độ – Cân nặng (đã chốt).
import { useState, useEffect } from "react";
import { GRAD_BLUE, Icon, SR } from "./ui";
import { rangeSummary, weekDates, weekdayStrip, fmtInt, fmtDec, fmtKg, deltaGood } from "../lib/mobileView";
import { addDays, monthRange, dateList, fmtVN, weekRange } from "../lib/dateVN";
import { parseKg } from "../lib/weightMath";
import { appAlert, appConfirm } from "../lib/dialog";

const seg = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 4, padding: 3, background: "#F1F5F9", border: "1.5px solid #E2E8F0", borderRadius: 12 };
const segBtn = (on) => ({ height: 36, borderRadius: 9, border: "none", background: on ? "#FFFFFF" : "transparent", fontFamily: "inherit", fontSize: 14, fontWeight: on ? 800 : 600, color: on ? "#007AFF" : "#475569", boxShadow: on ? "0 1px 3px rgba(0,0,0,0.08)" : "none" });
const navBtn = { width: 40, height: 40, borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#FFFFFF", color: "#007AFF", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 };
const BAR_COLOR = { ok: "#00C896", low: "#FACC15", high: "#EF4444" };
const PCT_COLOR = { ok: "#047857", low: "#A16207", high: "#DC2626" };

export function ProgressScreen(p) {
  const [segId, setSegId] = useState(p.initialSeg || "food");
  useEffect(() => { if (p.initialSeg) setSegId(p.initialSeg); }, [p.initialSeg, p.segNonce]);
  return (
    <div>
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 14px) 12px 10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ fontSize: 20, fontWeight: 900, padding: "0 4px" }}>Tiến độ</span>
        <div role="tablist" style={seg}>
          <button role="tab" aria-selected={segId === "food"} onClick={() => setSegId("food")} style={segBtn(segId === "food")}>Ăn uống</button>
          <button role="tab" aria-selected={segId === "weight"} onClick={() => setSegId("weight")} style={segBtn(segId === "weight")}>Cân nặng</button>
        </div>
        {segId === "food" && <FoodHeader {...p} />}
      </div>
      {segId === "food" ? <FoodPanel {...p} /> : <WeightPanel {...p} />}
      <div style={{ height: 24 }} />
    </div>
  );
}

// Trạng thái khoảng ngày dùng chung giữa header và panel (giữ trong module, đơn giản)
function useRange(p) { return p.range; }

function FoodHeader(p) {
  const { mode, setMode, anchor, setAnchor, today } = p.range;
  const label = mode === "week"
    ? (() => { const r = weekRange(anchor); return `${fmtVN(r.start)} – ${fmtVN(r.end)}`; })()
    : `Tháng ${Number(anchor.slice(5, 7))}/${anchor.slice(0, 4)}`;
  const step = (dir) => {
    if (mode === "week") setAnchor(addDays(anchor, dir * 7));
    else { const [y, m] = anchor.split("-").map(Number); const t = y * 12 + (m - 1) + dir; setAnchor(`${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}-01`); }
  };
  const atNow = mode === "week" ? weekRange(anchor).end >= today : monthRange(anchor).end >= today;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button onClick={() => step(-1)} aria-label={mode === "week" ? "Tuần trước" : "Tháng trước"} style={navBtn}>{Icon.back(18)}</button>
      <span style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: 800 }}>{label}</span>
      <button onClick={() => step(1)} disabled={atNow} aria-label={mode === "week" ? "Tuần sau" : "Tháng sau"} style={navBtn}>{Icon.next(18)}</button>
      <div style={{ display: "flex", padding: 3, background: "#F1F5F9", borderRadius: 10, marginLeft: 4 }}>
        {[["week", "Tuần"], ["month", "Tháng"]].map(([id, l]) => (
          <button key={id} aria-pressed={mode === id} onClick={() => { setMode(id); setAnchor(today); }} style={{ height: 34, padding: "0 10px", borderRadius: 8, border: "none", background: mode === id ? "#FFFFFF" : "transparent", fontFamily: "inherit", fontSize: 12, fontWeight: mode === id ? 800 : 600, color: mode === id ? "#0F172A" : "#475569" }}>{l}</button>
        ))}
      </div>
    </div>
  );
}

function FoodPanel(p) {
  const { mode, anchor, today } = useRange(p);
  const [rows, setRows] = useState(null);
  const dates = mode === "week" ? weekDates(anchor) : (() => { const r = monthRange(anchor); return dateList(r.start, r.end); })();
  const start = dates[0], end = dates[dates.length - 1];
  useEffect(() => {
    let alive = true;
    setRows(null);
    p.getDailyLogs(start, end).then((d) => { if (alive) setRows(d || []); });
    return () => { alive = false; };
  }, [start, end, p.dataVersion]);

  const sum = rangeSummary(rows || [], dates, p.targetOf);
  const passed = dates.filter((d) => d <= today).length;
  const lineCal = p.lineCal;
  const max = Math.max(lineCal / 0.75, ...sum.days.map((d) => Math.max(d.cal, d.planCal)));
  const H = 128;
  const h = (v) => Math.max(3, Math.min(H, Math.round((v / max) * H)));
  const month = mode === "month";
  const hasHigh = sum.days.some((d) => d.status === "high");
  const listed = sum.days.filter((d) => d.mealCount > 0).reverse();

  return (
    <>
      <div style={{ margin: "0 12px", background: "#FFFFFF", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 12, opacity: rows ? 1 : 0.6 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: "#007AFF" }}>{fmtInt(sum.avg)}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>kcal TB/ngày · đạt {sum.okCount}/{sum.loggedCount} · ghi {sum.loggedCount}/{passed} ngày</span>
        </div>
        <div role="img" aria-label={`Biểu đồ kcal từng ngày, mục tiêu ${fmtInt(lineCal)} kcal`} style={{ position: "relative", height: H, display: "grid", gridTemplateColumns: `repeat(${dates.length}, minmax(0, 1fr))`, gap: month ? 2 : 8, alignItems: "end", borderBottom: "1px solid #E2E8F0" }}>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: h(lineCal), borderTop: "2px dashed #007AFF" }} />
          <span style={{ position: "absolute", right: 0, bottom: h(lineCal) + 4, fontSize: 11, fontWeight: 800, color: "#007AFF", background: "#FFFFFF", padding: "0 4px" }}>{fmtInt(lineCal)}</span>
          {sum.days.map((d) => {
            if (d.status === "planned") return <div key={d.date} className="hatch" title={`${fmtVN(d.date)}: có thực đơn ${d.planCal} kcal`} style={{ height: h(d.planCal), borderRadius: month ? "3px 3px 0 0" : "6px 6px 0 0", border: "1.5px solid #CBD5E1", borderBottom: "none", boxSizing: "border-box" }} />;
            if (d.status === "none") return <div key={d.date} style={{ height: 3, background: "#E2E8F0" }} />;
            return <button key={d.date} onClick={() => p.openDay(d.date)} aria-label={`${fmtVN(d.date)}: ${d.cal} kcal`} style={{ height: h(d.cal), borderRadius: month ? "3px 3px 0 0" : "6px 6px 0 0", background: BAR_COLOR[d.status], border: "none", padding: 0 }} />;
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${dates.length}, minmax(0, 1fr))`, gap: month ? 2 : 8, marginTop: -6, fontSize: 11, fontWeight: 600, color: "#64748B", textAlign: "center" }}>
          {dates.map((d) => {
            const day = Number(d.slice(8));
            const show = !month || day === 1 || day % 7 === 1;
            const strong = sum.days.find((x) => x.date === d)?.mealCount > 0 || d === today;
            return <span key={d} style={{ fontWeight: strong ? 800 : 600, color: strong ? "#0F172A" : "#64748B", whiteSpace: "nowrap", overflow: "visible" }}>{show ? (month ? day : weekdayStrip(d)) : ""}</span>;
          })}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, fontWeight: 600, color: "#475569" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: BAR_COLOR.ok }} />Đạt</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: BAR_COLOR.low }} />Thiếu</span>
          {hasHigh && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: BAR_COLOR.high }} />Dư</span>}
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span className="hatch" style={{ width: 10, height: 10, borderRadius: 3, border: "1px solid #CBD5E1", boxSizing: "border-box" }} />Có thực đơn, chưa tick</span>
        </div>
      </div>

      {listed.length > 0 && (
        <div style={{ margin: "10px 12px 0 12px", background: "#FFFFFF", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: "0 12px" }}>
          {listed.map((d, i) => (
            <button key={d.date} onClick={() => p.openDay(d.date)} className="tap" style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", height: 56, boxSizing: "content-box", borderStyle: "solid", borderColor: "#F1F5F9", borderWidth: i < listed.length - 1 ? "0 0 1px 0" : 0, borderRadius: 0, background: "transparent", padding: 0, color: "#0F172A", fontFamily: "inherit", textAlign: "left" }}>
              <span style={{ width: 44, fontSize: 12, fontWeight: 700, color: "#475569", lineHeight: 1.3 }}>{weekdayStrip(d.date)}<br />{fmtVN(d.date)}</span>
              <span style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                {d.eatenCount > 0 ? <>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{fmtInt(d.cal)} kcal</span>
                  <span style={{ fontSize: 12, color: "#64748B" }}>{d.eatenCount}/{d.mealCount} bữa đã ăn</span>
                </> : <>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Chưa tick bữa nào</span>
                  <span style={{ fontSize: 12, color: "#B45309" }}>Có thực đơn {fmtInt(d.planCal)} kcal</span>
                </>}
              </span>
              <span style={{ fontSize: 12, fontWeight: 800, color: d.eatenCount > 0 ? PCT_COLOR[d.status] : "#64748B" }}>{d.eatenCount > 0 ? `${d.pct}%` : "—"}</span>
              {Icon.chev(16)}
            </button>
          ))}
        </div>
      )}
      <p style={{ margin: "10px 16px 0 16px", fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>Chỉ cộng bữa đã tick "Đã ăn". Chạm một ngày để xem và sửa.</p>
    </>
  );
}

function WeightPanel({ weightLog, weight, profile, setProfile, addWeight, updateWeight, deleteWeight }) {
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [showAll, setShowAll] = useState(false);
  const w = weight;
  const list = [...(weightLog || [])].reverse();
  const shown = showAll ? list : list.slice(0, 4);
  const lastId = weightLog.length ? weightLog[weightLog.length - 1].id : null;

  const saveToday = async () => {
    const kg = parseKg(val);
    if (!kg) { appAlert("Cân nặng không hợp lệ (30–250 kg)"); return; }
    setBusy(true);
    const r = await addWeight(kg);
    setBusy(false);
    if (!r) { appAlert("Lưu không được, thử lại sau."); return; }
    setProfile({ ...profile, kg });
    setVal("");
  };
  const saveEdit = async (row) => {
    const kg = parseKg(editVal);
    if (!kg) { appAlert("Cân nặng không hợp lệ (30–250 kg)"); return; }
    setBusy(true);
    const ok = await updateWeight(row.id, kg);
    setBusy(false);
    if (!ok) { appAlert("Lưu không được, thử lại sau."); return; }
    if (row.id === lastId) setProfile({ ...profile, kg });
    setEditId(null);
  };
  const del = async (row) => {
    if (!(await appConfirm(`Xoá lần cân ${fmtDec(row.kg)} kg ngày ${row.date}?`))) return;
    setBusy(true);
    await deleteWeight(row.id);
    setBusy(false);
    if (row.id === lastId && weightLog.length > 1) setProfile({ ...profile, kg: weightLog[weightLog.length - 2].kg });
    setEditId(null);
  };
  const dColor = (d) => { const g = deltaGood(d, w.goalKg, w.startKg); return g == null ? "#64748B" : g ? "#00A67E" : "#DC2626"; };
  const per = w.perWeek != null ? ` · ≈ ${w.perWeek > 0 ? "+" : ""}${fmtDec(w.perWeek)} kg/tuần` : "";

  return (
    <>
      <div style={{ margin: "0 12px", background: "#FFFFFF", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 26, fontWeight: 900 }}>{fmtDec(w.curKg)} kg</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#475569", flex: 1 }}>→ {fmtDec(w.goalKg)} kg</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#007AFF" }}>{w.pct}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: "#E2E8F0", overflow: "hidden" }}><div style={{ width: `${w.pct}%`, height: 6, background: "linear-gradient(90deg,#36A3FF,#007AFF,#0057FF)" }} /></div>
        {w.startDate && <span style={{ fontSize: 12, color: "#475569" }}>Từ {fmtDec(w.startKg)} kg ({w.startDate}) · {w.change > 0 ? "+" : ""}{fmtDec(w.change)} kg / {fmtDec(w.weeks)} tuần{per}</span>}
        <div style={{ display: "flex", gap: 8, paddingTop: 2 }}>
          <label style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6, height: 44, padding: "0 12px", background: "#F1F5F9", border: "1.5px solid #E2E8F0", borderRadius: 10, boxSizing: "border-box" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B", whiteSpace: "nowrap" }}>Hôm nay</span>
            <input data-testid="weight-input" type="text" inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value.replace(",", ".").replace(/[^0-9.]/g, "").slice(0, 5))} onKeyDown={(e) => e.key === "Enter" && saveToday()} placeholder={String(w.curKg || "")}
              style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", textAlign: "right", fontFamily: "inherit", fontSize: 16, fontWeight: 700, color: "#0F172A", outline: "none" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#64748B" }}>kg</span>
          </label>
          <button data-testid="weight-save" onClick={saveToday} disabled={busy || !val} style={{ height: 44, padding: "0 18px", borderRadius: 10, border: "none", background: GRAD_BLUE, color: "#FFFFFF", fontFamily: "inherit", fontSize: 14, fontWeight: 900 }}>Lưu</button>
        </div>
        {w.weighedToday && <span style={{ fontSize: 12, color: "#64748B", marginTop: -4 }}>Hôm nay đã cân — lưu lần nữa sẽ sửa số hôm nay.</span>}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "14px 16px 6px 16px" }}>
        <span style={{ fontSize: 15, fontWeight: 800 }}>Lịch sử</span>
        {list.length > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>Chạm một dòng để sửa</span>}
      </div>
      <div style={{ margin: "0 12px", background: "#FFFFFF", border: "1.5px solid #E2E8F0", borderRadius: 14, padding: "0 12px" }}>
        {list.length === 0 && <div style={{ height: 52, display: "flex", alignItems: "center", fontSize: 13, color: "#64748B" }}>Chưa có lần cân nào.</div>}
        {shown.map((r, i) => editId === r.id ? (
          <div key={r.id} style={{ margin: "0 -12px", padding: "10px 12px 12px 12px", background: "rgba(0,122,255,0.05)", borderTop: "1.5px solid #007AFF", borderBottom: "1.5px solid #007AFF", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#007AFF", flex: 1 }}>Đang sửa · Tuần {r.week}</span>
              <button onClick={() => del(r)} disabled={busy} style={{ height: 32, padding: "0 10px", border: "none", background: "transparent", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: "#DC2626" }}>Xoá</button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ flex: 1, display: "flex", alignItems: "center", height: 40, padding: "0 10px", background: "#FFFFFF", border: "1.5px solid #CBD5E1", borderRadius: 8, boxSizing: "border-box", fontSize: 15, fontWeight: 600, color: "#475569" }}>{weekdayStrip(r.logged_date)} {r.date}</span>
              <label style={{ width: 88, display: "flex", alignItems: "center", height: 40, padding: "0 10px", background: "#FFFFFF", border: "1.5px solid #007AFF", borderRadius: 8, boxSizing: "border-box" }}>
                <span style={SR}>Cân nặng kg</span>
                <input autoFocus type="text" inputMode="decimal" value={editVal} onChange={(e) => setEditVal(e.target.value.replace(",", ".").replace(/[^0-9.]/g, "").slice(0, 5))} onKeyDown={(e) => e.key === "Enter" && saveEdit(r)}
                  style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", textAlign: "right", fontFamily: "inherit", fontSize: 16, fontWeight: 800, color: "#0F172A", outline: "none" }} />
              </label>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setEditId(null)} style={{ flex: 1, height: 40, borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#FFFFFF", fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Huỷ</button>
              <button onClick={() => saveEdit(r)} disabled={busy} style={{ flex: 2, height: 40, borderRadius: 10, border: "none", background: "#007AFF", fontFamily: "inherit", fontSize: 14, fontWeight: 900, color: "#FFFFFF" }}>Lưu</button>
            </div>
          </div>
        ) : (
          <button key={r.id} onClick={() => { setEditId(r.id); setEditVal(String(r.kg)); }} className="tap" style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", height: 52, boxSizing: "content-box", borderStyle: "solid", borderColor: "#F1F5F9", borderWidth: i < shown.length - 1 ? "0 0 1px 0" : 0, background: "transparent", padding: 0, fontFamily: "inherit", color: "#0F172A", textAlign: "left" }}>
            <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Tuần {r.week}</span>
              <span style={{ fontSize: 12, color: "#64748B" }}>{weekdayStrip(r.logged_date)} {fmtVN(r.logged_date)}</span>
            </span>
            <span style={{ fontSize: 15, fontWeight: 800 }}>{fmtKg(r.kg)}</span>
            <span style={{ width: 40, textAlign: "right", fontSize: 12, fontWeight: 800, color: dColor(r.delta) }}>{r.delta ? `${r.delta > 0 ? "+" : "−"}${fmtDec(Math.abs(r.delta))}` : "—"}</span>
          </button>
        ))}
      </div>
      {list.length > 4 && <button onClick={() => setShowAll(!showAll)} style={{ display: "block", margin: "6px auto 0 auto", height: 40, padding: "0 16px", border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "#007AFF" }}>{showAll ? "Thu gọn" : `Xem tất cả ${list.length} lần cân`}</button>}
    </>
  );
}
