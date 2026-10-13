// Màn Tôi › Mục tiêu & macro (bản vẽ HoSo):
//  - Thẻ macro ngày tập / ngày nghỉ + TDEE · BMI (tự tính lại theo calcMacro ngay khi đổi)
//  - Mục tiêu: Tăng cơ / Giảm mỡ / Duy trì, cân mục tiêu, số tháng, tốc độ an toàn
//  - Cơ thể: giới tính, chiều cao, cân nặng (theo lần cân nếu đã có), năm sinh
//  - Tập luyện: loại tập, tần suất, lịch tập (mở màn Lịch tập & bữa), whey/TPBS, kiểu ăn khi giảm mỡ
//  - Cách tính: Việt Nam (BMR ×0,9) / Chuẩn quốc tế
// Ô số lưu khi rời ô (blur/Enter); lựa chọn lưu ngay qua setProfile.
import { useState } from "react";
import { Icon, Toggle, GRAD_BLUE } from "./ui";
import { fmtInt, fmtDec } from "../lib/mobileView";
import { todayVN } from "../lib/dateVN";

const GOALS = [["bulk", "Tăng cơ"], ["cut", "Giảm mỡ"], ["maintain", "Duy trì"]];
const GOAL_NAME = { bulk: "Tăng cơ", cut: "Giảm mỡ", maintain: "Duy trì" };
const ADJUST = { bulk: "+250", cut: "−350", maintain: "±0" };
const EXERCISE = [["gym", "Gym"], ["gym_cardio", "Gym + Cardio"], ["cardio", "Cardio"], ["none", "Không tập"]];
const FREQ = [["occasional", "1–2 buổi/tuần"], ["regular", "3–4 buổi/tuần"], ["frequent", "5–6 buổi/tuần"], ["daily", "Mỗi ngày"]];
const GENDER = [["male", "Nam"], ["female", "Nữ"]];
const DIET = [["balanced", "Cân bằng"], ["low_carb", "Ít tinh bột"], ["keto", "Keto"]];
const MODE = [["asian", "Việt Nam (BMR ×0,9)"], ["standard", "Chuẩn quốc tế"]];
const GYM_NAMES = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const nameOf = (list, id) => (list.find((x) => x[0] === id) || [])[1] || "—";

