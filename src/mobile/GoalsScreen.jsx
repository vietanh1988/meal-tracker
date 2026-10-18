// Màn Tôi › Mục tiêu & macro (bản vẽ HoSo):
//  - Thẻ macro ngày tập / ngày nghỉ + TDEE · BMI (tự tính lại theo calcMacro ngay khi đổi)
//  - Mục tiêu: Tăng cơ / Giảm mỡ / Duy trì, cân mục tiêu, số tháng (tăng cơ) / Tốc độ giảm Chậm·Vừa·Nhanh (giảm mỡ, bản vẽ 126)
//  - Điều chỉnh theo tuần: số kcal đã chỉnh từ thẻ Kiểm tra tuần (bấm để về 0)
//  - Cơ thể: giới tính, chiều cao, cân nặng (theo lần cân nếu đã có), năm sinh
//  - Tập luyện: loại tập, tần suất, lịch tập (mở màn Lịch tập & bữa), whey/TPBS, kiểu ăn khi giảm mỡ
//  - Cách tính: Việt Nam (BMR ×0,9) / Chuẩn quốc tế
// Ô số lưu khi rời ô (blur/Enter); lựa chọn lưu ngay qua setProfile.
import { useState } from "react";
import { Icon, Toggle, Seg } from "./ui";
import { fmtInt, fmtDec } from "../lib/mobileView";
import { todayVN, fmtVN } from "../lib/dateVN";
import { PacePicker, etaMonth } from "./PacePicker";
import { DK, dkCard } from "../theme";

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

// Nền tối (bản vẽ 48): thẻ kính mờ, ô nhập tối, nút chọn kiểu kính
const sec = { display: "block", padding: "16px 16px 6px 16px", fontSize: 11, fontWeight: 700, color: DK.t3, letterSpacing: "0.08em" };
const box = { ...dkCard, margin: "0 12px", borderRadius: 16, padding: "0 14px" };
const rowBase = { display: "flex", alignItems: "center", gap: 10, minHeight: 48, width: "100%", boxSizing: "border-box", borderStyle: "solid", borderColor: DK.line, background: "transparent", padding: 0, fontFamily: "inherit", color: DK.t1, textAlign: "left" };
const kStyle = { flex: 1, fontSize: 14, fontWeight: 600 };
const vStyle = { fontSize: 14, fontWeight: 700, color: DK.t2 };

