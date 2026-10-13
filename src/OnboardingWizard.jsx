// Thiết lập lần đầu (bản vẽ 54–59, chốt 14/10) — nền Blue Dark nối tiếp màn đăng nhập.
//  0 Chào → 1 Cơ thể → 2 Tập luyện → 3 Mục tiêu → 4 Xong (vòng macro) → 5 Phong cách ăn + AI lên thực đơn ngày đầu.
// Logic giữ nguyên bản cũ: lưu từng thay đổi qua setProfile, tính macro bằng calcMacro, AI qua generateMenuAI.
// Khác bản cũ: áp thực đơn đầu tiên chỉ áp cho HÔM NAY, không tự lưu ngầm vào "Lặp lại hằng tuần" (thống nhất chốt 13/10).
import { useState } from "react";
import { calcMacro } from "./calcMacro";
import { generateMenuAI, resolveMealIds } from "./lib/aiMenuService";
import { DK, DK_CSS, dkCard, dkGlass } from "./theme";

const FONT = "Inter, Roboto, -apple-system, 'Segoe UI', sans-serif";
const GRAD_BLUE = "linear-gradient(135deg,#36A3FF,#007AFF,#0057FF)";
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

export function OnboardingWizard({ profile, setProfile, onComplete, appSettings, applyTemplate }) {
  const [step, setStep] = useState(0);
  const [autoStyle, setAutoStyle] = useState("vn");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const isStandalone = typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone);
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);
  const [showPin, setShowPin] = useState(!isStandalone && isIOS);
  const p = { ...(profile || {}) };
  if (!p.gender) p.gender = "male";
  const macro = calcMacro(p);
  const noEx = (p.exerciseType || "gym") === "none";
  const year = new Date().getFullYear();
  const set = (patch) => setProfile({ ...p, ...patch });

  const finish = () => { setProfile({ ...p, onboardingDone: true }); onComplete(); };
  const applyMenu = async (tpl) => {
    try { if (applyTemplate) await applyTemplate(tpl); } catch (e) { console.error("Apply AI menu on onboarding error:", e); } // chỉ áp cho hôm nay
    finish();
  };
  const runAutoMenu = async () => {
    setLoading(true); setResult(null);
    try {
      const dayType = noEx ? "rest" : "train";
      const mealIds = resolveMealIds(dayType, p, appSettings);
      const res = await generateMenuAI({ macro, profile: p, dayType, mealIds, prefs: { style: autoStyle, avoid: "" }, avoidFoods: [], appSettings });
      if (res && res.meals) setResult(res); else finish();
    } catch (e) { console.error("Auto menu onboarding error:", e); finish(); } finally { setLoading(false); }
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
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${opts.length}, minmax(0,1fr))`, padding: 3, borderRadius: 12, background: DK.chip, border: `1px solid ${DK.chipLine}` }}>
      {opts.map(([id, t]) => {
        const on = id === cur; const dis = id === disabledId;
        return <button key={id} data-testid={`onb-seg-${id}`} disabled={dis} aria-pressed={on} onClick={() => onPick(id)} style={{ height: 38, borderRadius: 9, border: "none", fontFamily: "inherit", fontSize: 14, fontWeight: on ? 800 : 600, background: on ? "#FFFFFF" : "transparent", color: on ? "#0040E0" : DK.t2, opacity: dis ? 0.35 : 1, boxShadow: on ? "0 1px 3px rgba(0,0,0,0.12)" : "none" }}>{t}</button>;
      })}
    </div>
  );
  const field = (key, label, unit, mode, value, onChange, onBlur) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: DK.t2 }}>{label}</span>
      <span className="pw-box" style={{ height: 48, padding: "0 14px", borderRadius: 12, border: `1.5px solid ${DK.fieldLine}`, background: DK.field, display: "flex", alignItems: "center", gap: 8, boxSizing: "border-box" }}>
        <input className="pw-inner" data-testid={`onb-${key}`} type="text" inputMode={mode} value={value ?? ""} onChange={onChange} onBlur={onBlur}
          style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", color: "#FFFFFF", fontFamily: "inherit", fontSize: 16, fontWeight: 600, outline: "none" }} />
        <span style={{ fontSize: 13, color: DK.t3, whiteSpace: "nowrap" }}>{unit}</span>
      </span>
    </label>
  );
  const num = (key, decimal) => (e) => { const v = decimal ? e.target.value.replace(",", ".") : e.target.value; set({ [key]: v === "" ? "" : Number(v) }); };
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

  if (step === 1) body = <>
    {top(1)}{head(1, "Cơ thể bạn", "Chiều cao, cân nặng và tuổi để tính năng lượng nền.")}
    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ fontSize: 12, fontWeight: 700, color: DK.t2 }}>Giới tính</span>{seg([["male", "Nam"], ["female", "Nữ"]], p.gender, (g) => set({ gender: g }))}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {field("cm", "Chiều cao", "cm", "numeric", p.cm, num("cm"))}
        {field("kg", "Cân nặng", "kg", "decimal", p.kg, num("kg", true))}
      </div>
      {field("birthYear", "Năm sinh", p.birthYear ? `${year - p.birthYear} tuổi` : "", "numeric", p.birthYear, num("birthYear"))}
    </div>
    {note("Dùng để tính BMR (Mifflin-St Jeor). Không chia sẻ cho ai.")}
    {footer(btn("Tiếp tục", () => setStep(2), !p.cm || !p.kg || !p.birthYear, "onb-next"))}
  </>;

  if (step === 2) body = <>
    {top(2)}{head(2, "Bạn tập thế nào?", "Mức vận động quyết định lượng calo cần ăn.")}
    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: DK.t2 }}>Bạn thường tập gì?</span>
      {[["gym", "bolt", "#EA580C", "Gym", "Tập tạ, máy"], ["gym_cardio", "bolt", "#7C3AED", "Gym + Cardio", "Tạ kèm chạy, đạp xe"], ["cardio", "bolt", "#0891B2", "Cardio", "Chạy, bơi, đạp xe"], ["none", "user", "#64748B", "Không tập", "App tự tính cho người không tập lực"]].map(([id, k, c, t, s]) =>
        opt(id, (p.exerciseType || "gym") === id, k, c, t, s, () => { const up = { exerciseType: id }; if (id === "none") { up.goalType = p.goalType === "bulk" ? "maintain" : p.goalType; up.frequency = undefined; } else if (!p.frequency) up.frequency = "regular"; set(up); }))}
      {!noEx && <>
        <span style={{ fontSize: 12, fontWeight: 700, color: DK.t2, marginTop: 8 }}>Tần suất</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[["occasional", "Thỉnh thoảng · 1–2"], ["regular", "Đều đặn · 3–4"], ["frequent", "Rất thường xuyên · 5–6"], ["daily", "Gần như mỗi ngày"]].map(([id, t]) => chip(id, t, (p.frequency || "regular") === id, () => set({ frequency: id })))}
        </div>
      </>}
    </div>
    {footer(btn("Tiếp tục", () => setStep(3), false, "onb-next"))}
  </>;

  if (step === 3) body = <>
    {top(3)}{head(3, "Mục tiêu của bạn", "Fipilot tính lượng calo thêm/bớt mỗi ngày theo mục tiêu.")}
    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 14 }}>
      {seg([["bulk", "Tăng cơ"], ["cut", "Giảm mỡ"], ["maintain", "Duy trì"]], p.goalType || "bulk", (g) => { const up = { goalType: g }; if (g !== "cut") up.dietStrategy = "balanced"; set(up); }, noEx ? "bulk" : null)}
      {p.goalType !== "maintain" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {field("goalKg", "Cân mục tiêu", "kg", "decimal", p.goalKg, num("goalKg", true))}
        {field("months", "Trong vòng", "tháng", "numeric", p.months, num("months"), () => { if (!p.months || p.months < 1) set({ months: 1 }); })}
      </div>}
      {p.goalType !== "maintain" && macro.perWeek > 0 && (
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
    {footer(btn("Tính macro", () => setStep(4), false, "onb-next"))}
  </>;

  if (step === 4) {
    const pc = macro.protein * 4, cc = macro.carb * 4, fc = macro.fat * 9, tot = pc + cc + fc || 1;
    const a = (pc / tot) * 100, b = a + (cc / tot) * 100;
    const m3 = (t, v, c) => <div style={{ ...dkCard, borderRadius: 14, padding: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: c }} /><span style={{ fontSize: 18, fontWeight: 900 }}>{v} g</span><span style={{ fontSize: 11, color: DK.t3 }}>{t}</span></div>;
    const kv = (k, t, v, c, last) => <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48, borderBottom: last ? "none" : `1px solid ${DK.line}` }}>{ic(k, c, 32, 18)}<span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{t}</span><span style={{ fontSize: 13, color: DK.t2 }}>{v}</span></div>;
    body = <>
      {top(null)}
      <div style={{ padding: "4px 20px 0 20px", textAlign: "center", display: "flex", flexDirection: "column", gap: 6 }}><span style={{ fontSize: 26, fontWeight: 900 }}>Xong rồi! 🎉</span><span style={{ fontSize: 14, color: DK.t2 }}>Mục tiêu mỗi ngày của bạn</span></div>
      <div style={{ display: "flex", justifyContent: "center", padding: "20px 0 6px 0" }}>
        <span style={{ width: 168, height: 168, borderRadius: 84, background: `conic-gradient(#4DA3FF 0 ${a}%, #34D399 ${a}% ${b}%, #FBBF24 ${b}% 100%)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 40px rgba(77,163,255,0.35)" }}>
          <span style={{ width: 136, height: 136, borderRadius: 68, background: DK.base, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span data-testid="onb-kcal" style={{ fontSize: 34, fontWeight: 900 }}>{fmt(macro.calTarget)}</span>
            <span style={{ fontSize: 12, color: DK.t2 }}>{noEx ? "kcal mỗi ngày" : "kcal ngày tập"}</span>
          </span>
        </span>
      </div>
      <div style={{ margin: "8px 16px 0 16px", display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8 }}>{m3("Đạm", fmt(macro.protein), "#4DA3FF")}{m3("Tinh bột", fmt(macro.carb), "#34D399")}{m3("Béo", fmt(macro.fat), "#FBBF24")}</div>
      <div style={{ ...dkCard, margin: "12px 16px 0 16px", padding: "0 14px" }}>
        {kv("calc", "BMR", `${fmt(macro.bmr)} kcal`, "#007AFF")}
        {kv("chart", `TDEE (×${String(macro.actMul).replace(".", ",")})`, `${fmt(macro.tdee)} kcal`, "#0891B2")}
        {!noEx && kv("target", "Ngày nghỉ", `${fmt(macro.calRest)} kcal`, "#00A67E")}
        {kv("doc", "Cách tính", (p.calorieMode || "standard") === "asian" ? "Việt Nam (BMR ×0,9)" : "Chuẩn quốc tế", "#64748B", true)}
      </div>
      {footer(<>{btn("Tiếp — AI lên thực đơn đầu tiên", () => setStep(5), false, "onb-next")}<p style={{ margin: "10px 0 0 0", textAlign: "center", fontSize: 12, color: DK.t3 }}>Đổi lại được ở Tôi › Mục tiêu &amp; macro</p></>)}
    </>;
  }

  if (step === 5) {
    const meals = result?.meals || [];
    const sum = (k) => Math.round(meals.reduce((s, m) => (m.items || []).reduce((a, i) => a + (Number(i[k]) || 0), s), 0));
    body = <>
      {top(null)}
      <div style={{ padding: "4px 20px 10px 20px", display: "flex", flexDirection: "column", gap: 6 }}><span style={{ fontSize: 26, fontWeight: 900 }}>Bạn thích ăn kiểu nào?</span><span style={{ fontSize: 14, color: DK.t2 }}>AI lên thực đơn ngày đầu tiên theo kiểu này.</span></div>
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
      {footer(<>
        {!loading && !result && btn("AI lên thực đơn cho tôi", runAutoMenu, false, "onb-ai")}
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
