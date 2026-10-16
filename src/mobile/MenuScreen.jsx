// Tab Thực đơn (bản vẽ 90–97, chốt 16/10; trước đó 13/10): thẻ Hôm nay, AI lên thực đơn, Thực đơn của tôi (AI đã tạo + ngày đã ăn),
// Thực đơn mẫu, dải 7 thứ Lặp lại hằng tuần (luôn hiện). Bỏ Gói tuần khỏi giao diện.
// Màn chi tiết là lớp "page" của MobileApp: MenuPastPage / MenuDayPage / MenuTplPage.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { todayVN, fmtVN } from "../lib/dateVN";
import { appConfirm } from "../lib/dialog";
import { fmtInt, dayTypeOf } from "../lib/mobileView";
import { aiQuota } from "../lib/aiQuota";
import { loadAIMenus } from "../lib/aiMenuService";
import { SaveWeekSheet } from "./AIMenuScreen";
import { weekRows, libraryFor, pastDaysFor, dailyTargetOf, mealsCal, dayToTemplateMeals, WEEK_KEYS, WEEK_SHORT } from "../lib/menuView";
import { applyMealEngineToTemplate } from "../mealEngine";
import { Icon, Seg, Skel } from "./ui";
import { PURPLE, GREEN, DT, MI, Chip, pill, fbtn, SumCard, totalsOf, Warn, MealCard, sortedMeals, DayPicker, Sheet, CloseX, Lbl, OptRow, StickyFoot, foodName, portionText } from "./menuUI";
import { LT, ltCard } from "../theme";
import { readUser, writeUser } from "../lib/userStore";
import { AppIcon } from "./icons";

const STYLES = [["vn", "Cơm nhà VN", "Cơm, canh, món mặn quen thuộc"], ["clean", "Eat clean", "Ức gà, khoai lang, yến mạch"], ["easy", "Tiện lợi", "Ít nấu nướng, đồ nhanh gọn"]];
const PREFS_KEY = "fp_menu_prefs"; // lưu theo từng tài khoản (lib/userStore)
const box = { margin: "0 12px", ...ltCard, padding: "0 14px" };
const secHead = { padding: "20px 18px 10px 18px", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 };
const AVOID_SUGGEST = ["hải sản", "sữa", "thịt bò", "trứng", "đậu phộng"];
const avoidList = (s) => String(s || "").split(/[,;]/).map((x) => x.trim()).filter(Boolean);

function readPrefs(uid) { return readUser(PREFS_KEY, uid, {}) || {}; }
function writePrefs(uid, p) { writeUser(PREFS_KEY, uid, p); }

// Danh sách bữa + món (dùng chung cho các màn chi tiết, bản vẽ 95/96)
export function MealsPreview({ meals }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sortedMeals(meals).map((m) => <MealCard key={m.meal_id} meal={m} name={foodName} portion={portionText} />)}
    </div>
  );
}

// Khối tổng xanh của trang chi tiết (95/96)
function Summary({ title, meals, cal, target, sub }) {
  const t = totalsOf(meals);
  return <SumCard title={title} cal={cal ?? t.cal} target={target} macros={{ p: t.p, c: t.c, f: t.f }} sub={sub} />;
}

const body = { padding: 12, display: "flex", flexDirection: "column", gap: 10 };

// Ô 1 thứ trong dải Lặp lại hằng tuần (bản vẽ 90)
function WeekCell({ r, noEx, onClick }) {
  const on = !!r.tpl;
  const st = r.isToday ? { background: "#0062F0", color: "#FFFFFF" } : on ? { background: LT.soft, color: "#0062F0" } : { background: "#F8FAFC", color: "#94A3B8" };
  return (
    <button data-testid={`week-day-${r.idx}`} data-set={on ? "1" : "0"} onClick={onClick} aria-label={`${r.long}${on ? ` · ${fmtInt(r.cal)} kcal` : " · chưa đặt"}`}
      style={{ flex: 1, minWidth: 0, height: 64, borderRadius: 14, border: "none", padding: 0, fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, ...st }}>
      <span style={{ fontSize: 14, fontWeight: 900 }}>{r.short}</span>
      {!noEx && <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.85 }}>{r.dayType === "train" ? "Tập" : "Nghỉ"}</span>}
      <span style={{ width: 5, height: 5, borderRadius: 3, background: on ? (r.isToday ? "#FFFFFF" : (r.low || r.mismatch ? "#F59E0B" : GREEN)) : "transparent" }} />
    </button>
  );
}