// Dòng chọn 1 trong nhiều: bấm để mở các lựa chọn ngay bên dưới
function ChoiceRow({ k, value, options, selected, onPick, open, setOpen, id, last }) {
  const isOpen = open === id;
  return (
    <div style={{ borderBottom: last ? "none" : `1px solid ${DK.line}` }}>
      <button data-testid={`goals-${id}`} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : id)} style={{ ...rowBase, borderWidth: 0 }}>
        <span style={kStyle}>{k}</span>
        <span style={vStyle}>{value}</span>
        <span style={{ display: "flex", color: DK.chev, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}>{Icon.down(14)}</span>
      </button>
      {isOpen && (
        <div role="group" aria-label={k} style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingBottom: 12 }}>
          {options.map(([oid, text, disabled]) => {
            const on = oid === selected;
            return (
              <button key={oid} data-testid={`goals-${id}-${oid}`} aria-pressed={on} disabled={!!disabled}
                onClick={() => { onPick(oid); setOpen(null); }}
                style={{ height: 36, padding: "0 12px", borderRadius: 10, fontFamily: "inherit", fontSize: 13, fontWeight: on ? 800 : 600, border: `1.5px solid ${on ? "#FFFFFF" : DK.chipLine}`, background: on ? "#FFFFFF" : DK.chip, color: on ? "#0040E0" : DK.t2 }}>{text}</button>
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
      style={{ width, height: 36, padding: "0 8px", borderRadius: 10, border: `1.5px solid ${DK.fieldLine}`, background: DK.field, fontFamily: "inherit", fontSize: 16, fontWeight: 700, color: DK.t1, textAlign: "right", boxSizing: "border-box" }} />
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

export function GoalsScreen({ profile, setProfile, macro, weightLog, openSchedule, openWeigh }) {
  const [open, setOpen] = useState(null);
  const p = profile || {};
  const m = macro || {};
  // Sửa số đo nào thì bỏ dấu "đang dùng số mặc định" của số đó
  const save = (patch) => {
    const d = (p._defaulted || []).filter((f) => !(f in patch));
    setProfile({ ...p, ...patch, _defaulted: d.length ? d : undefined });
  };
  const goal = p.goalType || "bulk";
  const noEx = (p.exerciseType || "gym") === "none";
  const lastW = (weightLog || [])[weightLog?.length - 1];
  const BODY_NAME = { cm: "chiều cao", kg: "cân nặng", birthYear: "năm sinh", goalKg: "cân mục tiêu" };
  const missing = (p._defaulted || []).filter((f) => !(f === "kg" && lastW));
  // 4 số đúng bằng mặc định của app (172 cm · 63 kg · 1987 · 68 kg) → nhiều khả năng chưa từng nhập thật
  const looksDefault = !missing.length && Number(p.cm) === 172 && (lastW ? true : Number(p.kg) === 63) && Number(p.birthYear) === 1987 && Number(p.goalKg) === 68;
  const year = Number(todayVN().slice(0, 4));
  const age = p.birthYear ? year - Number(p.birthYear) : null;
  const speed = speedText(m, m.goal || goal, p.months);
  const isCut = (m.goal || goal) === "cut";
  const curKg = lastW ? lastW.kg : p.kg;
  const cutLine = !isCut ? null
    : m.directionMismatch ? { bad: true, text: "Cân mục tiêu cao hơn cân hiện tại — sửa lại cân mục tiêu hoặc đổi mục tiêu." }
    : !m.etaWeeks ? { bad: false, text: "Đã tới cân mục tiêu — chuyển sang Duy trì để giữ cân." }
    : { bad: false, text: `Đạt ${fmtDec(p.goalKg)} kg vào khoảng ${etaMonth(m.etaWeeks)} (≈ ${m.etaWeeks} tuần) · bớt ${fmtInt(m.deficit)} kcal/ngày · an toàn, giữ cơ` };
  const offset = isCut || (m.goal || goal) === "bulk" ? Number(m.calOffset) || 0 : 0;
  const sOff = (v) => (v === 0 ? "±0" : `${v > 0 ? "+" : "−"}${fmtInt(Math.abs(v))}`);
  const gym = noEx ? "Không tập" : (p.gymDays || []).slice().sort((a, b) => a - b).map((i) => GYM_NAMES[i]).join(", ") || "Chưa chọn";

  // Đổi mục tiêu → điều chỉnh tuần về 0 (bản vẽ 129c)
  const pickGoal = (g) => { const up = { goalType: g, calOffset: 0, calOffsetDate: null }; if (g !== "cut") up.dietStrategy = "balanced"; save(up); };
  const pickExercise = (e) => {
    const up = { exerciseType: e };
    if (e === "none") { up.frequency = undefined; if (goal === "bulk") { up.goalType = "maintain"; up.dietStrategy = "balanced"; } }
    else if (!p.frequency) up.frequency = "regular";
    save(up);
  };

  const tile = (t, cal, c) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: DK.t2 }}>{t}</span>
      <span style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.15 }}>{fmtInt(cal)} <span style={{ fontSize: 13, fontWeight: 700 }}>kcal</span></span>
      <span style={{ fontSize: 11, fontWeight: 600, color: DK.t3 }}>Đ {fmtInt(m.protein)} · TB {fmtInt(c)} · B {fmtInt(m.fat)} g</span>
    </div>
  );

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Bản vẽ 51: khối macro kính + vạch nhấn xanh (thay nền xanh đặc) */}
      <div data-testid="goals-macro" data-cal={Math.round(m.calTarget) || 0} style={{ ...dkCard, margin: "12px 12px 0 12px", borderRadius: 18, padding: 16, color: "#FFFFFF", display: "grid", gridTemplateColumns: noEx ? "1fr" : "1fr 1fr", gap: 12, position: "relative" }}>
        <span aria-hidden="true" style={{ position: "absolute", left: 16, top: 0, width: 44, height: 3, borderRadius: "0 0 3px 3px", background: "#4DA3FF" }} />
        {noEx ? tile("Mỗi ngày", m.calTarget, m.carb) : <>{tile("Ngày tập", m.calTarget, m.carb)}{tile("Ngày nghỉ", m.calRest, m.carbRest)}</>}
        <div style={{ gridColumn: "1 / -1", borderTop: `1px solid ${DK.line}`, paddingTop: 10, fontSize: 12, fontWeight: 600, color: DK.t2 }}>
          {(m.goal || goal) === "cut"
            ? `TDEE ${fmtInt(m.tdee)} kcal · bớt ${fmtInt(m.deficit - (m.calOffset || 0))} kcal/ngày · BMI ${fmtDec(m.bmi)}`
            : (m.goal || goal) === "bulk" && m.calOffset ? `TDEE ${fmtInt(m.tdee)} kcal · BMI ${fmtDec(m.bmi)} · Tăng cơ ${sOff(250 + m.calOffset)} (+250 · ${sOff(m.calOffset)} kiểm tra tuần)` : `TDEE ${fmtInt(m.tdee)} kcal · BMI ${fmtDec(m.bmi)} · ${GOAL_NAME[m.goal || goal]} ${ADJUST[m.goal || goal]}`}
        </div>
        {m.floorApplied && <div data-testid="goals-floor" style={{ gridColumn: "1 / -1", fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.18)", borderRadius: 10, padding: "6px 10px" }}>Đã nâng lên mức tối thiểu an toàn {fmtInt(m.calFloor)} kcal/ngày khi giảm mỡ.</div>}
      </div>

      {(missing.length > 0 || looksDefault) && (
        <div data-testid="goals-missing" role="status" style={{ margin: "12px 12px 0 12px", padding: "10px 12px", borderRadius: 12, background: "rgba(245,158,11,0.18)", border: "1px solid rgba(252,211,77,0.4)", color: DK.amber, fontSize: 13, fontWeight: 600, lineHeight: 1.45 }}>
          {missing.length > 0
            ? `Hồ sơ chưa có ${missing.map((f) => BODY_NAME[f]).join(", ")} — đang tạm dùng số mặc định. Nhập lại bên dưới để calo tính đúng.`
            : "Số đo đang giống hệt số mặc định của app (172 cm · 63 kg · 1987). Kiểm tra lại cho đúng với bạn."}
        </div>
      )}

      <span style={sec}>MỤC TIÊU</span>
      <div style={{ ...box, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
        <Seg dark ariaLabel="Mục tiêu" value={goal} onChange={pickGoal} opts={GOALS.map(([g, t]) => ({ value: g, label: t, testid: `goals-goal-${g}`, disabled: noEx && g === "bulk" }))} />
        {noEx && <span style={{ fontSize: 12, color: DK.t3, marginTop: -4 }}>Không tập thì không đặt Tăng cơ được — chọn Giảm mỡ hoặc Duy trì.</span>}
        {isCut ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: DK.t3 }}>Cân hiện tại</span>
                <span data-testid="goals-curkg" style={{ height: 36, borderRadius: 10, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 10px", fontSize: 16, fontWeight: 700, color: DK.t2 }}>{fmtDec(curKg)} kg</span>
              </span>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: DK.t3 }}>Cân mục tiêu (kg)</span>
                <NumField testid="goals-goalkg" ariaLabel="Cân mục tiêu" value={p.goalKg} min={30} max={250} decimal width="100%" onSave={(v) => save({ goalKg: v })} />
              </label>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: DK.t3, marginBottom: -4 }}>Tốc độ giảm</span>
            <PacePicker testid="goals-pace" kg={p.kg} value={p.cutPace} onChange={(v) => save({ cutPace: v })} />
            <span data-testid="goals-speed" style={{ padding: "10px 12px", borderRadius: 12, fontSize: 13, fontWeight: 600, lineHeight: 1.4, background: cutLine.bad ? "rgba(245,158,11,0.18)" : "rgba(0,200,150,0.18)", color: cutLine.bad ? DK.amber : DK.green }}>{cutLine.text}</span>
            <span style={{ fontSize: 12, color: DK.t3, lineHeight: 1.45 }}>Chậm: dễ giữ, ít đói · Vừa: khuyên dùng · Nhanh: đói hơn, cần ăn đủ đạm. Mức ăn luôn ≥ {fmtInt(m.calFloor || 1500)} kcal/ngày.</span>
            {/* 18/10: khách giảm mỡ tự chọn giao diện — Đầy đủ (gym, xem macro) hoặc Gọn (giảm cân: thực đơn tự lên, Hôm nay bản gọn) */}
            <span style={{ fontSize: 12, fontWeight: 700, color: DK.t3, marginBottom: -4, marginTop: 4 }}>Giao diện</span>
            <Seg dark ariaLabel="Giao diện" value={p.uiMode === "loss" ? "loss" : "gym"} onChange={(v) => save({ uiMode: v })}
              opts={[{ value: "gym", label: "Đầy đủ (gym)", testid: "goals-ui-gym" }, { value: "loss", label: "Gọn (giảm cân)", testid: "goals-ui-loss" }]} />
            <span style={{ fontSize: 12, color: DK.t3, lineHeight: 1.45 }}>{p.uiMode === "loss" ? "Gọn: thực đơn món Việt tự lên mỗi ngày, Hôm nay chỉ báo bạn có đang đúng kế hoạch không — không cần tính macro." : "Đầy đủ: xem đạm, tinh bột, béo từng bữa — hợp người tập gym. Chọn Gọn nếu bạn chỉ cần giảm cân cho dễ."}</span>
          </>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: DK.t3 }}>Cân mục tiêu (kg)</span>
                <NumField testid="goals-goalkg" ariaLabel="Cân mục tiêu" value={p.goalKg} min={30} max={250} decimal width="100%" onSave={(v) => save({ goalKg: v })} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: DK.t3 }}>Trong vòng (tháng)</span>
                <NumField testid="goals-months" ariaLabel="Số tháng" value={p.months} min={1} max={36} width="100%" onSave={(v) => save({ months: v })} />
              </label>
            </div>
            <span data-testid="goals-speed" style={{ padding: "10px 12px", borderRadius: 12, fontSize: 13, fontWeight: 600, lineHeight: 1.4, background: speed.bad ? "rgba(245,158,11,0.18)" : "rgba(0,200,150,0.18)", color: speed.bad ? DK.amber : DK.green }}>{speed.text}</span>
          </>
        )}
      </div>

      {offset !== 0 && <>
        <span style={sec}>ĐIỀU CHỈNH THEO TUẦN</span>
        <div style={box}>
          <button data-testid="goals-offset" onClick={() => save({ calOffset: 0, calOffsetDate: null })} style={{ ...rowBase, minHeight: 58, borderWidth: 0 }}>
            <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Đã chỉnh từ kiểm tra tuần</span>
              <span style={{ fontSize: 12, color: DK.t3 }}>{sOff(offset)} kcal{p.calOffsetDate ? ` (${fmtVN(p.calOffsetDate)})` : ""} · bấm để về 0</span>
            </span>
            <span style={{ height: 32, padding: "0 12px", borderRadius: 10, background: "#FFFFFF", color: "#0040E0", fontSize: 14, fontWeight: 900, display: "flex", alignItems: "center" }}>{sOff(offset)}</span>
          </button>
        </div>
      </>}

      <span style={sec}>CƠ THỂ</span>
      <div style={box}>
        <ChoiceRow id="gender" k="Giới tính" value={nameOf(GENDER, p.gender || "male")} options={GENDER} selected={p.gender || "male"} onPick={(v) => save({ gender: v })} open={open} setOpen={setOpen} />
        <NumRow k="Chiều cao" unit="cm" testid="goals-cm" value={p.cm} min={120} max={230} onSave={(v) => save({ cm: v })} />
        {/* 17/10 (bản vẽ 115): bỏ ô nhập cân nặng riêng — chỉ 1 nguồn là lần cân; nút "Cân hôm nay" mở sheet Cân hôm nay */}
        {openWeigh ? (
          <div style={{ ...rowBase, borderWidth: "0 0 1px 0" }}>
            <span style={kStyle}>Cân nặng</span>
            <span data-testid="goals-kg" style={vStyle}>{lastW ? `${fmtDec(lastW.kg)} kg · theo lần cân` : `${fmtDec(p.kg)} kg`}</span>
            <button data-testid="goals-weigh" onClick={openWeigh} style={{ height: 32, padding: "0 10px", borderRadius: 10, border: `1.5px solid ${DK.chipLine}`, background: DK.chip, fontFamily: "inherit", fontSize: 12, fontWeight: 800, color: DK.t1, flexShrink: 0 }}>Cân hôm nay</button>
          </div>
        ) : lastW ? (
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
            {Icon.chev(16, DK.chev)}
          </button>
        )}
        {goal === "cut" && <ChoiceRow id="diet" k="Kiểu ăn" value={nameOf(DIET, p.dietStrategy || "balanced")} options={DIET} selected={p.dietStrategy || "balanced"} onPick={(v) => save({ dietStrategy: v })} open={open} setOpen={setOpen} />}
        <div style={{ ...rowBase, minHeight: 52, borderWidth: 0 }}>
          <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Dùng whey / TPBS</span>
            <span style={{ fontSize: 12, color: DK.t3 }}>AI tính cả whey khi lên thực đơn</span>
          </span>
          <Toggle testid="goals-whey" on={p.usesSupplements === true} label="Dùng whey / TPBS" onClick={() => save({ usesSupplements: !(p.usesSupplements === true) })} />
        </div>
      </div>

      <span style={sec}>CÁCH TÍNH</span>
      <div style={box}>
        <ChoiceRow id="mode" k="Công thức" value={nameOf(MODE, p.calorieMode || "standard")} options={MODE} selected={p.calorieMode || "standard"} onPick={(v) => save({ calorieMode: v })} open={open} setOpen={setOpen} last />
      </div>
      <p style={{ margin: "8px 16px 0 16px", fontSize: 12, color: DK.t3, lineHeight: 1.45 }}>
        BMR theo Mifflin-St Jeor × hệ số vận động = TDEE. Tăng cơ +250 kcal; giảm mỡ bớt theo tốc độ đã chọn (kg/tuần × 7.700 / 7, tối đa 25% TDEE). Đạm {m.pRatio ? `${fmtDec(parseFloat(m.pRatio))} g/kg` : "—"}, béo tối thiểu 0,7 g/kg, tinh bột là phần còn lại (ngày nghỉ giảm 25%).
      </p>
    </div>
  );
}
