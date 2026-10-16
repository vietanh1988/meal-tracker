// Thực đơn AI trên mobile (bản vẽ ThucDonKetQua + DoiMon + DangTai + HetLuot):
//  - Đang tạo: các bước chạy dần, nút Huỷ
//  - Kết quả: tổng kcal / mục tiêu, thanh tiến, macro, cảnh báo lệch; từng bữa + nút Đổi từng món
//  - Sheet Đổi món: tính trước kết quả cho từng ứng viên (swapOptions) — gram, kcal, "bữa sẽ thành", gần calo bữa cũ nhất lên đầu
//  - Hết lượt: gợi ý dùng thực đơn đã lưu / tự ghi bằng Tìm món
// Áp dụng / lặp lại hằng tuần (weekly_templates) do MobileApp xử lý (onApply / onSaveWeek). Không gọi AI khi mở thực đơn đã lưu.
import { useEffect, useMemo, useRef, useState } from "react";
import { todayVN, addDays } from "../lib/dateVN";
import { fmtInt } from "../lib/mobileView";
import { mealLabel, MEAL_ORDER } from "../lib/mealMath";
import { generateMenuAI, buildExclusionKeys, swapOptions, sumTemplate, dayTarget, resolveMealIds, getRecentFoodKeys, saveAIMenu, rebalanceTemplate } from "../lib/aiMenuService";
import { buildWhitelist } from "../lib/whitelistBuilder";
import { WEEK_SHORT } from "../lib/menuView";
import { SubPage, Icon } from "./ui";
import { PURPLE, GREEN, DT, MI, fbtn, pill, SumCard, MealCard, Sheet, CloseX, OptRow, DayPicker, foodName, portionText } from "./menuUI";
import { AppIcon } from "./icons";

const STYLE_NAME = { vn: "Cơm nhà VN", clean: "Eat clean", easy: "Tiện lợi" };
const STEPS = ["Chọn món hợp khẩu vị bạn", "Cân khẩu phần theo mục tiêu", "Xếp mâm cho từng bữa", "Kiểm tra calo và đạm"];

