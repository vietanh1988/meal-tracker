// Khung app mobile mới (canvas "Fipilot mobile – bản sửa"):
// thanh dưới Hôm nay · Thực đơn · (+) Ghi bữa · Tiến độ · Tôi, các lớp phủ
// (Ghi bữa, Sửa bữa, Chụp ảnh, Fipilot AI, Thực đơn AI, màn phụ của Tôi).
// Mọi ghi daily_logs đi qua useUserData (saveMealToCloud/toggleEaten/removeDayMeal/moveDayMeal/addWater/applyTemplate).
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MOBILE_CSS, FONT, BottomNav, SubPage, Toast, NAV_SPACE } from "./ui";
import { DK, DK_CSS, LT } from "../theme";
import { readUser } from "../lib/userStore";
import { TodayScreen } from "./TodayScreen";
import { HEADER_CSS, hdrDelay, HDR_TOP } from "./TodayHeader";
import { LogMealSheet } from "./LogMealSheet";
import { EditMealScreen } from "./EditMealScreen";
import { ProgressScreen } from "./ProgressScreen";
import { MeScreen } from "./MeScreen";
import { AdminHomeScreen, AdminFeedbackScreen, ADMIN_TITLES } from "./AdminHomeScreen";
import { ScheduleScreen } from "./ScheduleScreen";
import { GoalsScreen } from "./GoalsScreen";
import { RemindersScreen } from "./RemindersScreen";
import { PlanScreen, PayScreen } from "./PlanScreen";
import { AccountScreen } from "./AccountScreen";
import { FeedbackScreen } from "./FeedbackScreen";
import { AboutScreen, TermsScreen } from "./AboutScreen";
import { MenuScreen, MenuDayPage, MenuTplPage, MenuPastPage } from "./MenuScreen";
import { AIMenuScreen } from "./AIMenuScreen";
import { MealSuggestSheet } from "./MealSuggestSheet";
import { mealSuggestions, mealTargetOf } from "../lib/mealSuggest";
import { avoidMatcher } from "../lib/allergy";
import { WEEK_KEYS, WEEK_SHORT, mealsCal, libraryFor } from "../lib/menuView";
import { UpdatePopup } from "./UpdatePopup";
import { AdminPanel } from "../AdminPanel";
import { AICoachPanel } from "../AICoachPanel";
import { PhotoScreen } from "./PhotoScreen";
import { CalcCheckScreen } from "./CalcCheckScreen";
import { usePendingFoodCache } from "../hooks/usePendingFoodCache";
import PWAInstallPrompt from "../PWAInstallPrompt";
import { useNotifications } from "../hooks/useNotifications";
import { NotificationsScreen, BellButton } from "./NotificationsScreen";
import { AppDialogHost, appConfirm } from "../lib/dialog";
import { parseFeatureFlags } from "../adminTabs/FeatureFlagsTab";
import { getAIMenuAccess, loadAIMenus, buildExclusionKeys } from "../lib/aiMenuService";
import { DEFAULT_MEAL_CONFIG } from "../mealConstants";
import { MEAL_NAMES, MEAL_ORDER, mealKey, hasItems, mealLabel } from "../lib/mealMath";
import { recentEatenMeals, frequentItems, currentMealId } from "../lib/dayPlan";
import { todayVN, addDays, nowVNParts, friendlyDate, fmtVN, templateKeyOf, weekRange } from "../lib/dateVN";
import { dayTypeOf, targetsOf, visibleMealIds, timelineIds, mealRows, eatenOfDay, weightSummary, itemName, weekCard, weekDates } from "../lib/mobileView";

const TAB_KEY = "fp_mtab";
const SECTION_TITLE = { profile: "Mục tiêu & hồ sơ", account: "Tài khoản & gói cước", feedback_inline: "Góp ý & báo lỗi", about: "Giới thiệu", about_edit: "Sửa giới thiệu", terms: "Điều khoản", admin_home: "Quản trị" };

