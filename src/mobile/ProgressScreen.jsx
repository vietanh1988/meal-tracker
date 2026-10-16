// Màn 4 · Tiến độ – Ăn uống và Màn 5 · Tiến độ – Cân nặng (đã chốt).
import { useState, useEffect } from "react";
import { GRAD_BLUE, Icon, SR, Seg, Skel, EmptyCard } from "./ui";
import { LT, ltCard } from "../theme";
import { rangeSummary, weekDates, weekdayStrip, fmtInt, fmtDec, fmtKg, deltaGood, weightChart } from "../lib/mobileView";
import { addDays, monthRange, dateList, fmtVN, weekRange, todayVN } from "../lib/dateVN";
import { parseKg } from "../lib/weightMath";
import { appAlert, appConfirm } from "../lib/dialog";
import { MeasurePanel, InsightLine } from "./MeasurePanel";
import { bodyInsight } from "../lib/bodyMeasure";

const navBtn = { width: 40, height: 40, borderRadius: 12, border: "none", boxShadow: "0 2px 8px rgba(30,64,175,0.10)", background: "#FFFFFF", color: "#007AFF", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 };
const BAR_COLOR = { ok: "#059669", low: "#F59E0B", high: "#EF4444" };
const PCT_COLOR = { ok: "#047857", low: "#A16207", high: "#DC2626" };

