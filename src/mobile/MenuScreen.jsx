// Tab Thực đơn (chốt 13/10): thẻ Hôm nay, AI lên thực đơn, Thực đơn của tôi (AI đã tạo + ngày đã ăn),
// Thực đơn mẫu, Lặp lại hằng tuần (chỉ khi đã đặt). Bỏ Gói tuần khỏi giao diện.
// Màn chi tiết là lớp "page" của MobileApp: MenuPastPage / MenuDayPage / MenuTplPage.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { todayVN, fmtVN } from "../lib/dateVN";
import { appConfirm } from "../lib/dialog";
import { fmtInt, dayTypeOf } from "../lib/mobileView";
import { mealLabel, MEAL_ORDER } from "../lib/mealMath";
import { aiQuota } from "../lib/aiQuota";
import { loadAIMenus } from "../lib/aiMenuService";
import { SaveWeekSheet } from "./AIMenuScreen";
import { weekRows, libraryFor, pastDaysFor, dailyTargetOf, mealsCal, dayToTemplateMeals, WEEK_KEYS, WEEK_SHORT } from "../lib/menuView";
import { applyMealEngineToTemplate } from "../mealEngine";
import { Icon, GRAD_BLUE } from "./ui";
import { LT, ltCard } from "../theme";
import { readUser, writeUser } from "../lib/userStore";
import { AppIcon } from "./icons";

