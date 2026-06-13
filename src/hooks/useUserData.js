import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

// Stores: ai_settings, food_cache, meals_train, meals_rest
// All in one "user_data" approach using profiles table's JSONB or a simple key-value approach

export function useUserData(userId) {
  const [loaded, setLoaded] = useState(false);

  // Load all user data from Supabase into localStorage on login
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data } = await supabase.from("meal_logs").select("*").eq("user_id", userId).eq("log_date", new Date().toISOString().slice(0,10));
        if (data && data.length > 0) {
          // Rebuild meals from meal_logs
          const trainMeals = {};
          const restMeals = {};
          data.forEach(d => {
            const target = d.day_type === "train" ? trainMeals : restMeals;
            target[d.meal_id] = d.items;
          });
          if (Object.keys(trainMeals).length > 0) {
            const existing = JSON.parse(localStorage.getItem("meals_train") || "null");
            if (existing) {
              existing.forEach(m => { if (trainMeals[m.id]) m.items = trainMeals[m.id]; });
              localStorage.setItem("meals_train", JSON.stringify(existing));
            }
          }
          if (Object.keys(restMeals).length > 0) {
            const existing = JSON.parse(localStorage.getItem("meals_rest") || "null");
            if (existing) {
              existing.forEach(m => { if (restMeals[m.id]) m.items = restMeals[m.id]; });
              localStorage.setItem("meals_rest", JSON.stringify(existing));
            }
          }
        }

        // Load food cache from Supabase
        const { data: cacheData } = await supabase.from("food_cache").select("*");
        if (cacheData && cacheData.length > 0) {
          const fc = JSON.parse(localStorage.getItem("foodCache") || "{}");
          cacheData.forEach(d => {
            const k = d.food_name.toLowerCase().trim();
            if (!fc[k]) fc[k] = { p: Number(d.protein), c: Number(d.carb), f: Number(d.fat), fiber: Number(d.fiber), cal: Number(d.cal), gram: d.gram };
          });
          localStorage.setItem("foodCache", JSON.stringify(fc));
        }

        // Load AI settings
        // We'll use a simple approach: store in profiles table via a settings column
        // For now, sync from Supabase meal_logs metadata
      } catch (e) { console.error("UserData load error:", e); }
      setLoaded(true);
    })();
  }, [userId]);

  // Save meal to Supabase
  const saveMealToCloud = useCallback(async (mealId, dayType, items) => {
    if (!userId) return;
    try {
      const totalCal = items.reduce((s, i) => s + (i.cal || 0), 0);
      const totalP = items.reduce((s, i) => s + (i.p || i.protein || 0), 0);
      const totalC = items.reduce((s, i) => s + (i.c || i.carb || 0), 0);
      const totalF = items.reduce((s, i) => s + (i.f || i.fat || 0), 0);
      
      // Upsert by user + meal + date + day_type
      const today = new Date().toISOString().slice(0, 10);
      const { data: existing } = await supabase.from("meal_logs")
        .select("id").eq("user_id", userId).eq("meal_id", mealId).eq("day_type", dayType).eq("log_date", today).single();
      
      if (existing) {
        await supabase.from("meal_logs").update({ items, total_cal: totalCal, total_protein: totalP, total_carb: totalC, total_fat: totalF })
          .eq("id", existing.id);
      } else {
        await supabase.from("meal_logs").insert({
          user_id: userId, meal_id: mealId, day_type: dayType, log_date: today,
          items, total_cal: totalCal, total_protein: totalP, total_carb: totalC, total_fat: totalF,
        });
      }
    } catch (e) { console.error("Meal save error:", e); }
  }, [userId]);

  // Save food to global cache on Supabase
  const saveFoodCache = useCallback(async (foods, provider) => {
    if (!userId) return;
    for (const f of foods) {
      try {
        const name = (f.name || f.food || "").toLowerCase().trim();
        if (!name) continue;
        await supabase.from("food_cache").upsert({
          food_name: name, gram: f.gram || 100,
          protein: f.protein || f.p || 0, carb: f.carb || f.c || 0,
          fat: f.fat || f.f || 0, fiber: f.fiber || 0, cal: f.cal || 0,
          ai_provider: provider,
        }, { onConflict: "food_name,gram" });
      } catch {}
    }
  }, [userId]);

  // Save AI settings to localStorage + Supabase (using a simple approach)
  const saveAiSettings = useCallback(async (settings) => {
    localStorage.setItem("aiProvider", settings.aiProvider || "claude");
    localStorage.setItem("claudeKey", settings.claudeKey || "");
    localStorage.setItem("geminiKey", settings.geminiKey || "");
    localStorage.setItem("gptKey", settings.gptKey || "");
    localStorage.setItem("geminiModel", settings.geminiModel || "gemini-2.5-flash");
    localStorage.setItem("gptModel", settings.gptModel || "gpt-4o-mini");
    // Optionally sync encrypted keys to Supabase - skip for security
  }, []);

  return { loaded, saveMealToCloud, saveFoodCache, saveAiSettings };
}
