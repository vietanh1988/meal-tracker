// Thực đơn AI trên mobile (bản vẽ ThucDonKetQua + DoiMon + DangTai + HetLuot):
//  - Đang tạo: các bước chạy dần, nút Huỷ
//  - Kết quả: tổng kcal / mục tiêu, thanh tiến, macro, cảnh báo lệch; từng bữa + nút Đổi từng món
//  - Sheet Đổi món: tính trước kết quả cho từng ứng viên (swapOptions) — gram, kcal, "bữa sẽ thành", gần calo bữa cũ nhất lên đầu
//  - Hết lượt: gợi ý dùng thực đơn đã lưu / tự ghi bằng Tìm món
// Áp dụng / lặp lại hằng tuần (weekly_templates) do MobileApp xử lý (onApply / onSaveWeek). Không gọi AI khi mở thực đơn đã lưu.
import { useEffect, useMemo, useRef, useState } from "react";
import { todayVN, addDays } from "../lib/dateVN";
import { fmtInt } from "../lib/mobileView";
import { MealIcon } from "./icons";
import { mealLabel, MEAL_ORDER } from "../lib/mealMath";
import { generateMenuAI, buildExclusionKeys, swapOptions, sumTemplate, dayTarget, resolveMealIds, getRecentFoodKeys, saveAIMenu, formatFoodPortion } from "../lib/aiMenuService";
import { buildWhitelist } from "../lib/whitelistBuilder";
import { getFoodDisplay } from "../lib/localFoodDB";
import { WEEK_SHORT } from "../lib/menuView";
import { SubPage, Icon, GRAD_BLUE, useLockScroll } from "./ui";

const PURPLE = "linear-gradient(135deg,#7C3AED,#5B21B6)";
const STYLE_NAME = { vn: "Cơm nhà VN", clean: "Eat clean", easy: "Tiện lợi" };
const DT = { train: "Ngày tập", rest: "Ngày nghỉ" };
const STEPS = ["Chọn món hợp khẩu vị bạn", "Cân khẩu phần theo mục tiêu", "Xếp mâm cho từng bữa", "Kiểm tra calo và đạm"];
const card = { margin: "10px 12px 0 12px", background: "#FFFFFF", border: "1.5px solid #E2E8F0", borderRadius: 16 };
const btn = (kind, disabled) => ({ height: 50, borderRadius: 14, border: kind === "ghost" ? "1.5px solid #E2E8F0" : "none", background: disabled ? "#CBD5E1" : kind === "ghost" ? "#FFFFFF" : kind === "purple" ? PURPLE : GRAD_BLUE, color: kind === "ghost" ? "#0F172A" : "#FFFFFF", fontFamily: "inherit", fontSize: 15, fontWeight: kind === "ghost" ? 800 : 900, padding: "0 14px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 });
const itemName = (it) => it.display || getFoodDisplay(it.food) || it.food;

function Loading({ sub, onCancel }) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => Math.min(x + 1, STEPS.length - 1)), 3500); return () => clearInterval(t); }, []);
  return (
    <div data-testid="ai-loading" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "48px 24px 24px 24px", textAlign: "center" }}>
      <span style={{ width: 64, height: 64, borderRadius: 20, background: PURPLE, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>{Icon.sparkle(30)}</span>
      <span style={{ fontSize: 20, fontWeight: 900, marginTop: 6 }}>Đang lên thực đơn cho bạn</span>
      <span style={{ fontSize: 13, color: "#475569" }}>{sub}</span>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10, alignSelf: "stretch", maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>
        {STEPS.map((s, k) => (
          <span key={s} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: k === i ? 800 : 600, color: k <= i ? "#0F172A" : "#94A3B8", textAlign: "left" }}>
            <span style={{ width: 22, height: 22, borderRadius: 11, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: k < i ? "#00C896" : k === i ? "#7C3AED" : "#E2E8F0", color: "#FFFFFF" }}>{k < i ? Icon.check(12) : null}</span>
            {s}{k === i ? "…" : ""}
          </span>
        ))}
      </div>
      <button onClick={onCancel} style={{ marginTop: 24, height: 44, padding: "0 20px", border: "none", background: "transparent", fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "#64748B" }}>Huỷ</button>
    </div>
  );
}

