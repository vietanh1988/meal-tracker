// Màn Tôi › Nhắc nhở (bản vẽ NhacNho):
//  - Thẻ bật thông báo đẩy trên máy này (ẩn khi đã bật)
//  - Nhắc ghi bữa (giờ theo từng bữa, chỉ nhắc khi bữa chưa ghi), nhắc cân (thứ + giờ), nhắc uống nước (mỗi N giờ trong khung)
// Lưu vào profile.reminderSettings (cột reminder_settings) qua setProfile, dạng chuẩn trong src/lib/reminders.js.
import { useEffect, useState } from "react";
import { Toggle } from "./ui";
import { DK, dkCard } from "../theme";
import { fmtVN } from "../lib/dateVN";
import { normalizeReminders, defaultSlotTime, WEEKDAY_NAMES, WATER_EVERY, toMin } from "../lib/reminders";
import { MEAL_ORDER } from "../lib/mealMath";
import { mealTimesOf, waterGoalMl } from "../lib/dayPlan";
import { isPushSupported, getPushStatus, enablePushNotifications } from "../pushNotifications";

const SHORT = { sang: "Sáng", phu_sang: "Phụ sáng", trua: "Trưa", phu_chieu: "Phụ chiều", pre: "Trước tập", post: "Sau tập", toi: "Tối" };
// Nền tối (bản vẽ 48): thẻ kính mờ, nút giờ kiểu kính, chữ trắng
const box = { ...dkCard, margin: "0 12px", borderRadius: 16, padding: "0 14px" };
// 17/10 (bản vẽ 124): mọi cài đặt nhắc gom ở đây, chia nhóm ĂN UỐNG · CƠ THỂ; nhắc cân + đo số đo gộp 1 mục
const secT = { display: "block", padding: "18px 16px 6px 16px", fontSize: 11, fontWeight: 700, color: DK.t3, letterSpacing: "0.08em" };
const blk = (last) => ({ padding: "14px 0", borderBottom: last ? "none" : `1px solid ${DK.line}`, display: "flex", flexDirection: "column", gap: 10 });
const chip = (dim, blue) => ({ height: 34, padding: "0 12px", borderRadius: 10, border: `1px solid ${DK.chipLine}`, background: DK.chip, fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: dim ? "rgba(255,255,255,0.45)" : blue ? DK.link : DK.t1, display: "inline-flex", alignItems: "center", gap: 6 });
const timeInput = { height: 34, padding: "0 8px", borderRadius: 10, border: `1.5px solid ${DK.link}`, fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: DK.t1, background: "rgba(255,255,255,0.14)", WebkitAppearance: "none" };
const fmtL = (ml) => (Math.round(ml / 10) / 100).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
const isIOS = () => typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent || "");
const isStandalone = () => { try { return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; } catch (e) { return false; } };

function Head({ title, sub, on, onToggle, testid }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{title}</span>
        <span style={{ fontSize: 12, color: DK.t3 }}>{sub}</span>
      </span>
      <Toggle testid={testid} on={on} label={title} onClick={onToggle} />
    </div>
  );
}

// Nút giờ: bấm để sửa bằng ô chọn giờ, rời ô là lưu
function TimeChip({ label, value, dim, onSave, testid }) {
  const [edit, setEdit] = useState(false);
  if (edit) return (
    <input data-testid={`${testid}-input`} type="time" autoFocus defaultValue={value} aria-label={label}
      onBlur={(e) => { const v = e.target.value; setEdit(false); if (/^\d{2}:\d{2}$/.test(v) && v !== value) onSave(v); }}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} style={timeInput} />
  );
  return <button data-testid={testid} onClick={() => setEdit(true)} style={chip(dim)}>{label ? `${label} ` : ""}{value}</button>;
}

