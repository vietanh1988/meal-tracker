// Khung app mobile mới (canvas "Fipilot mobile – bản sửa"):
// thanh dưới Hôm nay · Thực đơn · (+) Ghi bữa · Tiến độ · Tôi, các lớp phủ
// (Ghi bữa, Sửa bữa, Chụp ảnh, Fipilot AI, Thực đơn AI, màn phụ của Tôi).
// Mọi ghi daily_logs đi qua useUserData (saveMealToCloud/toggleEaten/removeDayMeal/moveDayMeal/addWater/applyTemplate).
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MOBILE_CSS, FONT, BottomNav, SubPage, Toast } from "./ui";
import { TodayScreen } from "./TodayScreen";
import { LogMealSheet } from "./LogMealSheet";
import { EditMealScreen } from "./EditMealScreen";
import { ProgressScreen } from "./ProgressScreen";
import { MeScreen } from "./MeScreen";
import { ScheduleScreen } from "./ScheduleScreen";
import { GoalsScreen } from "./GoalsScreen";
import { RemindersScreen } from "./RemindersScreen";
import { PlanScreen } from "./PlanScreen";
import { FeedbackScreen } from "./FeedbackScreen";
import { AboutScreen } from "./AboutScreen";
import { MenuScreen, MenuDayPage, MenuTplPage, MenuBundlePage } from "./MenuScreen";
import { AIMenuScreen } from "./AIMenuScreen";
import { WEEK_KEYS, WEEK_SHORT, mealsCal } from "../lib/menuView";
import { UpdatePopup } from "./UpdatePopup";
import { AdminPanel } from "../AdminPanel";
import { AICoachPanel } from "../AICoachPanel";
import { PhotoScreen } from "./PhotoScreen";
import PWAInstallPrompt from "../PWAInstallPrompt";
import { useNotifications } from "../hooks/useNotifications";
import { NotificationsScreen, BellButton } from "./NotificationsScreen";
import { AppDialogHost, appConfirm } from "../lib/dialog";
import { parseFeatureFlags } from "../adminTabs/FeatureFlagsTab";
import { getAIMenuAccess } from "../lib/aiMenuService";
import { DEFAULT_MEAL_CONFIG } from "../mealConstants";
import { MEAL_NAMES, mealKey, hasItems, mealLabel } from "../lib/mealMath";
import { recentEatenMeals, frequentItems, currentMealId } from "../lib/dayPlan";
import { todayVN, addDays, nowVNParts, friendlyDate, fmtVN, templateKeyOf, weekRange } from "../lib/dateVN";
import { dayTypeOf, targetsOf, visibleMealIds, timelineIds, mealRows, eatenOfDay, weightSummary, itemName } from "../lib/mobileView";

const TAB_KEY = "fp_mtab";
const SECTION_TITLE = { profile: "Mục tiêu & hồ sơ", account: "Tài khoản & gói cước", feedback_inline: "Góp ý & báo lỗi", about: "Giới thiệu", about_edit: "Sửa giới thiệu", terms: "Điều khoản", admin_home: "Quản trị" };

