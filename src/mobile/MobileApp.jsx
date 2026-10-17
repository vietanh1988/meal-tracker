// Khung app mobile mới (canvas "Fipilot mobile – bản sửa"):
// thanh dưới Hôm nay · Thực đơn · (+) Ghi bữa · Tiến độ · Tôi, các lớp phủ
// (Ghi bữa, Sửa bữa, Chụp ảnh, Fipilot AI, Thực đơn AI, màn phụ của Tôi).
// Mọi ghi daily_logs đi qua useUserData (saveMealToCloud/toggleEaten/removeDayMeal/moveDayMeal/addWater/applyTemplate).
import { useMyFoods } from "../hooks/useMyFoods";
import { useBodyMeasure } from "../hooks/useBodyMeasure";
import { MeasureSheet } from "./MeasureSheet";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MOBILE_CSS, FONT, BottomNav, SubPage, Toast, NAV_SPACE } from "./ui";
import { DK, DK_CSS, LT } from "../theme";
import { readUser, writeUser } from "../lib/userStore";
import { TodayScreen } from "./TodayScreen";
import { HEADER_CSS, HDR_TOP } from "./TodayHeader";
import { LogMealSheet } from "./LogMealSheet";
import { EditMealScreen } from "./EditMealScreen";
import { ProgressScreen } from "./ProgressScreen";
import { MeScreen } from "./MeScreen";
import { AdminHomeScreen, AdminFeedbackScreen, ADMIN_TITLES } from "./AdminHomeScreen";
import { OrdersScreen } from "./admin/OrdersScreen";
import { ReportScreen } from "./admin/ReportScreen";
import { PendingFoodsScreen } from "./admin/PendingFoodsScreen";
import { FoodDBScreen } from "./admin/FoodDBScreen";
import { TemplatesScreen } from "./admin/TemplatesScreen";
import { VersionScreen } from "./admin/VersionScreen";
import { FlagsScreen } from "./admin/FlagsScreen";
import { AiScreen } from "./admin/AiScreen";
import { AiCostScreen } from "./admin/AiCostScreen";
import { BackupScreen } from "./admin/BackupScreen";
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
import { mealSuggestions, remainingMealTarget, scaleSuggestion } from "../lib/mealSuggest";
import { avoidMatcher } from "../lib/allergy";
import { WEEK_KEYS, WEEK_SHORT, mealsCal, libraryFor } from "../lib/menuView";
import { UpdatePopup } from "./UpdatePopup";
import { scrollPcFrameTop } from "../pc/PcPhoneFrame";
import { AdminPanel } from "../AdminPanel";
import { AICoachPanel } from "../AICoachPanel";
import { PhotoScreen } from "./PhotoScreen";
import { CalcCheckScreen } from "./CalcCheckScreen";
import { WeightSheet } from "./WeightSheet";
import { PlusMenu } from "./PlusMenu";
import { calcMacro } from "../calcMacro";
import { weeklyCheck, nextOffset } from "../lib/weeklyCheck";
import { WeeklyCheckCard, WalkTipCard } from "./WeeklyCheckCard";
import { ActivityRow, ActivitySheet, SnackCard } from "./ActivitySheet";
import { useActivityLog } from "../hooks/useActivityLog";
import { dayBurn, activityBonus, withBonus, bonusTip, actOf } from "../lib/activity";
import { usePendingFoodCache } from "../hooks/usePendingFoodCache";
import PWAInstallPrompt from "../PWAInstallPrompt";
import { useNotifications } from "../hooks/useNotifications";
import { NotificationsScreen, BellButton } from "./NotificationsScreen";
import { AppDialogHost, appConfirm } from "../lib/dialog";
import { parseFeatureFlags } from "../adminTabs/FeatureFlagsTab";
import { getAIMenuAccess, loadAIMenus, buildExclusionKeys } from "../lib/aiMenuService";
import { DEFAULT_MEAL_CONFIG } from "../mealConstants";
import { MEAL_NAMES, MEAL_ORDER, mealKey, hasItems, mealLabel, menuReplaces, menuWrites } from "../lib/mealMath";
import { recentEatenMeals, frequentItems, currentMealId } from "../lib/dayPlan";
import { todayVN, addDays, nowVNParts, friendlyDate, fmtVN, templateKeyOf, weekRange } from "../lib/dateVN";
import { dayTypeOf, targetsOf, visibleMealIds, timelineIds, mealRows, eatenOfDay, weightSummary, itemName, weekCard, weekDates, MEAL_SHORT, fmtKg, fmtDec, fmtInt } from "../lib/mobileView";

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
  // Món tự nhập calo (16/10): lưu trên máy theo tài khoản, chỉ người đó thấy — không vào kho chung / hàng chờ duyệt
  // Món tự nhập: lưu theo tài khoản trên máy chủ (bảng user_foods) + bản đệm trên máy — đổi máy không mất
  const { myFoods, saveMyFoods } = useMyFoods(user?.id);
  // Mời cài app chỉ sau khi khách đã ghi ít nhất 1 bữa (17/10) — nhớ theo máy để lần sau không phải chờ
  const loggedToday = (ud.todayLog?.meals || []).some((m) => (m.items || []).length > 0);
  const [hasLogged, setHasLogged] = useState(() => { try { return localStorage.getItem("fp_has_logged") === "1"; } catch (e) { return false; } });
  useEffect(() => { if (loggedToday && !hasLogged) { setHasLogged(true); try { localStorage.setItem("fp_has_logged", "1"); } catch (e) { /* */ } } }, [loggedToday, hasLogged]);
  // Số đo cơ thể (bảng body_measurements, 17/10)
  const { measures, saveMeasure, deleteMeasure } = useBodyMeasure(user?.id);
  // Vận động thêm trong ngày (bản vẽ 130, 17/10): cộng vào mục tiêu của đúng ngày đó theo mục tiêu (lib/activity.js)
  const { activityByDate, saveActivity } = useActivityLog(user?.id);
  const bonusOf = (d) => activityBonus(dayBurn(activityByDate[d]), macro.goal);
  const macroFor = (d) => withBonus(macro, bonusOf(d));
  const calcFoodCache = useMemo(() => ({ ...(myFoods || {}), ...(myPending || {}), ...(ud.foodCache || {}) }), [myFoods, myPending, ud.foodCache]);
  const name = user?.user_metadata?.username || user?.email?.split("@")[0] || "bạn";

  // ---------- điều hướng ----------
  const [tab, setTabState] = useState(() => { try { const t = localStorage.getItem(TAB_KEY); return ["today", "menu", "progress", "me"].includes(t) ? t : "today"; } catch (e) { return "today"; } });
  const setTab = (t) => { setTabState(t); try { localStorage.setItem(TAB_KEY, t); } catch (e) { /* */ } window.scrollTo(0, 0); scrollPcFrameTop(); };
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
  const [recentReady, setRecentReady] = useState(false);
  const [weekRows, setWeekRows] = useState([]);
  const loadDay = useCallback(async (d) => {
    if (d === todayVN()) return;
    const row = await ud.getDailyLog(d);
    setDayCache((c) => ({ ...c, [d]: row || { log_date: d, meals: [], eaten_meals: [], water_ml: 0 } }));
  }, [ud.getDailyLog]);
  useEffect(() => { if (date !== today && !dayCache[date]) loadDay(date); }, [date, today]);
  useEffect(() => {
    let alive = true;
    ud.getRecentDays(30).then((r) => { if (alive) { setRecentRows(r || []); setRecentReady(true); } });
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
  const targets = targetsOf(macroFor(date), dayType);
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
    const dayMeals = (dayOf(d) || {}).meals || [];
    const md = macroFor(d);
    const rt = remainingMealTarget({ macro: md, dayType: dt, mealIds: idsFor(d), mealId, dayMeals });
    const list = mealSuggestions({ dayMeals,
      mealId, mealIds: idsFor(d), macro: md, dayType: dt,
      history: historyMeals.filter((h) => h.log_date !== d),
      templates: flags.template_library ? libraryFor(ud.defaultTemplates, { goal: macro?.goal, dietStrategy: macro?.dietStrategy, dayType: dt }) : [],
      aiMenus: aiMenusS, avoidKeys: buildExclusionKeys(avoidText), isAvoided: avoidMatcher(avoidText), currentItems: cur, limit: 5,
    });
    return { list, avoidText, dayType: dt, target: rt?.cal || 0, rt };
  };
  const frequent = useMemo(() => frequentItems(recentRows, 15), [recentRows]);
  const weekDots = useMemo(() => {
    const m = {};
    (weekRows || []).forEach((r) => { if ((r.eaten_meals || []).length) m[String(r.log_date).slice(0, 10)] = true; });
    if (ud.todayLog?.log_date === today && (ud.todayLog.eaten_meals || []).length) m[today] = true;
    return m;
  }, [weekRows, ud.todayLog, today]);

  // Thẻ "Tuần này" ở Hôm nay (tuần của ngày đang xem)
  const week = useMemo(() => weekCard(weekRows, ud.todayLog, weekDates(date), today, (d) => targetsOf(macroFor(d), dayTypeOf(profile, d)).cal),
    [weekRows, ud.todayLog, date, today, macro, profile, activityByDate]); // eslint-disable-line react-hooks/exhaustive-deps

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
  // Đã ăn ≥ 1 bữa hôm nay → AI chỉ lên các bữa còn lại, mục tiêu = cả ngày − đã ăn (16/10)
  const restOfToday = () => {
    const td = dayOf(today);
    const eatenIds = (td?.eaten_meals || []).filter((id) => (td?.meals || []).some((m) => mealKey(m) === id && hasItems(m)));
    return eatenIds.length ? { eatenIds, eaten: eatenOfDay(td) } : null;
  };
  const restInfoMenu = (() => {
    const r = restOfToday();
    if (!r) return null;
    const left = idsFor(today).filter((id) => !r.eatenIds.includes(id)).length;
    return { eatenN: r.eatenIds.length, left };
  })();
  const quickAILayer = () => {
    let prefs = {};
    prefs = readUser("fp_menu_prefs", user?.id, {}) || {};
    const rest = restOfToday();
    return { type: "ai", auto: true, rest, prefs: { style: prefs.style, avoid: prefs.avoid, dayType: dayTypeOf(profile, today) } };
  };
  const aiMenuAction = aiAccess.usable ? () => openLayer(quickAILayer()) : aiAccess.enabled ? () => setTab("menu") : null;
  const openDay = (d) => { setSelDate(d === today ? null : d); setTab("today"); };

  // ---------- Thực đơn AI ----------
  const applyAIMenu = async (tpl) => {
    try {
      const res = await applyDayMenu(tpl);
      if (res && res.cancelled) return; // Huỷ ở hộp hỏi → vẫn ở màn Thực đơn AI
    } catch (e) { console.error("Apply AI menu error:", e); fail(); }
    closeLayer();
  };
  // Áp thực đơn cả ngày (AI / lặp lại hằng tuần / mẫu / ngày đã ăn) cho HÔM NAY — 16/10:
  // bữa chưa ăn đang có món mà thực đơn sẽ thay → hỏi trước; áp xong có Hoàn tác (ghi lại từng bữa cũ / xoá bữa mới thêm).
  const shortMeals = (ids) => { const n = ids.map((id) => MEAL_SHORT[id] || MEAL_NAMES[id] || id); return n.length > 3 ? `${n.slice(0, 3).join(", ")}…` : n.join(", "); };
  const applyDayMenu = async (tpl) => {
    const repl = menuReplaces(dayOf(today), tpl.meals);
    if (repl.length && !(await appConfirm(`Thay ${repl.length} bữa chưa ăn (${shortMeals(repl)}) bằng thực đơn này?`, { title: "Áp thực đơn" }))) return { ok: false, cancelled: true };
    return serial(async () => {
      const prevDay = await freshDay(today);
      const prevMeals = JSON.parse(JSON.stringify((prevDay && prevDay.meals) || []));
      const writes = menuWrites(prevDay, tpl.meals);
      const prevType = (prevDay && prevDay.day_type) || dayTypeOf(profile, today);
      // Không còn tự lưu ngầm vào Lịch tuần (chốt 13/10) — muốn lặp lại thì bấm "Lặp lại hằng tuần"
      const res = await ud.applyTemplate({ ...tpl, day_type: tpl.day_type || dayTypeOf(profile, today) });
      await refresh(today);
      if (res && res.ok === false) { fail(); return res; }
      const undo = async () => {
        setToast(null);
        await serial(async () => {
          for (const id of writes) {
            const pm = prevMeals.find((m) => mealKey(m) === id);
            if (pm && hasItems(pm)) {
              const { items, meal_id: _m, meal_name, id: _id, ...extra } = pm;
              await ud.saveMealToCloud(id, prevType, items, false, today, { name: mealLabel(meal_name, id), extra });
            } else await ud.removeDayMeal(today, id);
          }
          await refresh(today);
          showToast({ text: "Đã hoàn tác, trả lại các bữa như trước." }, 3000);
        });
      };
      showToast({ text: "Đã áp thực đơn · bấm ✓ khi ăn xong từng bữa", action: { label: "Hoàn tác", onClick: undo } }, 7000);
      return res || { ok: true };
    });
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
      return { target: targetsOf(macroFor(today), dt).cal, eatenCal: eatenOfDay(ud.todayLog).cal, goal: macro.goal, proteinTarget: macro.protein, dayType: dt, visibleMealIds: ids, mealTimes: profile.mealTimes || null };
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
    // 17/10 (bản vẽ 113): chip "Từ thực đơn tuần" đưa các món vào giỏ của sheet Ghi bữa (ghi bằng nút Ghi, nối thêm — không ghi đè)
    return { cal: Math.round(m.items.reduce((s, i) => s + (Number(i.cal) || 0), 0)), items: m.items };
  };
  const updateLog = (patch) => setLayers((ls) => ls.map((l) => (l.type === "log" ? { ...l, ...patch } : l)));

  // Ghi 1 gợi ý món vào bữa (sheet Gợi ý món + nút "Ghi · X kcal" ở thẻ đến giờ): bữa đã có món → hỏi trước; có Hoàn tác (putItems)
  const pickSuggestion = async (d, mealId, opt, beforeWrite) => {
    const nm = MEAL_NAMES[mealId] || "Bữa";
    const m = mealOf(dayOf(d), mealId);
    if (m && hasItems(m) && !(await appConfirm(`${nm} đã có món. Thay bằng món gợi ý?`))) return false;
    const label = opt.kind === "history" ? `${nm.toLowerCase()} ${fmtVN(opt.date)}` : `gợi ý ${opt.title.toLowerCase()}`;
    if (beforeWrite) beforeWrite();
    return putItems(d, mealId, opt.items, true, label);
  };

  const renderLog = (l) => {
    if (l.pick) {
      return <LogMealSheet pickMode pickTitle={MEAL_NAMES[l.mealId]} date={l.date} mealId={l.mealId} mealIds={[]} dateOptions={dateOptions}
        recentMeals={[]} frequent={frequent} foodCache={calcFoodCache} onClose={closeLayer} aiOn={!!flags.ai_macro} saveMine={saveMyFoods}
        onCalc={(text, auto) => replaceTop({ type: "calc", pick: true, text: text || "", auto: !!auto, date: l.date, mealId: l.mealId })}
        onPickMany={(items) => { setPendingPick({ items, n: Date.now() }); closeLayer(); return true; }} />;
    }
    const ids = idsFor(l.date);
    const mealId = ids.includes(l.mealId) ? l.mealId : ids[0];
    const sg = suggestFor(mealId, l.date);
    return <LogMealSheet date={l.date} onDate={(d) => { updateLog({ date: d }); if (d !== today && !dayCache[d]) loadDay(d); }} mealId={mealId} onMeal={(id) => updateLog({ mealId: id })}
      mealIds={ids} dateOptions={dateOptions} recentMeals={recentMeals} frequent={frequent} foodCache={calcFoodCache}
      onClose={closeLayer} aiOn={!!flags.ai_macro} saveMine={saveMyFoods}
      onPhoto={flags.photo_macro ? () => replaceTop({ type: "photo", mealId: l.mealId }) : null}
      onAI={aiAccess.usable && l.date === today ? () => replaceTop(quickAILayer()) : null}
      weekly={weeklyFor(l.date, mealId)}
      onCalc={(text, auto) => replaceTop({ type: "calc", text: text || "", auto: !!auto, date: l.date, mealId })}
      onAddItems={async (items) => { const ok = await putItems(l.date, mealId, items, false, items.length === 1 ? itemName(items[0]).toLowerCase() : `${items.length} món`); if (ok !== false) closeLayer(); return ok; }}
      suggestions={sg.list} suggestTarget={sg.target} />;
  };

  const renderEdit = (l) => {
    const dy = dayOf(l.date);
    const m = mealOf(dy, l.mealId);
    if (!dy) return null;
    const wasEaten = (dy.eaten_meals || []).includes(l.mealId);
    const nm = mealLabel(m && m.meal_name, l.mealId);
    const dt = dayTypeOf(profile, l.date);
    return <EditMealScreen key={`${l.date}:${l.mealId}`} noEx={(profile.exerciseType || "gym") === "none"} date={l.date} today={today} mealId={l.mealId} mealName={nm} items={(m && m.items) || []} eaten={wasEaten} dayType={dt}
      pendingPick={pendingPick}
      onAddPick={() => openLayer({ type: "log", pick: true, date: l.date, mealId: l.mealId })}
      onPhoto={flags.photo_macro ? () => replaceTop({ type: "photo", mealId: l.mealId }) : null}
      onClose={closeLayer}
      onSave={(items, eatenNow, auto) => serial(async () => {
        const prevItems = (m && m.items) || [];
        const res = await ud.saveMealToCloud(l.mealId, dt, items, false, l.date, { markEaten: eatenNow, name: nm });
        if (res && res.ok === false) { fail(); return false; }
        if (!eatenNow && wasEaten) await ud.toggleEaten(l.mealId, false, l.date);
        await refresh(l.date);
        // Hoàn tác (16/10): ghi lại món + trạng thái đã ăn trước khi sửa (bữa mới tạo thì xoá)
        const undo = async () => {
          setToast(null);
          await serial(async () => {
            if (!prevItems.length) await ud.removeDayMeal(l.date, l.mealId);
            else {
              await ud.saveMealToCloud(l.mealId, dt, prevItems, false, l.date, { markEaten: wasEaten, name: nm });
              if (!wasEaten && eatenNow) await ud.toggleEaten(l.mealId, false, l.date);
            }
            await refresh(l.date);
          });
        };
        showToast({ text: `Đã lưu ${nm.toLowerCase()}`, action: { label: "Hoàn tác", onClick: undo } }, auto ? 6000 : 4500);
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

  // ---------- Cân hôm nay (bản vẽ 115) ----------
  // Lưu = cùng hàm Tiến độ dùng (addWeight: 1 lần cân / ngày, cân lại = sửa số hôm đó) + cập nhật kg hồ sơ (macro tính theo kg).
  // Toast "Đã lưu 64,6 kg · −0,3 kg (· mục tiêu mới X kcal)" + Hoàn tác (trả số hôm nay cũ / xoá lần cân hôm nay).
  const weightRef = useRef(weightLog);
  weightRef.current = weightLog;
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const openWeigh = (fromGoals) => openLayer({ type: "weight", fromGoals: fromGoals === true });
  const saveWeightToday = async (kg, prev) => {
    const d = todayVN();
    const before = (weightRef.current || []).find((w) => w.logged_date === d) || null;
    const prevKg = profileRef.current.kg;
    const r = await addWeight(kg);
    if (!r) { fail(); return false; }
    const oldCal = targetsOf(macro, dayTypeOf(profile, d)).cal;
    const np = { ...profileRef.current, kg };
    setProfile(np);
    let newCal = oldCal;
    try { newCal = targetsOf(calcMacro(np), dayTypeOf(np, d)).cal; } catch (e) { /* giữ số cũ */ }
    const dl = prev ? Math.round((kg - prev.kg) * 10) / 10 : null;
    const dText = dl == null ? "" : ` · ${dl > 0 ? "+" : dl < 0 ? "−" : "±"}${fmtDec(Math.abs(dl))} kg`;
    const calText = Math.round(newCal) !== Math.round(oldCal) ? ` · mục tiêu mới ${fmtInt(newCal)} kcal` : "";
    const undo = async () => {
      setToast(null);
      if (before) await addWeight(before.kg, d);
      else { const row = (weightRef.current || []).find((w) => w.logged_date === d); if (row) await deleteWeight(row.id); }
      setProfile({ ...profileRef.current, kg: prevKg });
      showToast({ text: "Đã hoàn tác lần cân hôm nay." }, 2500);
    };
    showToast({ text: `Đã lưu ${fmtKg(kg)} kg${dText}${calText}`, action: { label: "Hoàn tác", onClick: undo } }, 6000);
    return true;
  };
  // "Xem biểu đồ ›" trong sheet: đường cũ — sang Tiến độ › Cân nặng
  const openWeightChart = () => { closeLayer(); setProgressSeg((s) => ({ seg: "weight", n: s.n + 1 })); setTab("progress"); };

  // ---------- Nút + giữa thanh dưới (bản vẽ 116) ----------
  const [plusOpen, setPlusOpen] = useState(false);
  useEffect(() => { if (layers.length) setPlusOpen(false); }, [layers.length]);
  const plusDate = tab === "today" ? date : today;

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
    refresh: () => refresh(today), showToast, close: closeLayer, applyDayMenu,
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
        <GoalsScreen profile={profile} setProfile={setProfile} macro={macro} weightLog={weightLog} openSchedule={() => openLayer({ type: "page", sec: "schedule" })} openWeigh={() => openWeigh(true)} />
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
          <RemindersScreen profile={profile} setProfile={setProfile} pushFeature={flags.push} weightLog={weightLog} curKg={weight.curKg} visibleMeals={[...new Set(vis)]} lastMeasureDate={(measures || []).length ? measures[measures.length - 1].log_date : null} />
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
    // 10 trang con Quản trị nền tối (bản vẽ 98–108, 16/10) — thay AdminPanel cũ trên điện thoại (PC vẫn dùng tab cũ)
    const ADM = { orders: OrdersScreen, report_biz: ReportScreen, food_cache_pending: PendingFoodsScreen, food_db: FoodDBScreen, templates: TemplatesScreen, admin: VersionScreen, feature_flags: FlagsScreen, ai: AiScreen, ai_cost: AiCostScreen, backup: BackupScreen };
    if (ADM[sec] && isAdmin) {
      const Scr = ADM[sec];
      return <Scr {...panelProps} onBack={closeLayer} isAdmin={isAdmin} isSuperAdmin={profile.adminRole === "super"} user={user} appSettings={appSettings} saveSetting={saveSetting} showToast={showToast} />;
    }
    const inner = <AdminPanel {...panelProps} forcedSection="settings" initialSection={sec === "about_edit" ? "about" : sec} hidePills />;
    return (
      <SubPage title={ADMIN_TITLES[sec] || SECTION_TITLE[sec] || "Cài đặt"} onBack={closeLayer}>
        <div style={{ padding: 10 }}>
          {inner}
        </div>
      </SubPage>
    );
  };

  // Mở từ thông báo (17/10): url ?tab=progress&seg=weight|measure|food → chuyển tab Tiến độ đúng mục.
  // Mở mới: đọc location.search; app đang mở: service worker gửi message "open-url".
  useEffect(() => {
    const go = (url) => {
      try {
        const u = new URL(url, window.location.origin);
        const t = u.searchParams.get("tab"), sg = u.searchParams.get("seg");
        if (t === "progress") { if (sg) setProgressSeg((s) => ({ seg: sg, n: s.n + 1 })); setTab("progress"); }
      } catch (e) { /* url lạ: bỏ qua */ }
    };
    if (window.location.search.includes("tab=")) { go(window.location.href); try { window.history.replaceState(null, "", window.location.pathname); } catch (e) { /* */ } }
    const onMsg = (e) => { if (e.data?.type === "open-url" && e.data.url) go(e.data.url); };
    navigator.serviceWorker?.addEventListener?.("message", onMsg);
    return () => navigator.serviceWorker?.removeEventListener?.("message", onMsg);
  }, []);

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

  // ---------- Kiểm tra tuần (bản vẽ 127) + khách không tập (bản vẽ 128) ----------
  const noEx = (profile.exerciseType || "gym") === "none";
  // Ngày đã xử lý thẻ: cột profiles.checkin_date (khi prod đã có cột) + bản trên máy — lấy ngày mới hơn
  const [checkinLocal, setCheckinLocal] = useState(() => readUser("fp_checkin", user?.id, null));
  const checkinDate = [profile.checkinDate, checkinLocal].filter(Boolean).sort().pop() || null;
  const check = useMemo(() => (recentReady ? weeklyCheck({
    today, goal: macro.goal, kgWeek: macro.kgWeek, curKg: weight.curKg, weightLog, dayRows: recentRows, measures, checkinDate,
    calOffset: macro.calOffset, atFloor: !!macro.floorApplied || macro.calTargetRaw - 100 < macro.calFloor,
  }) : null), [recentReady, today, macro, weight.curKg, weightLog, recentRows, measures, checkinDate]);
  const onCheckin = (act) => {
    writeUser("fp_checkin", user?.id, today);
    setCheckinLocal(today);
    const patch = { checkinDate: today };
    if (act === "apply" && check?.delta) {
      patch.calOffset = nextOffset(macro.calOffset, check.delta, macro.goal);
      patch.calOffsetDate = today;
      showToast({ text: `Đã ${check.delta < 0 ? "bớt" : "thêm"} 100 kcal/ngày — mục tiêu mới ${fmtInt(targets.cal + check.delta)} kcal. Đổi lại ở Tôi › Mục tiêu.` });
    }
    setProfile({ ...profileRef.current, ...patch });
    if (act === "weigh") openWeigh(false);
  };
  const checkinCard = check ? <WeeklyCheckCard check={check} target={targets.cal} onAct={onCheckin} /> : null;
  // Mẹo đi bộ: 3 lần mở app đầu tiên (đếm theo lần mở), × thì ẩn luôn
  const [walkTip, setWalkTip] = useState(false);
  useEffect(() => {
    if (!noEx || !user?.id) { setWalkTip(false); return; }
    const w = readUser("fp_walk_tip", user.id, null) || { n: 0 };
    if (w.off || w.n >= 3) { setWalkTip(false); return; }
    writeUser("fp_walk_tip", user.id, { ...w, n: w.n + 1 });
    setWalkTip(true);
  }, [noEx, user?.id]);
  const closeWalkTip = () => { writeUser("fp_walk_tip", user?.id, { n: 3, off: true }); setWalkTip(false); };
  const leftKg = Math.round(((Number(weight.curKg) || 0) - (Number(weight.goalKg) || 0)) * 10) / 10;
  const planCard = !noEx ? null : macro.goal === "cut"
    ? { value: `Giảm ${fmtDec(Math.round((macro.kgWeek || 0) * 10) / 10)} kg/tuần`, sub: leftKg > 0 ? `còn ${fmtDec(leftKg)} kg` : "Đã tới cân mục tiêu" }
    : { value: "Giữ cân", sub: "Không tập" };

  // Vận động thêm hôm nay (bản vẽ 130a–c)
  const actToday = activityByDate[today] || [];
  const bonusToday = bonusOf(today);
  const clearActivity = async () => {
    if (!(await appConfirm("Xoá phần vận động thêm hôm nay? Mục tiêu calo trở lại như cũ.", { title: "Xoá vận động?", confirmText: "Xoá", danger: true }))) return;
    await saveActivity(today, []);
  };
  const activityRow = <ActivityRow items={actToday} goal={macro.goal} onOpen={() => openLayer({ type: "activity" })} onClear={clearActivity} />;
  const actLabel = actToday.length ? actOf(actToday[actToday.length - 1].type).label.toLowerCase() : "";
  const focusBonus = bonusToday > 0 ? `+${fmtInt(bonusToday)} kcal vì ${actToday.length > 1 ? "vận động thêm" : actLabel} — ${bonusTip(bonusToday)}` : null;
  const bDate = bonusOf(date);
  const goalSub = bDate > 0 ? `${fmtInt(targets.cal - bDate)} + ${fmtInt(bDate)} vận động` : null;
  const [snackSkip, setSnackSkip] = useState(() => readUser("fp_snack_skip", user?.id, null));
  const allEatenToday = date === today && rows.length > 0 && rows.every((r) => r.state === "eaten");
  const snackRemain = targets.cal - eaten.cal;
  const snackCard = allEatenToday && bonusToday > 0 && macro.goal !== "cut" && snackRemain >= 100 && now.minutes < 22 * 60 && snackSkip !== today
    ? <SnackCard remain={snackRemain} onPick={(sn) => putItems(today, "toi", sn.items, false, sn.name.toLowerCase())} onSkip={() => { writeUser("fp_snack_skip", user?.id, today); setSnackSkip(today); }} />
    : null;

  return (
    <div className="fpm" style={{ fontFamily: FONT, background: tab === "me" ? DK.base : LT.base, color: "#0F172A", minHeight: "100vh" }}>
      <style>{MOBILE_CSS + DK_CSS}</style>
      {/* Thanh giờ iPhone (16/10, chủ dự án chốt): KHÔNG phủ màu riêng — trong suốt, hiện đúng nền phía sau
          (chưa cuộn = header Hôm nay / nền tab; đã cuộn = nội dung, iOS tự làm mờ). Bỏ dải che 14/10. */}
      <style>{HEADER_CSS}</style>
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
            nowMinutes={now.minutes} name={name} dayLoaded={!!day && (date !== today || ud.loaded !== false)} weekDots={weekDots} weight={weight} banner={banner} busy={busy}
            waterMl={Number(day?.water_ml) || 0} addWater={(ml) => ud.addWater(ml, date).then((r) => { if (date !== today) refresh(date); return r; })} waterGoalOverride={profile.waterGoalMl}
            onAskAI={flags.ai_chat ? (r) => openLayer({ type: "coach", input: `${r.name} hôm nay nên ăn gì cho đủ macro?` }) : null}
            planLine={noEx ? "Không tập" : `Lịch ${(profile.gymDays || []).length} buổi/tuần`} planCard={planCard}
            checkin={checkinCard} walkTip={walkTip ? <WalkTipCard onClose={closeWalkTip} /> : null}
            activity={activityRow} snack={snackCard} focusBonus={focusBonus} goalSub={goalSub}
            week={week} onDiary={() => { setProgressSeg((s) => ({ seg: "food", n: s.n + 1 })); setTab("progress"); }}
            bell={<BellButton count={notif.unread} ringing={notif.ringing} onClick={() => openLayer({ type: "page", sec: "notifications" })} />}
            onLog={(id) => openLog(id)} onPhoto={(id) => openPhoto(id)} onEdit={(id) => openEdit(id)} onToggleEaten={toggleEaten}
            suggestInfo={(id) => { const sg = suggestFor(id); return { n: sg.list.length, best: sg.list[0] ? scaleSuggestion(sg.list[0], 1) : null }; }}
            onSuggest={(id) => openLayer({ type: "suggest", date, mealId: id })} onSuggestApply={(id, opt) => pickSuggestion(date, id, opt)}
            onAIMenu={aiMenuAction} onWeight={() => openWeigh(false)} />
        )}
        {tab === "menu" && (
          <div>
            <MenuScreen {...menuProps} active={!top} aiAccess={aiAccess} userId={user?.id} flags={flags} recentDays={recentRows} openToday={() => { setSelDate(null); setTab("today"); }}
              todayRest={restInfoMenu} openGenerate={(prefs) => openLayer({ type: "ai", prefs, auto: true, rest: prefs.scope === "rest" ? restOfToday() : null })} openSaved={(template) => openLayer({ type: "ai", template })}
              openPage={(sec, extra) => openLayer({ type: "page", sec, ...(extra || {}) })} clearToday={clearToday} />
          </div>
        )}
        {tab === "progress" && (
          <ProgressScreen initialSeg={progressSeg.seg} segNonce={progressSeg.n}
            range={{ mode: rangeMode, setMode: setRangeMode, anchor: rangeAnchor, setAnchor: setRangeAnchor, today }}
            getDailyLogs={ud.getDailyLogs} dataVersion={version} targetOf={(d) => targetsOf(macroFor(d), dayTypeOf(profile, d)).cal} lineCal={Math.round(macro.calTarget)} openDay={openDay} onLog={() => openLog(null, today)}
            weightLog={weightLog} weight={weight} profile={profile} setProfile={setProfile} addWeight={addWeight} updateWeight={updateWeight} deleteWeight={deleteWeight}
            measures={measures} onMeasure={(d) => openLayer({ type: "measure", date: d })} onOpenReminders={() => openLayer({ type: "page", sec: "reminders" })} />
        )}
        {tab === "me" && (
          <MeScreen bell={<BellButton count={notif.unread} ringing={notif.ringing} onClick={() => openLayer({ type: "page", sec: "notifications" })} />} name={name} profile={profile} macro={macro} weight={weight} isAdmin={isAdmin} appVersion={appSettings.app_version} signOut={signOut}
            openCoach={flags.ai_chat ? () => openLayer({ type: "coach" }) : null} salesEnabled={!!flags.sales_enabled}
            openDiary={() => { setProgressSeg((s) => ({ seg: "food", n: s.n + 1 })); setTab("progress"); }}
            open={(sec) => openLayer({ type: "page", sec })} />
        )}
      </main>

      {plusOpen && !top && (
        <PlusMenu onClose={() => setPlusOpen(false)}
          onLog={() => { setPlusOpen(false); openLog(null, plusDate); }}
          onPhoto={flags.photo_macro ? () => { setPlusOpen(false); openPhoto(defaultMealFor(today)); } : null}
          onCalc={() => { setPlusOpen(false); openLayer({ type: "calc", text: "", auto: false, date: today, mealId: defaultMealFor(today), viewFirst: true }); }} />
      )}
      <BottomNav dark={tab === "me"} hidden={!!top} tab={tab} addOpen={plusOpen && !top} onTab={(t) => { setPlusOpen(false); if (t === "today") setSelDate(null); setTab(t); }} onAdd={() => setPlusOpen((v) => !v)} />

      {layers.map((l, i) => (
        <div key={i} style={{ display: i === layers.length - 1 || l.type === "page" || l.type === "edit" ? "block" : "none" }}>
          {l.type === "log" && renderLog(l)}
          {l.type === "edit" && renderEdit(l)}
          {l.type === "page" && renderPage(l)}
          {l.type === "suggest" && (() => {
            const sg = suggestFor(l.mealId, l.date);
            const nm = MEAL_NAMES[l.mealId] || "Bữa";
            return <MealSuggestSheet noEx={noEx} mealId={l.mealId} mealName={nm} list={sg.list} target={sg.target} rt={sg.rt} goal={macro?.goal} dayType={sg.dayType} avoidText={sg.avoidText}
              onClose={closeLayer} onSearch={() => replaceTop({ type: "log", date: l.date, mealId: l.mealId })}
              onPick={(opt) => pickSuggestion(l.date, l.mealId, opt, closeLayer)} />;
          })()}
          {l.type === "coach" && <AICoachPanel profile={profile} macro={macro} weightLog={weightLog} measures={measures} todayData={{ ...eatenOfDay(ud.todayLog), dayType: dayTypeOf(profile, today) }} mob={true} onClose={closeLayer} appSettings={appSettings} isAdmin={isAdmin} getMeals={ud.getMeals} getWeeklyTemplate={ud.getWeeklyTemplate} foodCache={ud.foodCache} userId={user?.id} applyTemplate={ud.applyTemplate} saveWeeklyTemplate={ud.saveWeeklyTemplate} getMealHistory={ud.getMealHistory} getDailyLogs={ud.getDailyLogs}
            onOpenAIMenu={aiAccess.usable ? () => replaceTop(quickAILayer()) : null} initialInput={l.input || ""} />}
          {l.type === "ai" && (
            <AIMenuScreen macro={macro} profile={profile} user={user} appSettings={appSettings} todayType={dayTypeOf(profile, today)} getDailyLogs={ud.getDailyLogs}
              initialPrefs={l.prefs} autoStart={!!l.auto} initialTemplate={l.template || null} rest={l.rest || null}
              onApply={applyAIMenu} onSaveWeek={saveAIMenuToWeek} onClose={closeLayer}
              openSaved={() => { closeLayer(); setTab("menu"); }} openSearch={() => replaceTop({ type: "log", date: today, mealId: defaultMealFor(today) })} />
          )}
          {l.type === "calc" && (
            <CalcCheckScreen initialText={l.text} autoRun={l.auto} foodCache={calcFoodCache} frequent={frequent} aiEnabled={!!flags.ai_macro} userId={user?.id} appSettings={appSettings}
              dayInfo={{ target: targetsOf(macroFor(l.date), dayTypeOf(profile, l.date)).cal, eaten: eatenOfDay(dayOf(l.date)).cal }}
              mealIds={idsFor(l.date).length ? idsFor(l.date) : ["sang", "trua", "toi"]} initialMeal={l.mealId} date={l.date} dateOptions={dateOptions.some((o) => o.value === l.date) ? dateOptions : [{ value: l.date, label: fmtVN(l.date) }, ...dateOptions]}
              savePending={savePendingFoodCache} saveMine={saveMyFoods} onClose={closeLayer}
              pickTitle={l.pick ? MEAL_NAMES[l.mealId] : null} viewFirst={!!l.viewFirst}
              onSave={l.pick
                // Từ Sửa bữa › Thêm món: món AI tính đưa về bản nháp Sửa bữa (chưa lưu), như chọn món trong kho
                ? (d, mealId, items) => { setPendingPick({ items, n: Date.now() }); return true; }
                : (d, mealId, items) => putItems(d, mealId, items, false, items.length === 1 ? itemName(items[0]).toLowerCase() : `${items.length} món`)} />
          )}
          {l.type === "activity" && <ActivitySheet kg={weight.curKg || profile.kg} goal={macro.goal} items={actToday} baseTarget={targetsOf(macro, dayTypeOf(profile, today)).cal}
            onSave={(list) => saveActivity(today, list)} onClose={closeLayer} />}
          {l.type === "measure" && <MeasureSheet today={today} date={l.date} rows={measures || []} gender={profile.gender}
            onSave={async (d, v) => { const ok = await saveMeasure(d, v); showToast({ text: ok ? "Đã lưu số đo" : "Chưa lưu được số đo — kiểm tra mạng rồi thử lại." }); return ok; }}
            onDelete={async (d) => { const ok = await deleteMeasure(d); if (ok) showToast({ text: "Đã xoá lần đo" }); return ok; }} onClose={closeLayer} />}
          {l.type === "weight" && <WeightSheet today={today} weightLog={weightLog} profileKg={profile.kg} goalKg={weight.goalKg} startKg={weight.startKg}
            onSave={saveWeightToday} onClose={closeLayer} onChart={l.fromGoals ? null : openWeightChart} />}
          {l.type === "photo" && <PhotoScreen initialMeal={l.mealId} mealIds={idsFor(today)} appSettings={appSettings} photoCtx={photoCtx} foodCache={ud.foodCache} dateOptions={dateOptions} onClose={closeLayer} onSave={(d, mealId, items) => putItems(d, mealId, items, false, `${items.length} món từ ảnh`)} />}
        </div>
      ))}

      <Toast toast={toast} bottom={has("edit") ? 100 : 90} />
      {!top && <PWAInstallPrompt ready={hasLogged} />}
    </div>
  );
}