export function ProgressScreen(p) {
  const [segId, setSegId] = useState(p.initialSeg || "food");
  useEffect(() => { if (p.initialSeg) setSegId(p.initialSeg); }, [p.initialSeg, p.segNonce]);
  return (
    <div>
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 14px) 12px 10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ fontSize: 26, fontWeight: 900, padding: "0 4px" }}>Tiến độ</span>
        <Seg mode="tab" value={segId} onChange={setSegId} opts={[{ value: "food", label: "Nhật ký", testid: "seg-diary" }, { value: "weight", label: "Cân nặng", testid: "seg-weight" }, { value: "measure", label: "Số đo", testid: "seg-measure" }]} />
        {segId === "food" && <FoodHeader {...p} />}
      </div>
      {segId === "food" ? <FoodPanel {...p} /> : segId === "weight" ? <WeightPanel {...p} /> : <MeasurePanel measures={p.measures} profile={p.profile} weightLog={p.weightLog} today={p.range.today} onMeasure={p.onMeasure} onOpenReminders={p.onOpenReminders} />}
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
      <div style={{ display: "flex", padding: 3, background: "rgba(30,64,175,0.07)", borderRadius: 10, marginLeft: 4 }}>
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
      <div data-testid="diary-summary" style={{ margin: "0 12px", ...ltCard, padding: 16, display: "flex", flexDirection: "column", gap: 12, opacity: rows ? 1 : 0.6 }}>
        {/* 16/10 (bản vẽ 86): số TB to + 3 ô nhỏ thay dòng chữ dài */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 30, fontWeight: 900, color: "#0062F0" }}>{fmtInt(sum.avg)}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>kcal TB/ngày</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
          {[["Đạt mục tiêu", `${sum.okCount} / ${sum.loggedCount} ngày`], ["Đã ghi", `${sum.loggedCount} / ${passed} ngày`], ["Mục tiêu", fmtInt(lineCal)]].map(([a, b]) => (
            <span key={a} style={{ borderRadius: 12, background: "#F1F5FB", padding: 8, display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span style={{ fontSize: 11, color: "#64748B" }}>{a}</span><span style={{ fontSize: 15, fontWeight: 900, whiteSpace: "nowrap" }}>{b}</span>
            </span>
          ))}
        </div>
        <div role="img" aria-label={`Biểu đồ kcal từng ngày, mục tiêu ${fmtInt(lineCal)} kcal`} style={{ position: "relative", height: H, display: "grid", gridTemplateColumns: `repeat(${dates.length}, minmax(0, 1fr))`, gap: month ? 2 : 8, alignItems: "end", borderBottom: "1px solid #EEF2FA" }}>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: h(lineCal), borderTop: "1.5px dashed rgba(0,98,240,0.5)" }} />
          <span style={{ position: "absolute", right: 0, bottom: h(lineCal) + 4, fontSize: 11, fontWeight: 800, color: "#0062F0", background: "#FFFFFF", padding: "0 4px" }}>{fmtInt(lineCal)}</span>
          {sum.days.map((d) => {
            if (d.status === "planned") return <div key={d.date} className="hatch" title={`${fmtVN(d.date)}: có thực đơn ${d.planCal} kcal`} style={{ height: h(d.planCal), borderRadius: month ? "3px 3px 0 0" : "6px 6px 0 0", border: "1.5px solid #CBD5E1", borderBottom: "none", boxSizing: "border-box" }} />;
            if (d.status === "none") return <div key={d.date} style={{ height: 3, background: "#E2E8F0" }} />;
            return <button key={d.date} onClick={() => p.openDay(d.date)} aria-label={`${fmtVN(d.date)}: ${d.cal} kcal`} style={{ height: h(d.cal), borderRadius: month ? "3px 3px 1px 1px" : "7px 7px 3px 3px", background: BAR_COLOR[d.status], border: "none", padding: 0 }} />;
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${dates.length}, minmax(0, 1fr))`, gap: month ? 2 : 8, marginTop: -6, fontSize: 11, fontWeight: 600, color: "#64748B", textAlign: "center" }}>
          {dates.map((d) => {
            const day = Number(d.slice(8));
            const show = !month || day === 1 || day % 7 === 1;
            const strong = sum.days.find((x) => x.date === d)?.mealCount > 0 || d === today;
            return <span key={d} style={{ fontWeight: d === today ? 900 : strong ? 800 : 600, color: d === today ? "#0062F0" : strong ? "#0F172A" : "#64748B", whiteSpace: "nowrap", overflow: "visible" }}>{show ? (month ? day : weekdayStrip(d)) : ""}</span>;
          })}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, fontWeight: 600, color: "#475569" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: BAR_COLOR.ok }} />Đạt</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: BAR_COLOR.low }} />Thiếu</span>
          {hasHigh && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: BAR_COLOR.high }} />Dư</span>}
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span className="hatch" style={{ width: 10, height: 10, borderRadius: 3, border: "1px solid #CBD5E1", boxSizing: "border-box" }} />Có thực đơn, chưa tick</span>
        </div>
      </div>

      {rows && listed.length === 0 && (
        <EmptyCard testid="diary-empty" style={{ margin: "10px 12px 0 12px" }} icon={Icon.plus(22)}
          title={mode === "week" ? "Tuần này chưa ghi bữa nào" : "Tháng này chưa ghi bữa nào"}
          sub="Ghi bữa ở Hôm nay hoặc bấm nút + ở giữa thanh dưới. Ngày đã ghi sẽ hiện ở đây kèm biểu đồ."
          action={p.onLog ? "Ghi bữa ngay" : null} onAction={p.onLog} />
      )}
      {!rows && (
        <div aria-hidden="true" style={{ margin: "10px 12px 0 12px", ...ltCard, padding: "6px 14px" }}>
          {[0, 1, 2].map((k) => <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, height: 58 }}><Skel w={36} h={36} r={10} /><div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}><Skel w="45%" /><Skel w="30%" h={10} /></div></div>)}
        </div>
      )}
      {listed.length > 0 && (
        <div style={{ margin: "10px 12px 0 12px", ...ltCard, padding: "0 14px" }}>
          {listed.map((d, i) => (
            <button key={d.date} onClick={() => p.openDay(d.date)} className="tap" style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", height: 58, boxSizing: "content-box", borderStyle: "solid", borderColor: LT.line, borderWidth: i < listed.length - 1 ? "0 0 1px 0" : 0, borderRadius: 0, background: "transparent", padding: 0, color: "#0F172A", fontFamily: "inherit", textAlign: "left" }}>
              <span style={{ width: 44, display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.25 }}><span style={{ fontSize: 12, fontWeight: 800, color: "#64748B" }}>{weekdayStrip(d.date)}</span><span style={{ fontSize: 14, fontWeight: 900 }}>{fmtVN(d.date)}</span></span>
              <span style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                {d.eatenCount > 0 ? <>
                  <span style={{ fontSize: 15, fontWeight: 800 }}>{fmtInt(d.cal)} kcal</span>
                  <span style={{ fontSize: 12, color: "#64748B" }}>{d.eatenCount}/{d.mealCount} bữa đã ăn</span>
                </> : <>
                  <span style={{ fontSize: 15, fontWeight: 800 }}>Chưa tick bữa nào</span>
                  <span style={{ fontSize: 12, color: "#B45309" }}>Có thực đơn {fmtInt(d.planCal)} kcal</span>
                </>}
              </span>
              <span style={{ fontSize: 13, fontWeight: 900, color: d.eatenCount > 0 ? PCT_COLOR[d.status] : "#64748B" }}>{d.eatenCount > 0 ? `${d.pct}%` : "—"}</span>
              {Icon.chev(16)}
            </button>
          ))}
        </div>
      )}
      <p style={{ margin: "10px 16px 0 16px", fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>Chỉ cộng bữa đã tick "Đã ăn". Chạm một ngày để xem và sửa.</p>
    </>
  );
}

function WeightPanel({ weightLog, weight, profile, setProfile, addWeight, updateWeight, deleteWeight, measures }) {
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
      <div style={{ margin: "0 12px", ...ltCard, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 30, fontWeight: 900 }}>{fmtDec(w.curKg)} kg</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#475569", flex: 1 }}>→ {fmtDec(w.goalKg)} kg</span>
          <span style={{ fontSize: 13, fontWeight: 900, color: "#0062F0" }}>{w.pct}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: LT.soft, overflow: "hidden" }}><div style={{ width: `${w.pct}%`, height: 8, borderRadius: 4, background: "linear-gradient(90deg,#1A7CFF,#0050E6)" }} /></div>
        {w.startDate && <span style={{ fontSize: 12, color: "#475569" }}>Từ {fmtDec(w.startKg)} kg ({w.startDate}) · {w.change > 0 ? "+" : ""}{fmtDec(w.change)} kg / {fmtDec(w.weeks)} tuần{per}</span>}
        <div style={{ display: "flex", gap: 8, paddingTop: 2 }}>
          <label style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6, height: 46, padding: "0 12px", background: "#F1F5F9", border: "none", borderRadius: 12, boxSizing: "border-box" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B", whiteSpace: "nowrap" }}>Hôm nay</span>
            <input data-testid="weight-input" type="text" inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value.replace(",", ".").replace(/[^0-9.]/g, "").slice(0, 5))} onKeyDown={(e) => e.key === "Enter" && saveToday()} placeholder={String(w.curKg || "")}
              style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", textAlign: "right", fontFamily: "inherit", fontSize: 16, fontWeight: 700, color: "#0F172A", outline: "none" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#64748B" }}>kg</span>
          </label>
          <button data-testid="weight-save" onClick={saveToday} disabled={busy || !val} style={{ height: 46, padding: "0 22px", borderRadius: 12, border: "none", background: GRAD_BLUE, color: "#FFFFFF", fontFamily: "inherit", fontSize: 14, fontWeight: 900 }}>Lưu</button>
        </div>
        {w.weighedToday && <span style={{ fontSize: 12, color: "#64748B", marginTop: -4 }}>Hôm nay đã cân — lưu lần nữa sẽ sửa số hôm nay.</span>}
      </div>

      <WeightChart weightLog={weightLog} weight={w} />
      {/* 17/10: cân đứng mà eo giảm / tăng cân mà eo to nhanh → 1 dòng nhận xét (cần ≥ 2 lần đo eo cách ≥ 10 ngày) */}
      <InsightLine insight={bodyInsight({ weightLog, rows: measures || [], goalType: profile?.goalType })} testid="weight-insight" />

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "14px 16px 6px 16px" }}>
        <span style={{ fontSize: 15, fontWeight: 800 }}>Lịch sử</span>
        {list.length > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>Chạm một dòng để sửa</span>}
      </div>
      <div style={{ margin: "0 12px", ...ltCard, padding: "0 14px", overflow: "hidden" }}>
        {list.length === 0 && <div style={{ height: 52, display: "flex", alignItems: "center", fontSize: 13, color: "#64748B" }}>Chưa có lần cân nào.</div>}
        {shown.map((r, i) => editId === r.id ? (
          <div key={r.id} style={{ margin: "0 -14px", padding: "10px 14px 12px 14px", background: "rgba(0,122,255,0.05)", borderTop: "1.5px solid #007AFF", borderBottom: "1.5px solid #007AFF", display: "flex", flexDirection: "column", gap: 8 }}>
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
          <button key={r.id} onClick={() => { setEditId(r.id); setEditVal(String(r.kg)); }} className="tap" style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", height: 52, boxSizing: "content-box", borderStyle: "solid", borderColor: LT.line, borderWidth: i < shown.length - 1 ? "0 0 1px 0" : 0, background: "transparent", padding: 0, fontFamily: "inherit", color: "#0F172A", textAlign: "left" }}>
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

// Biểu đồ cân nặng (bản vẽ 40): đường + vùng mờ, vạch mục tiêu nét đứt, chọn 4 tuần / 8 tuần / tất cả
function WeightChart({ weightLog, weight }) {
  const [range, setRange] = useState("8w");
  const t = todayVN();
  const c = weightChart(weightLog, weight.goalKg, range, t, weight.perWeek, weight.curKg);
  const W = 326, H = 160, x0 = 34, x1 = W - 8, y0 = 10, y1 = H - 24;
  const X = (x) => x0 + x * (x1 - x0), Y = (y) => y0 + y * (y1 - y0);
  const line = c.points.map((p) => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ");
  const area = c.points.length ? `${X(c.points[0].x).toFixed(1)},${y1} ${line} ${X(c.points[c.points.length - 1].x).toFixed(1)},${y1}` : "";
  const left = Math.round((weight.goalKg - weight.curKg) * 10) / 10;
  return (
    <div data-testid="weight-chart" style={{ margin: "12px 12px 0 12px", ...ltCard, padding: "12px 10px 8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
        <span style={{ fontSize: 15, fontWeight: 800 }}>Biểu đồ</span>
        <Seg size="sm" ariaLabel="Khoảng thời gian" value={range} onChange={setRange} opts={[["4w", "4 tuần"], ["8w", "8 tuần"], ["all", "Tất cả"]].map(([id, l]) => ({ value: id, label: l, testid: `wchart-${id}` }))} />
      </div>
      {c.points.length < 2 ? (
        <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#64748B", textAlign: "center", padding: "0 16px" }}>
          {c.points.length ? "Cân thêm vài lần để thấy đường biểu đồ." : "Chưa có lần cân nào trong khoảng này."}
        </div>
      ) : (
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Cân nặng từ ${fmtKg(c.points[0].kg)} đến ${fmtKg(c.points[c.points.length - 1].kg)}`}>
          <defs><linearGradient id="fpwa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#007AFF" stopOpacity="0.18" /><stop offset="1" stopColor="#007AFF" stopOpacity="0" /></linearGradient></defs>
          {c.ticks.map((tk) => (
            <g key={tk.v}>
              <line x1={x0} x2={x1} y1={Y(tk.y)} y2={Y(tk.y)} stroke="#F1F5F9" />
              <text x={x0 - 6} y={Y(tk.y) + 4} fontSize="10" fill="#94A3B8" textAnchor="end">{String(tk.v).replace(".", ",")}</text>
            </g>
          ))}
          {c.goalY != null && c.goalY >= 0 && c.goalY <= 1 && (
            <g>
              <line x1={x0} x2={x1} y1={Y(c.goalY)} y2={Y(c.goalY)} stroke="#00A67E" strokeDasharray="5 4" strokeWidth="1.5" />
              <text x={x1 - 2} y={Y(c.goalY) - 5} fontSize="10" fontWeight="700" fill="#00A67E" textAnchor="end">Mục tiêu {fmtDec(weight.goalKg)}</text>
            </g>
          )}
          <polygon points={area} fill="url(#fpwa)" />
          <polyline points={line} fill="none" stroke="#007AFF" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {c.points.map((p, i) => <circle key={p.date} cx={X(p.x)} cy={Y(p.y)} r={i === c.points.length - 1 ? 4 : 3} fill={i === c.points.length - 1 ? "#007AFF" : "#FFFFFF"} stroke="#007AFF" strokeWidth="2" />)}
          <text x={x0} y={H - 6} fontSize="10" fill="#94A3B8">{fmtVN(c.first)}</text>
          <text x={x1} y={H - 6} fontSize="10" fill="#94A3B8" textAnchor="end">{fmtVN(c.last)}</text>
        </svg>
      )}
      <span data-testid="wchart-note" style={{ fontSize: 12, color: "#64748B", padding: "0 4px 4px 4px" }}>
        {Math.abs(left) < 0.1 ? "Đã đạt mục tiêu 🎉" : `Còn ${fmtDec(Math.abs(left))} kg tới mục tiêu`}{c.eta ? ` · theo tốc độ này ≈ ${c.eta} tuần nữa` : ""}
      </span>
    </div>
  );
}