export function MobileApp(props) {
  const { user, profile, setProfile, macro, appSettings, isAdmin, saveSetting, signOut, isOffline, macroBanner,
    weightLog, addWeight, updateWeight, deleteWeight, ud } = props;
  const flags = parseFeatureFlags(appSettings);
  const aiAccess = getAIMenuAccess(profile, appSettings);
  const notif = useNotifications(appSettings, user?.id);
  const name = user?.user_metadata?.username || user?.email?.split("@")[0] || "bạn";

  // ---------- điều hướng ----------
  const [tab, setTabState] = useState(() => { try { const t = localStorage.getItem(TAB_KEY); return ["today", "menu", "progress", "me"].includes(t) ? t : "today"; } catch (e) { return "today"; } });
  const setTab = (t) => { setTabState(t); try { localStorage.setItem(TAB_KEY, t); } catch (e) { /* */ } window.scrollTo(0, 0); };
  const [layers, setLayers] = useState([]);
  const layersRef = useRef(layers);
  layersRef.current = layers;
  // Mỗi lớp = 1 mục lịch sử ({fpDepth}). Nút Back của Android/trình duyệt đóng lớp trên cùng.
  useEffect(() => {
    const onPop = (e) => {
      const depth = Number(e.state && e.state.fpDepth) || 0;
      if (layersRef.current.length > depth) setLayers((l) => l.slice(0, depth));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const openLayer = (layer) => {
    const depth = layersRef.current.length + 1;
    setLayers((l) => [...l, layer]);
    try { window.history.pushState({ fpDepth: depth }, ""); } catch (e) { /* */ }
  };
  // Thay lớp trên cùng bằng lớp khác (không đổi lịch sử) — VD Ghi bữa → Chụp ảnh
  const replaceTop = (layer) => setLayers((l) => [...l.slice(0, -1), layer]);
  const closeLayer = () => {
    if (!layersRef.current.length) return;
    try { window.history.back(); } catch (e) { setLayers((l) => l.slice(0, -1)); }
  };
  const top = layers[layers.length - 1];
  const has = (type) => layers.some((l) => l.type === type);

  // ---------- ngày đang xem ----------
  const [now, setNow] = useState(() => nowVNParts());
  useEffect(() => {
    const t = setInterval(() => setNow(nowVNParts()), 60000);
    const v = () => { if (document.visibilityState === "visible") setNow(nowVNParts()); };
    document.addEventListener("visibilitychange", v);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", v); };
  }, []);
  const today = todayVN();
  const [selDate, setSelDate] = useState(null); // null = hôm nay
  const date = selDate && selDate <= today ? selDate : today;

  // ---------- dữ liệu ngày khác hôm nay + 30 ngày gần đây ----------
  const [dayCache, setDayCache] = useState({});
  const [version, setVersion] = useState(0);
  const [recentRows, setRecentRows] = useState([]);
  const [weekRows, setWeekRows] = useState([]);
  const loadDay = useCallback(async (d) => {
    if (d === todayVN()) return;
    const row = await ud.getDailyLog(d);
    setDayCache((c) => ({ ...c, [d]: row || { log_date: d, meals: [], eaten_meals: [], water_ml: 0 } }));
  }, [ud.getDailyLog]);
  useEffect(() => { if (date !== today && !dayCache[date]) loadDay(date); }, [date, today]);
  useEffect(() => {
    let alive = true;
    ud.getRecentDays(30).then((r) => { if (alive) setRecentRows(r || []); });
    return () => { alive = false; };
  }, [version, ud.getRecentDays]);
  const wk = weekRange(date);
  useEffect(() => {
    let alive = true;
    ud.getDailyLogs(wk.start, wk.end).then((r) => { if (alive) setWeekRows(r || []); });
    return () => { alive = false; };
  }, [wk.start, version]);

  const dayOf = (d) => (d === today ? ud.todayLog : dayCache[d]);
  const refresh = async (d) => { if (d && d !== todayVN()) await loadDay(d); setVersion((v) => v + 1); };

  // ---------- tính cho Hôm nay ----------
  const mealConfig = useMemo(() => {
    if (profile.mealConfig) return profile.mealConfig;
    try { return appSettings.meal_config ? JSON.parse(appSettings.meal_config) : DEFAULT_MEAL_CONFIG; } catch (e) { return DEFAULT_MEAL_CONFIG; }
  }, [profile.mealConfig, appSettings.meal_config]);
  const idsFor = (d) => timelineIds(dayOf(d), visibleMealIds(mealConfig, dayTypeOf(profile, d), profile.exerciseType, DEFAULT_MEAL_CONFIG));
  const day = dayOf(date);
  const dayType = dayTypeOf(profile, date);
  const targets = targetsOf(macro, dayType);
  const rows = mealRows(day, idsFor(date), profile.mealTimes, now.minutes, date === today, date < today);
  const eaten = eatenOfDay(day);
  const weight = weightSummary(weightLog, profile.goalKg, profile.kg, today);
  const recentMeals = useMemo(() => recentEatenMeals(recentRows, 12), [recentRows]);
  const frequent = useMemo(() => frequentItems(recentRows, 15), [recentRows]);
  const weekDots = useMemo(() => {
    const m = {};
    (weekRows || []).forEach((r) => { if ((r.eaten_meals || []).length) m[String(r.log_date).slice(0, 10)] = true; });
    if ((ud.todayLog?.eaten_meals || []).length) m[today] = true;
    return m;
  }, [weekRows, ud.todayLog, today]);

  // ---------- thông báo nhỏ ----------
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const showToast = (t, ms = 4500) => { clearTimeout(toastTimer.current); setToast(t); toastTimer.current = setTimeout(() => setToast(null), ms); };
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const [busy, setBusy] = useState(false);

  // ---------- thao tác ghi (tuần tự) ----------
  const queue = useRef(Promise.resolve());
  const serial = (fn) => { const p = queue.current.then(fn, fn); queue.current = p.catch(() => {}); return p; };
  const freshDay = async (d) => (d === todayVN() ? ud.todayLog : (await ud.getDailyLog(d)) || { meals: [], eaten_meals: [] });
  const mealOf = (dy, id) => (dy?.meals || []).find((m) => mealKey(m) === id);
  const fail = () => showToast({ text: "Lưu không được, kiểm tra mạng rồi thử lại." });

  // Thêm món vào 1 bữa (hoặc thay cả bữa) và đánh dấu đã ăn. Trả về true/false.
  const putItems = (d, mealId, newItems, replace, label) => serial(async () => {
    const dy = await freshDay(d);
    const prevMeal = mealOf(dy, mealId);
    const prev = (prevMeal && prevMeal.items) || [];
    const prevEaten = (dy?.eaten_meals || []).includes(mealId);
    const next = replace ? newItems : [...prev, ...newItems];
    const mealName = mealLabel(prevMeal && prevMeal.meal_name, mealId);
    const res = await ud.saveMealToCloud(mealId, dayTypeOf(profile, d), next, false, d, { markEaten: true, name: mealName });
    if (res && res.ok === false) { fail(); return false; }
    await refresh(d);
    const undo = async () => {
      setToast(null);
      await serial(async () => {
        if (prev.length === 0) await ud.removeDayMeal(d, mealId);
        else {
          await ud.saveMealToCloud(mealId, dayTypeOf(profile, d), prev, false, d, { name: mealName });
          if (!prevEaten) await ud.toggleEaten(mealId, false, d);
        }
        await refresh(d);
      });
    };
    showToast({ text: `Đã ghi ${label} vào ${mealName.toLowerCase()}${d === todayVN() ? "" : " " + friendlyDate(d).toLowerCase()}`, action: { label: "Hoàn tác", onClick: undo } });
    return true;
  });

  const toggleEaten = async (mealId, v) => {
    setBusy(true);
    const res = await ud.toggleEaten(mealId, v, date);
    setBusy(false);
    if (res && res.ok === false) return fail();
    await refresh(date);
  };
  const repeatMeal = (rec, mealId, d = date) => putItems(d, mealId, rec.items, true, `${rec.meal_name.toLowerCase()} ${fmtVN(rec.log_date)}`);

  // ---------- mở các lớp ----------
  const defaultMealFor = (d) => {
    const ids = idsFor(d);
    if (d !== today) return ids[0] || "trua";
    return currentMealId(now.minutes, ids, profile.mealTimes) || ids[0] || "trua";
  };
  const openLog = (mealId, d = date) => openLayer({ type: "log", date: d, mealId: mealId || defaultMealFor(d) });
  const openEdit = (mealId, d = date) => { setPendingPick(null); openLayer({ type: "edit", date: d, mealId }); };
  const openPhoto = (mealId) => {
    if (!flags.photo_macro) { showToast({ text: "Chụp ảnh món ăn đang tạm tắt." }); return; }
    openLayer({ type: "photo", mealId: typeof mealId === "string" ? mealId : null });
  };
  // Nút AI ở Hôm nay: tạo luôn với lựa chọn đã dùng lần trước ở tab Thực đơn
  const quickAILayer = () => {
    let prefs = {};
    try { prefs = JSON.parse(localStorage.getItem("fp_menu_prefs") || "{}") || {}; } catch (e) { /* */ }
    return { type: "ai", auto: true, prefs: { style: prefs.style, avoid: prefs.avoid, dayType: dayTypeOf(profile, today) } };
  };
  const aiMenuAction = aiAccess.usable ? () => openLayer(quickAILayer()) : aiAccess.enabled ? () => setTab("menu") : null;
  const openDay = (d) => { setSelDate(d === today ? null : d); setTab("today"); };

  // ---------- Thực đơn AI ----------
  const applyAIMenu = async (tpl) => {
    try {
      const tplDayType = tpl.day_type || dayTypeOf(profile, today);
      const tplMeals = (tpl.meals || []).map((m) => ({ meal_id: m.meal_id, meal_name: mealLabel(m.meal_name, m.meal_id), items: m.items || [], composite: !!m.composite, pattern: m.pattern || null }));
      const tplCal = Math.round((tpl.meals || []).reduce((s, m) => (m.items || []).reduce((a, i) => a + (i.cal || 0), s), 0));
      await ud.saveWeeklyTemplate(templateKeyOf(today), tplDayType, tplMeals, tplCal);
      await ud.applyTemplate(tpl);
      await refresh(today);
      showToast({ text: "Đã áp thực đơn AI cho hôm nay." });
    } catch (e) { console.error("Apply AI menu error:", e); fail(); }
    closeLayer();
  };

  // Lưu thực đơn AI vào các ngày trong Lịch tuần (chỉ số 0 = T2)
  const saveAIMenuToWeek = async (tpl, days) => {
    try {
      const meals = (tpl.meals || []).filter((m) => (m.items || []).length > 0).map((m) => ({ meal_id: m.meal_id, meal_name: mealLabel(m.meal_name, m.meal_id), items: m.items, composite: !!m.composite, pattern: m.pattern || null }));
      for (const i of days) await ud.saveWeeklyTemplate(WEEK_KEYS[i], tpl.day_type || "train", meals, mealsCal(meals));
      showToast({ text: `Đã lưu vào Lịch tuần: ${days.map((i) => WEEK_SHORT[i]).join(", ")}.` });
    } catch (e) { console.error("saveAIMenuToWeek error:", e); fail(); }
  };

  // ---------- photoCtx cho Chụp ảnh (giữ như cũ) ----------
  const photoCtx = (() => {
    try {
      const dt = dayTypeOf(profile, today);
      const ids = visibleMealIds(mealConfig, dt, profile.exerciseType, DEFAULT_MEAL_CONFIG);
      return { target: targetsOf(macro, dt).cal, eatenCal: eatenOfDay(ud.todayLog).cal, goal: macro.goal, proteinTarget: macro.protein, dayType: dt, visibleMealIds: ids, mealTimes: profile.mealTimes || null };
    } catch (e) { return null; }
  })();

  // ---------- lớp Ghi bữa ----------
  const logLayer = layers.find((l) => l.type === "log");
  const editLayer = layers.find((l) => l.type === "edit");
  const [pendingPick, setPendingPick] = useState(null);
  const dateOptions = Array.from({ length: 7 }, (_, i) => addDays(today, -i)).map((d) => ({ value: d, label: friendlyDate(d, today) }));
  const weeklyFor = (d, mealId) => {
    const tpl = ud.getWeeklyTemplate ? ud.getWeeklyTemplate(templateKeyOf(d)) : null;
    const m = tpl && (tpl.meals || []).find((x) => x.meal_id === mealId && (x.items || []).length);
    if (!m) return null;
    return { cal: Math.round(m.items.reduce((s, i) => s + (Number(i.cal) || 0), 0)), onClick: () => putItems(d, mealId, m.items, true, "thực đơn tuần") };
  };
  const updateLog = (patch) => setLayers((ls) => ls.map((l) => (l.type === "log" ? { ...l, ...patch } : l)));

  const renderLog = (l) => {
    if (l.pick) {
      return <LogMealSheet pickMode pickTitle={MEAL_NAMES[l.mealId]} date={l.date} mealId={l.mealId} mealIds={[]} dateOptions={dateOptions}
        recentMeals={[]} frequent={frequent} foodCache={ud.foodCache} onClose={closeLayer}
        onPick={(it) => { setPendingPick({ item: it, n: Date.now() }); closeLayer(); return true; }} />;
    }
    const ids = idsFor(l.date);
    const mealId = ids.includes(l.mealId) ? l.mealId : ids[0];
    const target = mealOf(dayOf(l.date), mealId);
    return <LogMealSheet date={l.date} onDate={(d) => { updateLog({ date: d }); if (d !== today && !dayCache[d]) loadDay(d); }} mealId={mealId} onMeal={(id) => updateLog({ mealId: id })}
      mealIds={ids} dateOptions={dateOptions} recentMeals={recentMeals} frequent={frequent} foodCache={ud.foodCache}
      onClose={closeLayer}
      onPhoto={flags.photo_macro ? () => replaceTop({ type: "photo", mealId: l.mealId }) : null}
      onAI={aiAccess.usable && l.date === today ? () => replaceTop({ type: "ai" }) : null}
      weekly={weeklyFor(l.date, mealId)}
      onAddItem={(it) => putItems(l.date, mealId, [it], false, itemName(it).toLowerCase())}
      onAddMeal={async (rec) => {
        if (target && hasItems(target) && !(await appConfirm(`${mealLabel(target.meal_name, mealId)} đã có món. Thay bằng ${rec.meal_name.toLowerCase()} ${fmtVN(rec.log_date)}?`))) return false;
        return repeatMeal(rec, mealId, l.date);
      }} />;
  };

  const renderEdit = (l) => {
    const dy = dayOf(l.date);
    const m = mealOf(dy, l.mealId);
    if (!dy) return null;
    const wasEaten = (dy.eaten_meals || []).includes(l.mealId);
    const nm = mealLabel(m && m.meal_name, l.mealId);
    const dt = dayTypeOf(profile, l.date);
    return <EditMealScreen key={`${l.date}:${l.mealId}`} date={l.date} today={today} mealId={l.mealId} mealName={nm} items={(m && m.items) || []} eaten={wasEaten} dayType={dt}
      pendingPick={pendingPick}
      onAddPick={() => openLayer({ type: "log", pick: true, date: l.date, mealId: l.mealId })}
      onPhoto={flags.photo_macro ? () => replaceTop({ type: "photo", mealId: l.mealId }) : null}
      onClose={closeLayer}
      onSave={(items, eatenNow) => serial(async () => {
        const res = await ud.saveMealToCloud(l.mealId, dt, items, false, l.date, { markEaten: eatenNow, name: nm });
        if (res && res.ok === false) { fail(); return false; }
        if (!eatenNow && wasEaten) await ud.toggleEaten(l.mealId, false, l.date);
        await refresh(l.date);
        showToast({ text: `Đã lưu ${nm.toLowerCase()}` }, 2500);
        return true;
      })}
      onDelete={() => serial(async () => {
        const res = await ud.removeDayMeal(l.date, l.mealId);
        if (res && res.ok === false) { fail(); return false; }
        await refresh(l.date);
        showToast({ text: `Đã xoá ${nm.toLowerCase()}` }, 2500);
        return true;
      })}
      onMove={(to) => serial(async () => {
        const res = await ud.moveDayMeal(l.date, to, l.mealId, dayTypeOf(profile, to));
        if (res && res.ok === false) { fail(); return false; }
        await refresh(l.date); await refresh(to);
        showToast({ text: `Đã chuyển ${nm.toLowerCase()} sang ${friendlyDate(to).toLowerCase()}` }, 3000);
        return true;
      })} />;
  };

  // ---------- màn phụ của Tôi (dùng lại các màn cũ chưa vẽ lại) ----------
  const panelProps = {
    updateWeight, todayLog: ud.todayLog, removeDayMeal: ud.removeDayMeal, moveDayMeal: ud.moveDayMeal, weightLog, setWeightLog: props.setWeightLog, addWeight, deleteWeight, resetWeights: props.resetWeights,
    profile, setProfile, macro, saveMealToCloud: ud.saveMealToCloud, saveFoodCache: ud.saveFoodCache, deleteFoodCache: ud.deleteFoodCache, getMeals: ud.getMeals, foodCache: ud.foodCache,
    appSettings, isAdmin, saveSetting, user, signOut, weeklyTemplates: ud.weeklyTemplates, saveWeeklyTemplate: ud.saveWeeklyTemplate, getWeeklyTemplate: ud.getWeeklyTemplate,
    deleteWeeklyTemplate: ud.deleteWeeklyTemplate, defaultTemplates: ud.defaultTemplates, saveDefaultTemplate: ud.saveDefaultTemplate, deleteDefaultTemplate: ud.deleteDefaultTemplate,
    applyTemplate: ud.applyTemplate, refreshDefaultTemplates: ud.refreshDefaultTemplates, weeklyBundles: ud.weeklyBundles, saveWeeklyBundle: ud.saveWeeklyBundle,
    deleteWeeklyBundle: ud.deleteWeeklyBundle, refreshWeeklyBundles: ud.refreshWeeklyBundles, getMealHistory: ud.getMealHistory, getDailyLogs: ud.getDailyLogs,
  };
  // ---------- Thực đơn ----------
  // Xoá hết bữa hôm nay: nhật ký hôm nay (daily_logs) + thực đơn mẫu của loại ngày hôm nay (meal_logs)
  const clearToday = async () => {
    const dt = dayTypeOf(profile, today);
    const logIds = ((ud.todayLog && ud.todayLog.log_date === today && ud.todayLog.meals) || []).filter((m) => (m.items || []).length > 0).map((m) => m.meal_id || m.id);
    const bucketIds = (ud.getMeals ? ud.getMeals(dt) : []).filter((m) => (m.items || []).length > 0).map((m) => m.id);
    if (!logIds.length && !bucketIds.length) return;
    if (!(await appConfirm(`Xoá toàn bộ ${logIds.length || bucketIds.length} bữa hôm nay (kể cả bữa đã đánh dấu đã ăn)? Không hoàn tác được.`, { danger: true }))) return;
    try {
      for (const id of logIds) await ud.removeDayMeal(today, id);
      for (const id of bucketIds) await ud.saveMealToCloud(id, dt, [], true);
      await refresh(today);
      showToast({ text: "Đã xoá hết bữa hôm nay." });
    } catch (e) { console.error("clearToday error:", e); fail(); }
  };
  const menuProps = {
    profile, macro, todayLog: ud.todayLog, getWeeklyTemplate: ud.getWeeklyTemplate, weeklyTemplates: ud.weeklyTemplates,
    saveWeeklyTemplate: ud.saveWeeklyTemplate, deleteWeeklyTemplate: ud.deleteWeeklyTemplate, applyTemplate: ud.applyTemplate,
    removeDayMeal: ud.removeDayMeal, defaultTemplates: ud.defaultTemplates, refreshDefaultTemplates: ud.refreshDefaultTemplates,
    weeklyBundles: ud.weeklyBundles, refresh: () => refresh(today), showToast, close: closeLayer,
  };
  const MENU_PAGE_TITLE = { menu_day: "Lịch tuần", menu_tpl: "Mẫu thực đơn", menu_bundle: "Gói tuần" };

  const renderPage = (l) => {
    const sec = l.sec;
    if (MENU_PAGE_TITLE[sec]) return (
      <SubPage title={sec === "menu_day" ? `Lịch tuần · ${({ thu_2: "Thứ Hai", thu_3: "Thứ Ba", thu_4: "Thứ Tư", thu_5: "Thứ Năm", thu_6: "Thứ Sáu", thu_7: "Thứ Bảy", cn: "Chủ nhật" })[l.key] || ""}` : MENU_PAGE_TITLE[sec]} onBack={closeLayer}>
        {sec === "menu_day" && <MenuDayPage dayKey={l.key} {...menuProps} />}
        {sec === "menu_tpl" && <MenuTplPage tplId={l.id} {...menuProps} />}
        {sec === "menu_bundle" && <MenuBundlePage bundleId={l.id} {...menuProps} />}
      </SubPage>
    );
    if (sec === "goals") return (
      <SubPage title="Mục tiêu & macro" onBack={closeLayer} right={<span style={{ fontSize: 12, fontWeight: 700, color: "#00A67E", paddingRight: 8 }}>Tự động lưu</span>}>
        <GoalsScreen profile={profile} setProfile={setProfile} macro={macro} weightLog={weightLog} openSchedule={() => openLayer({ type: "page", sec: "schedule" })} />
      </SubPage>
    );
    if (sec === "notifications") return (
      <SubPage title="Thông báo" onBack={closeLayer}>
        <NotificationsScreen notif={notif} appVersion={appSettings.app_version} openReminders={() => replaceTop({ type: "page", sec: "reminders" })} />
      </SubPage>
    );
    if (sec === "about") return (
      <SubPage title="Giới thiệu" onBack={closeLayer}>
        <AboutScreen appSettings={appSettings} openTerms={() => openLayer({ type: "page", sec: "terms" })} openEdit={isAdmin ? () => openLayer({ type: "page", sec: "about_edit" }) : null} />
      </SubPage>
    );
    if (sec === "feedback") return (
      <SubPage title="Góp ý & báo lỗi" onBack={closeLayer}>
        <FeedbackScreen user={user} showToast={showToast} />
      </SubPage>
    );
    if (sec === "plan") return (
      <SubPage title="Gói cước" onBack={closeLayer}>
        <PlanScreen userId={user?.id} isAdmin={isAdmin} salesEnabled={!!flags.sales_enabled} openPayment={() => openLayer({ type: "page", sec: "account" })} />
      </SubPage>
    );
    if (sec === "reminders") {
      const vis = ["train", "rest"].flatMap((dt) => visibleMealIds(mealConfig, dt, profile.exerciseType, DEFAULT_MEAL_CONFIG));
      return (
        <SubPage title="Nhắc nhở" onBack={closeLayer}>
          <RemindersScreen profile={profile} setProfile={setProfile} pushFeature={flags.push} weightLog={weightLog} curKg={weight.curKg} visibleMeals={[...new Set(vis)]} />
        </SubPage>
      );
    }
    if (sec === "schedule") return (
      <SubPage title="Lịch tập & bữa" onBack={closeLayer}>
        <ScheduleScreen profile={profile} setProfile={setProfile} mealConfig={profile.mealConfig || null} defaultConfig={mealConfig} curKg={weight.curKg} />
      </SubPage>
    );
    const inner = sec === "admin_home"
      ? <AdminPanel {...panelProps} forcedSection="settings" />
      : <AdminPanel {...panelProps} forcedSection="settings" initialSection={sec === "about_edit" ? "about" : sec} hidePills />;
    return (
      <SubPage title={SECTION_TITLE[sec] || "Cài đặt"} onBack={closeLayer}>
        <div style={{ padding: 10 }}>
          {inner}
        </div>
      </SubPage>
    );
  };

  // ---------- Tiến độ ----------
  const [rangeMode, setRangeMode] = useState("week");
  const [rangeAnchor, setRangeAnchor] = useState(today);
  const [progressSeg, setProgressSeg] = useState({ seg: null, n: 0 });

  const banner = macroBanner ? (
    <div style={{ margin: "12px 12px 0 12px", background: "#DCFCE7", border: "1.5px solid #86EFAC", borderRadius: 12, padding: "8px 12px", fontSize: 13, fontWeight: 600, color: "#166534" }}>
      Mục tiêu đã cập nhật: {Math.round(macroBanner.prev)} → {Math.round(macroBanner.now)} kcal ({macroBanner.diff > 0 ? "+" : ""}{Math.round(macroBanner.diff)})
    </div>
  ) : null;

  return (
    <div className="fpm" style={{ fontFamily: FONT, background: "#F8FAFC", color: "#0F172A", minHeight: "100vh" }}>
      <style>{MOBILE_CSS}</style>
      <AppDialogHost />
      <UpdatePopup appSettings={appSettings} />
      {isOffline && <div style={{ position: "sticky", top: 0, zIndex: 95, background: "#FEF3C7", padding: "8px 16px", fontSize: 12, fontWeight: 600, color: "#92400E", textAlign: "center" }}>Không có kết nối mạng — dữ liệu có thể chưa cập nhật</div>}

      <main aria-hidden={top ? true : undefined} style={{ maxWidth: 560, margin: "0 auto", paddingBottom: "calc(74px + env(safe-area-inset-bottom, 0px))" }}>
        {tab === "today" && (
          <TodayScreen date={date} today={today} onDate={(d) => setSelDate(d === today ? null : d)} rows={rows} eaten={eaten} targets={targets} dayType={dayType}
            nowMinutes={now.minutes} name={name} dayLoaded={!!day} weekDots={weekDots} weight={weight} banner={banner} busy={busy}
            waterMl={Number(day?.water_ml) || 0} addWater={(ml) => ud.addWater(ml, date).then((r) => { if (date !== today) refresh(date); return r; })} waterGoalOverride={profile.waterGoalMl}
            onCoach={flags.ai_chat ? () => openLayer({ type: "coach" }) : null}
            bell={<BellButton count={notif.unread} ringing={notif.ringing} onClick={() => openLayer({ type: "page", sec: "notifications" })} />}
            onLog={(id) => openLog(id)} onPhoto={() => openPhoto()} onEdit={(id) => openEdit(id)} onToggleEaten={toggleEaten}
            repeatFor={(id) => recentMeals.find((r) => r.meal_id === id && !(r.log_date === date))} onRepeat={(rec, id) => repeatMeal(rec, id)}
            onAIMenu={aiMenuAction} onWeight={() => { setProgressSeg((s) => ({ seg: "weight", n: s.n + 1 })); setTab("progress"); }} />
        )}
        {tab === "menu" && (
          <div>
            <MenuScreen {...menuProps} aiAccess={aiAccess} userId={user?.id} flags={flags}
              openGenerate={(prefs) => openLayer({ type: "ai", prefs, auto: true })} openSaved={(template) => openLayer({ type: "ai", template })}
              openPage={(sec, extra) => openLayer({ type: "page", sec, ...(extra || {}) })} clearToday={clearToday} />
          </div>
        )}
        {tab === "progress" && (
          <ProgressScreen initialSeg={progressSeg.seg} segNonce={progressSeg.n}
            range={{ mode: rangeMode, setMode: setRangeMode, anchor: rangeAnchor, setAnchor: setRangeAnchor, today }}
            getDailyLogs={ud.getDailyLogs} dataVersion={version} targetOf={(d) => targetsOf(macro, dayTypeOf(profile, d)).cal} lineCal={Math.round(macro.calTarget)} openDay={openDay}
            weightLog={weightLog} weight={weight} profile={profile} setProfile={setProfile} addWeight={addWeight} updateWeight={updateWeight} deleteWeight={deleteWeight} />
        )}
        {tab === "me" && (
          <MeScreen name={name} profile={profile} macro={macro} weight={weight} isAdmin={isAdmin} appVersion={appSettings.app_version} signOut={signOut}
            openDiary={() => { setProgressSeg((s) => ({ seg: "food", n: s.n + 1 })); setTab("progress"); }}
            open={(sec) => openLayer({ type: "page", sec })} />
        )}
      </main>

      <BottomNav hidden={!!top} tab={tab} onTab={(t) => { if (t === "today") setSelDate(null); setTab(t); }} onAdd={() => openLog(null, tab === "today" ? date : today)} />

      {layers.map((l, i) => (
        <div key={i} style={{ display: i === layers.length - 1 || l.type === "page" || l.type === "edit" ? "block" : "none" }}>
          {l.type === "log" && renderLog(l)}
          {l.type === "edit" && renderEdit(l)}
          {l.type === "page" && renderPage(l)}
          {l.type === "coach" && <AICoachPanel profile={profile} macro={macro} weightLog={weightLog} todayData={{ ...eatenOfDay(ud.todayLog), dayType: dayTypeOf(profile, today) }} mob={true} onClose={closeLayer} appSettings={appSettings} isAdmin={isAdmin} getMeals={ud.getMeals} getWeeklyTemplate={ud.getWeeklyTemplate} foodCache={ud.foodCache} userId={user?.id} applyTemplate={ud.applyTemplate} saveWeeklyTemplate={ud.saveWeeklyTemplate} getMealHistory={ud.getMealHistory} getDailyLogs={ud.getDailyLogs}
            onOpenAIMenu={aiAccess.usable ? () => replaceTop(quickAILayer()) : null} />}
          {l.type === "ai" && (
            <AIMenuScreen macro={macro} profile={profile} user={user} appSettings={appSettings} todayType={dayTypeOf(profile, today)} getDailyLogs={ud.getDailyLogs}
              initialPrefs={l.prefs} autoStart={!!l.auto} initialTemplate={l.template || null}
              onApply={applyAIMenu} onSaveWeek={saveAIMenuToWeek} onClose={closeLayer}
              openSaved={() => { closeLayer(); setTab("menu"); }} openSearch={() => replaceTop({ type: "log", date: today, mealId: defaultMealFor(today) })} />
          )}
          {l.type === "photo" && <PhotoScreen initialMeal={l.mealId} appSettings={appSettings} photoCtx={photoCtx} foodCache={ud.foodCache} dateOptions={dateOptions} onClose={closeLayer} onSave={(d, mealId, items) => putItems(d, mealId, items, false, `${items.length} món từ ảnh`)} />}
        </div>
      ))}

      <Toast toast={toast} bottom={has("edit") ? 100 : 90} />
      {!top && <PWAInstallPrompt />}
    </div>
  );
}
