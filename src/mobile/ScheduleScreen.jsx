// Màn Tôi › Lịch tập & bữa (bản vẽ LichTap):
//  - Ngày tập trong tuần (profile.gymDays, 0 = T2 … 6 = CN)
//  - Các bữa trong ngày theo Ngày tập / Ngày nghỉ (profile.mealConfig) + giờ từng bữa (profile.mealTimes)
//  - Mục tiêu nước mỗi ngày (profile.waterGoalMl; trống = tự tính)
// Mỗi thay đổi lưu ngay qua setProfile.
import { useState } from "react";
import { fmtDec } from "../lib/mobileView";
import { MealIcon } from "./icons";
import { Toggle, Seg } from "./ui";
import { DK, dkCard } from "../theme";
import { MEAL_ORDER } from "../lib/mealMath";
import { mealTimesOf, waterGoalMl, DEFAULT_MEAL_TIMES } from "../lib/dayPlan";

const DAYS = ["Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy", "CN"];
const NAME = { sang: "Bữa sáng", phu_sang: "Phụ sáng", trua: "Bữa trưa", phu_chieu: "Phụ chiều", pre: "Trước tập", post: "Sau tập", toi: "Bữa tối" };
// Nền tối (bản vẽ 48)
const label = { display: "block", padding: "16px 16px 6px 16px", fontSize: 11, fontWeight: 700, color: DK.t3, letterSpacing: "0.08em" };
const note = { margin: "8px 16px 0 16px", fontSize: 12, color: DK.t3, lineHeight: 1.45 };
const card = { ...dkCard, margin: "0 12px", borderRadius: 16, padding: "0 14px" };
const fmtL = (ml) => (Math.round(ml / 10) / 100).toLocaleString("vi-VN", { maximumFractionDigits: 2 });

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
  const stepBtn = { width: 40, height: 40, borderRadius: 12, border: `1px solid ${DK.chipLine}`, background: DK.chip, color: "#FFFFFF", fontSize: 20, fontWeight: 800, fontFamily: "inherit", cursor: "pointer" };

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
                  style={{ height: 56, borderRadius: 12, border: "none", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, padding: 0, cursor: "pointer", background: on ? "#007AFF" : DK.chip, boxShadow: on ? "0 4px 12px rgba(0,122,255,0.35), inset 0 1px 0 rgba(255,255,255,0.25)" : `inset 0 0 0 1px ${DK.chipLine}`, color: on ? "#FFFFFF" : DK.t2 }}>
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
        <span style={{ fontSize: 11, fontWeight: 700, color: DK.t3, letterSpacing: "0.08em" }}>CÁC BỮA TRONG NGÀY</span>
        {!noExercise && (
          <Seg dark mode="tab" size="sm" value={seg} onChange={(k) => { setSeg(k); setEditTime(null); }} opts={[["train", "Ngày tập"], ["rest", "Ngày nghỉ"]].map(([k, t]) => ({ value: k, label: t, testid: `sched-seg-${k}` }))} />
        )}
      </div>
      <div style={card}>
        {MEAL_ORDER.filter((id) => !(noExercise && (id === "pre" || id === "post"))).map((id, i, arr) => {
          const on = ids.includes(id);
          return (
            <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 52, borderBottom: i < arr.length - 1 ? `1px solid ${DK.line}` : "none" }}>
              <MealIcon id={id} size={32} dim={!on} />
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: on ? DK.t1 : DK.t3 }}>{NAME[id]}</span>
              {editTime === id ? (
                <input data-testid={`sched-time-input-${id}`} type="time" autoFocus defaultValue={times[id]}
                  onBlur={(e) => { setTime(id, e.target.value); setEditTime(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                  style={{ height: 36, padding: "0 8px", borderRadius: 10, border: `1.5px solid ${DK.link}`, fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: DK.t1, background: "rgba(255,255,255,0.14)", WebkitAppearance: "none" }} />
              ) : (
                <button data-testid={`sched-time-${id}`} onClick={() => setEditTime(id)} aria-label={`Đổi giờ ${NAME[id].toLowerCase()}`}
                  style={{ minWidth: 56, height: 36, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: on ? DK.t2 : "rgba(255,255,255,0.45)", cursor: "pointer", textDecoration: "underline dotted", textUnderlineOffset: 3 }}>{times[id]}</button>
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
          <span style={{ fontSize: 12, color: DK.t3 }}>{override ? "Bạn tự đặt" : `Tự tính: 35 ml/kg, ngày tập +500 ml (${fmtDec(curKg)} kg)`}</span>
        </span>
        <button data-testid="water-goal-minus" aria-label="Giảm 250 ml" style={stepBtn} onClick={() => setWater((override || autoRest) - 250)}>−</button>
        <button data-testid="water-goal-plus" aria-label="Tăng 250 ml" style={stepBtn} onClick={() => setWater((override || autoRest) + 250)}>+</button>
      </div>
      {override > 0 && <button data-testid="water-goal-auto" onClick={() => setWater(null)} style={{ display: "block", margin: "8px 16px 0 auto", height: 36, padding: "0 4px", border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: DK.link, cursor: "pointer" }}>Dùng lại tự tính</button>}
    </div>
  );
}