function OutOfQuota({ message, onSaved, onSearch, onClose }) {
  const row = { display: "flex", alignItems: "center", gap: 12, minHeight: 60, width: "100%", padding: "0 14px", border: "1.5px solid #E2E8F0", borderRadius: 14, background: "#FFFFFF", fontFamily: "inherit", textAlign: "left", color: "#0F172A" };
  return (
    <div data-testid="ai-out-of-quota" style={{ padding: "32px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
      <span style={{ alignSelf: "center", width: 64, height: 64, borderRadius: 20, background: "rgba(245,158,11,0.14)", color: "#B45309", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900 }}>!</span>
      <span style={{ fontSize: 19, fontWeight: 900, textAlign: "center" }}>Hết lượt AI tạo thực đơn hôm nay</span>
      <span style={{ fontSize: 13, color: "#475569", textAlign: "center", lineHeight: 1.5 }}>{message || "Bạn đã dùng hết lượt hôm nay."} Lượt mới có lúc 7:00 sáng.</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", marginTop: 8 }}>VẪN GHI ĐƯỢC BỮA, KHÔNG CẦN AI</span>
      <button onClick={onSaved} style={row}><span style={{ display: "flex", flexDirection: "column", flex: 1 }}><span style={{ fontSize: 15, fontWeight: 800 }}>Dùng thực đơn đã lưu</span><span style={{ fontSize: 12, color: "#64748B" }}>Thực đơn AI đã tạo, ngày ăn trước</span></span>{Icon.chev(16)}</button>
      <button onClick={onSearch} style={row}><span style={{ display: "flex", flexDirection: "column", flex: 1 }}><span style={{ fontSize: 15, fontWeight: 800 }}>Tự ghi bằng Tìm món</span><span style={{ fontSize: 12, color: "#64748B" }}>Món hay ăn, ăn lại bữa cũ</span></span>{Icon.chev(16)}</button>
      <button onClick={onClose} style={{ ...btn("ghost"), marginTop: 8 }}>Đóng</button>
    </div>
  );
}

function SwapSheet({ ctx, opts, onPick, onClose }) {
  useLockScroll(true);
  const [sel, setSel] = useState(opts.options[0]?.key || null);
  const [shown, setShown] = useState(5);
  const list = opts.options.slice(0, shown);
  const chosen = opts.options.find((o) => o.key === sel);
  const tone = (d) => (Math.abs(d) <= 15 ? "#475569" : d < 0 ? "#00A67E" : "#A16207");
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 220, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "fpmFade .15s ease" }}>
      <div data-testid="swap-sheet" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, maxHeight: "86vh", background: "#FFFFFF", borderRadius: "20px 20px 0 0", padding: "8px 14px calc(env(safe-area-inset-bottom, 0px) + 16px) 14px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 10, animation: "fpmSheetUp .2s ease" }}>
        <span style={{ width: 36, height: 4, borderRadius: 2, background: "#CBD5E1", alignSelf: "center" }} />
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 18, fontWeight: 900 }}>Đổi "{opts.current?.name}" · {ctx.mealName}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Món cùng nhóm, khẩu phần tự tính lại theo mục tiêu. Không tốn lượt AI.</span>
        </span>
        {opts.current && (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 12px", borderRadius: 10, background: "#F1F5F9", fontSize: 12, fontWeight: 700, color: "#334155" }}>
            <span>Đang dùng: {opts.current.name} {fmtInt(opts.current.gram)} g · {fmtInt(opts.current.cal)} kcal</span><span style={{ whiteSpace: "nowrap" }}>{ctx.mealName} {fmtInt(opts.current.mealCal)}</span>
          </div>
        )}
        {opts.options.length === 0 ? (
          <span style={{ padding: "20px 0", fontSize: 14, color: "#64748B", textAlign: "center" }}>Không có món cùng nhóm nào giữ được calo bữa này.</span>
        ) : (
          <>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em" }}>GẦN CALO NHẤT · {ctx.mealName.toUpperCase()} SẼ THÀNH</span>
            {opts.options[0]?.wide && <span style={{ fontSize: 12, color: "#A16207" }}>Không có món nào giữ sát calo bữa này — đây là các món gần nhất.</span>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", minHeight: 0 }}>
              {list.map((o) => {
                const on = o.key === sel;
                return (
                  <button key={o.key} data-testid="swap-opt" aria-pressed={on} onClick={() => setSel(o.key)}
                    style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 60, padding: "0 12px", borderRadius: 14, border: on ? "2px solid #007AFF" : "1.5px solid #E2E8F0", background: on ? "rgba(0,122,255,0.05)" : "#FFFFFF", fontFamily: "inherit", textAlign: "left", color: "#0F172A", flexShrink: 0 }}>
                    <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: on ? 800 : 700 }}>{o.name}</span>
                      <span style={{ fontSize: 12, color: "#475569" }}>{fmtInt(o.gram)} g · {fmtInt(o.cal)} kcal{o.carb ? ` · ${o.carb.name.toLowerCase()} ${opts.current?.carb === o.carb.gram ? "giữ " : ""}${fmtInt(o.carb.gram)} g` : ""}</span>
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: tone(o.diff) }}>{fmtInt(o.mealCal)}</span>
                    {on ? <span style={{ width: 22, height: 22, borderRadius: 11, background: "#007AFF", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Icon.check(12)}</span>
                      : <span style={{ width: 22, height: 22, borderRadius: 11, border: "2px solid #CBD5E1", boxSizing: "border-box", flexShrink: 0 }} />}
                  </button>
                );
              })}
              {opts.options.length > shown && (
                <button data-testid="swap-more" onClick={() => setShown(shown + 10)} style={{ height: 40, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "#007AFF", flexShrink: 0 }}>Xem thêm {opts.options.length - shown} món cùng nhóm</button>
              )}
            </div>
          </>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={{ ...btn("ghost"), flex: 1 }}>Huỷ</button>
          <button data-testid="swap-confirm" disabled={!chosen} onClick={() => chosen && onPick(chosen)} style={{ ...btn("blue", !chosen), flex: 2 }}>{chosen ? `Đổi sang ${chosen.name}` : "Chọn món"}</button>
        </div>
      </div>
    </div>
  );
}

