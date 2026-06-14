import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const defaultStructure = {
  train: [
    {id:"sang",icon:"🌅",name:"Sáng",items:[]},
    {id:"trua",icon:"☀️",name:"Trưa",items:[]},
    {id:"phu1",icon:"☕",name:"Phụ 1 (VP)",items:[]},
    {id:"phu2",icon:"💪",name:"Phụ 2 (pre-workout)",items:[]},
    {id:"toi",icon:"🌙",name:"Tối",items:[]},
  ],
  rest: [
    {id:"sang",icon:"🌅",name:"Sáng",items:[]},
    {id:"trua",icon:"☀️",name:"Trưa",items:[]},
    {id:"phu1",icon:"☕",name:"Phụ 1 (VP)",items:[]},
    {id:"toi",icon:"🌙",name:"Tối",items:[]},
  ],
};

export function useUserData(userId) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) { setLoaded(true); return; }
    (async () => {
      try {
        // Load ALL meals for this user (fixed menu, not daily log)
        const { data, error } = await supabase.from("meal_logs").select("*").eq("user_id", userId);
        if (error) console.error("Load meals error:", error);
        if (data && data.length > 0) {
          const trainMeals = {};
          const restMeals = {};
          data.forEach(d => {
            const target = d.day_type === "train" ? trainMeals : restMeals;
            target[d.meal_id] = d.items;
          });
          ["train", "rest"].forEach(dt => {
            const bucket = dt === "train" ? trainMeals : restMeals;
            if (Object.keys(bucket).length > 0) {
              const key = `meals_${dt}`;
              let existing = JSON.parse(JSON.stringify(defaultStructure[dt]));
              existing.forEach(m => { if (bucket[m.id]) m.items = bucket[m.id]; });
              localStorage.setItem(key, JSON.stringify(existing));
              console.log(`✅ Synced ${Object.keys(bucket).length} meals for ${dt} from cloud`);
            }
          });
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
          localStorage.setItem("foodCache", JSON.stringify(fc));
        }
      } catch (e) { console.error("UserData load error:", e); }
      setLoaded(true);
    })();
  }, [userId]);

  // Save meal — fixed menu, upsert by user_id + meal_id + day_type (no date)
  const saveMealToCloud = useCallback(async (mealId, dayType, items) => {
    if (!userId) return;
    try {
      const totalCal = items.reduce((s, i) => s + (i.cal || 0), 0);
      const totalP = items.reduce((s, i) => s + (i.p || i.protein || 0), 0);
      const totalC = items.reduce((s, i) => s + (i.c || i.carb || 0), 0);
      const totalF = items.reduce((s, i) => s + (i.f || i.fat || 0), 0);

      // Find existing record (no date filter — fixed menu)
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
    } catch (e) { console.error("Meal save error:", e); }
  }, [userId]);

  // Save food to global cache
  const saveFoodCache = useCallback(async (foods, provider) => {
    if (!userId) return;
    for (const f of foods) {
      try {
        const name = (f.name || f.food || "").toLowerCase().trim();
        if (!name) continue;
        const { error } = await supabase.from("food_cache").upsert({
          food_name: name, gram: f.gram || 100,
          protein: f.protein || f.p || 0, carb: f.carb || f.c || 0,
          fat: f.fat || f.f || 0, fiber: f.fiber || 0, cal: f.cal || 0,
          ai_provider: provider || "unknown",
        }, { onConflict: "food_name,gram" });
        if (error) console.error("Food cache upsert error:", name, error);
      } catch (e) { console.error("Food cache error:", e); }
    }
    console.log("✅ Food cache synced:", foods.length, "items");
  }, [userId]);

  return { loaded, saveMealToCloud, saveFoodCache };
}
