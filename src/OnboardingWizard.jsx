// Thiết lập lần đầu (bản vẽ 54–59, chốt 14/10) — nền Blue Dark nối tiếp màn đăng nhập.
//  0 Chào → 1 Cơ thể → 2 Tập luyện → 3 Mục tiêu → 4 Phong cách ăn (dòng macro mỗi ngày ở đầu) + AI lên thực đơn ngày đầu.
// Bản vẽ 110–112 (16/10): ô cơ thể để trống + báo số vô lý; chọn thẳng ngày tập T2…CN (tần suất tự suy ra);
// chặn mục tiêu ngược hướng; bỏ màn "Xong" riêng (BMR/TDEE) → 1 dòng macro ở đầu màn Phong cách ăn.
// Logic giữ nguyên bản cũ: lưu từng thay đổi qua setProfile, tính macro bằng calcMacro, AI qua generateMenuAI.
// Khác bản cũ: áp thực đơn đầu tiên chỉ áp cho HÔM NAY, không tự lưu ngầm vào "Lặp lại hằng tuần" (thống nhất chốt 13/10).
import { useState } from "react";
import { calcMacro } from "./calcMacro";
import { generateMenuAI, resolveMealIds } from "./lib/aiMenuService";
import { DK, DK_CSS, dkCard, dkGlass } from "./theme";
import { Seg } from "./mobile/ui";
import { todayVN } from "./lib/dateVN";
import { bodyErrors, bodyValid, daysToFrequency, goalDirectionError, isPlaceholderBody, BODY_LIMITS } from "./lib/onboardingCheck";