export function SaveWeekSheet({ dayType, gymDays, noEx, onSave, onClose }) {
  useLockScroll(true);
  const ok = (i) => (noEx ? "rest" : (gymDays || []).includes(i) ? "train" : "rest") === dayType;
  const [days, setDays] = useState([]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 220, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div data-testid="save-week-sheet" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, background: "#FFFFFF", borderRadius: "20px 20px 0 0", padding: "12px 14px calc(env(safe-area-inset-bottom, 0px) + 16px) 14px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{ fontSize: 18, fontWeight: 900 }}>Lặp lại hằng tuần</span>
        <span style={{ fontSize: 13, color: "#475569" }}>Chọn thứ muốn ăn lại thực đơn này. Sáng hôm đó, nếu Hôm nay chưa ghi gì, app tự chép thực đơn vào (chỉ {DT[dayType].toLowerCase()}).</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 6 }}>
          {WEEK_SHORT.map((d, i) => {
            const on = days.includes(i);
            return <button key={d} data-testid={`save-week-${i}`} disabled={!ok(i)} aria-pressed={on} onClick={() => setDays(on ? days.filter((x) => x !== i) : [...days, i])}
              style={{ height: 44, borderRadius: 10, border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 800, background: on ? "#007AFF" : ok(i) ? "#F1F5F9" : "#F8FAFC", color: on ? "#FFFFFF" : ok(i) ? "#475569" : "#CBD5E1" }}>{d}</button>;
          })}
        </div>
        <span style={{ fontSize: 12, color: "#64748B" }}>Ô mờ = {dayType === "train" ? "ngày nghỉ" : "ngày tập"}, không đặt được thực đơn {DT[dayType].toLowerCase()}.</span>
        <button data-testid="save-week-confirm" disabled={!days.length} onClick={() => onSave(days)} style={btn("blue", !days.length)}>{days.length ? `Lặp lại ${days.length} thứ mỗi tuần` : "Chọn ngày"}</button>
      </div>
    </div>
  );
}

