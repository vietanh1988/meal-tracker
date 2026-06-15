import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const DEFAULT = {cm:172,kg:63,age:25,goalKg:68,gym:4,goalType:"bulk",months:4,activity:"sedentary",gymDays:[0,2,4,5]};

export function useProfile(userId) {
  const [profile, setProfileState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setProfileState(DEFAULT); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
        if (cancelled) return;
        if (data && !error) {
          setProfileState({
            cm: data.cm || DEFAULT.cm,
            kg: Number(data.kg) || DEFAULT.kg,
            age: data.age || DEFAULT.age,
            goalKg: Number(data.goal_kg) || DEFAULT.goalKg,
            gym: data.gym || DEFAULT.gym,
            goalType: data.goal_type || DEFAULT.goalType,
            months: data.months || DEFAULT.months,
            activity: data.activity || DEFAULT.activity,
            gymDays: data.gym_days || DEFAULT.gymDays,
          });
        } else {
          // No profile in DB yet — use defaults and create one
          setProfileState(DEFAULT);
          await supabase.from("profiles").upsert({
            id: userId, cm: DEFAULT.cm, kg: DEFAULT.kg, age: DEFAULT.age,
            goal_kg: DEFAULT.goalKg, gym: DEFAULT.gym, goal_type: DEFAULT.goalType,
            months: DEFAULT.months, activity: DEFAULT.activity, gym_days: DEFAULT.gymDays,
          });
        }
      } catch (e) {
        console.error("Profile load error:", e);
        if (!cancelled) setProfileState(DEFAULT);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const setProfile = useCallback(async (p) => {
    const merged = { ...DEFAULT, ...p };
    setProfileState(merged);
    if (userId) {
      try {
        await supabase.from("profiles").upsert({
          id: userId, cm: merged.cm, kg: merged.kg, age: merged.age,
          goal_kg: merged.goalKg, gym: merged.gym, goal_type: merged.goalType,
          months: merged.months, activity: merged.activity, gym_days: merged.gymDays,
        });
      } catch (e) { console.error("Profile sync error:", e); }
    }
  }, [userId]);

  return { profile, setProfile, loading };
}
