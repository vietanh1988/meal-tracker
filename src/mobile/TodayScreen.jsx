// Màn 1 · Hôm nay (bản vẽ 32 "Hôm nay – bản đầy đủ", chốt 13/10).
// Header: dải ngày, vòng kcal còn lại + Mục tiêu/Đã ăn/loại ngày, dải 4 macro có icon.
// Thân: thẻ bữa đến giờ, danh sách bữa, nước theo cốc, cân nặng, tuần này.
import { useState, useEffect, useRef } from "react";
import { Icon, GRAD_ORANGE, GRAD_BLUE } from "./ui";
import { MEAL_ICON, weekdayStrip, weekdayFull, weekDates, mealWindowLabel, itemName, fmtInt, fmtDec, focusMeal } from "../lib/mobileView";
import { waterGoalMl, cupsView, CUP_SIZES } from "../lib/dayPlan";
import { fmtVN } from "../lib/dateVN";

const MONTHS = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
const WEEK_LBL = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const CUP_KEY = "fp_cup_ml";

const plusBtn = { width: 36, height: 36, borderRadius: 18, border: "1.5px solid #E2E8F0", background: "#FFFFFF", color: "#007AFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, padding: 0, flexShrink: 0, fontFamily: "inherit" };
const card = { margin: "0 12px", background: "#FFFFFF", border: "1.5px solid #E2E8F0", borderRadius: 20 };
const secHead = { padding: "20px 16px 8px 16px", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 };
const secTitle = { fontSize: 16, fontWeight: 900 };
const fmtL = (ml) => (Math.round(ml / 10) / 100).toLocaleString("vi-VN", { maximumFractionDigits: 2 });

const svg = (d, size = 12, sw = 2.4) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const MACRO_ICON = {
  p: svg(<><path d="M14.5 4.5a5 5 0 0 1 4.9 6.1c-.5 2.2-2.6 3.4-4.8 3.4h-1.1l-3.6 3.6a2 2 0 1 1-2.6 2.6 2 2 0 1 1 2.6-2.6L13.5 14v-1.1c0-2.2 1.2-4.3 3.4-4.8" /><path d="M14.5 4.5c-2.8 0-5 2.2-5 5 0 1 .3 2 .8 2.8" /></>),
  c: svg(<><path d="M3 11h18a9 9 0 0 1-18 0z" /><path d="M7 11c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" /><path d="M9 20h6" /></>),
  f: svg(<><path d="M12 3s6.5 7.2 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10.2 12 3 12 3z" /><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5" /></>),
  fiber: svg(<><path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15" /><path d="M5 19l8-8" /></>),
};
const MACROS = [
  { k: "p", label: "Đạm", col: "#E11D48", bar: "#FECDD3" },
  { k: "c", label: "Tinh bột", col: "#D97706", bar: "#FDE68A" },
  { k: "f", label: "Béo", col: "#7C3AED", bar: "#DDD6FE" },
  { k: "fiber", label: "Xơ", col: "#059669", bar: "#A7F3D0" },
];
const STAT_ICON = {
  goal: svg(<><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>, 16, 2.2),
  eaten: svg(<><path d="M3 11h18a9 9 0 0 1-18 0z" /><path d="M12 7V3M8 7l-1-3M16 7l1-3" /></>, 16, 2.2),
  train: svg(<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" />, 16, 2.2),
  rest: svg(<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />, 16, 2.2),
};

export function TodayScreen(p) {
  const { date, today, onDate, rows, eaten, targets, dayType, nowMinutes, name, dayLoaded } = p;
  const isToday = date === today;
  const [y, m] = date.split("-");
  const remain = targets.cal - eaten.cal;
  const focus = isToday ? focusMeal(rows, nowMinutes) : null;
  const allEaten = isToday && rows.length > 0 && rows.every((r) => r.state === "eaten");
  const eatenCount = rows.filter((r) => r.state === "eaten").length;
  const w = p.weight;

  return (
    <div style={{ background: "#F1F5F9", minHeight: "100%" }}>
      {/* ===== Header ===== */}
      <div style={{ backgroundImage: "url('/header-bg.webp'), linear-gradient(135deg,#36A3FF,#007AFF,#0057FF)", backgroundSize: "cover, cover", backgroundPosition: "center, center", padding: "calc(env(safe-area-inset-top, 0px) + 12px) 12px 16px 12px", borderRadius: "0 0 28px 28px", display: "flex", flexDirection: "column", gap: 14, color: "#FFFFFF" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 4 }}>
          <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Chào {name}</span>
            <span style={{ fontSize: 16, fontWeight: 800 }}>{MONTHS[Number(m) - 1]}, {y}</span>
          </span>
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

        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "0 4px" }}>
          <KcalRing remain={remain} eaten={eaten.cal} target={targets.cal} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 0 }}>
            <Stat icon={STAT_ICON.goal} label="Mục tiêu" value={`${fmtInt(targets.cal)} kcal`} />
            <Stat icon={STAT_ICON.eaten} label="Đã ăn" value={<span data-testid="kcal-eaten" data-value={eaten.cal}>{fmtInt(eaten.cal)} kcal</span>} />
            <Stat icon={dayType === "rest" ? STAT_ICON.rest : STAT_ICON.train} label={isToday ? "Hôm nay" : "Hôm đó"} value={dayType === "rest" ? "Ngày nghỉ" : "Ngày tập"} />
          </div>
        </div>

        <div data-testid="macro-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", padding: "10px 0", borderRadius: 14, background: "rgba(255,255,255,0.14)" }}>
          {MACROS.map((mc, i) => {
            const e = eaten[mc.k] || 0, t = targets[mc.k] || 0;
            const pct = t > 0 ? Math.max(3, Math.min(100, Math.round((e / t) * 100))) : 0;
            return (
              <div key={mc.k} data-testid={`macro-${mc.k}`} style={{ display: "flex", flexDirection: "column", gap: 5, padding: "0 6px", minWidth: 0, borderRight: i < 3 ? "1px solid rgba(255,255,255,0.2)" : "none" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 18, height: 18, borderRadius: 6, background: "#FFFFFF", color: mc.col, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{MACRO_ICON[mc.k]}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.95, whiteSpace: "nowrap" }}>{mc.label}</span>
                </span>
                <span style={{ fontSize: 15, fontWeight: 900, lineHeight: 1, whiteSpace: "nowrap" }}>{fmtInt(e)}<span style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>/{fmtInt(t)}g</span></span>
                <div role="progressbar" aria-label={mc.label} aria-valuenow={e} aria-valuemax={t} style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.25)", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: 4, borderRadius: 2, background: e > t * 1.1 ? "#FACC15" : mc.bar, transition: "width .3s" }} />
                </div>
              </div>
            );
          })}
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

      {/* ===== Bữa ăn ===== */}
      <div style={secHead}>
        <span style={secTitle}>{isToday ? "Bữa ăn hôm nay" : `${weekdayFull(date)} ${fmtVN(date)}`}</span>
        {rows.length > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>{eatenCount} / {rows.length} bữa</span>}
      </div>
      <div style={{ ...card, padding: "4px 12px", overflow: "hidden", opacity: dayLoaded ? 1 : 0.5 }}>
        {rows.map((r, i) => <MealRow key={r.id} r={r} last={i === rows.length - 1} now={focus && focus.id === r.id && r.state !== "planned"} {...p} />)}
        {rows.length === 0 && <div style={{ minHeight: 56, display: "flex", alignItems: "center", fontSize: 13, color: "#64748B" }}>Chưa bật bữa nào — vào Tôi › Lịch tập & bữa để bật.</div>}
      </div>
      {p.onAIMenu && date >= today && (
        <button onClick={p.onAIMenu} style={{ margin: "8px 12px 0 12px", width: "calc(100% - 24px)", height: 44, borderRadius: 14, border: "1.5px dashed rgba(124,58,237,0.45)", background: "rgba(124,58,237,0.04)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 800, color: "#7C3AED", fontFamily: "inherit" }}>
          {Icon.sparkle(16)}{eatenCount > 0 ? "AI lên thực đơn các bữa còn lại" : "AI lên thực đơn cả ngày"}
        </button>
      )}

      {/* ===== Nước ===== */}
      <WaterCups waterMl={p.waterMl} addWater={p.addWater} kg={w.curKg} isTrainDay={dayType !== "rest"} goalOverride={p.waterGoalOverride} />

      {/* ===== Cân nặng ===== */}
      <div style={secHead}><span style={secTitle}>Cân nặng</span></div>
      <button data-testid="weight-tile" onClick={p.onWeight} className="tap" style={{ ...card, width: "calc(100% - 24px)", padding: 14, display: "flex", flexDirection: "column", gap: 12, color: "#0F172A", fontFamily: "inherit", textAlign: "left", boxSizing: "border-box" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
          <span style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(250,204,21,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><img src="/icons/stat_weight.png" alt="" style={{ width: 26, height: 26, objectFit: "contain" }} /></span>
          <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.1, whiteSpace: "nowrap" }}>{fmtDec(w.curKg)} kg <span style={{ fontSize: 13, fontWeight: 700, color: "#64748B" }}>→ {fmtDec(w.goalKg)} kg</span></span>
            <span style={{ fontSize: 12, fontWeight: 700, color: w.weighedToday ? "#047857" : "#B45309" }}>{w.weighedToday ? "Đã cân hôm nay" : w.sinceLast == null ? "Chưa cân lần nào" : `${w.sinceLast} ngày chưa cân`}</span>
          </span>
          <span style={{ height: 36, padding: "0 12px", borderRadius: 12, background: w.weighedToday ? "#F1F5F9" : "#FACC15", color: "#0F172A", fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", flexShrink: 0 }}>{w.weighedToday ? "Xem" : "Cân hôm nay"}</span>
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
          <span style={{ height: 8, borderRadius: 4, background: "#F1F5F9", overflow: "hidden", display: "block" }}><span style={{ display: "block", width: `${Math.max(2, w.pct)}%`, height: 8, borderRadius: 4, background: "linear-gradient(90deg,#FACC15,#F59E0B)" }} /></span>
          <span style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "#94A3B8" }}>
            <span>{w.goalKg > w.startKg ? "Mục tiêu tăng cân" : w.goalKg < w.startKg ? "Mục tiêu giảm cân" : "Giữ cân"}</span>
            <span>{Math.abs(w.goalKg - w.curKg) < 0.05 ? "Đã đạt mục tiêu" : `Còn ${fmtDec(Math.abs(Math.round((w.goalKg - w.curKg) * 10) / 10))} kg`}</span>
          </span>
        </span>
      </button>

      {/* ===== Tuần này ===== */}
      {p.week && <WeekCard week={p.week} onOpen={p.onDiary} />}
      <div style={{ height: 24 }} />
    </div>
  );
}

function KcalRing({ remain, eaten, target }) {
  const r = 46, C = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, eaten / target) : 0;
  const over = remain < 0;
  return (
    <div style={{ position: "relative", width: 116, height: 116, flexShrink: 0 }}>
      <svg aria-hidden="true" width="116" height="116" viewBox="0 0 116 116">
        <circle cx="58" cy="58" r={r} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="11" />
        {pct > 0 && <circle cx="58" cy="58" r={r} fill="none" stroke={over ? "#FACC15" : "#FFFFFF"} strokeWidth="11" strokeLinecap="round" strokeDasharray={`${(C * pct).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90 58 58)" style={{ transition: "stroke-dasharray .3s" }} />}
      </svg>
      <span style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span data-testid="kcal-remain" data-value={remain} style={{ fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{fmtInt(Math.abs(remain))}</span>
        <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.9, marginTop: 3 }}>{over ? "kcal vượt" : "kcal còn lại"}</span>
      </span>
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <span style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, minWidth: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>{label}</span>
        <span style={{ fontSize: 16, fontWeight: 900, whiteSpace: "nowrap" }}>{value}</span>
      </span>
    </div>
  );
}

function FocusCard({ r, onLog, onPhoto, onEdit, onToggleEaten, repeatFor, onRepeat, busy, nowMinutes, onAskAI }) {
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
      {onAskAI && (
        <button data-testid="focus-ask-ai" onClick={() => onAskAI(r)} style={{ alignSelf: "center", height: 36, padding: "0 8px", border: "none", background: "transparent", color: "#7C3AED", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>{Icon.sparkle(14)}Hỏi AI về {r.name.toLowerCase()}</button>
      )}
    </div>
  );
}

function MealRow({ r, last, now, onLog, onEdit, onToggleEaten, busy }) {
  const border = last ? "none" : "1px solid #F1F5F9";
  const iconBox = (
    <span style={{ width: 44, height: 44, borderRadius: 14, background: now ? "rgba(0,122,255,0.08)" : "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <img src={MEAL_ICON[r.id]} alt="" style={{ width: 30, height: 30, objectFit: "contain", opacity: r.state === "missed" ? 0.7 : 1 }} />
    </span>
  );
  const title = (tag) => (
    <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
      <span style={{ fontSize: 14, fontWeight: 800, whiteSpace: "nowrap" }}>{r.name}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", whiteSpace: "nowrap" }}>{r.time}</span>
      {tag}
    </span>
  );
  if (r.state === "eaten" || r.state === "planned") {
    const eaten = r.state === "eaten";
    const tag = eaten
      ? <span style={{ fontSize: 10, fontWeight: 800, color: "#047857", background: "rgba(0,200,150,0.12)", padding: "2px 6px", borderRadius: 6, whiteSpace: "nowrap" }}>Đã ăn</span>
      : <span style={{ fontSize: 10, fontWeight: 800, color: "#B45309", background: "rgba(245,158,11,0.12)", padding: "2px 6px", borderRadius: 6, whiteSpace: "nowrap" }}>Chưa ăn</span>;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 66, borderBottom: border }}>
        <button onClick={() => onEdit(r.id)} className="tap" style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 12, minHeight: 66, border: "none", background: "transparent", padding: 0, fontFamily: "inherit", color: "#0F172A", textAlign: "left" }}>
          {iconBox}
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            {title(tag)}
            <span data-testid={`meal-foods-${r.id}`} style={{ fontSize: 12, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.items.map(itemName).join(", ")}</span>
          </span>
          <span style={{ fontSize: 14, fontWeight: 900, whiteSpace: "nowrap" }}>{fmtInt(r.cal)}</span>
        </button>
        <button data-testid={`eat-${r.id}`} disabled={busy} onClick={() => onToggleEaten(r.id, !eaten)} aria-label={eaten ? `Bỏ đánh dấu đã ăn ${r.name}` : `Đánh dấu đã ăn ${r.name}`} aria-pressed={eaten}
          style={{ ...plusBtn, background: eaten ? "#00C896" : "#FFFFFF", borderColor: eaten ? "#00C896" : "#E2E8F0", color: eaten ? "#FFFFFF" : "#94A3B8" }}>{Icon.check(16, 2.8)}</button>
      </div>
    );
  }
  const sub = now ? <span style={{ fontSize: 12, fontWeight: 700, color: "#007AFF" }}>Đến giờ ăn</span>
    : <span style={{ fontSize: 12, color: "#94A3B8" }}>{r.state === "missed" ? "Đã qua giờ · chưa ghi" : "Chưa ghi"}</span>;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 66, borderBottom: border, ...(now ? { background: "rgba(0,122,255,0.04)", margin: "0 -12px", padding: "0 12px" } : {}) }}>
      {iconBox}
      <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>{title(null)}{sub}</span>
      <button onClick={() => onLog(r.id)} aria-label={`Ghi ${r.name.toLowerCase()}`} style={now ? { ...plusBtn, background: "#007AFF", borderColor: "#007AFF", color: "#FFFFFF", fontSize: 20 } : plusBtn}>+</button>
    </div>
  );
}

function readCup() { try { return Number(localStorage.getItem(CUP_KEY)) || 250; } catch (e) { return 250; } }

function WaterCups({ waterMl = 0, addWater, kg, isTrainDay, goalOverride }) {
  const goal = waterGoalMl(kg, isTrainDay, goalOverride);
  const [cupMl, setCupMl] = useState(readCup);
  const [busy, setBusy] = useState(false);
  const v = cupsView(waterMl, goal, cupMl);
  const busyRef = useRef(false);
  useEffect(() => { busyRef.current = busy; }, [busy]);
  const change = async (ml) => {
    if (!addWater || busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try { await addWater(ml); } finally { busyRef.current = false; setBusy(false); }
  };
  const pickCup = (ml) => { setCupMl(ml); try { localStorage.setItem(CUP_KEY, String(ml)); } catch (e) { /* */ } };
  return (
    <>
      <div style={secHead}>
        <span style={secTitle}>Nước uống</span>
        <label style={{ position: "relative", height: 30, padding: "0 10px", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#FFFFFF", fontSize: 12, fontWeight: 800, color: "#0891B2", display: "flex", alignItems: "center", gap: 4 }}>
          1 cốc = {v.cupMl} ml{Icon.down ? Icon.down(12) : "▾"}
          <select data-testid="water-cup-size" aria-label="Cỡ cốc" value={v.cupMl} onChange={(e) => pickCup(Number(e.target.value))} style={{ position: "absolute", inset: 0, opacity: 0, fontSize: 16, cursor: "pointer" }}>
            {CUP_SIZES.map((s) => <option key={s} value={s}>1 cốc = {s} ml</option>)}
          </select>
        </label>
      </div>
      <div style={{ ...card, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(90,200,250,0.16)", color: "#0891B2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" /></svg>
          </span>
          <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <span data-testid="water-count" data-ml={waterMl} style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.1 }}>{v.filled} <span style={{ fontSize: 14, fontWeight: 700, color: "#64748B" }}>/ {v.need} cốc</span></span>
            <span style={{ fontSize: 12, color: "#64748B" }}>{fmtL(waterMl)} / {fmtL(goal)} L · {v.done ? "đủ rồi 👍" : `còn ${v.left} cốc`}</span>
          </span>
          <span style={{ fontSize: 12, fontWeight: 800, color: v.done ? "#047857" : "#0891B2", background: v.done ? "rgba(0,200,150,0.12)" : "rgba(90,200,250,0.14)", padding: "4px 8px", borderRadius: 8 }}>{v.pct}%</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 8, opacity: busy ? 0.7 : 1 }}>
          {v.cups.map((c) => {
            const next = !c.full && c.i === v.filled + 1;
            if (c.full) return (
              <button key={c.i} data-testid={`water-cup-${c.i}`} aria-pressed="true" aria-label={`Cốc ${c.i} đã uống, chạm để bỏ`} disabled={busy} onClick={() => change(-(waterMl - (v.filled - 1) * v.cupMl))}
                style={{ height: 58, borderRadius: 12, border: "none", background: "rgba(90,200,250,0.12)", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <svg aria-hidden="true" width="30" height="38" viewBox="0 0 30 38"><path d="M3 3h24l-3 32H6z" fill="#FFFFFF" stroke="#0891B2" strokeWidth="2.2" strokeLinejoin="round" /><path d="M4.6 12h20.8l-2.2 23H6.8z" fill="#38BDF8" /><path d="M8 17c2-1 4 1 6 0" stroke="#FFFFFF" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.7" /></svg>
              </button>
            );
            return (
              <button key={c.i} data-testid={next ? "water-cup-next" : `water-cup-${c.i}`} aria-label={`Uống thêm 1 cốc (${v.cupMl} ml)`} disabled={busy} onClick={() => change(v.cupMl)}
                style={{ height: 58, borderRadius: 12, border: next ? "2px dashed #0891B2" : "none", background: next ? "#FFFFFF" : "#F8FAFC", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxSizing: "border-box" }}>
                <svg aria-hidden="true" width="30" height="38" viewBox="0 0 30 38"><path d="M3 3h24l-3 32H6z" fill={next ? "#F0F9FF" : "#FFFFFF"} stroke={next ? "#0891B2" : "#BAE6FD"} strokeWidth="2.2" strokeLinejoin="round" />{next && <path d="M15 14v12M9 20h12" stroke="#0891B2" strokeWidth="2.6" strokeLinecap="round" />}</svg>
              </button>
            );
          })}
        </div>
        <span style={{ fontSize: 12, color: "#64748B", lineHeight: 1.45 }}>Chạm cốc trống để uống thêm 1 cốc. Chạm cốc đã uống (xanh) để bỏ cốc đó.</span>
      </div>
    </>
  );
}

function WeekCard({ week, onOpen }) {
  return (
    <>
      <div style={secHead}>
        <span style={secTitle}>Tuần này</span>
        {onOpen && <button onClick={onOpen} style={{ border: "none", background: "transparent", padding: "10px 0", margin: "-10px 0", fontSize: 12, fontWeight: 700, color: "#007AFF", fontFamily: "inherit" }}>Xem nhật ký ›</button>}
      </div>
      <div data-testid="week-card" style={{ ...card, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 20 }}>
          <span style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>ĐẠT MỤC TIÊU</span><span data-testid="week-ok" style={{ fontSize: 18, fontWeight: 900 }}>{week.okDays} / {week.countedDays} ngày</span></span>
          <span style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>TB MỖI NGÀY</span><span style={{ fontSize: 18, fontWeight: 900 }}>{week.countedDays ? `${fmtInt(week.avg)} kcal` : "—"}</span></span>
        </div>
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", justifyItems: "center" }}>
          <span style={{ position: "absolute", left: 0, right: 0, top: 74 - 64, borderTop: "1.5px dashed #CBD5E1" }} />
          {week.days.map((d, i) => {
            const h = d.has ? Math.max(4, Math.round(Math.min(1.15, d.ratio) * 64)) : 0;
            const col = d.ok ? "#00C896" : d.kind === "today" ? "#007AFF" : "#94A3B8";
            return (
              <div key={d.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ height: 74, width: 22, display: "flex", alignItems: "flex-end" }}>
                  {d.has ? <span style={{ width: "100%", height: h, borderRadius: 6, background: col }} /> : <span style={{ width: "100%", height: 4, borderRadius: 2, background: "#E2E8F0" }} />}
                </div>
                <span style={{ fontSize: 11, fontWeight: d.kind === "today" ? 900 : 700, color: d.kind === "today" ? "#007AFF" : "#64748B" }}>{WEEK_LBL[i]}</span>
              </div>
            );
          })}
        </div>
        <span style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 11, fontWeight: 700, color: "#64748B" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#00C896" }} />Đủ ±10%</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#94A3B8" }} />Thiếu / vượt</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, borderTop: "1.5px dashed #CBD5E1" }} />Mục tiêu</span>
        </span>
      </div>
    </>
  );
}
