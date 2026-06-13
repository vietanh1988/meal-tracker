import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export function useWeightLog(userId) {
  const [weightLog, setWeightLogState] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load from Supabase only
  const loadFromCloud = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const { data, error } = await supabase.from("weight_logs").select("*").eq("user_id", userId).order("week", { ascending: true });
      if (error) { console.error("Weight load error:", error); setLoading(false); return; }
      const logs = (data || []).map(d => ({
        id: d.id,
        week: d.week,
        date: new Date(d.logged_date).toLocaleDateString("vi-VN"),
        kg: Number(d.kg),
        delta: d.delta != null ? Number(d.delta) : null,
      }));
      setWeightLogState(logs);
      console.log(`✅ Loaded ${logs.length} weight entries from cloud`);
    } catch (e) { console.error("Weight load error:", e); }
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadFromCloud(); }, [loadFromCloud]);

  const setWeightLog = (logs) => { setWeightLogState(logs); };

  // Add new weight entry — Supabase only
  const addWeight = useCallback(async (kg) => {
    if (!userId) return;
    const prev = weightLog.length > 0 ? weightLog[weightLog.length - 1].kg : kg;
    const delta = Math.round((kg - prev) * 10) / 10;
    const entry = { week: weightLog.length + 1, kg, delta: delta === 0 ? null : delta };
    try {
      const { data, error } = await supabase.from("weight_logs").insert({
        user_id: userId, week: entry.week, kg: entry.kg, delta: entry.delta,
        logged_date: new Date().toISOString().slice(0, 10),
      }).select().single();
      if (error) { console.error("Weight insert error:", error); return; }
      // Reload from cloud to stay in sync
      await loadFromCloud();
      console.log("✅ Weight saved to cloud:", kg, "kg");
    } catch (e) { console.error("Weight save error:", e); }
    return entry;
  }, [userId, weightLog, loadFromCloud]);

  // Delete weight entry — Supabase only
  const deleteWeight = useCallback(async (id) => {
    if (!userId || !id) return;
    try {
      const { error } = await supabase.from("weight_logs").delete().eq("id", id);
      if (error) { console.error("Weight delete error:", error); return; }
      await loadFromCloud();
      console.log("✅ Weight entry deleted from cloud");
    } catch (e) { console.error("Weight delete error:", e); }
  }, [userId, loadFromCloud]);

  // Reset all weight entries — Supabase only
  const resetWeights = useCallback(async () => {
    if (!userId) return;
    try {
      const { error } = await supabase.from("weight_logs").delete().eq("user_id", userId);
      if (error) { console.error("Weight reset error:", error); return; }
      setWeightLogState([]);
      console.log("✅ All weight entries reset");
    } catch (e) { console.error("Weight reset error:", e); }
  }, [userId]);

  return { weightLog, addWeight, deleteWeight, resetWeights, setWeightLog, loading };
}
