import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const DEFAULT = {cm:172,kg:63,age:25,goalKg:68,gym:4,goalType:"bulk",months:4,activity:"sedentary",gymDays:[0,2,4,5]};

export function useProfile(userId) {
  const [profile, setProfileState] = useState(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let done = false;
    const timeout = setTimeout(() => {
      if (!done) {
        const saved = localStorage.getItem("profile");
        if (saved) setProfileState({...DEFAULT, ...JSON.parse(saved)});
        setLoading(false);
        done = true;
      }
    }, 3000);
    (async () => {
      try {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
        if (!done && data && !error) {
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
          setProfileState(p);
          localStorage.setItem("profile", JSON.stringify(p));
        }
      } catch {
        const saved = localStorage.getItem("profile");
        if (saved) setProfileState({...DEFAULT, ...JSON.parse(saved)});
      }
      if (!done) { setLoading(false); done = true; }
      clearTimeout(timeout);
    })();
    return () => clearTimeout(timeout);
  }, [userId]);

  const saveProfile = async (p) => {
    const merged = {...DEFAULT, ...p};
    setProfileState(merged);
    localStorage.setItem("profile", JSON.stringify(merged));
    if (userId) {
      try {
        await supabase.from("profiles").upsert({
          id: userId, cm: merged.cm, kg: merged.kg, age: merged.age,
          goal_kg: merged.goalKg, gym: merged.gym, goal_type: merged.goalType,
          months: merged.months, activity: merged.activity, gym_days: merged.gymDays,
        });
      } catch (e) { console.error("Profile sync error:", e); }
    }
  };

  return { profile, setProfile: saveProfile, loading };
}
