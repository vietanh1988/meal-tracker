import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { inferPatternFromItems } from "../lib/aiMenuService";
import { MEAL_PATTERNS } from "../mealPatterns";
import { todayVN } from "../lib/dateVN";
import { setMeal, toggleEatenIn, applyMenu, dayRowPayload, toSlots, hasItems, mealKey, MEAL_NAMES } from "../lib/mealMath";

const defaultStructure = {
  train: [
    {id:"sang",name:"Bữa sáng",items:[]},
    {id:"phu_sang",name:"Bữa phụ sáng",items:[]},
    {id:"trua",name:"Bữa trưa",items:[]},
    {id:"phu_chieu",name:"Bữa phụ chiều",items:[]},
    {id:"pre",name:"Trước tập",items:[]},
    {id:"post",name:"Sau tập",items:[]},
    {id:"toi",name:"Bữa tối",items:[]},
  ],
  rest: [
    {id:"sang",name:"Bữa sáng",items:[]},
    {id:"phu_sang",name:"Bữa phụ sáng",items:[]},
    {id:"trua",name:"Bữa trưa",items:[]},
    {id:"phu_chieu",name:"Bữa phụ chiều",items:[]},
    {id:"pre",name:"Trước tập",items:[]},
    {id:"post",name:"Sau tập",items:[]},
    {id:"toi",name:"Bữa tối",items:[]},
  ],
};

// Khôi phục tên hiển thị món (display) từ pattern nếu item thiếu
function restoreDisplay(mealId, items, pattern) {
  if (!pattern || !Array.isArray(items)) return items;
  const found = (MEAL_PATTERNS[mealId] || []).find(p => p.name === pattern);
  if (!found || !found.dishes) return items;
  const dishMap = {};
  found.dishes.forEach(d => { if (d.food && d.display) dishMap[d.food] = d.display; });
  return items.map(it => (!it.display && it.food && dishMap[it.food]) ? { ...it, display: dishMap[it.food] } : it);
}

const DAY_COLS = "log_date, day_type, meals, eaten_meals";