export function MobileApp(props) {
  const { user, profile, setProfile, macro, appSettings, isAdmin, saveSetting, signOut, isOffline, macroBanner,
    weightLog, addWeight, updateWeight, deleteWeight, ud } = props;
  const flags = parseFeatureFlags(appSettings);
  const aiAccess = getAIMenuAccess(profile, appSettings);
  const notif = useNotifications(appSettings, user?.id);
  // Món lạ AI đã tính (chờ admin duyệt) — chính user dùng lại được ngay, không tốn lượt
  const { myPending, savePendingFoodCache } = usePendingFoodCache(user?.id, false);
  const calcFoodCache = useMemo(() => ({ ...(myPending || {}), ...(ud.foodCache || {}) }), [myPending, ud.foodCache]);
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

  // Hôm nay: chỉ dùng todayLog khi đúng ngày (qua 0h mà app vẫn mở thì todayLog còn là hôm qua cho tới khi tải lại)
  const emptyDay = (d) => ({ log_date: d, meals: [], eaten_meals: [], water_ml: 0 });
  const dayOf = (d) => (d === today ? (ud.todayLog && ud.todayLog.log_date === today ? ud.todayLog : emptyDay(today)) : dayCache[d]);
  useEffect(() => { if (ud.todayLog && ud.todayLog.log_date !== today && ud.reloadToday) ud.reloadToday(); }, [today]); // eslint-disable-line react-hooks/exhaustive-deps
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
  const historyMeals = useMemo(() => recentEatenMeals(recentRows, 80), [recentRows]);
  // Gợi ý món cho 1 bữa (thẻ bữa đến giờ): nguồn = bữa đã ăn + thực đơn mẫu hợp mục tiêu + thực đơn AI đã tạo;
  // đồng bộ hồ sơ: calo bữa theo mục tiêu ngày + loại ngày, bỏ món "không ăn" ở tab Thực đơn.
  const [aiMenusS, setAiMenusS] = useState([]);
  useEffect(() => {
    let alive = true;
    if (user?.id) loadAIMenus(user.id, 5).then((r) => alive && setAiMenusS(r || []));
    return () => { alive = false; };
  }, [user?.id, version]);
  useEffect(() => { if (flags.template_library && !(ud.defaultTemplates || []).length && ud.refreshDefaultTemplates) ud.refreshDefaultTemplates(); }, [flags.template_library]); // eslint-disable-line react-hooks/exhaustive-deps
  const suggestFor = (mealId, d = date) => {
    const dt = dayTypeOf(profile, d);
    const avoidText = (readUser("fp_menu_prefs", user?.id, {}) || {}).avoid || "";
    const cur = (mealOf(dayOf(d), mealId) || {}).items || [];
    const list = mealSuggestions({
      mealId, mealIds: idsFor(d), macro, dayType: dt,
      history: historyMeals.filter((h) => h.log_date !== d),
      templates: flags.template_library ? libraryFor(ud.defaultTemplates, { goal: macro?.goal, dietStrategy: macro?.dietStrategy, dayType: dt }) : [],
      aiMenus: aiMenusS, avoidKeys: buildExclusionKeys(avoidText), isAvoided: avoidMatcher(avoidText), currentItems: cur, limit: 5,
    });
    return { list, avoidText, dayType: dt, target: mealTargetOf(macro, dt, idsFor(d), mealId)?.cal || 0 };
  };
  const frequent = useMemo(() => frequentItems(recentRows, 15), [recentRows]);
  const weekDots = useMemo(() => {
    const m = {};
    (weekRows || []).forEach((r) => { if ((r.eaten_meals || []).length) m[String(r.log_date).slice(0, 10)] = true; });
    if (ud.todayLog?.log_date === today && (ud.todayLog.eaten_meals || []).length) m[today] = true;
    return m;
  }, [weekRows, ud.todayLog, today]);

  // Thẻ "Tuần này" ở Hôm nay (tuần của ngày đang xem)
  const week = useMemo(() => weekCard(weekRows, ud.todayLog, weekDates(date), today, (d) => targetsOf(macro, dayTypeOf(profile, d)).cal),
    [weekRows, ud.todayLog, date, today, macro, profile]);

  // ---------- thông báo nhỏ ----------
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const showToast = (t, ms = 4500) => { clearTimeout(toastTimer.current); setToast(t); toastTimer.current = setTimeout(() => setToast(null), ms); };
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const [busy, setBusy] = useState(false);
  const [planNonce, setPlanNonce] = useState(0);

  // ---------- thao tác ghi (tuần tự) ----------
  const queue = useRef(Promise.resolve());
  const serial = (fn) => { const p = queue.current.then(fn, fn); queue.current = p.catch(() => {}); return p; };
  const freshDay = async (d) => (d === todayVN() ? dayOf(d) : (await ud.getDailyLog(d)) || { meals: [], eaten_meals: [] });
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
    prefs = readUser("fp_menu_prefs", user?.id, {}) || {};
    return { type: "ai", auto: true, prefs: { style: prefs.style, avoid: prefs.avoid, dayType: dayTypeOf(profile, today) } };
  };
  const aiMenuAction = aiAccess.usable ? () => openLayer(quickAILayer()) : aiAccess.enabled ? () => setTab("menu") : null;
  const openDay = (d) => { setSelDate(d === today ? null : d); setTab("today"); };

  // ---------- Thực đơn AI ----------
  const applyAIMenu = async (tpl) => {
    try {
      const tplDayType = tpl.day_type || dayTypeOf(profile, today);
      // Không còn tự lưu ngầm vào Lịch tuần (chốt 13/10) — muốn lặp lại thì bấm "Lặp lại hằng tuần"
      const res = await ud.applyTemplate({ ...tpl, day_type: tplDayType });
      await refresh(today);
      if (res && res.ok === false) fail();
      else showToast({ text: "Đã áp thực đơn AI cho hôm nay." });
    } catch (e) { console.error("Apply AI menu error:", e); fail(); }
    closeLayer();
  };

  // Lặp lại hằng tuần: lưu thực đơn AI vào weekly_templates các thứ đã chọn (chỉ số 0 = T2)
  const saveAIMenuToWeek = async (tpl, days) => {
    try {
      const meals = (tpl.meals || []).filter((m) => (m.items || []).length > 0).map((m) => ({ meal_id: m.meal_id, meal_name: mealLabel(m.meal_name, m.meal_id), items: m.items, composite: !!m.composite, pattern: m.pattern || null }));
      let ok = true;
      for (const i of days) ok = (await ud.saveWeeklyTemplate(WEEK_KEYS[i], tpl.day_type || "train", meals, mealsCal(meals))) && ok;
      if (!ok) { fail(); return; }
      showToast({ text: `Sẽ lặp lại mỗi ${days.map((i) => WEEK_SHORT[i]).join(", ")}.` });
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
      onCalc={(text, auto) => replaceTop({ type: "calc", text: text || "", auto: !!auto, date: l.date, mealId })}
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
      mealOptions={MEAL_ORDER.filter((id) => !((profile.exerciseType || "gym") === "none" && (id === "pre" || id === "post"))).map((id) => ({ id, name: MEAL_NAMES[id] }))}
      onMove={(to, toMeal = l.mealId) => serial(async () => {
        // Bữa đích đã có món → hỏi trước, đồng ý thì GỘP (không ghi đè như trước 14/10)
        const dst = mealOf(await freshDay(to), toMeal);
        const n = (dst?.items || []).length;
        const toName = MEAL_NAMES[toMeal] || toMeal;
        const where = `${toName.toLowerCase()}${to === l.date ? "" : " " + friendlyDate(to).toLowerCase()}`;
        if (n > 0 && !(await appConfirm(`${toName} ${to === l.date ? "" : friendlyDate(to).toLowerCase() + " "}đã có ${n} món. Gộp thêm các món của ${nm.toLowerCase()} vào?`))) return false;
        const res = await ud.moveDayMeal(l.date, to, l.mealId, dayTypeOf(profile, to), toMeal);
        if (res && res.ok === false) { fail(); return false; }
        await refresh(l.date); if (to !== l.date) await refresh(to);
        showToast({ text: `Đã chuyển ${nm.toLowerCase()} sang ${where}` }, 3000);
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
    refresh: () => refresh(today), showToast, close: closeLayer,
  };
  const MENU_PAGE_TITLE = { menu_day: "Lặp lại hằng tuần", menu_tpl: "Thực đơn mẫu", menu_past: "Ngày đã ăn" };

  const renderPage = (l) => {
    const sec = l.sec;
    if (MENU_PAGE_TITLE[sec]) return (
      <SubPage title={sec === "menu_day" ? `Lặp lại · ${({ thu_2: "Thứ Hai", thu_3: "Thứ Ba", thu_4: "Thứ Tư", thu_5: "Thứ Năm", thu_6: "Thứ Sáu", thu_7: "Thứ Bảy", cn: "Chủ nhật" })[l.key] || ""}` : MENU_PAGE_TITLE[sec]} onBack={closeLayer}>
        {sec === "menu_day" && <MenuDayPage dayKey={l.key} {...menuProps} />}
        {sec === "menu_tpl" && <MenuTplPage tplId={l.id} {...menuProps} />}
        {sec === "menu_past" && <MenuPastPage day={l.day} {...menuProps} />}
      </SubPage>
    );
    if (sec === "goals") return (
      <SubPage title="Mục tiêu & macro" onBack={closeLayer} dark right={<span style={{ fontSize: 12, fontWeight: 700, color: DK.green, paddingRight: 8 }}>Tự động lưu</span>}>
        <GoalsScreen profile={profile} setProfile={setProfile} macro={macro} weightLog={weightLog} openSchedule={() => openLayer({ type: "page", sec: "schedule" })} />
      </SubPage>
    );
    if (sec === "notifications") return (
      <SubPage title="Thông báo" onBack={closeLayer} dark>
        <NotificationsScreen notif={notif} appVersion={appSettings.app_version} openReminders={() => replaceTop({ type: "page", sec: "reminders" })} />
      </SubPage>
    );
    if (sec === "about") return (
      <SubPage title="Giới thiệu" onBack={closeLayer} dark>
        <AboutScreen appSettings={appSettings} openTerms={(id) => openLayer({ type: "page", sec: "terms", id })} openEdit={isAdmin ? () => openLayer({ type: "page", sec: "about_edit" }) : null} />
      </SubPage>
    );
    if (sec === "terms") return (
      <SubPage title="Điều khoản & chính sách" onBack={closeLayer} dark>
        <TermsScreen appSettings={appSettings} initialId={l.id} />
      </SubPage>
    );
    if (sec === "feedback") return (
      <SubPage title="Góp ý & báo lỗi" onBack={closeLayer} dark>
        <FeedbackScreen user={user} showToast={showToast} />
      </SubPage>
    );
    if (sec === "plan") return (
      <SubPage title={isAdmin || flags.sales_enabled ? "Gói cước" : "Lượt AI"} onBack={closeLayer} dark>
        <PlanScreen key={planNonce} userId={user?.id} isAdmin={isAdmin} salesEnabled={!!flags.sales_enabled} aiMenuLockedFree openPay={(pkg) => openLayer({ type: "page", sec: "pay", pkg })} />
      </SubPage>
    );
    if (sec === "account") return (
      <SubPage title="Tài khoản" onBack={closeLayer} dark>
        <AccountScreen user={user} profile={profile} isAdmin={isAdmin} appVersion={appSettings.app_version} salesEnabled={!!flags.sales_enabled} pushFeature={flags.push} signOut={signOut} showToast={showToast}
          openPlan={() => openLayer({ type: "page", sec: "plan" })} />
      </SubPage>
    );
    if (sec === "pay") return (
      <SubPage title="Chuyển khoản" subtitle="Premium" onBack={closeLayer} dark>
        <PayScreen userId={user?.id} pkgId={l.pkg} onDone={() => { setPlanNonce((n) => n + 1); closeLayer(); showToast({ text: "Đã gửi. Premium bật khi admin xác nhận chuyển khoản." }); }} />
      </SubPage>
    );
    if (sec === "reminders") {
      const vis = ["train", "rest"].flatMap((dt) => visibleMealIds(mealConfig, dt, profile.exerciseType, DEFAULT_MEAL_CONFIG));
      return (
        <SubPage title="Nhắc nhở" onBack={closeLayer} dark>
          <RemindersScreen profile={profile} setProfile={setProfile} pushFeature={flags.push} weightLog={weightLog} curKg={weight.curKg} visibleMeals={[...new Set(vis)]} />
        </SubPage>
      );
    }
    if (sec === "schedule") return (
      <SubPage title="Lịch tập & bữa" onBack={closeLayer} dark>
        <ScheduleScreen profile={profile} setProfile={setProfile} mealConfig={profile.mealConfig || null} defaultConfig={mealConfig} curKg={weight.curKg} />
      </SubPage>
    );
    // Quản trị (bản vẽ 52) + Góp ý admin (53): nền tối; các màn con admin còn lại vẫn là AdminPanel cũ (nền sáng)
    if (sec === "admin_home") return (
      <SubPage title="Quản trị" onBack={closeLayer} dark>
        <AdminHomeScreen isSuperAdmin={profile.adminRole === "super"} appVersion={appSettings.app_version} open={(id) => openLayer({ type: "page", sec: id })} />
      </SubPage>
    );
    if (sec === "admin_feedback") return (
      <SubPage title="Góp ý & báo lỗi" subtitle="Quản lý phản hồi · admin" onBack={closeLayer} dark>
        <AdminFeedbackScreen showToast={showToast} />
      </SubPage>
    );
    const inner = <AdminPanel {...panelProps} forcedSection="settings" initialSection={sec === "about_edit" ? "about" : sec} hidePills />;
    return (
      <SubPage title={ADMIN_TITLES[sec] || SECTION_TITLE[sec] || "Cài đặt"} onBack={closeLayer}>
        <div style={{ padding: 10 }}>
          {inner}
        </div>
      </SubPage>
    );
  };

  // Lưu hồ sơ lỗi (mất mạng, hết phiên…) → báo ngay kèm nút Thử lại (trước đây lỗi bị nuốt, mở lại app thấy số cũ)
  useEffect(() => {
    const onErr = (e) => showToast({ text: "Chưa lưu được thay đổi — kiểm tra mạng rồi thử lại.", action: { label: "Thử lại", onClick: () => e.detail?.retry?.() } }, 8000);
    window.addEventListener("fp:profile-save-error", onErr);
    return () => window.removeEventListener("fp:profile-save-error", onErr);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Màu thanh trạng thái / thanh trình duyệt theo tab (iOS, Android)
  useEffect(() => {
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", tab === "today" ? HDR_TOP.blue : tab === "me" ? HDR_TOP.dark : LT.top);
  }, [tab]);

  // Nền trang theo tab để iPhone kéo quá đầu/cuối không lộ vệt khác màu.
  // 16/10: app ghim màn hình iPhone bị lộ dải nền nhạt phía trên header khi kéo/bật lại app →
  // khoá kéo nảy (overscroll) của trang + tab Hôm nay tô nửa trên nền trang bằng màu header.
  useEffect(() => {
    const b = document.body, h = document.documentElement;
    const prev = { bg: b.style.background, ob: b.style.overscrollBehaviorY, oh: h.style.overscrollBehaviorY, hb: h.style.background };
    const bg = tab === "me" ? DK.base : tab === "today" ? `linear-gradient(180deg, ${HDR_TOP.blue} 0 50%, ${LT.base} 50% 100%)` : LT.base;
    b.style.background = bg; h.style.background = tab === "today" ? HDR_TOP.blue : tab === "me" ? DK.base : LT.base;
    b.style.overscrollBehaviorY = "none"; h.style.overscrollBehaviorY = "none";
    return () => { b.style.background = prev.bg; b.style.overscrollBehaviorY = prev.ob; h.style.overscrollBehaviorY = prev.oh; h.style.background = prev.hb; };
  }, [tab]);

  // ---------- Tiến độ ----------
  const [rangeMode, setRangeMode] = useState("week");
  const [rangeAnchor, setRangeAnchor] = useState(today);
  const [progressSeg, setProgressSeg] = useState({ seg: null, n: 0 });

  const banner = macroBanner ? (
    <div style={{ margin: "12px 12px 0 12px", background: "#DCFCE7", border: "1.5px solid #86EFAC", borderRadius: 12, padding: "8px 12px", fontSize: 13, fontWeight: 600, color: "#166534" }}>
      Mục tiêu đã cập nhật: {Math.round(macroBanner.prev)} → {Math.round(macroBanner.now)} kcal ({macroBanner.diff > 0 ? "+" : ""}{Math.round(macroBanner.diff)})
    </div>
  ) : null;

  // Dải che thanh giờ ở tab Hôm nay: khi header xanh đã cuộn khỏi màn thì đổi sang màu nền nhạt (16/10 — trước đó
  // dải xanh đặc còn nằm trên nội dung nhạt khi cuộn, nhìn như 1 khối xanh lơ lửng).
  const [hdrGone, setHdrGone] = useState(false);
  useEffect(() => {
    if (tab !== "today") { setHdrGone(false); return undefined; }
    let raf = 0;
    const check = () => { raf = 0; const h = document.querySelector('[data-testid="today-header"]'); setHdrGone(!!h && h.getBoundingClientRect().bottom < 4); };
    const on = () => { if (!raf) raf = requestAnimationFrame(check); };
    check();
    window.addEventListener("scroll", on, { passive: true });
    return () => { window.removeEventListener("scroll", on); if (raf) cancelAnimationFrame(raf); };
  }, [tab]);
  const coverToday = tab === "today" && !hdrGone;

  return (
    <div className="fpm" style={{ fontFamily: FONT, background: tab === "me" ? DK.base : LT.base, color: "#0F172A", minHeight: "100vh" }}>
      <style>{MOBILE_CSS + DK_CSS}</style>
      {/* Dải che vùng thanh giờ iPhone (14/10): iOS phủ lớp kính mờ khi nội dung cuộn dưới thanh giờ → chữ nhoè, vệt sáng.
          Dải cố định cùng màu đầu trang che nội dung lại, iOS chỉ còn làm mờ 1 màu đặc. Màn phụ (z 120+) tự có header riêng. */}
      <style>{HEADER_CSS}</style>
      <div aria-hidden="true" data-testid="ios-top-cover" data-tone={coverToday ? "header" : tab === "me" ? "dark" : "light"} style={{ position: "fixed", left: 0, right: 0, top: 0, height: "env(safe-area-inset-top, 0px)", zIndex: 94, pointerEvents: "none", transition: "background-color .2s ease", background: coverToday ? HDR_TOP.blue : tab === "me" ? HDR_TOP.dark : LT.top }}>
        {coverToday && <span className="fp-hdr-dark" style={{ position: "absolute", inset: 0, background: HDR_TOP.dark, animationDelay: hdrDelay() }} />}
      </div>
      {/* Tab Tôi: nền Blue Dark phủ cả màn (bản vẽ 48) */}
      {/* Tab sáng: nền xanh rất nhạt nối tiếp header (bản vẽ 69) */}
      <div aria-hidden="true" data-testid="page-bg" style={{ position: "fixed", inset: 0, zIndex: 0, background: tab === "me" ? DK.bg : LT.bg }} />
      <AppDialogHost />
      <UpdatePopup appSettings={appSettings} />
      {isOffline && <div role="status" data-testid="offline-bar" style={{ position: "sticky", top: 0, zIndex: 95, background: "#FEF3C7", padding: "calc(env(safe-area-inset-top, 0px) + 8px) 16px 8px 16px", fontSize: 13, fontWeight: 600, color: "#92400E", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0" /><path d="M3 3l18 18" /></svg>
        Mất kết nối — dữ liệu có thể chưa cập nhật</div>}

      <main aria-hidden={top ? true : undefined} className={tab === "me" ? "fpd" : undefined} style={{ position: "relative", zIndex: 1, maxWidth: 560, margin: "0 auto", paddingBottom: NAV_SPACE, color: tab === "me" ? DK.t1 : undefined }}>
        {tab === "today" && (
          <TodayScreen date={date} today={today} onDate={(d) => setSelDate(d === today ? null : d)} rows={rows} eaten={eaten} targets={targets} dayType={dayType}
            nowMinutes={now.minutes} name={name} dayLoaded={!!day} weekDots={weekDots} weight={weight} banner={banner} busy={busy}
            waterMl={Number(day?.water_ml) || 0} addWater={(ml) => ud.addWater(ml, date).then((r) => { if (date !== today) refresh(date); return r; })} waterGoalOverride={profile.waterGoalMl}
            onAskAI={flags.ai_chat ? (r) => openLayer({ type: "coach", input: `${r.name} hôm nay nên ăn gì cho đủ macro?` }) : null}
            planLine={(profile.exerciseType || "gym") === "none" ? "Không tập" : `Lịch ${(profile.gymDays || []).length} buổi/tuần`}
            week={week} onDiary={() => { setProgressSeg((s) => ({ seg: "food", n: s.n + 1 })); setTab("progress"); }}
            bell={<BellButton count={notif.unread} ringing={notif.ringing} onClick={() => openLayer({ type: "page", sec: "notifications" })} />}
            onLog={(id) => openLog(id)} onPhoto={(id) => openPhoto(id)} onEdit={(id) => openEdit(id)} onToggleEaten={toggleEaten}
            suggestCount={(id) => suggestFor(id).list.length} onSuggest={(id) => openLayer({ type: "suggest", date, mealId: id })}
            onAIMenu={aiMenuAction} onWeight={() => { setProgressSeg((s) => ({ seg: "weight", n: s.n + 1 })); setTab("progress"); }} />
        )}
        {tab === "menu" && (
          <div>
            <MenuScreen {...menuProps} active={!top} aiAccess={aiAccess} userId={user?.id} flags={flags} recentDays={recentRows} openToday={() => { setSelDate(null); setTab("today"); }}
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
          <MeScreen bell={<BellButton count={notif.unread} ringing={notif.ringing} onClick={() => openLayer({ type: "page", sec: "notifications" })} />} name={name} profile={profile} macro={macro} weight={weight} isAdmin={isAdmin} appVersion={appSettings.app_version} signOut={signOut}
            openCoach={flags.ai_chat ? () => openLayer({ type: "coach" }) : null} salesEnabled={!!flags.sales_enabled}
            openDiary={() => { setProgressSeg((s) => ({ seg: "food", n: s.n + 1 })); setTab("progress"); }}
            open={(sec) => openLayer({ type: "page", sec })} />
        )}
      </main>

      <BottomNav dark={tab === "me"} hidden={!!top} tab={tab} onTab={(t) => { if (t === "today") setSelDate(null); setTab(t); }} onAdd={() => openLog(null, tab === "today" ? date : today)} />

      {layers.map((l, i) => (
        <div key={i} style={{ display: i === layers.length - 1 || l.type === "page" || l.type === "edit" ? "block" : "none" }}>
          {l.type === "log" && renderLog(l)}
          {l.type === "edit" && renderEdit(l)}
          {l.type === "page" && renderPage(l)}
          {l.type === "suggest" && (() => {
            const sg = suggestFor(l.mealId, l.date);
            const nm = MEAL_NAMES[l.mealId] || "Bữa";
            return <MealSuggestSheet mealId={l.mealId} mealName={nm} list={sg.list} target={sg.target} goal={macro?.goal} dayType={sg.dayType} avoidText={sg.avoidText}
              onClose={closeLayer} onSearch={() => replaceTop({ type: "log", date: l.date, mealId: l.mealId })}
              onPick={async (opt) => {
                const m = mealOf(dayOf(l.date), l.mealId);
                if (m && hasItems(m) && !(await appConfirm(`${nm} đã có món. Thay bằng món gợi ý?`))) return;
                const label = opt.kind === "history" ? `${nm.toLowerCase()} ${fmtVN(opt.date)}` : `gợi ý ${opt.title.toLowerCase()}`;
                closeLayer();
                await putItems(l.date, l.mealId, opt.items, true, label);
              }} />;
          })()}
          {l.type === "coach" && <AICoachPanel profile={profile} macro={macro} weightLog={weightLog} todayData={{ ...eatenOfDay(ud.todayLog), dayType: dayTypeOf(profile, today) }} mob={true} onClose={closeLayer} appSettings={appSettings} isAdmin={isAdmin} getMeals={ud.getMeals} getWeeklyTemplate={ud.getWeeklyTemplate} foodCache={ud.foodCache} userId={user?.id} applyTemplate={ud.applyTemplate} saveWeeklyTemplate={ud.saveWeeklyTemplate} getMealHistory={ud.getMealHistory} getDailyLogs={ud.getDailyLogs}
            onOpenAIMenu={aiAccess.usable ? () => replaceTop(quickAILayer()) : null} initialInput={l.input || ""} />}
          {l.type === "ai" && (
            <AIMenuScreen macro={macro} profile={profile} user={user} appSettings={appSettings} todayType={dayTypeOf(profile, today)} getDailyLogs={ud.getDailyLogs}
              initialPrefs={l.prefs} autoStart={!!l.auto} initialTemplate={l.template || null}
              onApply={applyAIMenu} onSaveWeek={saveAIMenuToWeek} onClose={closeLayer}
              openSaved={() => { closeLayer(); setTab("menu"); }} openSearch={() => replaceTop({ type: "log", date: today, mealId: defaultMealFor(today) })} />
          )}
          {l.type === "calc" && (
            <CalcCheckScreen initialText={l.text} autoRun={l.auto} foodCache={calcFoodCache} frequent={frequent} aiEnabled={!!flags.ai_macro} userId={user?.id} appSettings={appSettings}
              dayInfo={{ target: targetsOf(macro, dayTypeOf(profile, l.date)).cal, eaten: eatenOfDay(dayOf(l.date)).cal }}
              mealIds={idsFor(l.date).length ? idsFor(l.date) : ["sang", "trua", "toi"]} initialMeal={l.mealId} date={l.date} dateOptions={dateOptions.some((o) => o.value === l.date) ? dateOptions : [{ value: l.date, label: fmtVN(l.date) }, ...dateOptions]}
              savePending={savePendingFoodCache} onClose={closeLayer}
              onSave={(d, mealId, items) => putItems(d, mealId, items, false, items.length === 1 ? itemName(items[0]).toLowerCase() : `${items.length} món`)} />
          )}
          {l.type === "photo" && <PhotoScreen initialMeal={l.mealId} appSettings={appSettings} photoCtx={photoCtx} foodCache={ud.foodCache} dateOptions={dateOptions} onClose={closeLayer} onSave={(d, mealId, items) => putItems(d, mealId, items, false, `${items.length} món từ ảnh`)} />}
        </div>
      ))}

      <Toast toast={toast} bottom={has("edit") ? 100 : 90} />
      {!top && <PWAInstallPrompt />}
    </div>
  );
}