export function AIMenuScreen({ macro, profile, user, appSettings, initialPrefs, autoStart, initialTemplate, todayType, getDailyLogs, onApply, onSaveWeek, onClose, openSaved, openSearch }) {
  const noEx = (profile?.exerciseType || "gym") === "none";
  const prefs = { style: initialPrefs?.style || "vn", avoid: initialPrefs?.avoid || "" };
  const dayType = noEx ? "rest" : (initialTemplate?.day_type || initialPrefs?.dayType || todayType) === "rest" ? "rest" : "train";
  const [step, setStep] = useState(initialTemplate ? "result" : autoStart ? "loading" : "error");
  const [tpl, setTpl] = useState(initialTemplate || null);
  const [err, setErr] = useState({ text: autoStart || initialTemplate ? "" : "Chưa có thực đơn.", quota: false });
  const [swap, setSwap] = useState(null);
  const [saveWeek, setSaveWeek] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const shown = useRef(new Set());
  const runId = useRef(0);
  const mealIds = resolveMealIds(dayType, profile, appSettings);
  const target = dayTarget(macro, dayType);
  const allowed = useMemo(() => {
    const wl = buildWhitelist({ style: prefs.style, diet: macro?.dietStrategy || profile?.dietStrategy || "balanced", goal: macro?.goal || profile?.goalType || null, usesSupplements: profile?.usesSupplements === true, mealIds });
    const banned = buildExclusionKeys(prefs.avoid); // Đổi món cũng không gợi ý món đang kiêng
    return new Set(wl.items.map((i) => i.key).filter((k) => !banned.has(k)));
  }, [prefs.avoid, prefs.style, dayType, macro?.dietStrategy, macro?.goal]); // eslint-disable-line react-hooks/exhaustive-deps

  const generate = async () => {
    const id = ++runId.current;
    setStep("loading"); setErr({ text: "", quota: false });
    // Tránh lặp món: đã ăn 3 ngày gần nhất + đã hiện trong phiên này
    const avoidFoods = new Set(shown.current);
    try {
      const rows = getDailyLogs ? await getDailyLogs(addDays(todayVN(), -3), todayVN()) : [];
      getRecentFoodKeys((rows || []).flatMap((r) => (r.meals || []).map((m) => ({ log_date: r.log_date, items: m.items || [] }))), 3).forEach((k) => avoidFoods.add(k));
    } catch (e) { /* bỏ qua, vẫn tạo được */ }
    const res = await generateMenuAI({ macro, profile, dayType, mealIds, prefs, avoidFoods: [...avoidFoods], appSettings });
    if (id !== runId.current) return; // đã huỷ / tạo lần khác
    if (res.ok) {
      const t = { ...res.template, day_type: dayType };
      setTpl(t); setNote(res.note || ""); setStep("result");
      saveAIMenu(t, user?.id);
      t.meals.forEach((m) => (m.items || []).forEach((it) => { if (it.role === "protein" || it.role === "carb") shown.current.add(it.food); }));
    } else { setErr({ text: res.error || "Chưa tạo được thực đơn.", quota: !!res.quota || /hết lượt|quota|giới hạn/i.test(res.error || "") }); setStep("error"); }
  };
  useEffect(() => { if (autoStart && !initialTemplate) generate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const cancel = () => { runId.current++; if (tpl) setStep("result"); else onClose(); };

  const openSwap = (m, it) => {
    const opts = swapOptions(tpl, m.meal_id, it.food, macro, dayType, allowed);
    setSwap({ ctx: { mealName: mealLabel(m.meal_name, m.meal_id) }, opts });
  };
  const pick = (o) => { setTpl(o.template); setSwap(null); saveAIMenu(o.template, user?.id); };
  const apply = async () => { setBusy(true); await onApply(tpl); setBusy(false); };
  const saveDays = async (days) => { setSaveWeek(false); setBusy(true); await onSaveWeek(tpl, days); setBusy(false); };

  const meals = (tpl?.meals || []).filter((m) => (m.items || []).some((i) => i.gram > 0)).sort((a, b) => MEAL_ORDER.indexOf(a.meal_id) - MEAL_ORDER.indexOf(b.meal_id));
  const total = tpl ? sumTemplate(tpl) : { cal: 0, p: 0, c: 0, f: 0 };
  const pct = target.cal ? Math.round((total.cal / target.cal) * 100) : 0;
  const dev = target.cal ? Math.round(((total.cal - target.cal) / target.cal) * 100) : 0;
  const sub = `${DT[dayType]} · ${STYLE_NAME[prefs.style] || "Cơm nhà VN"}${tpl ? ` · ${meals.length} bữa` : ` · ${fmtInt(target.cal)} kcal`}`;
  const canApplyToday = dayType === todayType;

  const footer = step === "result" && tpl ? (
    <div style={{ flexShrink: 0, background: "#FFFFFF", borderTop: "1px solid #E2E8F0", padding: "10px 12px calc(env(safe-area-inset-bottom, 0px) + 12px) 12px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", gap: 8 }}>
        <button data-testid="ai-regenerate" onClick={generate} disabled={busy} style={btn("ghost")}>{Icon.redo(16)} Tạo lại</button>
        <button data-testid="ai-save-week" onClick={() => setSaveWeek(true)} disabled={busy} style={btn("ghost")}>Lặp lại hằng tuần</button>
        {canApplyToday
          ? <button data-testid="ai-apply" onClick={apply} disabled={busy} style={{ ...btn("blue", busy), flex: 1, boxShadow: "0 4px 12px rgba(0,0,0,0.18)" }}>Áp dụng hôm nay</button>
          : <button onClick={() => setSaveWeek(true)} disabled={busy} style={{ ...btn("blue", busy), flex: 1 }}>Lưu vào {DT[dayType].toLowerCase()}</button>}
      </div>
    </div>
  ) : null;

  return (
    <SubPage title="Thực đơn AI" subtitle={sub} onBack={onClose} footer={footer}>
      {step === "loading" && <Loading sub={`${DT[dayType]} · ${fmtInt(target.cal)} kcal · ${STYLE_NAME[prefs.style] || ""}`} onCancel={cancel} />}
      {step === "error" && (err.quota
        ? <OutOfQuota message={err.text} onSaved={openSaved} onSearch={openSearch} onClose={onClose} />
        : (
          <div data-testid="ai-error" style={{ padding: "40px 16px", display: "flex", flexDirection: "column", gap: 12, textAlign: "center" }}>
            <span style={{ fontSize: 18, fontWeight: 900 }}>Chưa tạo được thực đơn</span>
            <span style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{err.text}</span>
            <button onClick={generate} style={btn("purple")}>Thử lại</button>
            <button onClick={openSaved} style={btn("ghost")}>Dùng thực đơn đã lưu</button>
          </div>
        ))}
      {step === "result" && tpl && (
        <div style={{ paddingBottom: 16 }}>
          {note && <p data-testid="ai-note" style={{ margin: "12px 16px 0 16px", fontSize: 13, color: "#475569", lineHeight: 1.45 }}>{note}</p>}
          <div data-testid="ai-total" data-cal={total.cal} style={{ ...card, marginTop: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}><span style={{ fontSize: 26, fontWeight: 900, color: "#7C3AED" }}>{fmtInt(total.cal)}</span><span style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>/ {fmtInt(target.cal)} kcal</span></div>
            <div style={{ height: 8, borderRadius: 4, background: "#E2E8F0", overflow: "hidden" }}><div style={{ width: `${Math.min(100, pct)}%`, height: 8, background: PURPLE }} /></div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Đạm {fmtInt(total.p)} · Tinh bột {fmtInt(total.c)} · Béo {fmtInt(total.f)} g</span>
            {Math.abs(dev) > 5 && (
              <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(250,204,21,0.14)", color: "#713F12", fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>
                {dev < 0 ? `Thiếu ${-dev}%` : `Dư ${dev}%`} so với mục tiêu {DT[dayType].toLowerCase()}. Bấm Tạo lại hoặc đổi món {dev < 0 ? "to" : "nhẹ"} hơn.
              </div>
            )}
          </div>
          {meals.map((m) => {
            const items = (m.items || []).filter((i) => i.gram > 0 && i.display !== null);
            const compact = !!m.composite;
            return (
              <div key={m.meal_id} data-testid={`ai-meal-${m.meal_id}`} style={{ ...card, padding: "4px 12px 8px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, height: 48 }}>
                  <MealIcon id={m.meal_id} size={30} />
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 800 }}>{mealLabel(m.meal_name, m.meal_id)}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#475569" }}>{fmtInt((m.items || []).reduce((s, i) => s + (i.cal || 0), 0))} kcal</span>
                </div>
                {compact ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44, borderTop: "1px solid #F1F5F9" }}>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{m.pattern || items.map(itemName).join(", ")} <span style={{ color: "#64748B", fontWeight: 500 }}>· 1 tô ~{fmtInt((m.items || []).reduce((s, i) => s + (i.gram || 0), 0))} g</span></span>
                  </div>
                ) : items.map((it) => (
                  <div key={it.food} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44, borderTop: "1px solid #F1F5F9" }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600 }}>{itemName(it)} <span style={{ color: "#64748B", fontWeight: 500 }}>· {formatFoodPortion(it.food, Math.round(it.gram)).replace(/(\d)g/g, "$1 g")}</span></span>
                    <span style={{ fontSize: 12, color: "#64748B" }}>{fmtInt(it.cal)}</span>
                    <button data-testid={`swap-${m.meal_id}-${it.food}`} onClick={() => openSwap(m, it)} style={{ height: 32, padding: "0 12px", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#FFFFFF", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "#007AFF" }}>Đổi</button>
                  </div>
                ))}
              </div>
            );
          })}
          {!canApplyToday && <p style={{ margin: "12px 16px 0 16px", fontSize: 12, color: "#64748B", textAlign: "center" }}>Hôm nay là {DT[todayType].toLowerCase()} nên thực đơn {DT[dayType].toLowerCase()} chỉ đặt lặp lại hằng tuần được.</p>}
        </div>
      )}
      {swap && <SwapSheet ctx={swap.ctx} opts={swap.opts} onPick={pick} onClose={() => setSwap(null)} />}
      {saveWeek && <SaveWeekSheet dayType={dayType} gymDays={profile?.gymDays} noEx={noEx} onSave={saveDays} onClose={() => setSaveWeek(false)} />}
    </SubPage>
  );
}
