import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";

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
  const [foodCache, setFoodCache] = useState({});
  const [weeklyTemplates, setWeeklyTemplates] = useState([]);
  const [defaultTemplates, setDefaultTemplates] = useState([]);
  const lastFetchRef = useRef(0);

  // === Extracted fetch function — reusable ===
  const fetchAllData = useCallback(async (silent = false) => {
    if (!userId) { setLoaded(true); return; }
    try {
      // Load meals
      const { data, error } = await supabase.from("meal_logs").select("*").eq("user_id", userId);
      if (error) console.error("Load meals error:", error);
      if (data && data.length > 0) {
        const trainMeals = {}, restMeals = {};
        data.forEach(d => {
          const target = d.day_type === "train" ? trainMeals : restMeals;
          target[d.meal_id] = d.items;
        });
        const newMeals = {};
        ["train", "rest"].forEach(dt => {
          const bucket = dt === "train" ? trainMeals : restMeals;
          const base = JSON.parse(JSON.stringify(defaultStructure[dt]));
          base.forEach(m => { if (bucket[m.id]) m.items = bucket[m.id]; });
          newMeals[dt] = base;
          if (!silent && Object.keys(bucket).length > 0)
            console.log(`✅ Synced ${Object.keys(bucket).length} meals for ${dt} from cloud`);
        });
        setMeals(newMeals);
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

      if (!silent) console.log("✅ All data synced from cloud");
      lastFetchRef.current = Date.now();
    } catch (e) { console.error("UserData load error:", e); }
    setLoaded(true);
  }, [userId]);

  // Load on mount
  useEffect(() => {
    fetchAllData(false);
  }, [fetchAllData]);

  // Auto re-fetch when tab/app becomes visible (cross-device sync)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && userId) {
        // Only re-fetch if last fetch was >10 seconds ago (avoid rapid re-fetches)
        if (Date.now() - lastFetchRef.current > 10000) {
          console.log("🔄 Tab focused — re-syncing data...");
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

  // Update meals in state after save
  const updateMealsState = useCallback((mealId, dayType, items) => {
    setMeals(prev => {
      const updated = { ...prev };
      const list = [...(updated[dayType] || defaultStructure[dayType])];
      const idx = list.findIndex(m => m.id === mealId);
      if (idx >= 0) list[idx] = { ...list[idx], items };
      updated[dayType] = list;
      return updated;
    });
  }, []);

  // Save meal to Supabase
  const saveMealToCloud = useCallback(async (mealId, dayType, items) => {
    if (!userId) return;
    // Update local state immediately
    updateMealsState(mealId, dayType, items);
    try {
      const totalCal = items.reduce((s, i) => s + (i.cal || 0), 0);
      const totalP = items.reduce((s, i) => s + (i.p || i.protein || 0), 0);
      const totalC = items.reduce((s, i) => s + (i.c || i.carb || 0), 0);
      const totalF = items.reduce((s, i) => s + (i.f || i.fat || 0), 0);

      const { data: existing } = await supabase.from("meal_logs")
        .select("id").eq("user_id", userId).eq("meal_id", mealId).eq("day_type", dayType)
        .maybeSingle();

      const payload = { items, total_cal: totalCal, total_protein: totalP, total_carb: totalC, total_fat: totalF };

      if (existing) {
        const { error } = await supabase.from("meal_logs").update(payload).eq("id", existing.id);
        if (error) console.error("Update meal error:", error);
        else console.log("✅ Meal updated:", mealId, dayType);
      } else {
        const { error } = await supabase.from("meal_logs").insert({
          user_id: userId, meal_id: mealId, day_type: dayType,
          log_date: new Date().toISOString().slice(0, 10), ...payload,
        });
        if (error) console.error("Insert meal error:", error);
        else console.log("✅ Meal saved:", mealId, dayType);
      }

      // === Auto-save to daily_logs ===
      const today = new Date().toISOString().slice(0, 10);
      const currentMeals = meals[dayType] || defaultStructure[dayType];
      const updatedMeals = currentMeals.map(m => m.id === mealId ? { ...m, items } : m);
      const mealsWithItems = updatedMeals
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
    } catch (e) { console.error("Meal save error:", e); }
  }, [userId, updateMealsState, meals]);

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
  const saveDefaultTemplate = useCallback(async (name, dayType, mealsData, totalCal) => {
    if (!userId) return;
    try {
      const { error } = await supabase.from("weekly_templates").insert({
        user_id: userId,
        name: name || "Template mới",
        day_name: "thu_2",
        day_type: dayType,
        meals: mealsData,
        total_cal: totalCal || 0,
        is_default: true,
      });
      if (error) { console.error("Save default template error:", error); return; }
      console.log("✅ Default template saved:", name);
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
        updateMealsState(mealId, dayType, items);
        try {
          const totalCal = items.reduce((s, i) => s + (i.cal || 0), 0);
          const totalP = items.reduce((s, i) => s + (i.p || i.protein || 0), 0);
          const totalC = items.reduce((s, i) => s + (i.c || i.carb || 0), 0);
          const totalF = items.reduce((s, i) => s + (i.f || i.fat || 0), 0);
          const { data: existing } = await supabase.from("meal_logs")
            .select("id").eq("user_id", userId).eq("meal_id", mealId).eq("day_type", dayType)
            .maybeSingle();
          const payload = { items, total_cal: totalCal, total_protein: totalP, total_carb: totalC, total_fat: totalF };
          if (existing) {
            await supabase.from("meal_logs").update(payload).eq("id", existing.id);
          } else {
            await supabase.from("meal_logs").insert({ user_id: userId, meal_id: mealId, day_type: dayType, log_date: today, ...payload });
          }
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

  return {
    loaded, meals, getMeals, getMealHistory, foodCache,
    saveMealToCloud, saveFoodCache, deleteFoodCache,
    weeklyTemplates, saveWeeklyTemplate, deleteWeeklyTemplate, getWeeklyTemplate,
    defaultTemplates, saveDefaultTemplate, deleteDefaultTemplate, refreshDefaultTemplates,
    applyTemplate,
    saveDailyLog, getDailyLogs, getDailyLog,
  };
}