// ============================================================
// NGUỒN SỰ THẬT:
//  - daily_logs (1 dòng / user / ngày VN) = những gì user ăn/định ăn NGÀY ĐÓ.
//    Tổng quan "hôm nay", nhật ký, báo cáo đều đọc từ đây.
//  - meal_logs (2 "ô" train/rest / user) = thực đơn mẫu gần nhất theo loại
//    ngày — chỉ dùng làm mẫu/ví dụ (WeightSuggestion, AI coach, soạn trước),
//    KHÔNG dùng để biết hôm nay ăn gì.
// Mọi ghi vào daily_logs đi qua hàng đợi (dayQueueRef) → đọc-sửa-ghi tuần tự,
// không còn 2 thao tác liên tiếp ghi đè nhau.
// ============================================================
export function useUserData(userId) {
  const [loaded, setLoaded] = useState(false);
  const [meals, setMeals] = useState({ train: defaultStructure.train, rest: defaultStructure.rest });
  const mealsRef = useRef(meals);
  const [foodCache, setFoodCache] = useState({});
  const [weeklyTemplates, setWeeklyTemplates] = useState([]);
  const [defaultTemplates, setDefaultTemplates] = useState([]);
  const [weeklyBundles, setWeeklyBundles] = useState([]);
  const lastFetchRef = useRef(Date.now());
  // Nhật ký HÔM NAY (daily_logs của todayVN())
  const [todayLog, setTodayLogState] = useState({ log_date: todayVN(), day_type: "train", meals: [], eaten_meals: [] });
  const todayLogRef = useRef(todayLog);
  const setTodayLog = useCallback((d) => { todayLogRef.current = d; setTodayLogState(d); }, []);
  const dayQueueRef = useRef(Promise.resolve());
  const todayStr = todayVN;

  // === Extracted fetch function — reusable ===
  const inFlightRef = useRef(false);
  const fetchAllData = useCallback(async (silent = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      return await _fetchAllDataInner(silent);
    } finally {
      inFlightRef.current = false;
    }
  }, [userId]);

  const loadTodayLog = useCallback(async () => {
    if (!userId) return;
    const t = todayStr();
    const { data, error } = await supabase.from("daily_logs").select(DAY_COLS)
      .eq("user_id", userId).eq("log_date", t).maybeSingle();
    if (error) { console.error("Load today log error:", error); return; }
    setTodayLog({
      log_date: t,
      day_type: data?.day_type || "train",
      meals: Array.isArray(data?.meals) ? data.meals : [],
      eaten_meals: Array.isArray(data?.eaten_meals) ? data.eaten_meals : [],
    });
  }, [userId, setTodayLog]);

  const _fetchAllDataInner = useCallback(async (silent = false) => {
    if (!userId) { setLoaded(true); return; }
    try {
      // Load meal_logs buckets (thực đơn mẫu theo loại ngày)
      const { data, error } = await supabase.from("meal_logs").select("*").eq("user_id", userId);
      if (error) console.error("Load meals error:", error);
      if (data && data.length > 0) {
        const trainMeals = {}, restMeals = {};
        let metaByKey = {};
        data.forEach(d => {
          const target = d.day_type === "train" ? trainMeals : restMeals;
          target[d.meal_id] = d.items;
          const mk = `${d.day_type}_${d.meal_id}`;
          if (d.pattern || d.composite) metaByKey[mk] = { pattern: d.pattern, composite: !!d.composite };
        });
        const newMeals = {};
        ["train", "rest"].forEach(dt => {
          const bucket = dt === "train" ? trainMeals : restMeals;
          const base = JSON.parse(JSON.stringify(defaultStructure[dt]));
          base.forEach(m => {
            if (bucket[m.id]) {
              m.items = bucket[m.id];
              const dbMeta = metaByKey[`${dt}_${m.id}`];
              if (dbMeta && dbMeta.pattern) {
                m.pattern = dbMeta.pattern;
                m.composite = !!dbMeta.composite;
              } else {
                const patternName = inferPatternFromItems(m.id, m.items);
                if (patternName) {
                  m.pattern = patternName;
                  const found = (MEAL_PATTERNS[m.id] || []).find(p => p.name === patternName);
                  m.composite = !!(found && found.composite);
                }
              }
              m.items = restoreDisplay(m.id, m.items, m.pattern);
            }
          });
          newMeals[dt] = base;
        });
        setMeals(newMeals);
        mealsRef.current = newMeals;
      }

      // Load food cache
      const { data: cacheData, error: cacheErr } = await supabase.from("food_cache").select("*");
      if (cacheErr) console.error("Load cache error:", cacheErr);
      if (cacheData && cacheData.length > 0) {
        const fc = {};
        cacheData.forEach(d => {
          const k = d.food_name.toLowerCase().trim();
          fc[k] = { p: Number(d.protein), c: Number(d.carb), f: Number(d.fat), fiber: Number(d.fiber), cal: Number(d.cal), gram: d.gram };
        });
        setFoodCache(fc);
      }

      // Load user's weekly templates (NOT default)
      const { data: tplData, error: tplErr } = await supabase.from("weekly_templates")
        .select("*").eq("user_id", userId).or("is_default.is.null,is_default.eq.false")
        .order("created_at");
      if (tplErr) console.error("Load weekly templates error:", tplErr);
      if (tplData) setWeeklyTemplates(tplData);

      // Load default templates (admin-created, visible to all)
      const { data: defData, error: defErr } = await supabase.from("weekly_templates")
        .select("*").eq("is_default", true).order("created_at");
      if (defErr) console.error("Load default templates error:", defErr);
      if (defData) setDefaultTemplates(defData);

      // Load weekly bundles
      const { data: bundleData, error: bundleErr } = await supabase.from("weekly_bundles")
        .select("*").order("created_at");
      if (bundleErr) console.error("Load weekly bundles error:", bundleErr);
      if (bundleData) setWeeklyBundles(bundleData);

      // Nhật ký hôm nay (giờ VN)
      await loadTodayLog();

      if (!silent) console.log("✅ All data synced from cloud");
      lastFetchRef.current = Date.now();
    } catch (e) { console.error("UserData load error:", e); }
    setLoaded(true);
  }, [userId, loadTodayLog]);

  // Load on mount
  useEffect(() => {
    fetchAllData(false);
  }, [fetchAllData]);

  // Re-sync khi quay lại app (30s debounce) — hoặc ngay lập tức nếu đã sang ngày mới
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && userId) {
        const dayChanged = todayLogRef.current.log_date !== todayStr();
        if (dayChanged || Date.now() - lastFetchRef.current > 30000) fetchAllData(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchAllData, userId]);

  // Thực đơn mẫu theo loại ngày (meal_logs bucket) — KHÔNG phải hôm nay
  const getMeals = useCallback((type) => {
    return meals[type] || defaultStructure[type];
  }, [meals]);

  const todayLogCurrent = () => (todayLog.log_date === todayStr() ? todayLog : { log_date: todayStr(), meals: [], eaten_meals: [] });

  // Hôm nay đã có bữa nào chưa (bất kể loại ngày — 1 ngày chỉ có 1 nhật ký)
  const hasMealsToday = useCallback(() => {
    return todayLogCurrent().meals.some(hasItems);
  }, [todayLog]);

  // Bữa ăn HÔM NAY điền vào 7 khung chuẩn — dùng cho Tổng quan
  const getTodayMeals = useCallback((type) => {
    const base = defaultStructure[type] || defaultStructure.train;
    return toSlots(todayLogCurrent(), base).map(m => ({ ...m, items: restoreDisplay(m.id, m.items, m.pattern) }));
  }, [todayLog]);

  const eatenMeals = todayLog.log_date === todayStr() ? (todayLog.eaten_meals || []) : [];

  // Update meals bucket state
  const updateMealsState = useCallback((mealId, dayType, items, extra) => {
    setMeals(prev => {
      const updated = { ...prev };
      const list = [...(updated[dayType] || defaultStructure[dayType])];
      const idx = list.findIndex(m => m.id === mealId);
      if (idx >= 0) {
        list[idx] = { ...list[idx], items };
        if (extra?.composite !== undefined) list[idx].composite = extra.composite;
        if (extra?.pattern !== undefined) list[idx].pattern = extra.pattern;
      }
      updated[dayType] = list;
      mealsRef.current = updated;
      return updated;
    });
  }, []);

  // ===== GHI NHẬT KÝ NGÀY (tuần tự) =====
  // fn: (day) => newDay. Đọc dòng mới nhất từ DB trong hàng đợi rồi ghi lại.
  // Hôm nay: cập nhật UI NGAY (lạc quan), rồi đồng bộ lại theo DB.
  const mutateDay = useCallback((date, fn, dayTypeHint = "train") => {
    if (!userId) return Promise.resolve({ ok: false, error: "no user" });
    const logDate = date || todayStr();
    const isToday = logDate === todayStr();
    if (isToday && todayLogRef.current.log_date === logDate) {
      try { setTodayLog({ ...fn(todayLogRef.current), log_date: logDate }); } catch (e) { /* ignore */ }
    }
    const job = async () => {
      try {
        const { data: row, error: rErr } = await supabase.from("daily_logs").select(DAY_COLS)
          .eq("user_id", userId).eq("log_date", logDate).maybeSingle();
        if (rErr) throw rErr;
        const base = {
          day_type: row?.day_type || dayTypeHint || "train",
          meals: Array.isArray(row?.meals) ? row.meals : [],
          eaten_meals: Array.isArray(row?.eaten_meals) ? row.eaten_meals : [],
        };
        const next = fn(base);
        const { error } = await supabase.from("daily_logs")
          .upsert(dayRowPayload(userId, logDate, next), { onConflict: "user_id,log_date" });
        if (error) throw error;
        if (isToday) setTodayLog({ log_date: logDate, day_type: next.day_type, meals: next.meals, eaten_meals: next.eaten_meals });
        lastFetchRef.current = Date.now();
        return { ok: true, day: next };
      } catch (e) {
        console.error("Daily log write error:", logDate, e);
        if (isToday) loadTodayLog(); // trả UI về đúng DB
        return { ok: false, error: e?.message || String(e) };
      }
    };
    const p = dayQueueRef.current.then(job, job);
    dayQueueRef.current = p;
    return p;
  }, [userId, setTodayLog, loadTodayLog]);

  // Lưu 1 bữa.
  //  - date: "YYYY-MM-DD" (mặc định hôm nay, giờ VN)
  //  - skipDailyLog=true: chỉ cập nhật thực đơn mẫu (meal_logs), không ghi nhật ký ngày
  //  - opts.markEaten: đánh dấu đã ăn luôn (ghi từ ảnh / nhập tay)
  //  - opts.name / opts.extra: tên bữa + field phụ (pattern, composite, source…)
  // Trả về { ok, error }.
  const saveMealToCloud = useCallback(async (mealId, dayType, items, skipDailyLog = false, date = null, opts = {}) => {
    if (!userId) return { ok: false, error: "no user" };
    const logDate = date || todayStr();
    const isToday = logDate === todayStr();
    const safeItems = Array.isArray(items) ? items : [];
    const extra = { ...(opts.extra || {}) };
    let bucketRes = { error: null };

    // Thực đơn mẫu theo loại ngày: chỉ cập nhật khi ghi cho HÔM NAY hoặc đang soạn trước
    if (isToday || skipDailyLog) {
      updateMealsState(mealId, dayType, safeItems, extra);
      const tot = safeItems.reduce((s, i) => ({ cal: s.cal + (Number(i.cal) || 0), p: s.p + (Number(i.p ?? i.protein) || 0), c: s.c + (Number(i.c ?? i.carb) || 0), f: s.f + (Number(i.f ?? i.fat) || 0) }), { cal: 0, p: 0, c: 0, f: 0 });
      const payload = { user_id: userId, meal_id: mealId, day_type: dayType, log_date: logDate, items: safeItems, total_cal: tot.cal, total_protein: tot.p, total_carb: tot.c, total_fat: tot.f };
      if (extra.pattern !== undefined) payload.pattern = extra.pattern;
      if (extra.composite !== undefined) payload.composite = !!extra.composite;
      bucketRes = await supabase.from("meal_logs").upsert(payload, { onConflict: "user_id,meal_id,day_type" });
      if (bucketRes.error) console.error("Meal bucket save error:", bucketRes.error);
    }
    if (skipDailyLog) return { ok: !bucketRes.error, error: bucketRes.error?.message || null };

    const name = opts.name || MEAL_NAMES[mealId] || mealId;
    return mutateDay(logDate, (day) => setMeal(day, mealId, safeItems, { name, extra, markEaten: !!opts.markEaten }), dayType);
  }, [userId, updateMealsState, mutateDay]);

  // Xoá 1 bữa khỏi 1 ngày
  const removeDayMeal = useCallback((date, mealId) => {
    return mutateDay(date, (day) => setMeal(day, mealId, []));
  }, [mutateDay]);

  // Chuyển 1 bữa sang ngày khác (ghi ngày đích trước, xoá ngày nguồn sau)
  const moveDayMeal = useCallback(async (fromDate, toDate, mealId, toDayType = null) => {
    if (!userId || !fromDate || !toDate || fromDate === toDate) return { ok: false, error: "invalid" };
    const { data: src, error } = await supabase.from("daily_logs").select(DAY_COLS)
      .eq("user_id", userId).eq("log_date", fromDate).maybeSingle();
    if (error || !src) return { ok: false, error: error?.message || "not found" };
    const meal = (src.meals || []).find(m => mealKey(m) === mealId);
    if (!meal) return { ok: false, error: "meal not found" };
    const wasEaten = (src.eaten_meals || []).includes(mealId);
    const { items, meal_id, meal_name, id, ...rest } = meal;
    const r1 = await mutateDay(toDate, (day) => setMeal(day, mealId, items || [], { name: meal_name, extra: rest, markEaten: wasEaten }), toDayType || src.day_type);
    if (!r1.ok) return r1;
    return mutateDay(fromDate, (day) => setMeal(day, mealId, []));
  }, [userId, mutateDay]);

  // Tick / bỏ tick "đã ăn"
  const toggleEaten = useCallback((mealId, isEaten, date = null) => {
    return mutateDay(date || todayStr(), (day) => toggleEatenIn(day, mealId, isEaten));
  }, [mutateDay]);

  // Áp thực đơn (template / AI) cho 1 ngày (mặc định hôm nay).
  // Bữa đã ăn được giữ nguyên. Thực đơn mẫu theo loại ngày cũng được cập nhật.
  const applyTemplate = useCallback(async (template, date = null) => {
    if (!userId || !template || !template.meals) return { ok: false, error: "no template" };
    const logDate = date || todayStr();
    const dayType = template.day_type === "rest" ? "rest" : "train";
    const tplMeals = (template.meals || []).filter(m => m && m.meal_id && Array.isArray(m.items) && m.items.length > 0);

    if (logDate === todayStr()) {
      tplMeals.forEach(m => updateMealsState(m.meal_id, dayType, m.items, { composite: !!m.composite, pattern: m.pattern || null }));
      await Promise.all(tplMeals.map(m => {
        const items = m.items;
        const tot = items.reduce((s, i) => ({ cal: s.cal + (Number(i.cal) || 0), p: s.p + (Number(i.p ?? i.protein) || 0), c: s.c + (Number(i.c ?? i.carb) || 0), f: s.f + (Number(i.f ?? i.fat) || 0) }), { cal: 0, p: 0, c: 0, f: 0 });
        return supabase.from("meal_logs").upsert({ user_id: userId, meal_id: m.meal_id, day_type: dayType, log_date: logDate, items, total_cal: tot.cal, total_protein: tot.p, total_carb: tot.c, total_fat: tot.f, pattern: m.pattern || null, composite: !!m.composite }, { onConflict: "user_id,meal_id,day_type" })
          .then(({ error }) => { if (error) console.error("Apply meal_logs error:", error); });
      }));
    }

    const menu = tplMeals.map(m => ({
      meal_id: m.meal_id,
      meal_name: m.meal_name || MEAL_NAMES[m.meal_id] || m.meal_id,
      items: m.items,
      ...(m.pattern ? { pattern: m.pattern } : {}),
      ...(m.composite !== undefined ? { composite: !!m.composite } : {}),
    }));
    const res = await mutateDay(logDate, (day) => applyMenu(day, menu, dayType), dayType);
    if (res.ok) console.log("✅ Template applied:", template.name || "unnamed", "→", menu.length, "bữa", logDate);
    return res;
  }, [userId, updateMealsState, mutateDay]);

  // Update food cache in state with pre-normalized entries
  const updateFoodCacheState = useCallback((normalizedEntries) => {
    setFoodCache(prev => {
      const fc = { ...prev };
      Object.entries(normalizedEntries).forEach(([k, v]) => {
        if (k) fc[k] = v;
      });
      return fc;
    });
  }, []);

  // Save food cache to Supabase
  const saveFoodCache = useCallback(async (normalizedEntries, provider) => {
    if (!userId) return;
    updateFoodCacheState(normalizedEntries);
    for (const [name, v] of Object.entries(normalizedEntries)) {
      try {
        if (!name) continue;
        const { error } = await supabase.from("food_cache").upsert({
          food_name: name, gram: v.gram || 100,
          protein: v.p || 0, carb: v.c || 0,
          fat: v.f || 0, fiber: v.fiber || 0, cal: v.cal || 0,
          ai_provider: provider || "unknown",
        }, { onConflict: "food_name,gram" });
        if (error) console.error("Food cache upsert error:", name, error);
      } catch (e) { console.error("Food cache error:", e); }
    }
    console.log("✅ Food cache synced:", Object.keys(normalizedEntries).length, "items");
  }, [userId, updateFoodCacheState]);

  // Delete specific food cache entries
  const deleteFoodCache = useCallback(async (nameKeys) => {
    if (!userId || !nameKeys || nameKeys.length === 0) return;
    setFoodCache(prev => {
      const fc = { ...prev };
      nameKeys.forEach(k => { delete fc[k]; });
      return fc;
    });
    for (const name of nameKeys) {
      try {
        const { error } = await supabase.from("food_cache").delete().eq("food_name", name);
        if (error) console.error("Food cache delete error:", name, error);
      } catch (e) { console.error("Food cache delete error:", e); }
    }
    console.log("🗑️ Deleted cache entries:", nameKeys);
  }, [userId]);

  // Get meal history for date range (for reports — from meal_logs)
  const getMealHistory = useCallback(async (startDate, endDate) => {
    if (!userId) return [];
    try {
      const { data, error } = await supabase.from("meal_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("log_date", startDate)
        .lte("log_date", endDate)
        .order("log_date", { ascending: true });
      if (error) { console.error("Meal history error:", error); return []; }
      return data || [];
    } catch (e) { console.error("Meal history error:", e); return []; }
  }, [userId]);

  // ===== WEEKLY TEMPLATES =====

  // Save or update a weekly template
  const saveWeeklyTemplate = useCallback(async (dayName, dayType, mealsData, totalCal) => {
    if (!userId) return;
    try {
      const { data: existing } = await supabase.from("weekly_templates")
        .select("id").eq("user_id", userId).eq("day_name", dayName)
        .maybeSingle();

      const payload = {
        day_type: dayType,
        meals: mealsData,
        total_cal: totalCal || 0,
      };

      if (existing) {
        const { error } = await supabase.from("weekly_templates").update(payload).eq("id", existing.id);
        if (error) { console.error("Update template error:", error); return; }
        console.log("✅ Template updated:", dayName);
      } else {
        const dayLabel = {"thu_2":"Thứ 2","thu_3":"Thứ 3","thu_4":"Thứ 4","thu_5":"Thứ 5","thu_6":"Thứ 6","thu_7":"Thứ 7","cn":"Chủ nhật"}[dayName] || dayName;
        const { error } = await supabase.from("weekly_templates").insert({
          user_id: userId, day_name: dayName, name: dayLabel, is_default: false, ...payload,
        });
        if (error) { console.error("Insert template error:", error); return; }
        console.log("✅ Template saved:", dayName);
      }
      // Reload templates (user's own only, not default)
      const { data: refreshed } = await supabase.from("weekly_templates")
        .select("*").eq("user_id", userId).or("is_default.is.null,is_default.eq.false")
        .order("created_at");
      if (refreshed) setWeeklyTemplates(refreshed);
    } catch (e) { console.error("Template save error:", e); }
  }, [userId]);

  // Delete a weekly template
  const deleteWeeklyTemplate = useCallback(async (dayName) => {
    if (!userId) return;
    try {
      const { error } = await supabase.from("weekly_templates").delete().eq("user_id", userId).eq("day_name", dayName);
      if (error) { console.error("Delete template error:", error); return; }
      setWeeklyTemplates(prev => prev.filter(t => t.day_name !== dayName));
      console.log("🗑️ Template deleted:", dayName);
    } catch (e) { console.error("Template delete error:", e); }
  }, [userId]);

  // Get template for a specific day
  const getWeeklyTemplate = useCallback((dayName) => {
    return weeklyTemplates.find(t => t.day_name === dayName) || null;
  }, [weeklyTemplates]);

  // Get daily logs for date range (for reports)
  const getDailyLogs = useCallback(async (startDate, endDate) => {
    if (!userId) return [];
    try {
      const { data, error } = await supabase.from("daily_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("log_date", startDate)
        .lte("log_date", endDate)
        .order("log_date", { ascending: true });
      if (error) { console.error("Daily logs error:", error); return []; }
      return data || [];
    } catch (e) { console.error("Daily logs error:", e); return []; }
  }, [userId]);

  // Get single daily log
  const getDailyLog = useCallback(async (date) => {
    if (!userId) return null;
    try {
      const { data, error } = await supabase.from("daily_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("log_date", date)
        .maybeSingle();
      if (error) { console.error("Daily log fetch error:", error); return null; }
      return data || null;
    } catch (e) { console.error("Daily log fetch error:", e); return null; }
  }, [userId]);

  // ===== DEFAULT TEMPLATES (admin-created) =====

  // Save default template (admin only)
  const saveDefaultTemplate = useCallback(async (name, dayType, mealsData, totalCal, editId = null, goalType = null, dietStrategy = null) => {
    if (!userId) return;
    try {
      if (editId) {
        const { error } = await supabase.from("weekly_templates").update({
          name: name || "Template mới",
          day_type: dayType,
          meals: mealsData,
          total_cal: totalCal || 0,
          goal_type: goalType,
          diet_strategy: dietStrategy,
        }).eq("id", editId);
        if (error) { console.error("Update default template error:", error); return; }
        console.log("✅ Default template updated:", name);
      } else {
        const { error } = await supabase.from("weekly_templates").insert({
          user_id: userId,
          name: name || "Template mới",
          day_name: "thu_2",
          day_type: dayType,
          meals: mealsData,
          total_cal: totalCal || 0,
          is_default: true,
          goal_type: goalType,
          diet_strategy: dietStrategy,
        });
        if (error) { console.error("Save default template error:", error); return; }
        console.log("✅ Default template saved:", name);
      }
      const { data: refreshed } = await supabase.from("weekly_templates")
        .select("*").eq("is_default", true).order("created_at");
      if (refreshed) setDefaultTemplates(refreshed);
    } catch (e) { console.error("Default template error:", e); }
  }, [userId]);

  // Delete default template (admin only)
  const deleteDefaultTemplate = useCallback(async (templateId) => {
    if (!userId) return;
    try {
      const { error } = await supabase.from("weekly_templates").delete().eq("id", templateId);
      if (error) { console.error("Delete default template error:", error); return; }
      setDefaultTemplates(prev => prev.filter(t => t.id !== templateId));
      console.log("🗑️ Default template deleted:", templateId);
    } catch (e) { console.error("Delete default template error:", e); }
  }, [userId]);

  // Refresh default templates
  const refreshDefaultTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("weekly_templates")
        .select("*").eq("is_default", true).order("created_at");
      if (error) { console.error("Refresh default templates error:", error); return; }
      if (data) setDefaultTemplates(data);
    } catch (e) { console.error("Refresh error:", e); }
  }, []);

  // ===== WEEKLY BUNDLES (Gói tuần) =====

  // Save (create or update) a weekly bundle. `days` = {thu_2: templateId, thu_3: templateId, ...}
  const saveWeeklyBundle = useCallback(async (name, goalType, days, bundleId = null) => {
    if (!userId) return;
    try {
      if (bundleId) {
        const { error } = await supabase.from("weekly_bundles").update({
          name: name || "Gói tuần mới", goal_type: goalType, days, updated_at: new Date().toISOString(),
        }).eq("id", bundleId);
        if (error) { console.error("Update weekly bundle error:", error); return; }
        console.log("✅ Weekly bundle updated:", name);
      } else {
        const { error } = await supabase.from("weekly_bundles").insert({
          name: name || "Gói tuần mới", goal_type: goalType, days, created_by: userId,
        });
        if (error) { console.error("Insert weekly bundle error:", error); return; }
        console.log("✅ Weekly bundle saved:", name);
      }
      const { data: refreshed } = await supabase.from("weekly_bundles").select("*").order("created_at");
      if (refreshed) setWeeklyBundles(refreshed);
    } catch (e) { console.error("Weekly bundle save error:", e); }
  }, [userId]);

  // Delete a weekly bundle
  const deleteWeeklyBundle = useCallback(async (bundleId) => {
    try {
      const { error } = await supabase.from("weekly_bundles").delete().eq("id", bundleId);
      if (error) { console.error("Delete weekly bundle error:", error); return; }
      setWeeklyBundles(prev => prev.filter(b => b.id !== bundleId));
      console.log("🗑️ Weekly bundle deleted:", bundleId);
    } catch (e) { console.error("Weekly bundle delete error:", e); }
  }, []);

  const refreshWeeklyBundles = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("weekly_bundles").select("*").order("created_at");
      if (error) { console.error("Refresh weekly bundles error:", error); return; }
      if (data) setWeeklyBundles(data);
    } catch (e) { console.error("Refresh error:", e); }
  }, []);

  return {
    loaded, meals, getMeals, getTodayMeals, hasMealsToday, getMealHistory, foodCache,
    saveMealToCloud, saveFoodCache, deleteFoodCache,
    weeklyTemplates, saveWeeklyTemplate, deleteWeeklyTemplate, getWeeklyTemplate,
    defaultTemplates, saveDefaultTemplate, deleteDefaultTemplate, refreshDefaultTemplates,
    weeklyBundles, saveWeeklyBundle, deleteWeeklyBundle, refreshWeeklyBundles,
    applyTemplate,
    getDailyLogs, getDailyLog,
    todayLog, eatenMeals, toggleEaten, removeDayMeal, moveDayMeal, reloadToday: loadTodayLog,
  };
}
