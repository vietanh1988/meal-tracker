import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";

const DEFAULT = {cm:172,kg:63,birthYear:1987,goalKg:68,goalType:"bulk",months:4,exerciseType:"gym",frequency:"regular",dietStrategy:"balanced",calorieMode:"standard",gymDays:[0,2,4,5]};

export function useProfile(userId, authLoading) {
  const [profile, setProfileState] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef(Date.now());

  const fetchProfile = useCallback(async (silent = false) => {
    if (authLoading) return; // auth chưa xác thực xong, chờ - không set state gì cả
    if (!userId) { setProfileState(DEFAULT); setLoading(false); return; }
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (data && !error) {
        const p = {
          cm: data.cm || DEFAULT.cm,
          kg: Number(data.kg) || DEFAULT.kg,
          birthYear: data.birth_year || (data.age ? new Date().getFullYear() - data.age : DEFAULT.birthYear),
          goalKg: Number(data.goal_kg) || DEFAULT.goalKg,
          gym: data.gym || 4,
          goalType: data.goal_type || DEFAULT.goalType,
          months: data.months || DEFAULT.months,
          activity: data.activity || "sedentary",
          gymDays: data.gym_days || DEFAULT.gymDays,
        };
        if(data.gender) p.gender = data.gender;
        if(data.exercise_type) p.exerciseType = data.exercise_type;
        if(data.cardio_intensity) p.cardioIntensity = data.cardio_intensity;
        if(data.onboarding_done) p.onboardingDone = data.onboarding_done;
        if(data.frequency) p.frequency = data.frequency;
        if(data.diet_strategy) p.dietStrategy = data.diet_strategy;
        if(data.calorie_mode) p.calorieMode = data.calorie_mode;
        p.usesSupplements = data.uses_supplements === true;
        // Cấu hình bật/tắt bữa RIÊNG của user (override cá nhân, khác với cấu hình
        // mặc định chung do admin đặt trong appSettings.meal_config). Nếu user chưa
        // từng tự chỉnh thì cột này null, app sẽ dùng mặc định chung của admin.
        if(data.meal_config) p.mealConfig = data.meal_config;
        if(data.banner_dismissed_date) p.bannerDismissedDate = data.banner_dismissed_date;
        // Chỉ ĐỌC — tier đổi qua admin (UsersTab) hoặc luồng thanh toán, không
        // qua setProfile() của user. Mặc định "free" nếu cột trống (an toàn:
        // chưa xác định được tier thì coi như free, không tự cấp quyền).
        p.tier = data.tier || "free";
        p.isLocked = !!data.is_locked;
        setProfileState(p);
        if (!silent) console.log("✅ Profile loaded from cloud");
      } else {
        setProfileState(DEFAULT);
        await supabase.from("profiles").upsert({
          id: userId, cm: DEFAULT.cm, kg: DEFAULT.kg,
          birth_year: DEFAULT.birthYear,
          goal_kg: DEFAULT.goalKg, goal_type: DEFAULT.goalType,
          months: DEFAULT.months, exercise_type: DEFAULT.exerciseType,
          frequency: DEFAULT.frequency, diet_strategy: DEFAULT.dietStrategy,
          calorie_mode: DEFAULT.calorieMode,
          gym_days: DEFAULT.gymDays,
        });
      }
    } catch (e) {
      console.error("Profile load error:", e);
      setProfileState(DEFAULT);
    }
    setLoading(false);
    lastFetchRef.current = Date.now();
  }, [userId, authLoading]);

  useEffect(() => { fetchProfile(false); }, [fetchProfile]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && userId) {
        if (Date.now() - lastFetchRef.current > 30000) {
          fetchProfile(true);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchProfile, userId]);

  const setProfile = useCallback(async (p) => {
    const merged = { ...DEFAULT, ...p };
    setProfileState(merged);
    lastFetchRef.current = Date.now();
    if (userId) {
      try {
        const payload = {
          id: userId, cm: merged.cm, kg: merged.kg,
          birth_year: merged.birthYear,
          goal_kg: merged.goalKg, goal_type: merged.goalType,
          months: merged.months, gym_days: merged.gymDays,
        };
        if(merged.gender) payload.gender = merged.gender;
        if(merged.exerciseType) payload.exercise_type = merged.exerciseType;
        if(merged.onboardingDone !== undefined) payload.onboarding_done = merged.onboardingDone;
        if(merged.frequency) payload.frequency = merged.frequency;
        if(merged.dietStrategy) payload.diet_strategy = merged.dietStrategy;
        if(merged.calorieMode) payload.calorie_mode = merged.calorieMode;
        if(merged.usesSupplements !== undefined) payload.uses_supplements = merged.usesSupplements === true;
        if(merged.mealConfig) payload.meal_config = merged.mealConfig;
        if(merged.bannerDismissedDate) payload.banner_dismissed_date = merged.bannerDismissedDate;
        // Legacy fields
        if(merged.gym) payload.gym = merged.gym;
        if(merged.activity) payload.activity = merged.activity;
        await supabase.from("profiles").upsert(payload);
      } catch (e) { console.error("Profile sync error:", e); }
    }
  }, [userId]);

  return { profile, setProfile, loading };
}