const sec = { display: "block", padding: "16px 16px 6px 16px", fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em" };
const box = { margin: "0 12px", background: "#FFFFFF", border: "1.5px solid #E2E8F0", borderRadius: 16, padding: "0 14px" };
const rowBase = { display: "flex", alignItems: "center", gap: 10, minHeight: 48, width: "100%", boxSizing: "border-box", borderStyle: "solid", borderColor: "#F1F5F9", background: "transparent", padding: 0, fontFamily: "inherit", color: "#0F172A", textAlign: "left" };
const kStyle = { flex: 1, fontSize: 14, fontWeight: 600 };
const vStyle = { fontSize: 14, fontWeight: 700, color: "#475569" };

// Dòng chọn 1 trong nhiều: bấm để mở các lựa chọn ngay bên dưới
function ChoiceRow({ k, value, options, selected, onPick, open, setOpen, id, last }) {
  const isOpen = open === id;
  return (
    <div style={{ borderBottom: last ? "none" : "1px solid #F1F5F9" }}>
      <button data-testid={`goals-${id}`} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : id)} style={{ ...rowBase, borderWidth: 0 }}>
        <span style={kStyle}>{k}</span>
        <span style={vStyle}>{value}</span>
        <span style={{ display: "flex", color: "#94A3B8", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}>{Icon.down(14)}</span>
      </button>
      {isOpen && (
        <div role="group" aria-label={k} style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingBottom: 12 }}>
          {options.map(([oid, text, disabled]) => {
            const on = oid === selected;
            return (
              <button key={oid} data-testid={`goals-${id}-${oid}`} aria-pressed={on} disabled={!!disabled}
                onClick={() => { onPick(oid); setOpen(null); }}
                style={{ height: 36, padding: "0 12px", borderRadius: 10, fontFamily: "inherit", fontSize: 13, fontWeight: on ? 800 : 600, border: `1.5px solid ${on ? "#007AFF" : "#E2E8F0"}`, background: on ? "rgba(0,122,255,0.08)" : "#FFFFFF", color: on ? "#007AFF" : "#475569" }}>{text}</button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Ô nhập số: giữ chuỗi đang gõ, lưu khi rời ô nếu hợp lệ, sai thì trả về số cũ
function NumField({ value, min, max, decimal, onSave, testid, width = 64, ariaLabel }) {
  const [draft, setDraft] = useState(null);
  const shown = draft ?? (value != null && value !== "" ? (decimal ? fmtDec(value) : String(value)) : "");
  const commit = () => {
    if (draft == null) return;
    const n = Number(String(draft).replace(",", ".").trim());
    setDraft(null);
    if (!Number.isFinite(n) || n < min || n > max) return;
    const v = decimal ? Math.round(n * 10) / 10 : Math.round(n);
    if (v !== Number(value)) onSave(v);
  };
  return (
    <input data-testid={testid} aria-label={ariaLabel} type="text" inputMode={decimal ? "decimal" : "numeric"} value={shown}
      onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      style={{ width, height: 36, padding: "0 8px", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#F1F5F9", fontFamily: "inherit", fontSize: 16, fontWeight: 700, color: "#0F172A", textAlign: "right", boxSizing: "border-box" }} />
  );
}

function NumRow({ k, unit, last, ...f }) {
  return (
    <label style={{ ...rowBase, borderWidth: last ? 0 : "0 0 1px 0" }}>
      <span style={kStyle}>{k}</span>
      <NumField ariaLabel={k} {...f} />
      <span style={{ ...vStyle, minWidth: 28 }}>{unit}</span>
    </label>
  );
}

function speedText(m, goal, months) {
  if (m.directionMismatch) return { bad: true, text: `Cân mục tiêu ngược hướng với ${GOAL_NAME[goal].toLowerCase()} — sửa lại cân mục tiêu hoặc đổi mục tiêu.` };
  if (goal === "maintain") return { bad: false, text: "Giữ cân, ăn đúng mức tiêu hao (TDEE)." };
  const weeks = (Number(months) || 0) * 4.33;
  if (!weeks) return { bad: true, text: "Chọn số tháng để tính tốc độ." };
  const g = Math.round((Math.abs(m.diff) / weeks) * 1000);
  const sign = m.diff >= 0 ? "+" : "−";
  const ok = m.safe;
  const note = goal === "bulk" ? (ok ? "An toàn, chủ yếu tăng cơ" : "Hơi nhanh, dễ tích mỡ — nên kéo dài thời gian") : (ok ? "An toàn, giữ được cơ" : "Hơi nhanh, dễ mất cơ — nên kéo dài thời gian");
  return { bad: !ok, text: `${sign}${fmtDec(Math.abs(m.diff))} kg · ≈ ${sign}${fmtInt(g)} g/tuần · ${note}` };
}

export function GoalsScreen({ profile, setProfile, macro, weightLog, openSchedule }) {
  const [open, setOpen] = useState(null);
  const p = profile || {};
  const m = macro || {};
  const save = (patch) => setProfile({ ...p, ...patch });
  const goal = p.goalType || "bulk";
  const noEx = (p.exerciseType || "gym") === "none";
  const lastW = (weightLog || [])[weightLog?.length - 1];
  const year = Number(todayVN().slice(0, 4));
  const age = p.birthYear ? year - Number(p.birthYear) : null;
  const speed = speedText(m, m.goal || goal, p.months);
  const gym = noEx ? "Không tập" : (p.gymDays || []).slice().sort((a, b) => a - b).map((i) => GYM_NAMES[i]).join(", ") || "Chưa chọn";

  const pickGoal = (g) => { const up = { goalType: g }; if (g !== "cut") up.dietStrategy = "balanced"; save(up); };
  const pickExercise = (e) => {
    const up = { exerciseType: e };
    if (e === "none") { up.frequency = undefined; if (goal === "bulk") { up.goalType = "maintain"; up.dietStrategy = "balanced"; } }
    else if (!p.frequency) up.frequency = "regular";
    save(up);
  };

  const tile = (t, cal, c) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.9 }}>{t}</span>
      <span style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.15 }}>{fmtInt(cal)} <span style={{ fontSize: 13, fontWeight: 700 }}>kcal</span></span>
      <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.92 }}>Đ {fmtInt(m.protein)} · TB {fmtInt(c)} · B {fmtInt(m.fat)} g</span>
    </div>
  );

  return (
    <div style={{ paddingBottom: 32 }}>
      <div data-testid="goals-macro" data-cal={Math.round(m.calTarget) || 0} style={{ margin: "12px 12px 0 12px", borderRadius: 18, padding: 16, background: GRAD_BLUE, color: "#FFFFFF", display: "grid", gridTemplateColumns: noEx ? "1fr" : "1fr 1fr", gap: 12 }}>
        {noEx ? tile("Mỗi ngày", m.calTarget, m.carb) : <>{tile("Ngày tập", m.calTarget, m.carb)}{tile("Ngày nghỉ", m.calRest, m.carbRest)}</>}
        <div style={{ gridColumn: "1 / -1", borderTop: "1px solid rgba(255,255,255,0.25)", paddingTop: 10, fontSize: 12, fontWeight: 600 }}>
          TDEE {fmtInt(m.tdee)} kcal · BMI {fmtDec(m.bmi)} · {GOAL_NAME[m.goal || goal]} {ADJUST[m.goal || goal]}
        </div>
      </div>

      <span style={sec}>MỤC TIÊU</span>
      <div style={{ ...box, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div role="group" aria-label="Mục tiêu" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", padding: 3, background: "#F1F5F9", borderRadius: 12 }}>
          {GOALS.map(([g, t]) => {
            const on = goal === g;
            const dis = noEx && g === "bulk";
            return (
              <button key={g} data-testid={`goals-goal-${g}`} aria-pressed={on} disabled={dis} onClick={() => pickGoal(g)}
                style={{ height: 38, borderRadius: 9, border: "none", fontFamily: "inherit", fontSize: 14, fontWeight: on ? 800 : 600, background: on ? "#FFFFFF" : "transparent", color: on ? "#007AFF" : "#475569", boxShadow: on ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>{t}</button>
            );
          })}
        </div>
        {noEx && <span style={{ fontSize: 12, color: "#64748B", marginTop: -4 }}>Không tập thì không đặt Tăng cơ được — chọn Giảm mỡ hoặc Duy trì.</span>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>Cân mục tiêu (kg)</span>
            <NumField testid="goals-goalkg" ariaLabel="Cân mục tiêu" value={p.goalKg} min={30} max={250} decimal width="100%" onSave={(v) => save({ goalKg: v })} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>Trong vòng (tháng)</span>
            <NumField testid="goals-months" ariaLabel="Số tháng" value={p.months} min={1} max={36} width="100%" onSave={(v) => save({ months: v })} />
          </label>
        </div>
        <span data-testid="goals-speed" style={{ padding: "10px 12px", borderRadius: 12, fontSize: 13, fontWeight: 600, lineHeight: 1.4, background: speed.bad ? "rgba(245,158,11,0.12)" : "rgba(0,200,150,0.1)", color: speed.bad ? "#92400E" : "#065F46" }}>{speed.text}</span>
      </div>

      <span style={sec}>CƠ THỂ</span>
      <div style={box}>
        <ChoiceRow id="gender" k="Giới tính" value={nameOf(GENDER, p.gender || "male")} options={GENDER} selected={p.gender || "male"} onPick={(v) => save({ gender: v })} open={open} setOpen={setOpen} />
        <NumRow k="Chiều cao" unit="cm" testid="goals-cm" value={p.cm} min={120} max={230} onSave={(v) => save({ cm: v })} />
        {lastW ? (
          <div style={{ ...rowBase, borderWidth: "0 0 1px 0" }}>
            <span style={kStyle}>Cân nặng</span>
            <span data-testid="goals-kg" style={vStyle}>{fmtDec(lastW.kg)} kg · theo lần cân</span>
          </div>
        ) : (
          <NumRow k="Cân nặng" unit="kg" testid="goals-kg-input" value={p.kg} min={30} max={250} decimal onSave={(v) => save({ kg: v })} />
        )}
        <NumRow k={age != null && age > 0 ? `Năm sinh · ${age} tuổi` : "Năm sinh"} unit="" testid="goals-birth" value={p.birthYear} min={year - 90} max={year - 10} width={76} onSave={(v) => save({ birthYear: v })} last />
      </div>

      <span style={sec}>TẬP LUYỆN</span>
      <div style={box}>
        <ChoiceRow id="exercise" k="Loại tập" value={nameOf(EXERCISE, p.exerciseType || "gym")} options={EXERCISE} selected={p.exerciseType || "gym"} onPick={pickExercise} open={open} setOpen={setOpen} />
        {!noEx && <ChoiceRow id="freq" k="Tần suất" value={nameOf(FREQ, p.frequency || "regular")} options={FREQ} selected={p.frequency || "regular"} onPick={(v) => save({ frequency: v })} open={open} setOpen={setOpen} />}
        {!noEx && (
          <button data-testid="goals-schedule" onClick={openSchedule} style={{ ...rowBase, borderWidth: "0 0 1px 0" }}>
            <span style={kStyle}>Lịch tập</span>
            <span style={{ ...vStyle, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "55%" }}>{gym}</span>
            {Icon.chev(16)}
          </button>
        )}
        {goal === "cut" && <ChoiceRow id="diet" k="Kiểu ăn" value={nameOf(DIET, p.dietStrategy || "balanced")} options={DIET} selected={p.dietStrategy || "balanced"} onPick={(v) => save({ dietStrategy: v })} open={open} setOpen={setOpen} />}
        <div style={{ ...rowBase, minHeight: 52 }}>
          <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Dùng whey / TPBS</span>
            <span style={{ fontSize: 12, color: "#64748B" }}>AI tính cả whey khi lên thực đơn</span>
          </span>
          <Toggle testid="goals-whey" on={p.usesSupplements === true} label="Dùng whey / TPBS" onClick={() => save({ usesSupplements: !(p.usesSupplements === true) })} />
        </div>
      </div>

      <span style={sec}>CÁCH TÍNH</span>
      <div style={box}>
        <ChoiceRow id="mode" k="Công thức" value={nameOf(MODE, p.calorieMode || "standard")} options={MODE} selected={p.calorieMode || "standard"} onPick={(v) => save({ calorieMode: v })} open={open} setOpen={setOpen} last />
      </div>
      <p style={{ margin: "8px 16px 0 16px", fontSize: 12, color: "#64748B", lineHeight: 1.45 }}>
        BMR theo Mifflin-St Jeor × hệ số vận động = TDEE. Tăng cơ +250 kcal, giảm mỡ −350 kcal. Đạm {m.pRatio || "—"}, béo tối thiểu 0,7 g/kg, tinh bột là phần còn lại (ngày nghỉ giảm 25%).
      </p>
    </div>
  );
}
