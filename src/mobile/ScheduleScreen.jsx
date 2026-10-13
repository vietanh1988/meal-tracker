// Màn Tôi › Lịch tập & bữa (bản vẽ LichTap):
//  - Ngày tập trong tuần (profile.gymDays, 0 = T2 … 6 = CN)
//  - Các bữa trong ngày theo Ngày tập / Ngày nghỉ (profile.mealConfig) + giờ từng bữa (profile.mealTimes)
//  - Mục tiêu nước mỗi ngày (profile.waterGoalMl; trống = tự tính)
// Mỗi thay đổi lưu ngay qua setProfile.
import { useState } from "react";
import { MEAL_ICON, fmtDec } from "../lib/mobileView";
import { MEAL_ORDER } from "../lib/mealMath";
import { mealTimesOf, waterGoalMl, DEFAULT_MEAL_TIMES } from "../lib/dayPlan";

const DAYS = ["Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy", "CN"];
const NAME = { sang: "Bữa sáng", phu_sang: "Phụ sáng", trua: "Bữa trưa", phu_chieu: "Phụ chiều", pre: "Trước tập", post: "Sau tập", toi: "Bữa tối" };
const label = { display: "block", padding: "16px 16px 6px 16px", fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em" };
const note = { margin: "8px 16px 0 16px", fontSize: 12, color: "#64748B", lineHeight: 1.45 };
const card = { margin: "0 12px", background: "#FFFFFF", border: "1.5px solid #E2E8F0", borderRadius: 16, padding: "0 14px" };
const fmtL = (ml) => (Math.round(ml / 10) / 100).toLocaleString("vi-VN", { maximumFractionDigits: 2 });

function Toggle({ on, onClick, label: aria, testid }) {
  return (
    <button data-testid={testid} onClick={onClick} aria-label={aria} aria-pressed={on}
      style={{ width: 52, height: 32, borderRadius: 16, border: "none", background: on ? "#00C896" : "#CBD5E1", position: "relative", padding: 0, flexShrink: 0, cursor: "pointer", transition: "background .15s" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 26, height: 26, borderRadius: 13, background: "#FFFFFF", transition: "left .15s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
    </button>
  );
}

export function ScheduleScreen({ profile, setProfile, mealConfig, defaultConfig, curKg }) {
  const noExercise = (profile?.exerciseType || "gym") === "none";
  const gymDays = profile?.gymDays || [];
  const [seg, setSeg] = useState(noExercise ? "rest" : "train");
  const [editTime, setEditTime] = useState(null);
  const times = mealTimesOf(profile?.mealTimes);
  const cfg = mealConfig || defaultConfig || {};
  const ids = cfg[seg] || (defaultConfig || {})[seg] || [];
  const save = (patch) => setProfile({ ...profile, ...patch });

  const toggleDay = (i) => {
    const next = gymDays.includes(i) ? gymDays.filter((d) => d !== i) : [...gymDays, i].sort((a, b) => a - b);
    save({ gymDays: next });
  };
  const toggleMeal = (id) => {
    const cur = new Set(ids);
    if (cur.has(id)) { if (cur.size <= 1) return; cur.delete(id); } else cur.add(id);
    const list = MEAL_ORDER.filter((x) => cur.has(x));
    const base = { train: cfg.train || defaultConfig?.train || [], rest: cfg.rest || defaultConfig?.rest || [] };
    save({ mealConfig: { ...base, [seg]: list } });
  };
  const setTime = (id, v) => {
    if (!/^\d{2}:\d{2}$/.test(v)) return;
    const mt = { ...(profile?.mealTimes || {}), [id]: v };
    // bỏ các giờ trùng mặc định cho gọn
    Object.keys(mt).forEach((k) => { if (mt[k] === DEFAULT_MEAL_TIMES[k]) delete mt[k]; });
    save({ mealTimes: Object.keys(mt).length ? mt : null });
  };

  const override = Number(profile?.waterGoalMl) || 0;
  const autoTrain = waterGoalMl(curKg, true), autoRest = waterGoalMl(curKg, false);
  const setWater = (ml) => save({ waterGoalMl: ml ? Math.min(8000, Math.max(500, ml)) : null });
  const stepBtn = { width: 40, height: 40, borderRadius: 12, border: "1.5px solid #E2E8F0", background: "#FFFFFF", color: "#007AFF", fontSize: 20, fontWeight: 800, fontFamily: "inherit", cursor: "pointer" };

  return (
    <div style={{ paddingBottom: 32 }}>
      <span style={label}>NGÀY TẬP TRONG TUẦN</span>
      {noExercise ? (
        <p style={{ ...note, marginTop: 0 }}>Bạn đang chọn "Không tập" trong Mục tiêu & macro — mọi ngày tính là ngày nghỉ.</p>
      ) : (
        <>
          <div role="group" aria-label="Ngày tập" style={{ margin: "0 12px", display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
            {DAYS.map((d, i) => {
              const on = gymDays.includes(i);
              return (
                <button key={d} data-testid={`sched-day-${i}`} aria-pressed={on} onClick={() => toggleDay(i)}
                  style={{ height: 56, borderRadius: 12, border: "none", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, padding: 0, cursor: "pointer", background: on ? "#007AFF" : "#F1F5F9", color: on ? "#FFFFFF" : "#475569" }}>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{d}</span>
                  <span style={{ fontSize: 10, fontWeight: 600 }}>{on ? "Tập" : "Nghỉ"}</span>
                </button>
              );
            })}
          </div>
          <p style={note}>App tự biết hôm nay tập hay nghỉ để tính calo và chọn bữa.</p>
        </>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 16px 8px 16px" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em" }}>CÁC BỮA TRONG NGÀY</span>
        {!noExercise && (
          <div role="tablist" style={{ display: "flex", padding: 3, background: "#F1F5F9", borderRadius: 10 }}>
            {[["train", "Ngày tập"], ["rest", "Ngày nghỉ"]].map(([k, t]) => (
              <button key={k} role="tab" aria-selected={seg === k} data-testid={`sched-seg-${k}`} onClick={() => { setSeg(k); setEditTime(null); }}
                style={{ height: 32, padding: "0 12px", borderRadius: 8, border: "none", fontFamily: "inherit", fontSize: 12, cursor: "pointer", background: seg === k ? "#FFFFFF" : "transparent", fontWeight: seg === k ? 800 : 600, color: seg === k ? "#007AFF" : "#475569", boxShadow: seg === k ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>{t}</button>
            ))}
          </div>
        )}
      </div>
      <div style={card}>
        {MEAL_ORDER.filter((id) => !(noExercise && (id === "pre" || id === "post"))).map((id, i, arr) => {
          const on = ids.includes(id);
          return (
            <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, borderBottom: i < arr.length - 1 ? "1px solid #F1F5F9" : "none" }}>
              <img src={MEAL_ICON[id]} alt="" style={{ width: 26, height: 26, objectFit: "contain", opacity: on ? 1 : 0.5 }} />
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: on ? "#0F172A" : "#64748B" }}>{NAME[id]}</span>
              {editTime === id ? (
                <input data-testid={`sched-time-input-${id}`} type="time" autoFocus defaultValue={times[id]}
                  onBlur={(e) => { setTime(id, e.target.value); setEditTime(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                  style={{ height: 36, padding: "0 8px", borderRadius: 10, border: "1.5px solid #007AFF", fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "#0F172A", background: "#FFFFFF", WebkitAppearance: "none" }} />
              ) : (
                <button data-testid={`sched-time-${id}`} onClick={() => setEditTime(id)} aria-label={`Đổi giờ ${NAME[id].toLowerCase()}`}
                  style={{ minWidth: 56, height: 36, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: on ? "#64748B" : "#94A3B8", cursor: "pointer", textDecoration: "underline dotted", textUnderlineOffset: 3 }}>{times[id]}</button>
              )}
              <Toggle testid={`sched-meal-${id}`} on={on} label={NAME[id]} onClick={() => toggleMeal(id)} />
            </div>
          );
        })}
      </div>
      <p style={note}>Bấm vào giờ để đổi. Giờ dùng để chọn bữa tự động và nhắc nhở. Bữa đã ghi món trong ngày vẫn hiện dù đang tắt.</p>

      <span style={label}>NƯỚC MỖI NGÀY</span>
      <div style={{ ...card, padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <span data-testid="water-goal-value" style={{ fontSize: 18, fontWeight: 900 }}>{override ? `${fmtL(override)} L` : `${fmtL(autoRest)} – ${fmtL(autoTrain)} L`}</span>
          <span style={{ fontSize: 12, color: "#64748B" }}>{override ? "Bạn tự đặt" : `Tự tính: 35 ml/kg, ngày tập +500 ml (${fmtDec(curKg)} kg)`}</span>
        </span>
        <button data-testid="water-goal-minus" aria-label="Giảm 250 ml" style={stepBtn} onClick={() => setWater((override || autoRest) - 250)}>−</button>
        <button data-testid="water-goal-plus" aria-label="Tăng 250 ml" style={stepBtn} onClick={() => setWater((override || autoRest) + 250)}>+</button>
      </div>
      {override > 0 && <button data-testid="water-goal-auto" onClick={() => setWater(null)} style={{ display: "block", margin: "8px 16px 0 auto", height: 36, padding: "0 4px", border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#007AFF", cursor: "pointer" }}>Dùng lại tự tính</button>}
    </div>
  );
}