const FONT = "Inter, Roboto, -apple-system, 'Segoe UI', sans-serif";
const GRAD_BLUE = "linear-gradient(135deg,#1A7CFF,#0062F0,#0050E6)";
const svg = (d, s = 22, w = 2.2) => <svg aria-hidden="true" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const P = {
  back: <path d="M15 6l-6 6 6 6" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /></>,
  spark: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  food: <path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10M17 3c-2 0-3 2-3 5s1 4 3 4v9" />,
  calc: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 12h2M12 12h2M8 16h2M12 16h2" /></>,
  doc: <><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4M9 12h7M9 16h5" /></>,
  share: <><path d="M12 3v12M8 7l4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></>,
};
const ic = (k, color, size = 40, s = 22) => <span aria-hidden="true" className="dkic" style={{ width: size, height: size, borderRadius: size >= 36 ? 11 : 9, background: color, color: "#FFFFFF", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 3px 8px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{svg(P[k], s)}</span>;
const fmt = (n) => Math.round(Number(n) || 0).toLocaleString("vi-VN");
const numOf = (v) => (v === "" || v === null || v === undefined ? NaN : Number(String(v).replace(",", ".")));
const BODY = ["cm", "kg", "birthYear", "goalKg"];
const DAY_NAMES = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]; // profile.gymDays: 0 = T2 … 6 = CN

export function OnboardingWizard({ profile, setProfile, onComplete, appSettings, applyTemplate }) {
  const [step, setStep] = useState(0);
  const [autoStyle, setAutoStyle] = useState("vn");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [aiErr, setAiErr] = useState("");
  const isStandalone = typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone);
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);
  const [showPin, setShowPin] = useState(!isStandalone && isIOS);
  // Số đo nhập ở màn này giữ tạm trong draft (chuỗi đang gõ), chỉ ghi vào hồ sơ khi bấm Tiếp tục / Tính macro —
  // không ghi số mặc định hay ô trống vào DB. Hồ sơ đã có số thật (chạy lại onboarding) thì điền sẵn số thật.
  const [draft, setDraft] = useState(() => {
    const pr = profile || {};
    const blank = new Set(pr._defaulted || []);
    if (isPlaceholderBody(pr)) BODY.forEach((f) => blank.add(f)); // số mặc định app / mặc định cột DB → để trống
    const d = {};
    BODY.forEach((f) => { d[f] = blank.has(f) || pr[f] === undefined || pr[f] === null || pr[f] === "" ? "" : String(pr[f]).replace(".", ","); });
    return d;
  });
  const [touched, setTouched] = useState({});
  const p = { ...(profile || {}) };
  if (!p.gender) p.gender = "male";
  const pm = { ...p };
  BODY.forEach((f) => { const n = numOf(draft[f]); if (!Number.isNaN(n)) pm[f] = n; });
  const macro = calcMacro(pm);
  const noEx = (p.exerciseType || "gym") === "none";
  const year = Number(todayVN().slice(0, 4));
  const set = (patch) => setProfile({ ...p, ...patch });
  const keepDefaulted = (fields) => { const d = (p._defaulted || []).filter((f) => !fields.includes(f)); return d.length ? d : undefined; };
  const gymDays = Array.isArray(p.gymDays) ? p.gymDays : [];

  const finish = () => { setProfile({ ...p, onboardingDone: true }); onComplete(); };
  const applyMenu = async (tpl) => {
    try { if (applyTemplate) await applyTemplate(tpl); } catch (e) { console.error("Apply AI menu on onboarding error:", e); } // chỉ áp cho hôm nay
    finish();
  };
  const runAutoMenu = async () => {
    setLoading(true); setResult(null); setAiErr("");
    try {
      const dayType = noEx ? "rest" : "train";
      const mealIds = resolveMealIds(dayType, pm, appSettings);
      const res = await generateMenuAI({ macro, profile: pm, dayType, mealIds, prefs: { style: autoStyle, avoid: "" }, avoidFoods: [], appSettings });
      // generateMenuAI trả {ok, template:{meals}} (16/10: trước đây kiểm res.meals → luôn thoát im lặng, vẫn tốn 1 lượt AI)
      if (res?.ok && res.template?.meals?.length) setResult({ ...res.template, day_type: dayType });
      else setAiErr(res?.error || "Chưa tạo được thực đơn. Thử lại hoặc bỏ qua để tự ghi.");
    } catch (e) { console.error("Auto menu onboarding error:", e); setAiErr("Chưa tạo được thực đơn (lỗi mạng). Thử lại hoặc bỏ qua để tự ghi."); } finally { setLoading(false); }
  };

  // ---------- khối dùng chung ----------
  const btn = (label, onClick, disabled, testid) => (
    <button data-testid={testid} onClick={onClick} disabled={disabled} style={{ width: "100%", height: 52, borderRadius: 14, border: "none", background: disabled ? "rgba(255,255,255,0.18)" : GRAD_BLUE, color: "#FFFFFF", fontFamily: "inherit", fontSize: 16, fontWeight: 900, boxShadow: disabled ? "none" : "0 6px 16px rgba(0,87,255,0.35)", cursor: disabled ? "default" : "pointer" }}>{label}</button>
  );
  const link = (label, onClick, color = DK.t3) => <button onClick={onClick} style={{ border: "none", background: "transparent", color, fontFamily: "inherit", fontSize: 13, fontWeight: 700, padding: "8px 6px" }}>{label}</button>;
  const dots = (cur) => (
    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
      {[1, 2, 3].map((i) => <span key={i} style={{ width: i === cur ? 22 : 8, height: 8, borderRadius: 4, background: i === cur ? "#FFFFFF" : i < cur ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.2)", transition: "all .3s" }} />)}
    </div>
  );
  const top = (n) => (
    <div style={{ display: "flex", alignItems: "center", padding: "6px 12px 0 4px" }}>
      <button aria-label="Quay lại" onClick={() => setStep(step - 1)} style={{ width: 44, height: 44, border: "none", background: "transparent", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>{svg(P.back, 22, 2.4)}</button>
      <span style={{ flex: 1 }} />
      {n && <span style={{ fontSize: 12, fontWeight: 700, color: DK.t3 }}>Bước {n}/3</span>}
    </div>
  );
  const head = (n, title, sub) => (
    <div style={{ padding: "8px 20px 14px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
      {n && dots(n)}
      <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.3px", marginTop: n ? 10 : 0 }}>{title}</span>
      {sub && <span style={{ fontSize: 14, color: DK.t2, lineHeight: 1.5 }}>{sub}</span>}
    </div>
  );
  const seg = (opts, cur, onPick, disabledId) => (
    <Seg dark value={cur} onChange={onPick} opts={opts.map(([id, t]) => ({ value: id, label: t, testid: `onb-seg-${id}`, disabled: id === disabledId }))} />
  );
  // Ô số (bản vẽ 110): cao 52, bo 14, viền đỏ DK.red khi sai, câu lỗi đỏ 12px ngay dưới ô
  const field = (key, label, unit, mode, value, onChange, onBlur, placeholder, err, testid) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: DK.t2 }}>{label}</span>
      <span className="pw-box" style={{ height: 52, padding: "0 14px", borderRadius: 14, border: `1.5px solid ${err ? DK.red : DK.fieldLine}`, background: DK.field, display: "flex", alignItems: "center", gap: 8, boxSizing: "border-box" }}>
        <input className="pw-inner" data-testid={testid || `onb-${key}`} type="text" inputMode={mode} pattern={mode === "numeric" ? "[0-9]*" : undefined} autoComplete="off" placeholder={placeholder} aria-invalid={err ? true : undefined}
          value={value ?? ""} onChange={onChange} onBlur={onBlur}
          style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", color: "#FFFFFF", fontFamily: "inherit", fontSize: 16, fontWeight: 600, outline: "none" }} />
        <span style={{ fontSize: 13, color: DK.t3, whiteSpace: "nowrap" }}>{unit}</span>
      </span>
      {err && typeof err === "string" && <span data-testid={`${testid || `onb-${key}`}-err`} role="alert" style={{ fontSize: 12, fontWeight: 600, color: DK.red, lineHeight: 1.4 }}>{err}</span>}
    </label>
  );
  const num = (key, decimal) => (e) => { const v = decimal ? e.target.value.replace(",", ".") : e.target.value; set({ [key]: v === "" ? "" : Number(v) }); };
  // Ô số giữ trong draft: chỉ nhận chữ số (và 1 dấu , . nếu có thập phân)
  const dnum = (key, decimal) => (e) => {
    let v = e.target.value.replace(decimal ? /[^0-9.,]/g : /[^0-9]/g, "");
    if (decimal) { v = v.replace(".", ","); const i = v.indexOf(","); if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/,/g, "").slice(0, 1); }
    setDraft((d) => ({ ...d, [key]: v.slice(0, decimal ? 5 : 4) }));
  };
  const blur = (key) => () => setTouched((t) => ({ ...t, [key]: true }));
  const opt = (id, on, k, color, title, sub, onClick) => (
    <button key={id} data-testid={`onb-opt-${id}`} aria-pressed={on} onClick={onClick} style={{ ...dkGlass, ...(on ? { border: "2px solid #FFFFFF", background: "rgba(255,255,255,0.2)" } : {}), display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 16, width: "100%", fontFamily: "inherit", color: "#FFFFFF", textAlign: "left", boxSizing: "border-box" }}>
      {ic(k, color)}
      <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}><span style={{ fontSize: 15, fontWeight: 800 }}>{title}</span><span style={{ fontSize: 12, color: DK.t3 }}>{sub}</span></span>
      <span style={{ width: 22, height: 22, borderRadius: 11, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", ...(on ? { background: "#FFFFFF", color: "#0040E0" } : { border: "2px solid rgba(255,255,255,0.35)", boxSizing: "border-box" }) }}>{on ? svg(P.check, 14, 3) : null}</span>
    </button>
  );
  const chip = (id, label, on, onClick) => <button key={id} data-testid={`onb-chip-${id}`} aria-pressed={on} onClick={onClick} style={{ height: 36, padding: "0 12px", borderRadius: 10, fontFamily: "inherit", fontSize: 13, fontWeight: on ? 800 : 600, border: `1.5px solid ${on ? "#FFFFFF" : DK.chipLine}`, background: on ? "#FFFFFF" : DK.chip, color: on ? "#0040E0" : DK.t2 }}>{label}</button>;
  const note = (t, color = DK.t3) => <p style={{ margin: 0, padding: "12px 20px 0 20px", fontSize: 12, color, lineHeight: 1.5 }}>{t}</p>;
  const footer = (children) => <div style={{ position: "sticky", bottom: 0, marginTop: "auto", padding: "16px 16px calc(env(safe-area-inset-bottom, 0px) + 18px) 16px", background: "linear-gradient(180deg, rgba(1,27,55,0) 0%, rgba(1,27,55,0.9) 40%)" }}>{children}</div>;

  // ---------- từng bước ----------
  let body = null;
  if (step === 0) body = <>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "40px 24px 0 24px", textAlign: "center" }}>
      <img src="/icon-192.png" alt="Fipilot AI" style={{ width: 96, height: 96, borderRadius: 26, objectFit: "cover", boxShadow: "0 0 0 1px rgba(255,255,255,0.3), 0 16px 40px rgba(0,30,120,0.5)", background: "#FFFFFF" }} />
      <span style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>Chào mừng đến Fipilot AI!</span>
      <span style={{ fontSize: 15, color: DK.t2, lineHeight: 1.5 }}>Trả lời 3 câu hỏi nhanh để app tính calo &amp; macro đúng cho bạn. Điền đúng thì kết quả mới chính xác.</span>
    </div>
    <div style={{ ...dkCard, margin: "28px 16px 0 16px", padding: "0 14px" }}>
      {[["target", "#007AFF", "Calo chính xác", "Tính theo cơ thể & mục tiêu của bạn"], ["spark", "#7C3AED", "AI gợi ý bữa ăn", "Thực đơn đúng kcal, món Việt quen thuộc"], ["chart", "#00A67E", "Theo dõi tiến trình", "Cân nặng, calo từng ngày"]].map(([k, c, t, s], i) => (
        <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 58, borderBottom: i < 2 ? `1px solid ${DK.line}` : "none" }}>{ic(k, c, 32, 18)}<span style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: 15, fontWeight: 700 }}>{t}</span><span style={{ fontSize: 12, color: DK.t3 }}>{s}</span></span></div>
      ))}
    </div>
    {footer(<>{btn("Bắt đầu thiết lập", () => setStep(1), false, "onb-start")}<p style={{ margin: "10px 0 0 0", textAlign: "center", fontSize: 12, color: DK.t3 }}>Đổi lại được bất cứ lúc nào ở Tôi › Mục tiêu &amp; macro</p></>)}
  </>;

  if (step === 1) {
    const vals = { cm: draft.cm, kg: draft.kg, birthYear: draft.birthYear };
    const errs = bodyErrors(vals, year);
    // Báo đỏ khi đã rời ô, hoặc đã gõ đủ số chữ số (cao 3, nặng 3, năm 4) — không báo khi đang gõ dở "1", "16"
    const shown = (k, len) => (errs[k] && (touched[k] || String(vals[k]).replace(",", "").length >= len) ? errs[k] : null);
    const ok = bodyValid(vals, year);
    const by = numOf(draft.birthYear);
    const ageUnit = String(draft.birthYear).length === 4 && !errs.birthYear ? `${year - by} tuổi` : "";
    const next = () => {
      if (!ok) return;
      set({ cm: Math.round(numOf(draft.cm)), kg: Math.round(numOf(draft.kg) * 10) / 10, birthYear: numOf(draft.birthYear), _defaulted: keepDefaulted(["cm", "kg", "birthYear"]) });
      setStep(2);
    };
    body = <>
      {top(1)}{head(1, "Cơ thể bạn", "Chiều cao, cân nặng và tuổi để tính năng lượng nền.")}
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ fontSize: 12, fontWeight: 700, color: DK.t2 }}>Giới tính</span>{seg([["male", "Nam"], ["female", "Nữ"]], p.gender, (g) => set({ gender: g }))}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "start" }}>
          {field("cm", "Chiều cao", "cm", "numeric", draft.cm, dnum("cm"), blur("cm"), "VD 165", shown("cm", 3), "onb-height")}
          {field("kg", "Cân nặng", "kg", "decimal", draft.kg, dnum("kg", true), blur("kg"), "VD 60", shown("kg", 3), "onb-weight")}
        </div>
        {field("birthYear", "Năm sinh", ageUnit, "numeric", draft.birthYear, dnum("birthYear"), blur("birthYear"), "VD 1995", shown("birthYear", 4), "onb-year")}
      </div>
      {note(`Dùng để tính BMR (Mifflin-St Jeor). Không chia sẻ cho ai. Cao ${BODY_LIMITS.cm[0]}–${BODY_LIMITS.cm[1]} cm · nặng ${BODY_LIMITS.kg[0]}–${BODY_LIMITS.kg[1]} kg · ${BODY_LIMITS.age[0]}–${BODY_LIMITS.age[1]} tuổi.`)}
      {footer(btn("Tiếp tục", next, !ok, "onb-next"))}
    </>;
  }

  if (step === 2) body = <>
    {top(2)}{head(2, "Tập luyện", "Để chia calo ngày tập / ngày nghỉ.")}
    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: DK.t2 }}>Bạn thường tập gì?</span>
      {[["gym", "bolt", "#EA580C", "Gym", "Tập tạ, máy"], ["gym_cardio", "bolt", "#7C3AED", "Gym + Cardio", "Tạ kèm chạy, đạp xe"], ["cardio", "bolt", "#0891B2", "Cardio", "Chạy, bơi, đạp xe"], ["none", "user", "#64748B", "Không tập", "App tự tính cho người không tập lực"]].map(([id, k, c, t, s]) =>
        opt(id, (p.exerciseType || "gym") === id, k, c, t, s, () => { const up = { exerciseType: id }; if (id === "none") { up.goalType = p.goalType === "bulk" ? "maintain" : p.goalType; up.frequency = undefined; } else up.frequency = gymDays.length ? daysToFrequency(gymDays.length) : (p.frequency || "regular"); set(up); }))}
      {!noEx && <>
        <span style={{ fontSize: 12, fontWeight: 700, color: DK.t2, marginTop: 8 }}>Ngày tập trong tuần · {gymDays.length} buổi</span>
        <div style={{ display: "flex", gap: 6 }}>
          {DAY_NAMES.map((t, i) => { const on = gymDays.includes(i); return (
            <button key={i} data-testid={`onb-day-${i}`} aria-pressed={on} aria-label={`Tập ${t}`} onClick={() => { const nx = on ? gymDays.filter((d) => d !== i) : [...gymDays, i].sort((a, b) => a - b); set({ gymDays: nx, frequency: daysToFrequency(nx.length) }); }}
              style={{ flex: 1, minWidth: 0, height: 44, padding: 0, borderRadius: 12, fontFamily: "inherit", fontSize: 14, fontWeight: 800, boxSizing: "border-box", border: on ? "1px solid #FFFFFF" : `1px solid ${DK.chipLine}`, background: on ? "#FFFFFF" : DK.chip, color: on ? "#0040E0" : "#FFFFFF", cursor: "pointer" }}>{t}</button>
          ); })}
        </div>
        <span style={{ fontSize: 12, color: gymDays.length ? DK.t3 : DK.red }}>{gymDays.length ? "Ngày tập ăn nhiều tinh bột hơn ngày nghỉ." : "Chọn ít nhất 1 ngày tập (hoặc chọn Không tập)."}</span>
      </>}
    </div>
    {footer(btn("Tiếp tục", () => { if (!noEx) set({ frequency: daysToFrequency(gymDays.length) }); setStep(3); }, !noEx && gymDays.length === 0, "onb-next"))}
  </>;

  if (step === 3) {
    const goal = p.goalType || "bulk";
    const showGoal = goal !== "maintain" && !(noEx && goal === "bulk");
    const gk = numOf(draft.goalKg);
    const rangeErr = showGoal && !Number.isNaN(gk) && (gk < BODY_LIMITS.kg[0] || gk > BODY_LIMITS.kg[1]) && (touched.goalKg || String(draft.goalKg).replace(",", "").length >= 3) ? `Cân mục tiêu từ ${BODY_LIMITS.kg[0]} đến ${BODY_LIMITS.kg[1]} kg` : null;
    const dirErr = showGoal ? goalDirectionError({ goalType: goal, kg: p.kg, goalKg: draft.goalKg, exerciseType: p.exerciseType }) : null;
    const goalErr = rangeErr || dirErr;
    const goalOk = !showGoal || (!Number.isNaN(gk) && gk >= BODY_LIMITS.kg[0] && gk <= BODY_LIMITS.kg[1] && !dirErr && Number(p.months) >= 1);
    const next = () => {
      if (!goalOk) return;
      if (showGoal) set({ goalKg: Math.round(gk * 10) / 10, _defaulted: keepDefaulted(["goalKg"]) });
      setStep(4);
    };
    body = <>
    {top(3)}{head(3, "Mục tiêu của bạn", "Fipilot tính lượng calo thêm/bớt mỗi ngày theo mục tiêu.")}
    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 14 }}>
      {seg([["bulk", "Tăng cơ"], ["cut", "Giảm mỡ"], ["maintain", "Duy trì"]], p.goalType || "bulk", (g) => { const up = { goalType: g }; if (g !== "cut") up.dietStrategy = "balanced"; set(up); }, noEx ? "bulk" : null)}
      {showGoal && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "start" }}>
        {field("goalKg", "Cân mục tiêu", "kg", "decimal", draft.goalKg, dnum("goalKg", true), blur("goalKg"), goal === "cut" ? `VD ${Math.max(BODY_LIMITS.kg[0], Math.round((Number(p.kg) || 65) - 5))}` : `VD ${Math.round((Number(p.kg) || 60) + 5)}`, !!goalErr)}
        {field("months", "Trong vòng", "tháng", "numeric", p.months, num("months"), () => { if (!p.months || p.months < 1) set({ months: 1 }); })}
      </div>}
      {showGoal && goalErr && <div data-testid="onb-goal-err" role="alert" style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(255,120,120,0.16)", color: DK.red, fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>{goalErr}</div>}
      {showGoal && !goalErr && !Number.isNaN(gk) && macro.perWeek > 0 && (
        <div data-testid="onb-speed" style={{ padding: "10px 12px", borderRadius: 12, background: macro.safe ? "rgba(0,200,150,0.18)" : "rgba(245,158,11,0.18)", color: macro.safe ? DK.green : DK.amber, fontSize: 13, fontWeight: 600 }}>
          {macro.safe ? `Tốc độ ${String(macro.perWeek).replace(".", ",")} kg/tuần · An toàn` : `Tốc độ ${String(macro.perWeek).replace(".", ",")} kg/tuần · Hơi nhanh, nên kéo dài thời gian`}
        </div>
      )}
      {p.goalType === "cut" && <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: DK.t2 }}>Kiểu ăn khi giảm mỡ</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{[["balanced", "Cân bằng"], ["low_carb", "Low-carb (≤ 100 g)"], ["keto", "Keto (≤ 50 g)"]].map(([id, t]) => chip(id, t, (p.dietStrategy || "balanced") === id, () => set({ dietStrategy: id })))}</div>
      </div>}
    </div>
    {note("Tốc độ quá nhanh sẽ báo vàng. Kiểu ăn chỉ hiện khi chọn Giảm mỡ.")}
    {footer(btn("Tính macro", next, !goalOk, "onb-next"))}
  </>;
  }

  if (step === 4) {
    const meals = result?.meals || [];
    const sum = (k) => Math.round(meals.reduce((s, m) => (m.items || []).reduce((a, i) => a + (Number(i[k]) || 0), s), 0));
    body = <>
      {top(null)}
      {/* Bản vẽ 112: thay màn "Xong – macro mỗi ngày" bằng 1 dòng tóm tắt ở đầu màn này */}
      <div data-testid="onb-macro" style={{ ...dkGlass, margin: "4px 16px 0 16px", padding: "10px 14px", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap", fontSize: 14, fontWeight: 700, color: DK.t2, lineHeight: 1.4, textAlign: "center" }}>
        <span><b data-testid="onb-kcal" style={{ color: "#FFFFFF", fontWeight: 900 }}>{fmt(macro.calTarget)}</b> kcal</span>
        <span>· Đạm <b style={{ color: "#FFFFFF" }}>{fmt(macro.protein)}</b></span>
        <span>· TB <b style={{ color: "#FFFFFF" }}>{fmt(macro.carb)}</b></span>
        <span>· Béo <b style={{ color: "#FFFFFF" }}>{fmt(macro.fat)}</b></span>
      </div>
      <div style={{ padding: "14px 20px 10px 20px", display: "flex", flexDirection: "column", gap: 6 }}><span style={{ fontSize: 26, fontWeight: 900 }}>Bạn thích ăn kiểu nào?</span><span style={{ fontSize: 14, color: DK.t2 }}>AI lên thực đơn ngày đầu tiên theo kiểu này. Đổi macro được ở Tôi › Mục tiêu &amp; macro.</span></div>
      {!loading && !result && <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {opt("vn", autoStyle === "vn", "food", "#EA580C", "Cơm nhà VN", "Thịt kho, cá chiên, canh rau, cơm trắng…", () => setAutoStyle("vn"))}
        {opt("clean", autoStyle === "clean", "target", "#00A67E", "Eat clean", "Ức gà, cá hấp, rau luộc, gạo lứt…", () => setAutoStyle("clean"))}
        {opt("easy", autoStyle === "easy", "bolt", "#0891B2", "Tiện lợi", "Mua nhanh, nấu nhanh, dân văn phòng", () => setAutoStyle("easy"))}
      </div>}
      {loading && <div style={{ textAlign: "center", padding: "50px 0" }}>
        <style>{"@keyframes onbspin{to{transform:rotate(360deg)}}"}</style>
        <div style={{ width: 48, height: 48, border: "4px solid rgba(255,255,255,0.18)", borderTopColor: "#FFFFFF", borderRadius: "50%", animation: "onbspin .8s linear infinite", margin: "0 auto 14px" }} />
        <div style={{ fontSize: 15, fontWeight: 800 }}>AI đang lên thực đơn…</div>
        <div style={{ fontSize: 12, color: DK.t3, marginTop: 4 }}>Chọn món từ kho món Việt có sẵn macro</div>
      </div>}
      {result && <div style={{ ...dkCard, margin: "0 16px", padding: "4px 14px" }} data-testid="onb-result">
        {meals.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: `1px solid ${DK.line}` }}>
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}><span style={{ fontSize: 14, fontWeight: 800 }}>{m.meal_name || m.meal_id}</span><span style={{ fontSize: 12, color: DK.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(m.items || []).map((it) => it.display || it.food).join(" · ")}</span></span>
            <span style={{ fontSize: 13, fontWeight: 800, color: DK.link, whiteSpace: "nowrap" }}>{fmt((m.items || []).reduce((s, it) => s + (Number(it.cal) || 0), 0))} kcal</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-around", padding: "10px 0", fontSize: 12, color: DK.t2 }}>
          <span><b style={{ color: "#FFFFFF" }}>{fmt(sum("cal"))}</b> kcal</span><span>Đạm <b style={{ color: "#FFFFFF" }}>{sum("p")}</b> g</span><span>TB <b style={{ color: "#FFFFFF" }}>{sum("c")}</b> g</span><span>Béo <b style={{ color: "#FFFFFF" }}>{sum("f")}</b> g</span>
        </div>
      </div>}
      {aiErr && !loading && <p data-testid="onb-ai-err" role="alert" style={{ margin: "12px 20px 0 20px", fontSize: 13, color: DK.red, lineHeight: 1.5 }}>{aiErr}</p>}
      {footer(<>
        {!loading && !result && btn(aiErr ? "Thử lại" : "AI lên thực đơn cho tôi", runAutoMenu, false, "onb-ai")}
        {result && btn("Dùng thực đơn này", () => applyMenu(result), false, "onb-apply")}
        <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 6 }}>
          {result && link("Tạo lại", runAutoMenu, DK.link)}
          {!loading && link("Bỏ qua, tự ghi sau", finish)}
        </div>
      </>)}
    </>;
  }

  return (
    <div className="fpm" style={{ fontFamily: FONT, background: DK.bg, minHeight: "100dvh", color: "#FFFFFF" }}>
      <style>{DK_CSS}</style>
      <div className="fpd" data-testid="onboarding" style={{ maxWidth: 480, margin: "0 auto", minHeight: "100dvh", display: "flex", flexDirection: "column", paddingTop: "env(safe-area-inset-top, 0px)", boxSizing: "border-box" }}>
        {body}
      </div>
      {showPin && (
        <div onClick={() => setShowPin(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 500, background: "#FFFFFF", color: "#0F172A", borderRadius: "22px 22px 0 0", padding: "10px 16px calc(env(safe-area-inset-bottom, 0px) + 24px) 16px", display: "flex", flexDirection: "column", gap: 10, boxSizing: "border-box" }}>
            <span style={{ width: 36, height: 4, borderRadius: 2, background: "#CBD5E1", alignSelf: "center" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img src="/icon-192.png" alt="" style={{ width: 56, height: 56, borderRadius: 15, boxShadow: "0 6px 16px rgba(0,64,224,0.3)" }} />
              <span style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: 17, fontWeight: 900 }}>Cài Fipilot AI lên iPhone</span><span style={{ fontSize: 13, color: "#64748B" }}>Mở như app, nhận nhắc nhở · không cần App Store</span></span>
            </div>
            <div style={{ background: "#F8FAFC", borderRadius: 14, padding: "4px 12px" }}>
              {[<>Bấm nút <b>Chia sẻ</b> <span style={{ display: "inline-flex", verticalAlign: "middle", width: 22, height: 22, borderRadius: 6, background: "#007AFF", color: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>{svg(P.share, 14, 2.4)}</span> ở thanh dưới Safari</>, <>Kéo xuống, chọn <b>Thêm vào MH chính</b></>, <>Bấm <b>Thêm</b> — xong!</>].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48, borderBottom: i < 2 ? "1px solid #F1F5F9" : "none", fontSize: 14 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 14, background: "rgba(0,122,255,0.1)", color: "#007AFF", fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span><span>{t}</span>
                </div>
              ))}
            </div>
            <span style={{ fontSize: 12, color: "#64748B" }}>Trên iPhone phải cài thì mới bật được thông báo nhắc bữa.</span>
            <button onClick={() => setShowPin(false)} style={{ height: 48, borderRadius: 14, border: "1.5px solid #E2E8F0", background: "#FFFFFF", fontFamily: "inherit", fontSize: 15, fontWeight: 800, color: "#0F172A" }}>Đã hiểu, để sau</button>
          </div>
        </div>
      )}
    </div>
  );
}
