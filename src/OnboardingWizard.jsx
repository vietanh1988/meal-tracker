// Thiết lập lần đầu (bản vẽ 54–59, chốt 14/10) — nền Blue Dark nối tiếp màn đăng nhập.
//  0 Chào → 1 Cơ thể → 2 Tập luyện → 3 Mục tiêu → 4 Phong cách ăn (dòng macro mỗi ngày ở đầu) + AI lên thực đơn ngày đầu.
// Bản vẽ 110–112 (16/10): ô cơ thể để trống + báo số vô lý; chọn thẳng ngày tập T2…CN (tần suất tự suy ra);
// chặn mục tiêu ngược hướng; bỏ màn "Xong" riêng (BMR/TDEE) → 1 dòng macro ở đầu màn Phong cách ăn.
// Logic giữ nguyên bản cũ: lưu từng thay đổi qua setProfile, tính macro bằng calcMacro. 17/10: bỏ bước AI lên thực đơn cuối onboarding.
// Khác bản cũ: áp thực đơn đầu tiên chỉ áp cho HÔM NAY, không tự lưu ngầm vào "Lặp lại hằng tuần" (thống nhất chốt 13/10).
import { useState } from "react";
import { calcMacro } from "./calcMacro";
import { PacePicker, etaMonth } from "./mobile/PacePicker";
import { lossChoices, goalError } from "./lib/lossPlan";
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
  // 18/10 (bản vẽ 131a): màn chào hỏi "Bạn muốn gì?" — loss = flow giảm cân 3 màn (bước 11, 12), gym = Bước 1–3 như cũ
  const [mode, setMode] = useState(profile?.uiMode === "gym" ? "gym" : "loss");
  const [lossKg, setLossKg] = useState(null); // số kg muốn giảm (chip) · null = theo gợi ý · "x" = tự nhập
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

  // ---------- khối dùng chung ----------
  const btn = (label, onClick, disabled, testid) => (
    <button data-testid={testid} onClick={onClick} disabled={disabled} style={{ width: "100%", height: 52, borderRadius: 14, border: "none", background: disabled ? "rgba(255,255,255,0.18)" : GRAD_BLUE, color: "#FFFFFF", fontFamily: "inherit", fontSize: 16, fontWeight: 900, boxShadow: disabled ? "none" : "0 6px 16px rgba(0,87,255,0.35)", cursor: disabled ? "default" : "pointer" }}>{label}</button>
  );
  const dots = (cur) => (
    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
      {[1, 2, 3].map((i) => <span key={i} style={{ width: i === cur ? 22 : 8, height: 8, borderRadius: 4, background: i === cur ? "#FFFFFF" : i < cur ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.2)", transition: "all .3s" }} />)}
    </div>
  );
  const top = (n, back = step - 1) => (
    <div style={{ display: "flex", alignItems: "center", padding: "6px 12px 0 4px" }}>
      <button aria-label="Quay lại" onClick={() => setStep(back)} style={{ width: 44, height: 44, border: "none", background: "transparent", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>{svg(P.back, 22, 2.4)}</button>
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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "36px 24px 0 24px", textAlign: "center" }}>
      <img src="/icon-192.png" alt="Fipilot AI" style={{ width: 84, height: 84, borderRadius: 24, objectFit: "cover", boxShadow: "0 0 0 1px rgba(255,255,255,0.3), 0 16px 40px rgba(0,30,120,0.5)", background: "#FFFFFF" }} />
      <span style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>Chào mừng đến Fipilot AI!</span>
      <span style={{ fontSize: 15, color: DK.t2, lineHeight: 1.5 }}>Bạn muốn gì? Chọn 1 — đổi lại được bất cứ lúc nào.</span>
    </div>
    <div role="radiogroup" aria-label="Mục tiêu" style={{ padding: "20px 16px 0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      {opt("mode-loss", mode === "loss", "chart", "#00A67E", "Tôi muốn giảm cân", "Kế hoạch ăn sẵn mỗi ngày, cơm Việt, không nhịn đói", () => setMode("loss"))}
      {opt("mode-gym", mode === "gym", "bolt", "#EA580C", "Tôi tập gym, muốn tăng cơ", "Tính calo, đạm theo ngày tập / ngày nghỉ", () => setMode("gym"))}
    </div>
    <div style={{ ...dkCard, margin: "18px 16px 0 16px", padding: "0 14px" }}>
      {(mode === "loss"
        ? [["check", "#00A67E", "Giảm cân không nhịn đói", "Ăn đủ bữa, mức ăn luôn an toàn"], ["food", "#EA580C", "Thực đơn món Việt có sẵn", "Phở, bún, cơm nhà — ăn theo là đạt"], ["chart", "#007AFF", "Mỗi tuần app tự chỉnh", "Xem cân của bạn rồi chỉnh mức ăn"]]
        : [["target", "#007AFF", "Calo chính xác", "Tính theo cơ thể & lịch tập của bạn"], ["spark", "#7C3AED", "AI gợi ý bữa ăn", "Thực đơn đúng kcal, món Việt quen thuộc"], ["chart", "#00A67E", "Theo dõi tiến trình", "Cân nặng, số đo, nhật ký ăn"]]
      ).map(([k, c, t, sub], i) => (
        <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, borderBottom: i < 2 ? `1px solid ${DK.line}` : "none" }}>{ic(k, c, 32, 18)}<span style={{ display: "flex", flexDirection: "column", textAlign: "left" }}><span style={{ fontSize: 14, fontWeight: 800 }}>{t}</span><span style={{ fontSize: 12, color: DK.t3 }}>{sub}</span></span></div>
      ))}
    </div>
    {footer(<>{btn("Bắt đầu", () => { if (mode === "loss") setStep(11); else { set({ uiMode: "gym" }); setStep(1); } }, false, "onb-start")}<p style={{ margin: "10px 0 0 0", textAlign: "center", fontSize: 12, color: DK.t3 }}>Mất khoảng 30 giây</p></>)}
  </>;

  // ---------- Flow giảm cân (bản vẽ 131b–c) ----------
  if (step === 11) {
    const vals = { cm: draft.cm, kg: draft.kg, birthYear: draft.birthYear };
    const errs = bodyErrors(vals, year);
    const shown = (k, len) => (errs[k] && (touched[k] || String(vals[k]).replace(",", "").length >= len) ? errs[k] : null);
    const bodyOk = bodyValid(vals, year);
    const kg = numOf(draft.kg), cm = numOf(draft.cm);
    const ch = bodyOk ? lossChoices(kg, cm) : { options: [5, 8, 10], pick: 5 };
    const pick = lossKg ?? ch.pick;
    const goalKg = pick === "x" ? numOf(draft.goalKg) : (bodyOk && pick ? Math.round((kg - pick) * 10) / 10 : NaN);
    const gErr = bodyOk && (pick === "x" ? String(draft.goalKg).length >= 2 : true) ? goalError(kg, goalKg, cm) : null;
    const ok = bodyOk && !Number.isNaN(goalKg) && !gErr;
    const next = () => {
      if (!ok) return;
      set({ cm: Math.round(cm), kg: Math.round(kg * 10) / 10, birthYear: numOf(draft.birthYear), goalKg, goalType: "cut", cutPace: "mid", dietStrategy: "balanced", uiMode: "loss", exerciseType: p.uiMode === "loss" ? p.exerciseType : "none", frequency: p.uiMode === "loss" ? p.frequency : undefined, _defaulted: keepDefaulted(["cm", "kg", "birthYear", "goalKg"]) });
      setStep(12);
    };
    body = <>
      {top(1, 0)}{head(1, "Vài thông tin để lên kế hoạch", "Chỉ 1 màn — app tự chọn mức ăn an toàn cho bạn.")}
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {seg([["male", "Nam"], ["female", "Nữ"]], p.gender || "male", (g) => set({ gender: g }))}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, alignItems: "start" }}>
          {field("kg", "Cân nặng", "kg", "decimal", draft.kg, dnum("kg", true), blur("kg"), "VD 75", shown("kg", 3), "onb-weight")}
          {field("cm", "Chiều cao", "cm", "numeric", draft.cm, dnum("cm"), blur("cm"), "VD 160", shown("cm", 3), "onb-height")}
          {field("birthYear", "Năm sinh", "", "numeric", draft.birthYear, dnum("birthYear"), blur("birthYear"), "VD 1990", shown("birthYear", 4), "onb-year")}
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, marginTop: 4 }}>Bạn muốn giảm bao nhiêu kg?</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[5, 8, 10].map((d) => (bodyOk && !ch.options.includes(d) ? null : chip(`loss-${d}`, `−${d} kg`, pick === d, () => setLossKg(d))))}
          {chip("loss-x", "Tự nhập", pick === "x", () => setLossKg("x"))}
        </div>
        {pick === "x" && field("goalKg", "Cân muốn đạt", "kg", "decimal", draft.goalKg, dnum("goalKg", true), blur("goalKg"), "VD 70", !!gErr, "onb-goalKg")}
        {bodyOk && (gErr
          ? <div data-testid="onb-goal-err" role="alert" style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(255,120,120,0.16)", color: DK.red, fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>{gErr}</div>
          : !Number.isNaN(goalKg) && <div data-testid="onb-loss-goal" style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(0,200,150,0.18)", color: DK.green, fontSize: 13, fontWeight: 600 }}>→ còn {String(goalKg).replace(".", ",")} kg · mức hợp lý với chiều cao của bạn</div>)}
        {note("Điền đúng số của bạn thì kế hoạch mới chính xác — cân buổi sáng, trước khi ăn.")}
      </div>
      {footer(btn("Xem kế hoạch", next, !ok, "onb-next"))}
    </>;
  }
  if (step === 12) {
    const eta = etaMonth(macro.etaWeeks);
    const exOn = (p.exerciseType || "none") !== "none";
    const start = () => {
      setProfile({ ...p, onboardingDone: true, uiMode: "loss", goalType: "cut" });
      onComplete();
    };
    body = <>
      {top(2, 11)}{head(2, "Kế hoạch của bạn", null)}
      <div data-testid="onb-promise" style={{ ...dkCard, margin: "0 16px", padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 14, color: DK.t2 }}>Theo kế hoạch này, bạn còn</span>
        <span style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.05 }}>{String(p.goalKg).replace(".", ",")} kg</span>
        {eta && <span style={{ fontSize: 16, fontWeight: 800, color: DK.green }}>vào khoảng {eta}</span>}
        <svg width="100%" height="96" viewBox="0 0 320 96" aria-hidden="true"><path d="M8 16 C 90 26, 170 52, 312 82" fill="none" stroke="#4ADE9B" strokeWidth="4" strokeLinecap="round" /><circle cx="8" cy="16" r="6" fill="#FFFFFF" /><circle cx="312" cy="82" r="7" fill="#4ADE9B" /><text x="16" y="40" fill="rgba(255,255,255,0.8)" fontSize="12" fontWeight="700">{String(p.kg).replace(".", ",")} kg · hôm nay</text></svg>
      </div>
      <div style={{ ...dkCard, margin: "12px 16px 0 16px", padding: "0 14px" }}>
        {[["food", "#EA580C", "Ăn cơm, phở, bún như thường", "App gợi ý sẵn món mỗi bữa"], ["check", "#00A67E", "Mỗi ngày chỉ 1 việc", "Ăn rồi bấm Đã ăn, hoặc chụp 1 tấm"], ["chart", "#007AFF", "Mỗi tuần app tự chỉnh", "Xem cân của bạn rồi chỉnh mức ăn"]].map(([k, c, t, sub], i) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 58, borderBottom: i < 2 ? `1px solid ${DK.line}` : "none" }}>{ic(k, c, 32, 18)}<span style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: 15, fontWeight: 800 }}>{t}</span><span style={{ fontSize: 12, color: DK.t3 }}>{sub}</span></span></div>
        ))}
      </div>
      <div style={{ margin: "14px 16px 0 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ flex: 1, fontSize: 14, color: DK.t2 }}>Bạn có hay tập / vận động không?</span>
        {chip("ex-no", "Không", !exOn, () => set({ exerciseType: "none", frequency: undefined }))}
        {chip("ex-yes", "Có", exOn, () => set({ exerciseType: "gym", frequency: "regular", gymDays: [0, 2, 4] }))}
      </div>
      <p data-testid="onb-kcal" style={{ margin: "10px 20px 0 20px", fontSize: 12, color: DK.t3 }}>Mỗi ngày ăn khoảng {fmt(macro.calTarget)} kcal — xem chi tiết ở Tôi › Mục tiêu.</p>
      {footer(btn("Bắt đầu", start, false, "onb-loss-start"))}
    </>;
  }

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
    const goalOk = !showGoal || (!Number.isNaN(gk) && gk >= BODY_LIMITS.kg[0] && gk <= BODY_LIMITS.kg[1] && !dirErr && (goal === "cut" || Number(p.months) >= 1));
    const next = () => {
      if (!goalOk) return;
      // 17/10: bỏ bước "AI lên thực đơn" (vướng, tốn 1 lượt AI) — xong mục tiêu là vào app; Hôm nay đã có Gợi ý món 1 chạm
      setProfile({ ...p, ...(showGoal ? { goalKg: Math.round(gk * 10) / 10, _defaulted: keepDefaulted(["goalKg"]) } : {}), onboardingDone: true });
      onComplete();
    };
    body = <>
    {top(3)}{head(3, "Mục tiêu của bạn", "Fipilot tính lượng calo thêm/bớt mỗi ngày theo mục tiêu.")}
    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 14 }}>
      {seg([["bulk", "Tăng cơ"], ["cut", "Giảm mỡ"], ["maintain", "Duy trì"]], p.goalType || "bulk", (g) => { const up = { goalType: g }; if (g !== "cut") up.dietStrategy = "balanced"; set(up); }, noEx ? "bulk" : null)}
      {showGoal && <div style={{ display: "grid", gridTemplateColumns: goal === "cut" ? "1fr" : "1fr 1fr", gap: 10, alignItems: "start" }}>
        {field("goalKg", "Cân mục tiêu", "kg", "decimal", draft.goalKg, dnum("goalKg", true), blur("goalKg"), goal === "cut" ? `VD ${Math.max(BODY_LIMITS.kg[0], Math.round((Number(p.kg) || 65) - 5))}` : `VD ${Math.round((Number(p.kg) || 60) + 5)}`, !!goalErr)}
        {goal !== "cut" && field("months", "Trong vòng", "tháng", "numeric", p.months, num("months"), () => { if (!p.months || p.months < 1) set({ months: 1 }); })}
      </div>}
      {showGoal && goalErr && <div data-testid="onb-goal-err" role="alert" style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(255,120,120,0.16)", color: DK.red, fontSize: 13, fontWeight: 700, lineHeight: 1.5 }}>{goalErr}</div>}
      {/* Giảm mỡ (bản vẽ 126): chọn tốc độ thay cho số tháng; mặc định Vừa */}
      {goal === "cut" && <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: DK.t2 }}>Tốc độ giảm</span>
        <PacePicker testid="onb-pace" kg={pm.kg} value={p.cutPace} onChange={(v) => set({ cutPace: v })} />
      </div>}
      {goal === "cut" && !goalErr && !Number.isNaN(gk) && macro.etaWeeks > 0 && (
        <div data-testid="onb-speed" style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(0,200,150,0.18)", color: DK.green, fontSize: 13, fontWeight: 600, lineHeight: 1.45 }}>
          Đạt {String(gk).replace(".", ",")} kg vào khoảng {etaMonth(macro.etaWeeks)} (≈ {macro.etaWeeks} tuần) · bớt {macro.deficit} kcal/ngày
        </div>
      )}
      {goal !== "cut" && showGoal && !goalErr && !Number.isNaN(gk) && macro.perWeek > 0 && (
        <div data-testid="onb-speed" style={{ padding: "10px 12px", borderRadius: 12, background: macro.safe ? "rgba(0,200,150,0.18)" : "rgba(245,158,11,0.18)", color: macro.safe ? DK.green : DK.amber, fontSize: 13, fontWeight: 600 }}>
          {macro.safe ? `Tốc độ ${String(macro.perWeek).replace(".", ",")} kg/tuần · An toàn` : `Tốc độ ${String(macro.perWeek).replace(".", ",")} kg/tuần · Hơi nhanh, nên kéo dài thời gian`}
        </div>
      )}
      {p.goalType === "cut" && <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: DK.t2 }}>Kiểu ăn khi giảm mỡ</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{[["balanced", "Cân bằng"], ["low_carb", "Low-carb (≤ 100 g)"], ["keto", "Keto (≤ 50 g)"]].map(([id, t]) => chip(id, t, (p.dietStrategy || "balanced") === id, () => set({ dietStrategy: id })))}</div>
      </div>}
    </div>
    {note(goal === "cut" ? "Chậm: dễ giữ, ít đói · Vừa: khuyên dùng · Nhanh: đói hơn, cần ăn đủ đạm." : "Tốc độ quá nhanh sẽ báo vàng. Kiểu ăn chỉ hiện khi chọn Giảm mỡ.")}
    {goalOk && <div data-testid="onb-macro" style={{ ...dkGlass, margin: "14px 16px 0 16px", padding: "10px 14px", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap", fontSize: 14, fontWeight: 700, color: DK.t2, lineHeight: 1.4, textAlign: "center" }}>
      <span>Mỗi ngày ≈ <b data-testid="onb-kcal" style={{ color: "#FFFFFF", fontWeight: 900 }}>{fmt(macro.calTarget)}</b> kcal</span>
      <span>· Đạm <b style={{ color: "#FFFFFF" }}>{fmt(macro.protein)}</b></span>
      <span>· TB <b style={{ color: "#FFFFFF" }}>{fmt(macro.carb)}</b></span>
      <span>· Béo <b style={{ color: "#FFFFFF" }}>{fmt(macro.fat)}</b></span>
    </div>}
    {footer(btn("Bắt đầu", next, !goalOk, "onb-next"))}
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