const listRow = (last) => ({ display: "flex", alignItems: "center", gap: 12, minHeight: 62, width: "100%", padding: 0, border: "none", borderBottom: last ? "none" : `1px solid ${LT.line}`, background: "transparent", fontFamily: "inherit", color: "#0F172A", textAlign: "left" });
const rowText = (t, s) => (
  <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 2 }}>
    <span style={{ fontSize: 15, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t}</span>
    <span style={{ fontSize: 12, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s}</span>
  </span>
);
const STYLE_ICON = { vn: [MI.food, "#EA580C"], clean: [MI.target, GREEN], easy: [MI.bolt, "#0891B2"] };

// ---------------- Tab Thực đơn ----------------
// Bố cục (bản vẽ 90, chốt 16/10): thẻ Hôm nay có thanh kcal; khối tím AI gọn (3 viên tuỳ chọn → sheet 91);
// Thực đơn của tôi (AI đã tạo + ngày đã ăn), Thực đơn mẫu (admin soạn), dải 7 thứ Lặp lại hằng tuần (luôn hiện).
export function MenuScreen(p) {
  const { profile, macro, aiAccess, userId, todayLog, getWeeklyTemplate, weeklyTemplates, defaultTemplates, refreshDefaultTemplates, flags, openGenerate, openSaved, openPage, openToday, clearToday, recentDays, active } = p;
  const today = todayVN();
  const todayType = dayTypeOf(profile, today);
  const noEx = (profile?.exerciseType || "gym") === "none";
  const saved = readPrefs(p.userId);
  const [style, setStyle] = useState(saved.style || "vn");
  const [avoid, setAvoid] = useState(saved.avoid || "");
  const [dayType, setDayType] = useState(todayType);
  const [aiMenus, setAiMenus] = useState(null); // null = đang tải
  const [quota, setQuota] = useState(null);
  const [libType, setLibType] = useState(todayType);
  const [opts, setOpts] = useState(false);
  const [scope, setScope] = useState("rest"); // đã ăn ≥ 1 bữa hôm nay: mặc định chỉ lên các bữa còn lại
  const [typed, setTyped] = useState("");

  useEffect(() => {
    let alive = true;
    if (!userId) return;
    loadAIMenus(userId, 5).then((r) => alive && setAiMenus(r || [])).catch(() => alive && setAiMenus([]));
    if (aiAccess?.usable) {
      Promise.all([
        supabase.from("profiles").select("tier,ai_menu_count_today,ai_menu_count_reset_at").eq("id", userId).maybeSingle(),
        supabase.from("subscription_settings").select("*").eq("id", 1).maybeSingle(),
      ]).then(([a, b]) => { if (alive) setQuota(aiQuota(a.data, b.data).find((q) => q.key === "menu")); }).catch(() => {});
    }
    if (flags?.template_library && refreshDefaultTemplates) refreshDefaultTemplates();
    return () => { alive = false; };
  }, [userId, active]); // eslint-disable-line react-hooks/exhaustive-deps — tải lại khi đóng màn AI (lượt + thực đơn mới)

  const rows = useMemo(() => weekRows({ getTemplate: getWeeklyTemplate, gymDays: profile?.gymDays, exerciseType: profile?.exerciseType, macro, today }),
    [weeklyTemplates, profile?.gymDays, profile?.exerciseType, macro?.calTarget, macro?.calRest, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const setCount = rows.filter((r) => r.tpl).length;
  const lib = flags?.template_library ? libraryFor(defaultTemplates, { goal: macro?.goal, dietStrategy: macro?.dietStrategy, dayType: libType }) : [];
  const dt = noEx ? "rest" : dayType;
  const target = dailyTargetOf(macro, dt).cal;
  const todayTarget = dailyTargetOf(macro, todayType).cal;
  const todayMeals = todayLog && todayLog.log_date === today ? dayToTemplateMeals(todayLog) : [];
  const todayHasMeals = todayMeals.length > 0;
  const todayCal = mealsCal(todayMeals);
  const past = useMemo(() => pastDaysFor(recentDays, today, 5), [recentDays, today]);
  const avoids = avoidList(avoid);

  const savePrefs = (next = {}) => writePrefs(p.userId, { style, avoid, ...next });
  const restN = p.todayRest && dt === todayType ? p.todayRest.left : 0; // số bữa chưa ăn hôm nay (chỉ khi đã ăn ≥ 1 bữa)
  const useRest = restN > 0 && scope === "rest";
  const generate = () => { savePrefs(); setOpts(false); openGenerate({ style, avoid: avoid.trim(), dayType: dt, scope: useRest ? "rest" : "day" }); };
  const toggleAvoid = (w) => { const has = avoids.includes(w); setAvoid((has ? avoids.filter((x) => x !== w) : [...avoids, w]).join(", ").slice(0, 120)); };
  const addTyped = () => { const w = typed.trim(); if (!w) return; if (!avoids.includes(w)) setAvoid([...avoids, w].join(", ").slice(0, 120)); setTyped(""); };
  const closeOpts = () => { savePrefs(); setOpts(false); };
  const styleName = (STYLES.find((x) => x[0] === style) || STYLES[0])[1];
  const avoidPill = avoids.length ? `Không ăn: ${avoids.slice(0, 2).join(", ")}${avoids.length > 2 ? ` +${avoids.length - 2}` : ""}` : "Món không ăn";

  return (
    <div>
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 14px) 16px 12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ flex: 1, fontSize: 28, fontWeight: 900 }}>Thực đơn</span>
        {quota && <span data-testid="menu-quota" style={{ ...pill(quota.out ? "rgba(239,68,68,0.1)" : "rgba(124,58,237,0.12)", quota.out ? "#B91C1C" : "#6D28D9"), height: 28 }}>{Icon.sparkle(13)}{quota.out ? "Hết lượt AI hôm nay" : `Còn ${fmtInt(quota.limit - quota.used)}/${fmtInt(quota.limit)} lượt`}</span>}
      </div>

      {/* Hôm nay đã có thực đơn chưa (bản vẽ 90) */}
      <button data-testid="menu-today" onClick={openToday} className="tap" style={{ margin: "0 12px", width: "calc(100% - 24px)", boxSizing: "border-box", display: "flex", alignItems: "center", gap: 12, padding: 14, ...ltCard, fontFamily: "inherit", textAlign: "left", color: "#0F172A" }}>
        {todayHasMeals ? <AppIcon color={GREEN} size={40}>{Icon.check(20, 2.6)}</AppIcon> : <AppIcon color="#F59E0B" size={40}>{Icon.plus(20)}</AppIcon>}
        <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>HÔM NAY · {DT[todayType].toUpperCase()}</span>
          {todayHasMeals
            ? <span style={{ fontSize: 16, fontWeight: 900 }}>{todayMeals.length} bữa · {fmtInt(todayCal)} <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>/ {fmtInt(todayTarget)} kcal</span></span>
            : <span style={{ fontSize: 16, fontWeight: 900 }}>Chưa có thực đơn</span>}
          {todayHasMeals
            ? <span style={{ height: 6, borderRadius: 3, background: LT.line, overflow: "hidden", marginTop: 4, display: "block" }}><span style={{ display: "block", width: `${Math.max(2, Math.min(100, todayTarget ? (todayCal / todayTarget) * 100 : 0))}%`, height: 6, background: GREEN }} /></span>
            : <span style={{ fontSize: 12, color: "#475569" }}>Chọn 1 cách bên dưới để có thực đơn</span>}
        </span>
        <span style={{ height: 34, padding: "0 12px", borderRadius: 17, background: LT.soft, color: "#0062F0", display: "flex", alignItems: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>Xem</span>
      </button>

      {aiAccess?.enabled && (
        <div data-testid="menu-ai-card" style={{ margin: "12px 12px 0 12px", borderRadius: 22, padding: 16, background: PURPLE, color: "#FFFFFF", display: "flex", flexDirection: "column", gap: 12, position: "relative", overflow: "hidden" }}>
          <span aria-hidden="true" style={{ position: "absolute", right: -30, top: -30, width: 140, height: 140, borderRadius: 70, background: "rgba(255,255,255,0.08)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
            <span style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Icon.sparkle(22)}</span>
            <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 18, fontWeight: 900 }}>AI lên thực đơn</span>
              <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.9 }}>Món Việt, vừa đúng {fmtInt(target)} kcal</span>
            </span>
          </div>
          {aiAccess.usable ? (
            <>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", position: "relative" }}>
                <button data-testid="menu-opt-style" onClick={() => setOpts(true)} style={pill()}>{styleName} {Icon.down(12)}</button>
                {!noEx && <button data-testid="menu-opt-day" onClick={() => setOpts(true)} style={pill()}>{DT[dayType]} {Icon.down(12)}</button>}
                <button data-testid="menu-opt-avoid" onClick={() => setOpts(true)} style={pill()}>{avoidPill} {Icon.down(12)}</button>
                {restN > 0 && <button data-testid="menu-opt-scope" onClick={() => setOpts(true)} style={pill()}>{useRest ? `${restN} bữa còn lại` : "Cả ngày"} {Icon.down(12)}</button>}
              </div>
              <button data-testid="menu-generate" onClick={generate} disabled={quota?.out} style={{ ...fbtn("white", quota?.out, 50), position: "relative" }}>
                {quota?.out ? "Hết lượt hôm nay — dùng thực đơn đã lưu" : <>{Icon.sparkle(18)} Lên thực đơn ngay</>}
              </button>
            </>
          ) : (
            <>
              <span style={{ fontSize: 13, opacity: 0.92, lineHeight: 1.5, position: "relative" }}>AI lên thực đơn dành cho tài khoản Dùng thử / Premium. Bạn vẫn dùng lại được thực đơn của mình{flags?.template_library ? " và thực đơn mẫu" : ""} bên dưới, hoặc ghi món bằng Tìm món.</span>
              <button data-testid="menu-upgrade" onClick={() => openPage("plan")} style={{ ...fbtn("white", false, 48), position: "relative" }}>Xem gói cước</button>
            </>
          )}
        </div>
      )}

      {opts && (
        <Sheet testid="menu-opt-sheet" onClose={closeOpts}>
          <div style={{ display: "flex", alignItems: "center" }}><span style={{ flex: 1, fontSize: 20, fontWeight: 900 }}>Tuỳ chọn thực đơn AI</span><CloseX onClick={closeOpts} /></div>
          <Lbl>PHONG CÁCH ĂN</Lbl>
          {STYLES.map(([id, t, d]) => (
            <OptRow key={id} testid={`menu-style-${id}`} on={style === id} color="#7C3AED" soft="#F3EEFF" title={t} sub={d} onClick={() => setStyle(id)}
              icon={<Chip color={STYLE_ICON[id][1]} size={38}>{STYLE_ICON[id][0](20)}</Chip>} />
          ))}
          {!noEx && (
            <>
              <Lbl>TẠO CHO</Lbl>
              <Seg ariaLabel="Tạo cho" accent="#6D28D9" value={dayType} onChange={setDayType} opts={["train", "rest"].map((d) => ({ value: d, label: `${DT[d]}${d === todayType ? " · hôm nay" : ""}`, testid: `menu-day-${d}` }))} />
            </>
          )}
          {restN > 0 && (
            <>
              <Lbl>HÔM NAY ĐÃ ĂN {p.todayRest.eatenN} BỮA</Lbl>
              <Seg ariaLabel="Lên cho" accent="#6D28D9" value={scope} onChange={setScope} opts={[{ value: "rest", label: `${restN} bữa còn lại`, testid: "menu-scope-rest" }, { value: "day", label: "Cả ngày", testid: "menu-scope-day" }]} />
            </>
          )}
          <Lbl>MÓN KHÔNG ĂN / DỊ ỨNG</Lbl>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[...avoids, ...AVOID_SUGGEST.filter((w) => !avoids.includes(w))].map((w) => {
              const on = avoids.includes(w);
              return <button key={w} data-testid={`menu-avoid-chip-${w}`} aria-pressed={on} onClick={() => toggleAvoid(w)}
                style={{ height: 32, padding: on ? "0 8px 0 12px" : "0 12px", borderRadius: 16, border: "none", background: on ? "#F3EEFF" : "#F1F5F9", color: on ? "#6D28D9" : "#334155", fontSize: 13, fontWeight: on ? 800 : 700, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                {on ? <>{w}<span aria-hidden="true" style={{ fontSize: 15, opacity: 0.7 }}>×</span></> : `+ ${w}`}</button>;
            })}
          </div>
          <input data-testid="menu-avoid" type="text" value={typed} onChange={(e) => setTyped(e.target.value.slice(0, 40))} onKeyDown={(e) => { if (e.key === "Enter") addTyped(); }} onBlur={addTyped}
            placeholder="Gõ thêm món khác…" aria-label="Món không ăn khác"
            style={{ height: 46, padding: "0 14px", borderRadius: 14, border: "1.5px solid transparent", background: "#F1F5F9", fontFamily: "inherit", fontSize: 16, color: "#0F172A", boxSizing: "border-box", width: "100%" }} />
          <button data-testid="menu-opt-generate" onClick={() => { addTyped(); generate(); }} disabled={quota?.out} style={fbtn("purple", quota?.out)}>{Icon.sparkle(18)} Lưu tuỳ chọn & lên thực đơn</button>
        </Sheet>
      )}

      <div style={secHead}>
        <span style={{ fontSize: 17, fontWeight: 900 }}>Thực đơn của tôi</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>Dùng lại không tốn lượt AI</span>
      </div>
      <div style={box}>
        {aiMenus === null && [0, 1].map((k) => <div key={k} aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 62 }}><Skel w={36} h={36} r={11} /><div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}><Skel w="50%" /><Skel w="70%" h={10} /></div></div>)}
        {(aiMenus || []).map((m, i) => (
          <button key={`ai-${m.date}`} data-testid={i === 0 ? "menu-latest-ai" : `menu-ai-${i}`} onClick={() => openSaved(m.template)} style={listRow(i === (aiMenus || []).length - 1 && past.length === 0)}>
            <AppIcon color="#7C3AED" size={36}>{Icon.sparkle(18)}</AppIcon>
            {rowText(`Thực đơn AI · ${m.date === today ? "hôm nay" : fmtVN(m.date)}`, `${DT[m.template.day_type] || "—"} · ${(m.template.meals || []).length} bữa · ${fmtInt(mealsCal(m.template.meals))} kcal`)}
            {Icon.chev(16)}
          </button>
        ))}
        {past.map((d, i) => (
          <button key={`d-${d.date}`} data-testid={`menu-past-${d.date}`} onClick={() => openPage("menu_past", { day: d })} style={listRow(i === past.length - 1)}>
            <AppIcon color={GREEN} size={36}>{Icon.redo(18)}</AppIcon>
            {rowText(`Ngày đã ăn · ${fmtVN(d.date)}`, `${d.meals.length} bữa · ${fmtInt(d.cal)} kcal · ${d.meals.flatMap((m) => m.items.map((it) => it.display || it.food || it.name)).slice(0, 4).join(", ")}`)}
            {Icon.chev(16)}
          </button>
        ))}
        {aiMenus && aiMenus.length === 0 && past.length === 0 && (
          <div style={{ padding: "14px 0", fontSize: 13, color: "#64748B", lineHeight: 1.5 }}>Thực đơn AI bạn tạo và những ngày bạn đã ghi đủ bữa sẽ hiện ở đây để dùng lại.</div>
        )}
      </div>

      {flags?.template_library && (
        <>
          <div style={secHead}>
            <span style={{ fontSize: 17, fontWeight: 900 }}>Thực đơn mẫu</span>
            {!noEx && (
              <Seg size="sm" ariaLabel="Loại ngày" value={libType} onChange={setLibType} opts={[{ value: "train", label: "Tập", testid: "lib-day-train" }, { value: "rest", label: "Nghỉ", testid: "lib-day-rest" }]} />
            )}
          </div>
          <div style={box}>
            {lib.length === 0 && <div style={{ padding: "16px 0", fontSize: 13, color: "#64748B", textAlign: "center" }}>Chưa có mẫu cho mục tiêu này.</div>}
            {lib.map((t, i) => {
              const cal = mealsCal(applyMealEngineToTemplate(t, dailyTargetOf(macro, t.day_type)).meals);
              return (
                <button key={t.id} data-testid={`lib-tpl-${t.id}`} onClick={() => openPage("menu_tpl", { id: t.id })} style={listRow(i === lib.length - 1)}>
                  <Chip color="#0062F0" size={36}>{MI.layers(18)}</Chip>
                  {rowText(t.name || "Mẫu", `${DT[t.day_type]} · ${(t.meals || []).length} bữa · ${fmtInt(cal)} kcal · tính riêng cho bạn`)}
                  {Icon.chev(16)}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div style={secHead}>
        <span style={{ fontSize: 17, fontWeight: 900 }}>Lặp lại hằng tuần</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>Tự chép vào Hôm nay</span>
      </div>
      <div data-testid="week-strip" style={{ ...box, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 5 }}>{rows.map((r) => <WeekCell key={r.key} r={r} noEx={noEx} onClick={() => openPage("menu_day", { key: r.key })} />)}</div>
        <span style={{ fontSize: 12, color: "#64748B", lineHeight: 1.4 }}>{setCount ? `Đã đặt ${setCount} thứ · chấm xanh = có thực đơn, chạm 1 thứ để xem / đặt` : "Chưa đặt thứ nào · chạm 1 thứ để lưu thực đơn ăn lại mỗi tuần"}</span>
      </div>

      {todayHasMeals && (
        <button data-testid="clear-today" onClick={clearToday} style={{ display: "block", margin: "16px auto 0 auto", height: 44, padding: "0 16px", border: "none", background: "transparent", fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "#DC2626" }}>Xoá hết bữa hôm nay</button>
      )}
      <div style={{ height: 24 }} />
    </div>
  );
}

// ---------------- 1 ngày đã ăn (dùng lại) — bản vẽ 95 ----------------
export function MenuPastPage({ day, profile, macro, applyDayMenu, saveWeeklyTemplate, showToast, close }) {
  const today = todayVN();
  const todayType = dayTypeOf(profile, today);
  const [busy, setBusy] = useState(false);
  const [repeat, setRepeat] = useState(false);
  if (!day) return null;
  // Dùng cho hôm nay: MobileApp.applyDayMenu hỏi trước nếu thay bữa chưa ăn, áp xong có Hoàn tác (16/10)
  const useToday = async () => {
    if (busy) return;
    setBusy(true);
    const res = await applyDayMenu({ name: `Ngày ${fmtVN(day.date)}`, day_type: todayType, meals: day.meals });
    setBusy(false);
    if (!res || res.cancelled || res.ok === false) return;
    close();
  };
  const saveRepeat = async (idxs) => {
    setBusy(true);
    let ok = true;
    for (const i of idxs) ok = (await saveWeeklyTemplate(WEEK_KEYS[i], day.day_type, day.meals, day.cal)) && ok;
    setBusy(false);
    if (!ok) { showToast({ text: "Chưa lưu được — kiểm tra mạng rồi thử lại." }); return; }
    setRepeat(false);
    showToast({ text: `Sẽ lặp lại mỗi ${idxs.map((i) => WEEK_SHORT[i]).join(", ")}.` });
  };
  return (
    <div>
      <div style={body}>
        <Summary title={`Ngày ${fmtVN(day.date)} · ${DT[day.day_type]}`} meals={day.meals} cal={day.cal} target={dailyTargetOf(macro, todayType).cal} sub={`${day.meals.length} bữa đã ăn · so với mục tiêu hôm nay`} />
        <MealsPreview meals={day.meals} />
        <span style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5, padding: "0 4px" }}>Dùng cho hôm nay: bữa trùng tên chưa ăn được thay bằng món của ngày này (hỏi trước nếu bữa đó đã có món, áp xong vẫn Hoàn tác được).</span>
      </div>
      <StickyFoot>
        <button data-testid="past-repeat" disabled={busy} onClick={() => setRepeat(true)} style={fbtn("soft", false, 48)}>{Icon.redo(16)} Lặp lại hằng tuần</button>
        <button data-testid="past-use-today" disabled={busy} onClick={useToday} style={fbtn("primary", busy)}>{Icon.check(18, 2.8)} Dùng cho hôm nay</button>
      </StickyFoot>
      {repeat && <SaveWeekSheet dayType={day.day_type} gymDays={profile?.gymDays} noEx={(profile?.exerciseType || "gym") === "none"} onSave={saveRepeat} onClose={() => setRepeat(false)} />}
    </div>
  );
}

// ---------------- 1 thứ Lặp lại hằng tuần — bản vẽ 95 ----------------
export function MenuDayPage({ dayKey, profile, macro, todayLog, getWeeklyTemplate, weeklyTemplates, saveWeeklyTemplate, deleteWeeklyTemplate, applyDayMenu, removeDayMeal, refresh, showToast, close }) {
  const today = todayVN();
  const todayType = dayTypeOf(profile, today);
  const row = weekRows({ getTemplate: getWeeklyTemplate, gymDays: profile?.gymDays, exerciseType: profile?.exerciseType, macro, today }).find((r) => r.key === dayKey);
  const [busy, setBusy] = useState(false);
  if (!row) return null;
  void weeklyTemplates;
  const target = dailyTargetOf(macro, row.dayType).cal;
  const todayMeals = todayLog && todayLog.log_date === today ? dayToTemplateMeals(todayLog) : [];
  const run = async (fn) => { if (busy) return; setBusy(true); try { await fn(); } finally { setBusy(false); } };

  const useToday = () => run(async () => {
    const res = await applyDayMenu({ ...row.tpl, day_type: todayType, meals: row.meals });
    if (!res || res.cancelled || res.ok === false) return;
    close();
  });
  const recalc = () => run(async () => {
    const eng = applyMealEngineToTemplate({ ...row.tpl, meals: row.meals }, dailyTargetOf(macro, row.dayType));
    if (!(await saveWeeklyTemplate(row.key, row.dayType, eng.meals || [], mealsCal(eng.meals)))) { showToast({ text: "Chưa lưu được — kiểm tra mạng rồi thử lại." }); return; }
    showToast({ text: "Đã tính lại khẩu phần theo mục tiêu hiện tại." });
  });
  const remove = () => run(async () => {
    if (!(await appConfirm(`Bỏ lặp lại thực đơn mỗi ${row.long}?`, { danger: true }))) return;
    await deleteWeeklyTemplate(row.key);
    if (row.isToday && todayLog && todayLog.log_date === today) {
      const eaten = todayLog.eaten_meals || [];
      const uneaten = (todayLog.meals || []).filter((m) => (m.items || []).length > 0 && !eaten.includes(m.meal_id || m.id)).map((m) => m.meal_id || m.id);
      if (uneaten.length && (await appConfirm(`Hôm nay còn ${uneaten.length} bữa chưa ăn. Xoá luôn các bữa chưa ăn khỏi Hôm nay?`))) {
        for (const id of uneaten) await removeDayMeal(today, id);
        await refresh?.();
      }
    }
    showToast({ text: `Đã bỏ lặp lại mỗi ${row.long}.` });
    close();
  });
  const saveFromToday = () => run(async () => {
    if (!(await saveWeeklyTemplate(row.key, row.dayType, todayMeals, mealsCal(todayMeals)))) { showToast({ text: "Chưa lưu được — kiểm tra mạng rồi thử lại." }); return; }
    showToast({ text: `Đã lưu thực đơn hôm nay vào ${row.long}.` });
  });

  if (!row.tpl) return (
    <div style={body}>
      <div style={{ ...ltCard, padding: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <AppIcon color={GREEN} size={40}>{Icon.redo(20)}</AppIcon>
        <span style={{ fontSize: 14, color: "#475569", lineHeight: 1.5 }}>{row.long} ({DT[row.dayType].toLowerCase()}) chưa có thực đơn. Lưu một ngày ăn ưng ý vào đây, mỗi {row.long} app sẽ tự áp sẵn các bữa.</span>
      </div>
      {todayMeals.length > 0 && row.dayType === todayType && (
        <button data-testid="day-save-today" disabled={busy} onClick={saveFromToday} style={fbtn("primary", busy)}>Lưu thực đơn hôm nay ({todayMeals.length} bữa · {fmtInt(mealsCal(todayMeals))} kcal)</button>
      )}
      {todayMeals.length > 0 && row.dayType !== todayType && <span style={{ fontSize: 12, color: "#64748B", textAlign: "center" }}>Hôm nay là {DT[todayType].toLowerCase()}, chỉ lưu được vào ngày cùng loại.</span>}
      {todayMeals.length === 0 && <span style={{ fontSize: 12, color: "#64748B", textAlign: "center", lineHeight: 1.5 }}>Hoặc mở 1 thực đơn AI / ngày đã ăn / thực đơn mẫu rồi bấm Lặp lại hằng tuần.</span>}
    </div>
  );
  return (
    <div>
      <div style={body}>
        <Summary title={`${row.long} · ${DT[row.dayType]}`} meals={row.meals} cal={row.cal} target={target} sub={`${row.meals.length} bữa · tự chép vào Hôm nay mỗi ${row.long} nếu sáng đó chưa ghi gì`} />
        {row.mismatch ? <Warn>Lưu cho {DT[row.tpl.day_type].toLowerCase()} — bấm Tính lại để khớp mục tiêu {DT[row.dayType].toLowerCase()}</Warn>
          : row.low ? <Warn>Thiếu nhiều so với mục tiêu — bấm Tính lại</Warn> : null}
        <MealsPreview meals={row.meals} />
      </div>
      <StickyFoot>
        <div style={{ display: "flex", gap: 8 }}>
          <button data-testid="day-recalc" disabled={busy} onClick={recalc} style={fbtn("soft", false, 48)}>{Icon.redo(16)} Tính lại</button>
          <button data-testid="day-delete" disabled={busy} onClick={remove} style={fbtn("danger", false, 48)}>{MI.trash(16)} Bỏ lặp lại</button>
        </div>
        {row.dayType === todayType
          ? <button data-testid="day-use-today" disabled={busy} onClick={useToday} style={fbtn("primary", busy)}>{Icon.check(18, 2.8)} Dùng cho hôm nay</button>
          : <span style={{ fontSize: 12, color: "#B45309", textAlign: "center", padding: "4px 0" }}>Hôm nay là {DT[todayType].toLowerCase()} nên không áp mẫu {DT[row.dayType].toLowerCase()} được.</span>}
      </StickyFoot>
    </div>
  );
}

// ---------------- 1 mẫu trong Kho mẫu — bản vẽ 96 ----------------
export function MenuTplPage({ tplId, profile, macro, defaultTemplates, saveWeeklyTemplate, applyDayMenu, showToast, close }) {
  const today = todayVN();
  const todayType = dayTypeOf(profile, today);
  const t = (defaultTemplates || []).find((x) => String(x.id) === String(tplId));
  const eng = useMemo(() => (t ? applyMealEngineToTemplate(t, dailyTargetOf(macro, t.day_type)) : null), [t, macro?.calTarget, macro?.calRest]); // eslint-disable-line react-hooks/exhaustive-deps
  const [days, setDays] = useState([]);
  const [busy, setBusy] = useState(false);
  if (!t || !eng) return <p style={{ margin: 24, textAlign: "center", color: "#64748B" }}>Mẫu không còn.</p>;
  const none = (profile?.exerciseType || "gym") === "none";
  const typeOf = (i) => (none ? "rest" : (profile?.gymDays || []).includes(i) ? "train" : "rest");
  const cal = mealsCal(eng.meals);

  const useToday = async () => {
    if (busy) return;
    setBusy(true);
    const res = await applyDayMenu(eng);
    setBusy(false);
    if (!res || res.cancelled || res.ok === false) return;
    close();
  };
  const assign = async () => {
    setBusy(true);
    let ok = true;
    for (const i of days) ok = (await saveWeeklyTemplate(WEEK_KEYS[i], t.day_type, eng.meals || [], cal)) && ok;
    setBusy(false);
    if (!ok) { showToast({ text: "Chưa lưu được — kiểm tra mạng rồi thử lại." }); return; }
    showToast({ text: `Sẽ lặp lại mỗi ${days.map((i) => WEEK_SHORT[i]).join(", ")}.` });
    setDays([]);
  };

  return (
    <div>
      <div style={body}>
        <Summary title={`${t.name || "Mẫu"} · ${DT[t.day_type]}`} meals={eng.meals} cal={cal} target={dailyTargetOf(macro, t.day_type).cal} sub="Khẩu phần đã tính riêng theo mục tiêu của bạn" />
        <MealsPreview meals={eng.meals} />
        <div style={{ ...ltCard, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 900 }}>Lặp lại hằng tuần</span>
          <span style={{ fontSize: 12, color: "#64748B", lineHeight: 1.4 }}>Mẫu {DT[t.day_type].toLowerCase()} chỉ đặt được vào {DT[t.day_type].toLowerCase()} (ô nét đứt là {t.day_type === "train" ? "ngày nghỉ" : "ngày tập"})</span>
          <DayPicker testid="tpl-assign" isOk={(i) => typeOf(i) === t.day_type} days={days} dayTypeOf={none ? null : typeOf} onToggle={(i) => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i])} />
          <button data-testid="tpl-assign" disabled={busy || !days.length} onClick={assign} style={fbtn(days.length ? "soft" : "grey", busy || !days.length, 46)}>{Icon.redo(16)} {days.length === 1 ? `Lặp lại mỗi ${WEEK_SHORT[days[0]]}` : days.length ? `Lặp lại ${days.map((i) => WEEK_SHORT[i]).join(", ")} mỗi tuần` : "Chọn thứ cùng loại ngày"}</button>
        </div>
      </div>
      <StickyFoot>
        {t.day_type === todayType
          ? <button data-testid="tpl-use-today" disabled={busy} onClick={useToday} style={fbtn("primary", busy)}>{Icon.check(18, 2.8)} Dùng cho hôm nay</button>
          : <span style={{ fontSize: 12, color: "#B45309", textAlign: "center", padding: "4px 0" }}>Mẫu {DT[t.day_type].toLowerCase()} — hôm nay là {DT[todayType].toLowerCase()}, chỉ đặt lặp lại hằng tuần được.</span>}
      </StickyFoot>
    </div>
  );
}
