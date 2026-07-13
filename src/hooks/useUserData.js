import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { inferPatternFromItems } from "../lib/aiMenuService";
import { MEAL_PATTERNS } from "../mealPatterns";

const defaultStructure = {
  train: [
    {id:"sang",name:"Bữa sáng",items:[]},
    {id:"phu_sang",name:"Bữa phụ sáng",items:[]},
    {id:"trua",name:"Bữa trưa",items:[]},
    {id:"phu_chieu",name:"Bữa phụ chiều",items:[]},
    {id:"pre",name:"Pre-workout",items:[]},
    {id:"post",name:"Post-workout",items:[]},
    {id:"toi",name:"Bữa tối",items:[]},
  ],
  rest: [
    {id:"sang",name:"Bữa sáng",items:[]},
    {id:"phu_sang",name:"Bữa phụ sáng",items:[]},
    {id:"trua",name:"Bữa trưa",items:[]},
    {id:"phu_chieu",name:"Bữa phụ chiều",items:[]},
    {id:"pre",name:"Pre-workout",items:[]},
    {id:"post",name:"Post-workout",items:[]},
    {id:"toi",name:"Bữa tối",items:[]},
  ],
};

export function useUserData(userId) {
  const [loaded, setLoaded] = useState(false);
  const [meals, setMeals] = useState({ train: defaultStructure.train, rest: defaultStructure.rest });
  const mealsRef = useRef(meals); // luôn đồng bộ NGAY LẬP TỨC (không đợi React render lại)
  // để tránh race condition khi saveMealToCloud được gọi liên tiếp nhiều lần
  // (VD: "Lưu tất cả bữa" gọi 1 lần/bữa) — nếu đọc `meals` qua closure thì mỗi
  // lần gọi đều thấy snapshot CŨ, làm bảng daily_logs chỉ lưu đúng bữa cuối cùng.
  const [foodCache, setFoodCache] = useState({});
  const [weeklyTemplates, setWeeklyTemplates] = useState([]);
  const [defaultTemplates, setDefaultTemplates] = useState([]);
  const [weeklyBundles, setWeeklyBundles] = useState([]);
  const lastFetchRef = useRef(Date.now());
  // log_date thật của từng bữa trong `meals` — DB chỉ có đúng 2 "ô" (train/rest)
  // mỗi user, KHÔNG theo ngày thật, nên `meals[type]` có thể đang chứa dữ liệu
  // sót lại từ vài ngày trước (chưa bị ghi đè). Theo dõi riêng log_date để biết
  // đâu là dữ liệu THẬT của hôm nay — dùng cho hasMealsToday() bên dưới, KHÔNG
  // đổi hành vi getMeals() (nhiều nơi như WeightSuggestion cố tình lấy ví dụ
  // bữa ăn cũ theo loại ngày, không quan tâm có phải hôm nay không).
  const [mealLogDates, setMealLogDates] = useState({ train: {}, rest: {} });
  const mealLogDatesRef = useRef(mealLogDates);
  const todayStr = () => new Date().toISOString().slice(0, 10);

  // === Extracted fetch function — reusable ===
  const inFlightRef = useRef(false);
  const fetchAllData = useCallback(async (silent = false) => {
    // Guard chống gọi trùng: focus tab + mount + auth refresh có thể bắn
    // cùng lúc — request sau bị bỏ qua khi request trước chưa xong.
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      return await _fetchAllDataInner(silent);
    } finally {
      inFlightRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
  const _fetchAllDataInner = useCallback(async (silent = false) => {
    if (!userId) { setLoaded(true); return; }
    try {
      // Load meals
      const { data, error } = await supabase.from("meal_logs").select("*").eq("user_id", userId);
      if (error) console.error("Load meals error:", error);
      if (data && data.length > 0) {
        const trainMeals = {}, restMeals = {};
        const newDates = { train: {}, rest: {} };
        let metaByKey = {};
        data.forEach(d => {
          const target = d.day_type === "train" ? trainMeals : restMeals;
          target[d.meal_id] = d.items;
          newDates[d.day_type === "train" ? "train" : "rest"][d.meal_id] = d.log_date;
          // Lưu pattern + composite từ DB (nếu có)
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
              const mk = `${dt}_${m.id}`;
              const dbMeta = metaByKey[mk];
              if (dbMeta && dbMeta.pattern) {
                // Đọc thẳng từ DB — chính xác 100%
                m.pattern = dbMeta.pattern;
                m.composite = !!dbMeta.composite;
              } else {
                // Fallback: suy đoán từ items (data cũ chưa có cột pattern)
                const patternName = inferPatternFromItems(m.id, m.items);
                if (patternName) {
                  m.pattern = patternName;
                  const patterns = MEAL_PATTERNS[m.id] || [];
                  const found = patterns.find(p => p.name === patternName);
                  m.composite = !!(found && found.composite);
                }
              }
              // Khôi phục display name nếu thiếu
              if (m.pattern) {
                const patterns = MEAL_PATTERNS[m.id] || [];
                const found = patterns.find(p => p.name === m.pattern);
                if (found && found.dishes) {
                  const dishMap = {};
                  found.dishes.forEach(d => { if (d.food && d.display) dishMap[d.food] = d.display; });
                  m.items = m.items.map(it => {
                    if (!it.display && it.food && dishMap[it.food]) {
                      return { ...it, display: dishMap[it.food] };
                    }
                    return it;
                  });
                }
              }
            }
          });
          newMeals[dt] = base;
          if (!silent && Object.keys(bucket).length > 0)
            console.log(`✅ Synced ${Object.keys(bucket).length} meals for ${dt} from cloud`);
        });
        setMeals(newMeals);
        mealsRef.current = newMeals;
        setMealLogDates(newDates);
        mealLogDatesRef.current = newDates;
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
        if (!silent) console.log(`✅ Loaded ${cacheData.length} food cache entries from cloud`);
      }

      // Load user's weekly templates (NOT default)
      const { data: tplData, error: tplErr } = await supabase.from("weekly_templates")
        .select("*").eq("user_id", userId).or("is_default.is.null,is_default.eq.false")
        .order("created_at");
      if (tplErr) console.error("Load weekly templates error:", tplErr);
      if (tplData) {
        setWeeklyTemplates(tplData);
        if (!silent) console.log(`✅ Loaded ${tplData.length} user weekly templates`);
      }

      // Load default templates (admin-created, visible to all)
      const { data: defData, error: defErr } = await supabase.from("weekly_templates")
        .select("*").eq("is_default", true).order("created_at");
      if (defErr) console.error("Load default templates error:", defErr);
      if (defData) {
        setDefaultTemplates(defData);
        if (!silent) console.log(`✅ Loaded ${defData.length} default templates from admin`);
      }

      // Load weekly bundles (Gói tuần — admin ghép sẵn 7 mẫu/tuần, visible to all)
      const { data: bundleData, error: bundleErr } = await supabase.from("weekly_bundles")
        .select("*").order("created_at");
      if (bundleErr) console.error("Load weekly bundles error:", bundleErr);
      if (bundleData) {
        setWeeklyBundles(bundleData);
        if (!silent) console.log(`✅ Loaded ${bundleData.length} weekly bundles`);
      }

      if (!silent) console.log("✅ All data synced from cloud");
      lastFetchRef.current = Date.now();
    } catch (e) { console.error("UserData load error:", e); }
    setLoaded(true);
  }, [userId]);

  // Load on mount
  useEffect(() => {
    fetchAllData(false);
  }, [fetchAllData]);

  // Re-sync on visibility change (30s debounce, visibilitychange only)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && userId) {
        if (Date.now() - lastFetchRef.current > 30000) {
          console.log("🔄 Re-syncing meals data...");
          fetchAllData(true);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchAllData, userId]);

  // Get meals for a day type
  const getMeals = useCallback((type) => {
    return meals[type] || defaultStructure[type];
  }, [meals]);

  // Có bữa THẬT của hôm nay trong bucket `type` không (khác getMeals() —
  // hàm đó trả cả dữ liệu sót từ ngày cũ, cố tình giữ nguyên cho các chỗ
  // như WeightSuggestion lấy ví dụ theo loại ngày, không quan tâm ngày nào).
  // Dùng hàm này riêng cho những chỗ cần biết chính xác "hôm nay đã có gì
  // chưa" — VD gate auto-apply Lịch tuần, tránh bị dữ liệu sót đánh lừa.
  const hasMealsToday = useCallback((type) => {
    const list = meals[type] || defaultStructure[type];
    const dates = mealLogDates[type] || {};
    const t = todayStr();
    return list.some(m => m.items && m.items.length > 0 && dates[m.id] === t);
  }, [meals, mealLogDates]);

  // Lấy bữa ăn CHỈ CỦA HÔM NAY — dùng cho Dashboard/Tổng quan.
  // Bữa nào log_date !== today → trả items rỗng (không hiện data cũ).
  // getMeals() vẫn giữ nguyên cho WeightSuggestion, AI Coach... cần data mẫu.
  const getTodayMeals = useCallback((type) => {
    const list = meals[type] || defaultStructure[type];
    const dates = mealLogDates[type] || {};
    const t = todayStr();
    return list.map(m => (dates[m.id] === t) ? m : { ...m, items: [] });
  }, [meals, mealLogDates]);

  // Update meals in state after save
  const updateMealsState = useCallback((mealId, dayType, items, extra) => {
    setMeals(prev => {
      const updated = { ...prev };
      const list = [...(updated[dayType] || defaultStructure[dayType])];
      const idx = list.findIndex(m => m.id === mealId);
      if (idx >= 0) {
        list[idx] = { ...list[idx], items };
        // Truyền thêm composite + pattern cho MealCard hiển thị đúng
        if (extra?.composite !== undefined) list[idx].composite = extra.composite;
        if (extra?.pattern !== undefined) list[idx].pattern = extra.pattern;
      }
      updated[dayType] = list;
      mealsRef.current = updated;
      return updated;
    });
  }, []);

  // Đánh dấu log_date=hôm nay cho 1 bữa NGAY trong session (không đợi
  // fetchAllData load lại) — gọi song song mỗi khi ghi meal_logs thật.
  const markMealDateToday = useCallback((dayType, mealId) => {
    setMealLogDates(prev => {
      const updated = { ...prev, [dayType]: { ...(prev[dayType] || {}), [mealId]: todayStr() } };
      mealLogDatesRef.current = updated;
      return updated;
    });
  }, []);

  // Save meal to Supabase
  // skipDailyLog=true khi user đang SOẠN TRƯỚC cho loại ngày KHÁC hôm nay
  // (VD hôm nay Nghỉ nhưng bật pill Ngày tập để chuẩn bị cho mai) — vẫn lưu
  // bucket meal_logs bình thường, nhưng KHÔNG auto-ghi daily_logs của hôm
  // nay với day_type/món sai loại, tránh làm bẩn số liệu Báo cáo.
  const saveMealToCloud = useCallback(async (mealId, dayType, items, skipDailyLog = false) => {
    if (!userId) return;
    // Update local state immediately
    updateMealsState(mealId, dayType, items);
    markMealDateToday(dayType, mealId);
    try {
      const totalCal = items.reduce((s, i) => s + (i.cal || 0), 0);
      const totalP = items.reduce((s, i) => s + (i.p || i.protein || 0), 0);
      const totalC = items.reduce((s, i) => s + (i.c || i.carb || 0), 0);
      const totalF = items.reduce((s, i) => s + (i.f || i.fat || 0), 0);

      const payload = { user_id: userId, meal_id: mealId, day_type: dayType, log_date: new Date().toISOString().slice(0, 10), items, total_cal: totalCal, total_protein: totalP, total_carb: totalC, total_fat: totalF };

      const { error } = await supabase.from("meal_logs").upsert(payload, { onConflict: "user_id,meal_id,day_type" });
      if (error) console.error("Meal save error:", error);
      else console.log("✅ Meal saved:", mealId, dayType);

      // === Auto-save to daily_logs ===
      if (!skipDailyLog) {
      const today = new Date().toISOString().slice(0, 10);
      // Đọc từ mealsRef.current (đã đồng bộ NGAY qua updateMealsState ở trên) thay vì
      // biến `meals` (closure) — tránh bị "cũ" khi hàm này được gọi liên tiếp nhiều
      // lần trong cùng 1 lượt (VD "Lưu tất cả bữa" gọi 1 lần/bữa).
      const currentMeals = mealsRef.current[dayType] || defaultStructure[dayType];
      const mealsWithItems = currentMeals
        .filter(m => m.items && m.items.length > 0)
        .map(m => ({ meal_id: m.id, meal_name: m.name, items: m.items }));

      if (mealsWithItems.length > 0) {
        const dayCal = mealsWithItems.reduce((s, m) => s + (m.items || []).reduce((a, i) => a + (i.cal || 0), 0), 0);
        const dayP = mealsWithItems.reduce((s, m) => s + (m.items || []).reduce((a, i) => a + (i.p || i.protein || 0), 0), 0);
        const dayC = mealsWithItems.reduce((s, m) => s + (m.items || []).reduce((a, i) => a + (i.c || i.carb || 0), 0), 0);
        const dayF = mealsWithItems.reduce((s, m) => s + (m.items || []).reduce((a, i) => a + (i.f || i.fat || 0), 0), 0);
        const dayFiber = mealsWithItems.reduce((s, m) => s + (m.items || []).reduce((a, i) => a + (i.fiber || 0), 0), 0);

        const { error: dlErr } = await supabase.from("daily_logs").upsert({
          user_id: userId, log_date: today, day_type: dayType,
          meals: mealsWithItems, total_cal: Math.round(dayCal),
          total_protein: Math.round(dayP * 10) / 10,
          total_carb: Math.round(dayC * 10) / 10,
          total_fat: Math.round(dayF * 10) / 10,
          total_fiber: Math.round(dayFiber * 10) / 10,
          is_complete: false,
        }, { onConflict: "user_id,log_date" });
        if (dlErr) console.error("Daily log auto-save error:", dlErr);
        else console.log("✅ Daily log auto-saved:", today, mealsWithItems.length, "bữa");
      }
      }
    } catch (e) { console.error("Meal save error:", e); }
    // Block re-sync for 30s after save to prevent overwrite
    lastFetchRef.current = Date.now();
  }, [userId, updateMealsState]);

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

  // ===== DAILY LOGS =====

  // Save daily log (upsert by user_id + date)
  const saveDailyLog = useCallback(async (date, dayType, mealsData, totalCal, isComplete) => {
    if (!userId) return;
    try {
      const totalP = (mealsData || []).reduce((s, m) => s + (m.items || []).reduce((a, i) => a + (i.p || i.protein || 0), 0), 0);
      const totalC = (mealsData || []).reduce((s, m) => s + (m.items || []).reduce((a, i) => a + (i.c || i.carb || 0), 0), 0);
      const totalF = (mealsData || []).reduce((s, m) => s + (m.items || []).reduce((a, i) => a + (i.f || i.fat || 0), 0), 0);
      const totalFiber = (mealsData || []).reduce((s, m) => s + (m.items || []).reduce((a, i) => a + (i.fiber || 0), 0), 0);

      const { error } = await supabase.from("daily_logs").upsert({
        user_id: userId,
        log_date: date,
        day_type: dayType,
        meals: mealsData,
        total_cal: totalCal || 0,
        total_protein: Math.round(totalP * 10) / 10,
        total_carb: Math.round(totalC * 10) / 10,
        total_fat: Math.round(totalF * 10) / 10,
        total_fiber: Math.round(totalFiber * 10) / 10,
        is_complete: isComplete || false,
      }, { onConflict: "user_id,log_date" });

      if (error) console.error("Daily log save error:", error);
      else console.log("✅ Daily log saved:", date, isComplete ? "(complete)" : "(partial)");
    } catch (e) { console.error("Daily log error:", e); }
  }, [userId]);

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

  // Apply template
  const applyTemplate = useCallback(async (template) => {
    if (!userId || !template || !template.meals) return;
    const today = new Date().toISOString().slice(0, 10);
    const dayType = template.day_type || "train";
    const tplMeals = template.meals || [];

    for (const m of tplMeals) {
      const mealId = m.meal_id;
      const items = m.items || [];
      if (mealId && items.length > 0) {
        updateMealsState(mealId, dayType, items, { composite: !!m.composite, pattern: m.pattern || null });
        markMealDateToday(dayType, mealId);
        try {
          const totalCal = items.reduce((s, i) => s + (i.cal || 0), 0);
          const totalP = items.reduce((s, i) => s + (i.p || i.protein || 0), 0);
          const totalC = items.reduce((s, i) => s + (i.c || i.carb || 0), 0);
          const totalF = items.reduce((s, i) => s + (i.f || i.fat || 0), 0);
          const payload = { user_id: userId, meal_id: mealId, day_type: dayType, log_date: today, items, total_cal: totalCal, total_protein: totalP, total_carb: totalC, total_fat: totalF, pattern: m.pattern || null, composite: !!m.composite };
          await supabase.from("meal_logs").upsert(payload, { onConflict: "user_id,meal_id,day_type" });
        } catch (e) { console.error("Apply meal_logs error:", e); }
      }
    }

    try {
      const mealsForLog = tplMeals.filter(m => m.items && m.items.length > 0);
      const dayCal = mealsForLog.reduce((s, m) => s + (m.items || []).reduce((a, i) => a + (i.cal || 0), 0), 0);
      const dayP = mealsForLog.reduce((s, m) => s + (m.items || []).reduce((a, i) => a + (i.p || i.protein || 0), 0), 0);
      const dayC = mealsForLog.reduce((s, m) => s + (m.items || []).reduce((a, i) => a + (i.c || i.carb || 0), 0), 0);
      const dayF = mealsForLog.reduce((s, m) => s + (m.items || []).reduce((a, i) => a + (i.f || i.fat || 0), 0), 0);
      const dayFiber = mealsForLog.reduce((s, m) => s + (m.items || []).reduce((a, i) => a + (i.fiber || 0), 0), 0);

      const { error } = await supabase.from("daily_logs").upsert({
        user_id: userId, log_date: today, day_type: dayType,
        meals: mealsForLog, total_cal: Math.round(dayCal),
        total_protein: Math.round(dayP * 10) / 10,
        total_carb: Math.round(dayC * 10) / 10,
        total_fat: Math.round(dayF * 10) / 10,
        total_fiber: Math.round(dayFiber * 10) / 10,
        is_complete: mealsForLog.length >= 3,
      }, { onConflict: "user_id,log_date" });
      if (error) console.error("Apply daily_logs error:", error);
      else console.log("✅ Template applied:", template.name || "unnamed", "→", mealsForLog.length, "bữa →", Math.round(dayCal), "cal");
    } catch (e) { console.error("Apply daily_logs error:", e); }
  }, [userId, updateMealsState]);

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
    saveDailyLog, getDailyLogs, getDailyLog,
  };
}