const PURPLE = "linear-gradient(135deg,#7C3AED,#5B21B6)";
const STYLES = [["vn", "Cơm nhà VN", "Cơm, canh, món mặn quen thuộc"], ["clean", "Eat clean", "Ức gà, khoai lang, yến mạch"], ["easy", "Tiện lợi", "Ít nấu nướng, đồ nhanh gọn"]];
const PREFS_KEY = "fp_menu_prefs"; // lưu theo từng tài khoản (lib/userStore)
const lbl = { fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em" };
const box = { margin: "0 12px", ...ltCard, padding: "0 14px" };
const secHead = { padding: "20px 18px 10px 18px", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 };
const rowBtn = (last) => ({ display: "flex", alignItems: "center", gap: 12, minHeight: 60, width: "100%", padding: 0, border: "none", borderBottom: last ? "none" : `1px solid ${LT.line}`, background: "transparent", fontFamily: "inherit", color: "#0F172A", textAlign: "left" });
const iconBox = (bg, color) => ({ width: 36, height: 36, borderRadius: 10, background: bg, color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, fontWeight: 900 });
const btn = (kind, disabled) => ({ height: 50, borderRadius: 14, border: kind === "ghost" ? "1.5px solid #E2E8F0" : kind === "danger" ? "1.5px solid #FCA5A5" : "none", background: disabled ? "#E2E8F0" : kind === "ghost" ? "#FFFFFF" : kind === "danger" ? "#FEF2F2" : kind === "purple" ? PURPLE : GRAD_BLUE, color: disabled ? "#64748B" : kind === "ghost" ? "#0F172A" : kind === "danger" ? "#DC2626" : "#FFFFFF", fontFamily: "inherit", fontSize: 15, fontWeight: 900, width: "100%" });
const DT = { train: "Ngày tập", rest: "Ngày nghỉ" };

function readPrefs(uid) { return readUser(PREFS_KEY, uid, {}) || {}; }
function writePrefs(uid, p) { writeUser(PREFS_KEY, uid, p); }

// Danh sách bữa + món (dùng chung cho các màn chi tiết)
export function MealsPreview({ meals }) {
  const list = (meals || []).filter((m) => (m.items || []).length > 0).sort((a, b) => MEAL_ORDER.indexOf(a.meal_id) - MEAL_ORDER.indexOf(b.meal_id));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "0 12px" }}>
      {list.map((m) => (
        <div key={m.meal_id} style={{ background: "#FFFFFF", border: "none", borderRadius: 14, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>{mealLabel(m.meal_name, m.meal_id)}</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#007AFF" }}>{fmtInt(mealsCal([m]))} kcal</span>
          </div>
          {m.items.map((it, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "4px 0", fontSize: 13, color: "#334155" }}>
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{it.display || it.food || it.name}{it.gram ? <span style={{ color: "#94A3B8" }}> · {fmtInt(it.gram)} g</span> : null}</span>
              <span style={{ color: "#64748B", whiteSpace: "nowrap" }}>{fmtInt(it.cal)} kcal</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Summary({ title, sub, cal, target }) {
  return (
    <div style={{ margin: "12px 12px 12px 12px", borderRadius: 18, padding: 16, background: GRAD_BLUE, color: "#FFFFFF", display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>{title}</span>
      <span style={{ fontSize: 26, fontWeight: 900 }}>{fmtInt(cal)} <span style={{ fontSize: 14, fontWeight: 700 }}>kcal</span>{target ? <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.85 }}> / mục tiêu {fmtInt(target)}</span> : null}</span>
      {sub && <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.9 }}>{sub}</span>}
    </div>
  );
}

// ---------------- Tab Thực đơn ----------------
// Bố cục (chốt 13/10, gọn lại cho dễ hiểu): Hôm nay ăn gì → 1) AI lên thực đơn, 2) Thực đơn của tôi
// (thực đơn AI đã tạo + ngày đã ăn trước, dùng lại không tốn lượt), 3) Thực đơn mẫu (admin soạn).
// "Lặp lại hằng tuần" (weekly_templates, tự chép vào Hôm nay mỗi sáng) chỉ hiện khi user đã đặt.
export function MenuScreen(p) {
  const { profile, macro, aiAccess, userId, todayLog, getWeeklyTemplate, weeklyTemplates, defaultTemplates, refreshDefaultTemplates, flags, openGenerate, openSaved, openPage, openToday, clearToday, recentDays, active } = p;
  const today = todayVN();
  const todayType = dayTypeOf(profile, today);
  const noEx = (profile?.exerciseType || "gym") === "none";
  const saved = readPrefs(p.userId);
  const [style, setStyle] = useState(saved.style || "vn");
  const [avoid, setAvoid] = useState(saved.avoid || "");
  const [dayType, setDayType] = useState(todayType);
  const [aiMenus, setAiMenus] = useState([]);
  const [quota, setQuota] = useState(null);
  const [libType, setLibType] = useState(todayType);

  useEffect(() => {
    let alive = true;
    if (!userId) return;
    loadAIMenus(userId, 5).then((r) => alive && setAiMenus(r || []));
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
  const repeatRows = rows.filter((r) => r.tpl);
  const lib = flags?.template_library ? libraryFor(defaultTemplates, { goal: macro?.goal, dietStrategy: macro?.dietStrategy, dayType: libType }) : [];
  const target = dailyTargetOf(macro, dayType).cal;
  const todayTarget = dailyTargetOf(macro, todayType).cal;
  const todayMeals = todayLog && todayLog.log_date === today ? dayToTemplateMeals(todayLog) : [];
  const todayHasMeals = todayMeals.length > 0;
  const past = useMemo(() => pastDaysFor(recentDays, today, 5), [recentDays, today]);

  const generate = () => { writePrefs(p.userId, { style, avoid }); openGenerate({ style, avoid: avoid.trim(), dayType: noEx ? "rest" : dayType }); };

  return (
    <div>
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 14px) 16px 10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ flex: 1, fontSize: 26, fontWeight: 900 }}>Thực đơn</span>
        {quota && <span data-testid="menu-quota" style={{ height: 28, padding: "0 10px", borderRadius: 999, background: quota.out ? "rgba(239,68,68,0.1)" : "rgba(124,58,237,0.1)", color: quota.out ? "#B91C1C" : "#6D28D9", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center" }}>{quota.out ? "Hết lượt AI hôm nay" : `Còn ${fmtInt(quota.limit - quota.used)}/${fmtInt(quota.limit)} lượt`}</span>}
      </div>

      {/* Hôm nay đã có thực đơn chưa */}
      <button data-testid="menu-today" onClick={openToday} className="tap" style={{ margin: "0 12px 12px 12px", width: "calc(100% - 24px)", boxSizing: "border-box", display: "flex", alignItems: "center", gap: 12, padding: 14, ...ltCard, borderLeft: `4px solid ${todayHasMeals ? "#00C896" : "#F59E0B"}`, fontFamily: "inherit", textAlign: "left", color: "#0F172A" }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, background: todayHasMeals ? "rgba(0,200,150,0.12)" : "rgba(245,158,11,0.14)", color: todayHasMeals ? "#047857" : "#B45309", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{todayHasMeals ? Icon.check(20, 2.6) : Icon.plus(20)}</span>
        <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>{todayHasMeals ? `Hôm nay đã có ${todayMeals.length} bữa · ${fmtInt(mealsCal(todayMeals))} kcal` : "Hôm nay chưa có thực đơn"}</span>
          <span style={{ fontSize: 12, color: "#475569" }}>{todayHasMeals ? `Mục tiêu ${fmtInt(todayTarget)} kcal · bấm để xem ở Hôm nay` : "Chọn 1 trong các cách bên dưới để có thực đơn"}</span>
        </span>
        {Icon.chev(16)}
      </button>

      {aiAccess?.enabled && (
        <div data-testid="menu-ai-card" style={{ margin: "0 12px", ...ltCard, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 44, height: 44, borderRadius: 14, background: PURPLE, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{Icon.sparkle(22)}</span>
            <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 17, fontWeight: 900 }}>AI lên thực đơn</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Món Việt, vừa đúng {fmtInt(target)} kcal · {DT[noEx ? "rest" : dayType]}</span>
            </span>
          </div>
          {aiAccess.usable ? (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={lbl}>PHONG CÁCH ĂN</span>
                {STYLES.map(([id, t, d]) => {
                  const on = style === id;
                  return (
                    <button key={id} data-testid={`menu-style-${id}`} aria-pressed={on} onClick={() => setStyle(id)}
                      style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "0 14px", borderRadius: 14, border: on ? "2px solid #7C3AED" : "1.5px solid #E2E8F0", background: on ? "rgba(124,58,237,0.05)" : "#FFFFFF", fontFamily: "inherit", textAlign: "left", color: "#0F172A" }}>
                      <span style={{ display: "flex", flexDirection: "column", flex: 1 }}><span style={{ fontSize: 15, fontWeight: on ? 800 : 700 }}>{t}</span><span style={{ fontSize: 12, color: "#475569" }}>{d}</span></span>
                      {on ? <span style={{ width: 22, height: 22, borderRadius: 11, background: "#7C3AED", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>{Icon.check(12)}</span>
                        : <span style={{ width: 22, height: 22, borderRadius: 11, border: "2px solid #CBD5E1", boxSizing: "border-box" }} />}
                    </button>
                  );
                })}
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={lbl}>MÓN KHÔNG ĂN / DỊ ỨNG</span>
                <input data-testid="menu-avoid" type="text" value={avoid} onChange={(e) => setAvoid(e.target.value.slice(0, 120))} placeholder="VD: hải sản, sữa, thịt bò..."
                  style={{ height: 46, padding: "0 14px", borderRadius: 12, border: "1.5px solid #E2E8F0", background: "#F1F5F9", fontFamily: "inherit", fontSize: 16, color: "#0F172A", boxSizing: "border-box" }} />
              </label>
              {!noEx && (
                <div role="group" aria-label="Tạo cho" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: 3, background: "#F1F5F9", borderRadius: 12 }}>
                  {["train", "rest"].map((d) => (
                    <button key={d} data-testid={`menu-day-${d}`} aria-pressed={dayType === d} onClick={() => setDayType(d)}
                      style={{ height: 36, borderRadius: 9, border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: dayType === d ? 800 : 600, background: dayType === d ? "#FFFFFF" : "transparent", color: dayType === d ? "#7C3AED" : "#475569", boxShadow: dayType === d ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
                      {DT[d]}{d === todayType ? " · hôm nay" : ""}
                    </button>
                  ))}
                </div>
              )}
              <button data-testid="menu-generate" onClick={generate} disabled={quota?.out} style={{ ...btn("purple", quota?.out), height: 52, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: quota?.out ? "none" : "0 4px 12px rgba(124,58,237,0.3)" }}>
                {quota?.out ? "Hết lượt hôm nay — dùng thực đơn đã lưu" : <>{Icon.sparkle(18)} Lên thực đơn ngay</>}
              </button>
            </>
          ) : (
            <>
              <span style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>AI lên thực đơn dành cho tài khoản Dùng thử / Premium. Bạn vẫn dùng lại được thực đơn của mình{flags?.template_library ? " và thực đơn mẫu" : ""} bên dưới, hoặc ghi món bằng Tìm món.</span>
              <button data-testid="menu-upgrade" onClick={() => openPage("plan")} style={btn("ghost")}>Xem gói cước</button>
            </>
          )}
        </div>
      )}


      <div style={secHead}>
        <span style={{ fontSize: 17, fontWeight: 900 }}>Thực đơn của tôi</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>Dùng lại không tốn lượt AI</span>
      </div>
      <div style={box}>
        {aiMenus.map((m, i) => (
          <button key={`ai-${m.date}`} data-testid={i === 0 ? "menu-latest-ai" : `menu-ai-${i}`} onClick={() => openSaved(m.template)} style={rowBtn(i === aiMenus.length - 1 && past.length === 0)}>
            <AppIcon color="#7C3AED" size={36}>{Icon.sparkle(18)}</AppIcon>
            <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Thực đơn AI · {m.date === today ? "hôm nay" : fmtVN(m.date)}</span>
              <span style={{ fontSize: 12, color: "#64748B" }}>{DT[m.template.day_type] || "—"} · {(m.template.meals || []).length} bữa · {fmtInt(mealsCal(m.template.meals))} kcal</span>
            </span>
            {Icon.chev(16)}
          </button>
        ))}
        {past.map((d, i) => (
          <button key={`d-${d.date}`} data-testid={`menu-past-${d.date}`} onClick={() => openPage("menu_past", { day: d })} style={rowBtn(i === past.length - 1)}>
            <AppIcon color="#00A67E" size={36}>{Icon.redo(18)}</AppIcon>
            <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Ngày đã ăn · {fmtVN(d.date)}</span>
              <span style={{ fontSize: 12, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.meals.length} bữa · {fmtInt(d.cal)} kcal · {d.meals.flatMap((m) => m.items.map((it) => it.display || it.food || it.name)).slice(0, 4).join(", ")}</span>
            </span>
            {Icon.chev(16)}
          </button>
        ))}
        {aiMenus.length === 0 && past.length === 0 && (
          <div style={{ padding: "14px 0", fontSize: 13, color: "#64748B", lineHeight: 1.5 }}>Thực đơn AI bạn tạo và những ngày bạn đã ghi đủ bữa sẽ hiện ở đây để dùng lại.</div>
        )}
      </div>

      {flags?.template_library && (
        <>
          <div style={secHead}>
            <span style={{ fontSize: 17, fontWeight: 900 }}>Thực đơn mẫu</span>
            {!noEx && (
              <div role="group" aria-label="Loại ngày" style={{ display: "flex", padding: 3, background: "rgba(30,64,175,0.07)", borderRadius: 10 }}>
                {["train", "rest"].map((d) => (
                  <button key={d} data-testid={`lib-day-${d}`} aria-pressed={libType === d} onClick={() => setLibType(d)} style={{ height: 30, padding: "0 10px", borderRadius: 8, border: "none", fontFamily: "inherit", fontSize: 12, fontWeight: libType === d ? 800 : 600, background: libType === d ? "#FFFFFF" : "transparent", color: libType === d ? "#007AFF" : "#475569" }}>{d === "train" ? "Tập" : "Nghỉ"}</button>
                ))}
              </div>
            )}
          </div>
          <div style={box}>
            {lib.length === 0 && <div style={{ padding: "16px 0", fontSize: 13, color: "#64748B", textAlign: "center" }}>Chưa có mẫu cho mục tiêu này.</div>}
            {lib.map((t, i) => {
              const cal = mealsCal(applyMealEngineToTemplate(t, dailyTargetOf(macro, t.day_type)).meals);
              return (
                <button key={t.id} data-testid={`lib-tpl-${t.id}`} onClick={() => openPage("menu_tpl", { id: t.id })} style={rowBtn(i === lib.length - 1)}>
                  <AppIcon color="#007AFF" size={36}><span style={{ fontSize: 13, fontWeight: 900 }}>{(t.meals || []).length}</span></AppIcon>
                  <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name || "Mẫu"}</span>
                    <span style={{ fontSize: 12, color: "#64748B" }}>{DT[t.day_type]} · {fmtInt(cal)} kcal · tính riêng cho bạn</span>
                  </span>
                  {Icon.chev(16)}
                </button>
              );
            })}
          </div>
        </>
      )}

      {repeatRows.length > 0 && (
        <>
          <div style={secHead}>
            <span style={{ fontSize: 17, fontWeight: 900 }}>Lặp lại hằng tuần</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>Tự chép vào Hôm nay mỗi sáng</span>
          </div>
          <div style={box}>
            {repeatRows.map((r, i) => (
              <button key={r.key} data-testid={`week-day-${r.idx}`} onClick={() => openPage("menu_day", { key: r.key })} style={{ ...rowBtn(i === repeatRows.length - 1), minHeight: 56 }}>
                <span style={{ ...iconBox(r.isToday ? "#007AFF" : LT.soft, r.isToday ? "#FFFFFF" : "#475569"), flexDirection: "column", lineHeight: 1.1 }}>
                  <span style={{ fontSize: 13, fontWeight: 900 }}>{r.short}</span>
                  {!noEx && <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.85 }}>{r.dayType === "train" ? "Tập" : "Nghỉ"}</span>}
                </span>
                <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Mỗi {r.long} · {fmtInt(r.cal)} kcal <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>· {r.meals.length} bữa</span></span>
                  <span style={{ fontSize: 12, color: r.low || r.mismatch ? "#B45309" : "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.mismatch ? `Lưu cho ${DT[r.tpl.day_type].toLowerCase()} — nay là ${DT[r.dayType].toLowerCase()}` : r.low ? "Thiếu nhiều so với mục tiêu" : r.names.join(", ")}
                  </span>
                </span>
                {Icon.chev(16)}
              </button>
            ))}
          </div>
        </>
      )}

      {todayHasMeals && (
        <button data-testid="clear-today" onClick={clearToday} style={{ display: "block", margin: "16px auto 0 auto", height: 44, padding: "0 16px", border: "none", background: "transparent", fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "#DC2626" }}>Xoá hết bữa hôm nay</button>
      )}
      <div style={{ height: 24 }} />
    </div>
  );
}

// ---------------- 1 ngày đã ăn (dùng lại) ----------------
export function MenuPastPage({ day, profile, macro, applyTemplate, saveWeeklyTemplate, todayLog, refresh, showToast, close }) {
  const today = todayVN();
  const todayType = dayTypeOf(profile, today);
  const [busy, setBusy] = useState(false);
  const [repeat, setRepeat] = useState(false);
  if (!day) return null;
  const todayHas = todayLog && todayLog.log_date === today && dayToTemplateMeals(todayLog).length > 0;
  const useToday = async () => {
    if (busy) return;
    if (todayHas && !(await appConfirm("Hôm nay đã có món. Bữa trùng tên sẽ được thay bằng thực đơn này. Tiếp tục?"))) return;
    setBusy(true);
    const res = await applyTemplate({ name: `Ngày ${fmtVN(day.date)}`, day_type: todayType, meals: day.meals });
    await refresh?.();
    setBusy(false);
    if (res && res.ok === false) { showToast({ text: "Chưa áp được, thử lại nhé." }); return; }
    showToast({ text: `Đã dùng thực đơn ngày ${fmtVN(day.date)} cho hôm nay.` });
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
    <div style={{ paddingBottom: 32 }}>
      <Summary title={`Ngày ${fmtVN(day.date)} · ${DT[day.day_type]}`} cal={day.cal} target={dailyTargetOf(macro, todayType).cal} sub={`${day.meals.length} bữa đã ăn · so với mục tiêu hôm nay`} />
      <MealsPreview meals={day.meals} />
      <div style={{ margin: "14px 12px 0 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        <button data-testid="past-use-today" disabled={busy} onClick={useToday} style={btn("blue", busy)}>Dùng cho hôm nay</button>
        <button data-testid="past-repeat" disabled={busy} onClick={() => setRepeat(true)} style={btn("ghost")}>Lặp lại hằng tuần…</button>
        <span style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>Dùng cho hôm nay: bữa trùng tên được thay bằng món của ngày này (hỏi trước nếu hôm nay đã có món).</span>
      </div>
      {repeat && <SaveWeekSheet dayType={day.day_type} gymDays={profile?.gymDays} noEx={(profile?.exerciseType || "gym") === "none"} onSave={saveRepeat} onClose={() => setRepeat(false)} />}
    </div>
  );
}

// ---------------- 1 ngày Lịch tuần ----------------
export function MenuDayPage({ dayKey, profile, macro, todayLog, getWeeklyTemplate, weeklyTemplates, saveWeeklyTemplate, deleteWeeklyTemplate, applyTemplate, removeDayMeal, refresh, showToast, close }) {
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
    const res = await applyTemplate({ ...row.tpl, day_type: todayType, meals: row.meals });
    await refresh?.();
    if (res && res.ok === false) { showToast({ text: "Chưa áp được, thử lại nhé." }); return; }
    showToast({ text: `Đã áp thực đơn ${row.long} cho hôm nay.` });
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

  return (
    <div style={{ paddingBottom: 32 }}>
      {row.tpl ? (
        <>
          <Summary title={`${row.long} · ${DT[row.dayType]}`} cal={row.cal} target={target} sub={row.mismatch ? `Lưu cho ${DT[row.tpl.day_type].toLowerCase()} — bấm Tính lại để khớp mục tiêu ${DT[row.dayType].toLowerCase()}` : `${row.meals.length} bữa · tự chép vào Hôm nay mỗi ${row.long} nếu sáng đó chưa ghi gì`} />
          <MealsPreview meals={row.meals} />
          <div style={{ margin: "14px 12px 0 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            {row.dayType === todayType
              ? <button data-testid="day-use-today" disabled={busy} onClick={useToday} style={btn("blue", busy)}>Dùng cho hôm nay</button>
              : <span style={{ fontSize: 12, color: "#B45309", textAlign: "center" }}>Hôm nay là {DT[todayType].toLowerCase()} nên không áp mẫu {DT[row.dayType].toLowerCase()} được.</span>}
            <button data-testid="day-recalc" disabled={busy} onClick={recalc} style={btn("ghost")}>Tính lại theo mục tiêu hiện tại</button>
            <button data-testid="day-delete" disabled={busy} onClick={remove} style={btn("danger")}>Bỏ lặp lại {row.long}</button>
          </div>
        </>
      ) : (
        <div style={{ margin: "16px 12px 0 12px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "#FFFFFF", border: "none", borderRadius: 16, padding: 16, fontSize: 14, color: "#475569", lineHeight: 1.5 }}>
            {row.long} ({DT[row.dayType].toLowerCase()}) chưa có thực đơn. Lưu một ngày ăn ưng ý vào đây, mỗi {row.long} app sẽ tự áp sẵn các bữa.
          </div>
          {todayMeals.length > 0 && row.dayType === todayType && (
            <button data-testid="day-save-today" disabled={busy} onClick={saveFromToday} style={btn("blue", busy)}>Lưu thực đơn hôm nay ({todayMeals.length} bữa · {fmtInt(mealsCal(todayMeals))} kcal)</button>
          )}
          {todayMeals.length > 0 && row.dayType !== todayType && <span style={{ fontSize: 12, color: "#64748B", textAlign: "center" }}>Hôm nay là {DT[todayType].toLowerCase()}, chỉ lưu được vào ngày cùng loại.</span>}
        </div>
      )}
    </div>
  );
}

// ---------------- 1 mẫu trong Kho mẫu ----------------
export function MenuTplPage({ tplId, profile, macro, defaultTemplates, saveWeeklyTemplate, applyTemplate, refresh, showToast, close }) {
  const today = todayVN();
  const todayType = dayTypeOf(profile, today);
  const t = (defaultTemplates || []).find((x) => String(x.id) === String(tplId));
  const eng = useMemo(() => (t ? applyMealEngineToTemplate(t, dailyTargetOf(macro, t.day_type)) : null), [t, macro?.calTarget, macro?.calRest]); // eslint-disable-line react-hooks/exhaustive-deps
  const [days, setDays] = useState([]);
  const [busy, setBusy] = useState(false);
  if (!t || !eng) return <p style={{ margin: 24, textAlign: "center", color: "#64748B" }}>Mẫu không còn.</p>;
  const none = (profile?.exerciseType || "gym") === "none";
  const sameTypeIdx = WEEK_KEYS.map((_, i) => i).filter((i) => (none ? "rest" : (profile?.gymDays || []).includes(i) ? "train" : "rest") === t.day_type);
  const cal = mealsCal(eng.meals);

  const useToday = async () => {
    setBusy(true);
    const res = await applyTemplate(eng);
    await refresh?.();
    setBusy(false);
    if (res && res.ok === false) { showToast({ text: "Chưa áp được, thử lại nhé." }); return; }
    showToast({ text: `Đã áp mẫu "${t.name}" cho hôm nay.` });
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
    <div style={{ paddingBottom: 32 }}>
      <Summary title={`${t.name || "Mẫu"} · ${DT[t.day_type]}`} cal={cal} target={dailyTargetOf(macro, t.day_type).cal} sub="Khẩu phần đã tính riêng theo mục tiêu của bạn" />
      <MealsPreview meals={eng.meals} />
      <div style={{ margin: "14px 12px 0 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        {t.day_type === todayType
          ? <button data-testid="tpl-use-today" disabled={busy} onClick={useToday} style={btn("blue", busy)}>Dùng cho hôm nay</button>
          : <span style={{ fontSize: 12, color: "#B45309", textAlign: "center" }}>Mẫu {DT[t.day_type].toLowerCase()} — hôm nay là {DT[todayType].toLowerCase()}, chỉ đặt lặp lại hằng tuần được.</span>}
        <span style={lbl}>LẶP LẠI HẰNG TUẦN VÀO · CHỈ {DT[t.day_type].toUpperCase()}</span>
        <div role="group" aria-label="Gán vào ngày" style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: 6 }}>
          {WEEK_SHORT.map((d, i) => {
            const ok = sameTypeIdx.includes(i);
            const on = days.includes(i);
            return <button key={d} data-testid={`tpl-assign-${i}`} disabled={!ok} aria-pressed={on} onClick={() => setDays(on ? days.filter((x) => x !== i) : [...days, i])}
              style={{ height: 44, borderRadius: 10, border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 800, background: on ? "#007AFF" : ok ? "#F1F5F9" : "#F8FAFC", color: on ? "#FFFFFF" : ok ? "#475569" : "#CBD5E1" }}>{d}</button>;
          })}
        </div>
        <button data-testid="tpl-assign" disabled={busy || !days.length} onClick={assign} style={btn("ghost")}>{days.length === 1 ? `Lặp lại mỗi ${WEEK_SHORT[days[0]]}` : days.length ? `Lặp lại ${days.length} thứ mỗi tuần` : "Chọn thứ cùng loại ngày"}</button>
        <span style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>Ô mờ là {t.day_type === "train" ? "ngày nghỉ" : "ngày tập"} — mẫu {DT[t.day_type].toLowerCase()} chỉ lặp lại vào {DT[t.day_type].toLowerCase()}.</span>
      </div>
    </div>
  );
}