export function RemindersScreen({ profile, setProfile, pushFeature, weightLog, curKg, visibleMeals, lastMeasureDate }) {
  const r = normalizeReminders(profile?.reminderSettings);
  const save = (next) => setProfile({ ...profile, reminderSettings: normalizeReminders(next) });
  const set = (key, patch) => save({ ...r, [key]: { ...r[key], ...patch } });

  const [push, setPush] = useState("checking");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushErr, setPushErr] = useState("");
  const [picking, setPicking] = useState(false);
  useEffect(() => { if (!isPushSupported()) setPush("unsupported"); else getPushStatus().then(setPush); }, []);
  const enable = async () => {
    setPushBusy(true); setPushErr("");
    try { await enablePushNotifications(); setPush("granted"); }
    catch (e) { setPushErr(e?.message || "Không bật được thông báo"); setPush(await getPushStatus()); }
    setPushBusy(false);
  };

  const times = mealTimesOf(profile?.mealTimes);
  const usedMeals = new Set(r.meal.slots.map((s) => s.meal));
  const addable = MEAL_ORDER.filter((id) => !usedMeals.has(id) && (visibleMeals || MEAL_ORDER).includes(id));
  const setSlot = (meal, time) => set("meal", { slots: r.meal.slots.map((s) => (s.meal === meal ? { ...s, time } : s)) });
  const dropSlot = (meal) => set("meal", { slots: r.meal.slots.filter((s) => s.meal !== meal) });
  const addSlot = (meal) => { set("meal", { slots: [...r.meal.slots, { meal, time: defaultSlotTime(times[meal]) }] }); setPicking(false); };

  const lastW = (weightLog || [])[weightLog?.length - 1];
  const nextEvery = WATER_EVERY[(WATER_EVERY.indexOf(r.water.every) + 1) % WATER_EVERY.length];
  const setWaterRange = (k, v) => {
    const w = { ...r.water, [k]: v };
    if (toMin(w.to) <= toMin(w.from)) return; // khung giờ sai thì bỏ qua
    set("water", { [k]: v });
  };

  const needPush = push === "default" || push === "denied" || push === "unsupported";
  const iosNeedsHome = isIOS() && !isStandalone();

  return (
    <div style={{ paddingBottom: 32 }}>
      {pushFeature === false && (
        <p style={{ margin: "12px 16px 0 16px", padding: "10px 12px", borderRadius: 12, background: "rgba(245,158,11,0.16)", color: DK.amber, fontSize: 13, fontWeight: 600 }}>Thông báo đẩy đang tạm tắt trên hệ thống. Cài đặt vẫn được lưu để dùng khi bật lại.</p>
      )}
      {pushFeature !== false && needPush && (
        <div data-testid="push-banner" style={{ margin: "12px 12px 0 12px", borderRadius: 16, padding: 14, background: "rgba(0,122,255,0.22)", border: "1px solid rgba(124,194,255,0.4)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: "#007AFF", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
          </span>
          <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>{push === "denied" ? "Thông báo đang bị chặn" : "Thông báo chưa bật trên máy này"}</span>
            <span style={{ fontSize: 12, color: DK.t2 }}>
              {push === "denied" ? "Mở cài đặt trình duyệt / máy để cho phép Fipilot." : push === "unsupported" ? (iosNeedsHome ? "Thêm Fipilot vào Màn hình chính trước." : "Trình duyệt này không hỗ trợ thông báo.") : "Cần bật để nhận nhắc nhở"}
            </span>
            {pushErr && <span style={{ fontSize: 12, color: DK.red, marginTop: 2 }}>{pushErr}</span>}
          </span>
          {push === "default" && <button data-testid="push-enable" disabled={pushBusy} onClick={enable} style={{ height: 38, padding: "0 14px", borderRadius: 10, border: "none", background: "#FFFFFF", color: "#0040E0", fontFamily: "inherit", fontSize: 13, fontWeight: 800 }}>{pushBusy ? "…" : "Bật"}</button>}
        </div>
      )}

      <span style={secT}>ĂN UỐNG</span>
      <div data-testid="rem-sec-food" style={box}>
        <div style={blk(false)}>
          <Head testid="rem-meal" title="Nhắc giờ ăn" sub="Chỉ nhắc khi bữa đó chưa bấm Đã ăn" on={r.meal.on} onToggle={() => set("meal", { on: !r.meal.on })} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", opacity: r.meal.on ? 1 : 0.6 }}>
            {r.meal.slots.map((s) => (
              <span key={s.meal} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                <TimeChip testid={`rem-slot-${s.meal}`} label={SHORT[s.meal]} value={s.time} dim={!r.meal.on} onSave={(v) => setSlot(s.meal, v)} />
                <button data-testid={`rem-slot-del-${s.meal}`} aria-label={`Bỏ nhắc ${SHORT[s.meal].toLowerCase()}`} onClick={() => dropSlot(s.meal)}
                  style={{ width: 28, height: 34, border: "none", background: "transparent", color: DK.t3, fontSize: 18, fontWeight: 700, fontFamily: "inherit", padding: 0 }}>×</button>
              </span>
            ))}
            {addable.length > 0 && !picking && <button data-testid="rem-slot-add" onClick={() => setPicking(true)} style={chip(false, true)}>+ Thêm giờ</button>}
          </div>
          {picking && (
            <div role="group" aria-label="Chọn bữa để nhắc" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {addable.map((id) => <button key={id} data-testid={`rem-slot-add-${id}`} onClick={() => addSlot(id)} style={{ ...chip(false, true), background: "rgba(0,122,255,0.22)" }}>{SHORT[id]} · {defaultSlotTime(times[id])}</button>)}
              <button onClick={() => setPicking(false)} style={{ ...chip(true), border: "none" }}>Huỷ</button>
            </div>
          )}
        </div>

        <div style={blk(true)}>
          <Head testid="rem-water" title="Nhắc uống nước" sub={(profile?.exerciseType || "gym") === "none" ? `Mục tiêu ${fmtL(waterGoalMl(curKg, false, profile?.waterGoalMl))} L/ngày` : `Mục tiêu ${fmtL(waterGoalMl(curKg, true, profile?.waterGoalMl))} L ngày tập · ${fmtL(waterGoalMl(curKg, false, profile?.waterGoalMl))} L ngày nghỉ`} on={r.water.on} onToggle={() => set("water", { on: !r.water.on })} />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button data-testid="rem-water-every" onClick={() => set("water", { every: nextEvery })} style={chip(!r.water.on)}>Mỗi {r.water.every} giờ</button>
            <TimeChip testid="rem-water-from" label="" value={r.water.from} dim={!r.water.on} onSave={(v) => setWaterRange("from", v)} />
            <span style={{ color: DK.t3, fontWeight: 700 }}>–</span>
            <TimeChip testid="rem-water-to" label="" value={r.water.to} dim={!r.water.on} onSave={(v) => setWaterRange("to", v)} />
          </div>
        </div>
      </div>

      <span style={secT}>CƠ THỂ</span>
      <div data-testid="rem-sec-body" style={box}>
        <div style={blk(true)}>
          <Head testid="rem-weigh" title="Cân & đo hằng tuần" sub={[lastW ? `Lần cân gần nhất ${fmtVN(lastW.logged_date)}` : "Chưa có lần cân nào", lastMeasureDate ? `lần đo gần nhất ${fmtVN(lastMeasureDate)}` : null].filter(Boolean).join(" · ")} on={r.weigh.on} onToggle={() => set("weigh", { on: !r.weigh.on })} />
          <div style={{ display: "flex", gap: 8, alignItems: "center", opacity: r.weigh.on ? 1 : 0.6 }}>
            <select data-testid="rem-weigh-day" aria-label="Thứ nhắc cân" value={r.weigh.weekday} onChange={(e) => set("weigh", { weekday: Number(e.target.value) })}
              style={{ ...chip(!r.weigh.on), WebkitAppearance: "none", appearance: "none", paddingRight: 12 }}>
              {WEEKDAY_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
            </select>
            <TimeChip testid="rem-weigh-time" label="" value={r.weigh.time} dim={!r.weigh.on} onSave={(v) => set("weigh", { time: v })} />
          </div>
          <button data-testid="rem-weigh-measure" role="checkbox" aria-checked={r.weigh.measure} onClick={() => set("weigh", { measure: !r.weigh.measure })}
            style={{ ...chip(!r.weigh.on), alignSelf: "flex-start", gap: 8 }}>
            <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: 6, background: r.weigh.measure ? "#00C896" : "transparent", border: `1.5px solid ${r.weigh.measure ? "#00C896" : "rgba(255,255,255,0.4)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#FFFFFF" }}>{r.weigh.measure ? "✓" : ""}</span>
            Kèm nhắc đo số đo
          </button>
        </div>

      </div>
      <p style={{ margin: "8px 20px 0 20px", fontSize: 12, color: DK.t3, lineHeight: 1.5 }}>Bấm vào thông báo cân &amp; đo sẽ mở thẳng Tiến độ.</p>

      <p style={{ margin: "12px 20px 0 20px", fontSize: 12, color: DK.t3, lineHeight: 1.5 }}>
        {iosNeedsHome ? "Trên iPhone cần thêm Fipilot vào Màn hình chính rồi mới bật được thông báo." : "Nhắc gửi theo giờ Việt Nam. Bấm vào giờ để đổi."}
      </p>
    </div>
  );
}
