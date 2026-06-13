import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const INIT = [{week:1,date:"22/05/2026",kg:63.0,delta:null},{week:2,date:"29/05/2026",kg:63.3,delta:0.3},{week:3,date:"05/06/2026",kg:63.5,delta:0.2},{week:4,date:"12/06/2026",kg:64.0,delta:0.5}];

export function useWeightLog(userId) {
  const [weightLog, setWeightLogState] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data } = await supabase.from("weight_logs").select("*").eq("user_id", userId).order("week", { ascending: true });
        if (data && data.length > 0) {
          const logs = data.map(d => ({
            id: d.id,
            week: d.week,
            date: new Date(d.logged_date).toLocaleDateString("vi-VN"),
            kg: Number(d.kg),
            delta: d.delta ? Number(d.delta) : null,
          }));
          setWeightLogState(logs);
          localStorage.setItem("weightLog", JSON.stringify(logs));
        } else {
          const saved = localStorage.getItem("weightLog");
          const local = saved ? JSON.parse(saved) : INIT;
          setWeightLogState(local);
          // Migrate local data to Supabase
          for (const entry of local) {
            try {
              await supabase.from("weight_logs").insert({
                user_id: userId, week: entry.week, kg: entry.kg, delta: entry.delta,
                logged_date: entry.date ? entry.date.split("/").reverse().join("-") : new Date().toISOString().slice(0,10),
              });
            } catch {}
          }
        }
      } catch {
        const saved = localStorage.getItem("weightLog");
        setWeightLogState(saved ? JSON.parse(saved) : INIT);
      }
      setLoading(false);
    })();
  }, [userId]);

  const setWeightLog = (logs) => {
    setWeightLogState(logs);
    localStorage.setItem("weightLog", JSON.stringify(logs));
  };

  const addWeight = async (kg) => {
    const prev = weightLog.length > 0 ? weightLog[weightLog.length-1].kg : kg;
    const delta = Math.round((kg-prev)*10)/10;
    const entry = {week:weightLog.length+1, date:new Date().toLocaleDateString("vi-VN"), kg, delta:delta===0?null:delta};
    const updated = [...weightLog, entry];
    setWeightLogState(updated);
    localStorage.setItem("weightLog", JSON.stringify(updated));
    if (userId) {
      try {
        await supabase.from("weight_logs").insert({
          user_id: userId, week: entry.week, kg: entry.kg, delta: entry.delta,
          logged_date: new Date().toISOString().slice(0,10),
        });
      } catch (e) { console.error("Weight sync error:", e); }
    }
    return entry;
  };

  return { weightLog, addWeight, setWeightLog, loading };
}