// Đang tạo (bản vẽ 92): khối tím có vòng sáng, 4 bước trong thẻ trắng, khung xương bữa mờ, Huỷ dạng viên trắng
function Loading({ sub, onCancel }) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => Math.min(x + 1, STEPS.length - 1)), 3500); return () => clearInterval(t); }, []);
  const sk = (w) => <span style={{ display: "block", height: 12, width: `${w}%`, borderRadius: 6, background: "linear-gradient(90deg,#EEF2FA,#F8FAFC,#EEF2FA)" }} />;
  return (
    <div data-testid="ai-loading" style={{ padding: "16px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ borderRadius: 22, padding: "22px 18px", background: PURPLE, color: "#FFFFFF", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
        <span style={{ width: 72, height: 72, borderRadius: 36, background: "rgba(255,255,255,0.18)", boxShadow: "0 0 0 10px rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>{Icon.sparkle(32)}</span>
        <span style={{ fontSize: 20, fontWeight: 900, marginTop: 8 }}>Đang lên thực đơn cho bạn</span>
        <span style={{ fontSize: 13, opacity: 0.9 }}>{sub}</span>
      </div>
      <div style={{ background: "#FFFFFF", borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {STEPS.map((s, k) => (
          <span key={s} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 15, fontWeight: k === i ? 800 : 600, color: k <= i ? "#0F172A" : "#94A3B8" }}>
            <span style={{ width: 24, height: 24, borderRadius: 12, flexShrink: 0, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", ...(k < i ? { background: GREEN } : k === i ? { border: "3px solid #DDD6FE", borderTopColor: "#7C3AED", animation: "fpSpin 0.9s linear infinite" } : { border: "2px solid #CBD5E1" }) }}>{k < i ? Icon.check(13, 3) : null}</span>
            {s}{k === i ? "…" : ""}
          </span>
        ))}
      </div>
      {[0, 1].map((n) => (
        <div key={n} aria-hidden="true" style={{ background: "#FFFFFF", borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 10, opacity: 0.8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 32, height: 32, borderRadius: 10, background: "#EEF2FA" }} />{sk(40)}</span>{sk(85)}{sk(65)}
        </div>
      ))}
      <style>{"@keyframes fpSpin{to{transform:rotate(360deg)}}"}</style>
      <button onClick={onCancel} style={{ alignSelf: "center", height: 44, padding: "0 22px", borderRadius: 22, border: "none", background: "#FFFFFF", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "#475569" }}>Huỷ</button>
    </div>
  );
}

function OutOfQuota({ message, onSaved, onSearch, onClose }) {
  const row = (t, s, onClick, ic, c) => (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 64, width: "100%", padding: "0 14px", border: "none", borderRadius: 18, background: "#FFFFFF", fontFamily: "inherit", textAlign: "left", color: "#0F172A" }}>
      <AppIcon color={c} size={38}>{ic}</AppIcon>
      <span style={{ display: "flex", flexDirection: "column", flex: 1 }}><span style={{ fontSize: 15, fontWeight: 800 }}>{t}</span><span style={{ fontSize: 12, color: "#64748B" }}>{s}</span></span>{Icon.chev(16)}
    </button>
  );
  return (
    <div data-testid="ai-out-of-quota" style={{ padding: "16px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ borderRadius: 22, padding: "22px 18px", background: "linear-gradient(135deg,#F59E0B,#B45309)", color: "#FFFFFF", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
        <span style={{ width: 64, height: 64, borderRadius: 32, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>{MI.alert(28)}</span>
        <span style={{ fontSize: 19, fontWeight: 900 }}>Hết lượt AI tạo thực đơn hôm nay</span>
        <span style={{ fontSize: 13, opacity: 0.92, lineHeight: 1.5 }}>{message || "Bạn đã dùng hết lượt hôm nay."} Lượt mới có lúc 7:00 sáng.</span>
      </div>
      <span style={{ fontSize: 12, fontWeight: 800, color: "#64748B", letterSpacing: "0.06em", padding: "6px 4px 0 4px" }}>VẪN GHI ĐƯỢC BỮA, KHÔNG CẦN AI</span>
      {row("Dùng thực đơn đã lưu", "Thực đơn AI đã tạo, ngày ăn trước", onSaved, Icon.redo(18), GREEN)}
      {row("Tự ghi bằng Tìm món", "Món hay ăn, ăn lại bữa cũ", onSearch, Icon.search(18, "#FFFFFF"), "#0062F0")}
      <button onClick={onClose} style={{ ...fbtn("grey", false, 48), marginTop: 4 }}>Đóng</button>
    </div>
  );
}

// Sheet Đổi món (bản vẽ 94): tiêu đề tách tên bữa / tên món, 2 viên xám, ứng viên nền xám (chọn = xanh nhạt + tick),
// bên phải: bữa sẽ thành + chênh ±kcal (xanh = nhẹ hơn, cam = nặng hơn > 15)
function SwapSheet({ ctx, opts, onPick, onClose }) {
  const [sel, setSel] = useState(opts.options[0]?.key || null);
  const [shown, setShown] = useState(5);
  const list = opts.options.slice(0, shown);
  const chosen = opts.options.find((o) => o.key === sel);
  const base = opts.current?.mealCal || 0;
  return (
    <Sheet testid="swap-sheet" onClose={onClose} max="86vh">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>{ctx.mealName} · đổi món</span>
          <span style={{ fontSize: 20, fontWeight: 900 }}>{opts.current?.name}</span>
        </span>
        <CloseX onClick={onClose} />
      </div>
      {opts.current && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={pill("#F1F5F9", "#334155")}>Đang dùng {fmtInt(opts.current.gram)} g · {fmtInt(opts.current.cal)} kcal</span>
          <span style={pill("#F1F5F9", "#334155")}>{ctx.mealName} {fmtInt(opts.current.mealCal)} kcal</span>
        </div>
      )}
      {opts.options.length === 0 ? (
        <span style={{ padding: "20px 0", fontSize: 14, color: "#64748B", textAlign: "center" }}>Không có món cùng nhóm nào giữ được calo bữa này.</span>
      ) : (
        <>
          <span style={{ fontSize: 12, color: "#64748B", lineHeight: 1.4 }}>Món cùng nhóm, tự tính lại khẩu phần · không tốn lượt AI. Số bên phải = {ctx.mealName.toLowerCase()} sẽ thành.</span>
          {opts.options[0]?.wide && <span style={{ fontSize: 12, color: "#A16207" }}>Không có món nào giữ sát calo bữa này — đây là các món gần nhất.</span>}
          {list.map((o) => {
            const d = Math.round((o.mealCal || 0) - base);
            const dc = d < 0 ? GREEN : d > 15 ? "#B45309" : "#64748B";
            return (
              <OptRow key={o.key} testid="swap-opt" on={o.key === sel} onClick={() => setSel(o.key)} title={o.name}
                sub={`${fmtInt(o.gram)} g · ${fmtInt(o.cal)} kcal${o.carb ? ` · ${o.carb.name.toLowerCase()} ${opts.current?.carb === o.carb.gram ? "giữ " : ""}${fmtInt(o.carb.gram)} g` : ""}`}
                right={<span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}><span style={{ fontSize: 15, fontWeight: 900 }}>{fmtInt(o.mealCal)}</span><span style={{ fontSize: 11, fontWeight: 800, color: dc }}>{d > 0 ? "+" : d < 0 ? "−" : "±"}{fmtInt(Math.abs(d))} kcal</span></span>} />
            );
          })}
          {opts.options.length > shown && (
            <button data-testid="swap-more" onClick={() => setShown(shown + 10)} style={{ height: 36, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: "#0062F0", flexShrink: 0 }}>Xem thêm {opts.options.length - shown} món cùng nhóm</button>
          )}
        </>
      )}
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={onClose} style={{ ...fbtn("grey"), flex: 1 }}>Huỷ</button>
        <button data-testid="swap-confirm" disabled={!chosen} onClick={() => chosen && onPick(chosen)} style={{ ...fbtn("primary", !chosen), flex: 2 }}>{chosen ? `Đổi sang ${chosen.name}` : "Chọn món"}</button>
      </div>
    </Sheet>
  );
}

// Sheet Lặp lại hằng tuần (bản vẽ 97): ô icon + mô tả, ô thứ to kèm Tập/Nghỉ, khác loại ngày = nét đứt
export function SaveWeekSheet({ dayType, gymDays, noEx, onSave, onClose }) {
  const typeOf = (i) => (noEx ? "rest" : (gymDays || []).includes(i) ? "train" : "rest");
  const [days, setDays] = useState([]);
  return (
    <Sheet testid="save-week-sheet" onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <AppIcon color={GREEN} size={40}>{Icon.redo(20)}</AppIcon>
        <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 19, fontWeight: 900 }}>Lặp lại hằng tuần</span>
          <span style={{ fontSize: 12, color: "#64748B", lineHeight: 1.4 }}>Sáng thứ đó, nếu Hôm nay chưa ghi gì, app tự chép thực đơn này vào</span>
        </span>
      </div>
      <DayPicker isOk={(i) => typeOf(i) === dayType} days={days} dayTypeOf={noEx ? null : typeOf} onToggle={(i) => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i])} />
      <span style={{ fontSize: 12, color: "#64748B" }}>Chỉ chọn được {DT[dayType].toLowerCase()}{noEx ? "" : ` · ô nét đứt là ${dayType === "train" ? "ngày nghỉ" : "ngày tập"}`}</span>
      <button data-testid="save-week-confirm" disabled={!days.length} onClick={() => onSave(days)} style={fbtn("primary", !days.length)}>{days.length ? `Lặp lại ${[...days].sort((a, b) => a - b).map((i) => WEEK_SHORT[i]).join(", ")} mỗi tuần` : "Chọn thứ"}</button>
    </Sheet>
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
  // Cân lại cho đủ mục tiêu (16/10): chỉ hiện khi mealEngine kéo được tổng kcal gần mục tiêu hơn rõ rệt (≥ 3 điểm %)
  const balanced = useMemo(() => {
    if (!tpl || !target.cal || Math.abs(dev) <= 5) return null;
    try {
      const t = rebalanceTemplate(tpl, macro, dayType);
      const d = Math.round(((sumTemplate(t).cal - target.cal) / target.cal) * 100);
      return Math.abs(d) <= Math.abs(dev) - 3 ? { tpl: t, dev: d } : null;
    } catch (e) { return null; }
  }, [tpl, target.cal, dev, dayType]); // eslint-disable-line react-hooks/exhaustive-deps
  const rebalance = () => { if (!balanced) return; setTpl(balanced.tpl); saveAIMenu(balanced.tpl, user?.id); };
  const sub = `${DT[dayType]} · ${STYLE_NAME[prefs.style] || "Cơm nhà VN"}${tpl ? ` · ${meals.length} bữa` : ` · ${fmtInt(target.cal)} kcal`}`;
  const canApplyToday = dayType === todayType;

  const sq = { width: 56, height: 52, borderRadius: 14, border: "none", background: "#EEF4FF", color: "#0062F0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, fontSize: 10, fontWeight: 800, fontFamily: "inherit", padding: 0, flexShrink: 0 };
  const footer = step === "result" && tpl ? (
    <div style={{ flexShrink: 0, background: "rgba(255,255,255,0.92)", WebkitBackdropFilter: "blur(14px)", backdropFilter: "blur(14px)", borderTop: "1px solid rgba(30,64,175,0.08)", padding: "10px 12px calc(env(safe-area-inset-bottom, 0px) + 12px) 12px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", gap: 8 }}>
        <button data-testid="ai-regenerate" onClick={generate} disabled={busy} style={sq}>{Icon.redo(18)}Tạo lại</button>
        <button data-testid="ai-save-week" onClick={() => setSaveWeek(true)} disabled={busy} style={sq}>{Icon.redo(18)}Hằng tuần</button>
        {canApplyToday
          ? <button data-testid="ai-apply" onClick={apply} disabled={busy} style={{ ...fbtn("primary", busy), flex: 1, fontSize: 16 }}>{Icon.check(18, 2.8)} Áp dụng hôm nay</button>
          : <button onClick={() => setSaveWeek(true)} disabled={busy} style={{ ...fbtn("primary", busy), flex: 1 }}>Lưu vào {DT[dayType].toLowerCase()}</button>}
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
            <button onClick={generate} style={fbtn("purple")}>Thử lại</button>
            <button onClick={openSaved} style={fbtn("soft")}>Dùng thực đơn đã lưu</button>
          </div>
        ))}
      {step === "result" && tpl && (
        <div style={{ padding: "12px 12px 16px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
          {note && <p data-testid="ai-note" style={{ margin: "0 4px", fontSize: 13, color: "#475569", lineHeight: 1.45 }}>{note}</p>}
          <SumCard testid="ai-total" dataCal={total.cal} grad={PURPLE} cal={total.cal} target={target.cal} pct={pct} bar={pct}
            macros={{ p: total.p, c: total.c, f: total.f }}
            warn={Math.abs(dev) > 5 ? (balanced
              ? `${dev < 0 ? `Thiếu ${-dev}%` : `Dư ${dev}%`} mục tiêu ${DT[dayType].toLowerCase()}`
              : `${dev < 0 ? `Thiếu ${-dev}%` : `Dư ${dev}%`} mục tiêu ${DT[dayType].toLowerCase()} — các món này không cân thêm được, Tạo lại hoặc đổi món ${dev < 0 ? "to" : "nhẹ"} hơn`) : null}
            warnAction={balanced ? (
              <button data-testid="ai-rebalance" onClick={rebalance} style={{ height: 36, borderRadius: 10, border: "none", background: "#FFFFFF", color: "#6D28D9", fontFamily: "inherit", fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {Icon.redo(15)} Cân lại cho đủ {fmtInt(target.cal)} kcal · không tốn lượt
              </button>
            ) : null} />
          {meals.map((m) => {
            if (m.composite) {
              const items = (m.items || []).filter((i) => i.gram > 0 && i.display !== null);
              const one = { meal_id: m.meal_id, meal_name: m.meal_name, items: [{ display: m.pattern || items.map(foodName).join(", "), qty_display: `1 tô ~${fmtInt(items.reduce((s, i) => s + (i.gram || 0), 0))} g`, gram: 1, cal: items.reduce((s, i) => s + (i.cal || 0), 0) }] };
              return <MealCard key={m.meal_id} testid={`ai-meal-${m.meal_id}`} meal={one} name={foodName} portion={portionText} kcalColor="#0F172A" />;
            }
            const vis = { ...m, items: (m.items || []).filter((i) => i.gram > 0 && i.display !== null) };
            return (
              <MealCard key={m.meal_id} testid={`ai-meal-${m.meal_id}`} meal={vis} name={foodName} portion={portionText} kcalColor="#0F172A"
                right={(it) => <button data-testid={`swap-${m.meal_id}-${it.food}`} onClick={() => openSwap(m, it)} aria-label={`Đổi ${foodName(it)}`} style={{ width: 36, height: 32, borderRadius: 10, border: "none", background: "#EEF4FF", color: "#0062F0", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}>{Icon.redo(16)}</button>} />
            );
          })}
          {!canApplyToday && <p style={{ margin: "4px 16px 0 16px", fontSize: 12, color: "#64748B", textAlign: "center" }}>Hôm nay là {DT[todayType].toLowerCase()} nên thực đơn {DT[dayType].toLowerCase()} chỉ đặt lặp lại hằng tuần được.</p>}
        </div>
      )}
      {swap && <SwapSheet ctx={swap.ctx} opts={swap.opts} onPick={pick} onClose={() => setSwap(null)} />}
      {saveWeek && <SaveWeekSheet dayType={dayType} gymDays={profile?.gymDays} noEx={noEx} onSave={saveDays} onClose={() => setSaveWeek(false)} />}
    </SubPage>
  );
}
