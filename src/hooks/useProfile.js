import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";

const DEFAULT = {cm:172,kg:63,age:25,goalKg:68,gym:4,goalType:"bulk",months:4,activity:"sedentary",gymDays:[0,2,4,5]};

export function useProfile(userId) {
  const [profile, setProfileState] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef(Date.now());

  const fetchProfile = useCallback(async (silent = false) => {
    if (!userId) { setProfileState(DEFAULT); setLoading(false); return; }
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (data && !error) {
        const p = {
          cm: data.cm || DEFAULT.cm,
          kg: Number(data.kg) || DEFAULT.kg,
          age: data.age || DEFAULT.age,
          goalKg: Number(data.goal_kg) || DEFAULT.goalKg,
          gym: data.gym || DEFAULT.gym,
          goalType: data.goal_type || DEFAULT.goalType,
          months: data.months || DEFAULT.months,
          activity: data.activity || DEFAULT.activity,
          gymDays: data.gym_days || DEFAULT.gymDays,
        };
        // Load extra fields if they exist in DB
        if(data.gender) p.gender = data.gender;
        if(data.exercise_type) p.exerciseType = data.exercise_type;
        if(data.cardio_intensity) p.cardioIntensity = data.cardio_intensity;
        if(data.onboarding_done) p.onboardingDone = data.onboarding_done;
        setProfileState(p);
        if (!silent) console.log("✅ Profile loaded from cloud");
      } else {
        setProfileState(DEFAULT);
        await supabase.from("profiles").upsert({
          id: userId, cm: DEFAULT.cm, kg: DEFAULT.kg, age: DEFAULT.age,
          goal_kg: DEFAULT.goalKg, gym: DEFAULT.gym, goal_type: DEFAULT.goalType,
          months: DEFAULT.months, activity: DEFAULT.activity, gym_days: DEFAULT.gymDays,
        });
      }
    } catch (e) {
      console.error("Profile load error:", e);
      setProfileState(DEFAULT);
    }
    setLoading(false);
    lastFetchRef.current = Date.now();
  }, [userId]);

  useEffect(() => { fetchProfile(false); }, [fetchProfile]);

  // Re-sync on visibility change (30s debounce)
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
          id: userId, cm: merged.cm, kg: merged.kg, age: merged.age,
          goal_kg: merged.goalKg, gym: merged.gym, goal_type: merged.goalType,
          months: merged.months, activity: merged.activity, gym_days: merged.gymDays,
        };
        // Save extra fields if present
        if(merged.gender) payload.gender = merged.gender;
        if(merged.exerciseType) payload.exercise_type = merged.exerciseType;
        if(merged.cardioIntensity) payload.cardio_intensity = merged.cardioIntensity;
        if(merged.onboardingDone !== undefined) payload.onboarding_done = merged.onboardingDone;
        await supabase.from("profiles").upsert(payload);
      } catch (e) { console.error("Profile sync error:", e); }
    }
  }, [userId]);

  return { profile, setProfile, loading };
}
