import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { todayVN, fmtVN } from "../lib/dateVN";
import { normalizeWeights, weightRowsToFix } from "../lib/weightMath";

// Cân nặng: tối đa 1 lần cân / ngày (cân lại trong ngày = sửa số hôm đó).
// Sau mỗi lần thêm/sửa/xoá, số tuần (T1, T2…) và delta được tính lại theo
// thứ tự ngày và ghi lại vào DB, để không còn "tuần" bị lệch hay trùng.
export function useWeightLog(userId, authLoading) {
  const [weightLog, setWeightLogState] = useState([]);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef(Date.now());
  const rawRef = useRef([]);

  const toView = (rows) => rows.map(d => ({
    id: d.id,
    week: d.week,
    date: fmtVN(d.logged_date, true),
    logged_date: d.logged_date,
    kg: Number(d.kg),
    delta: d.delta != null ? Number(d.delta) : null,
  }));

  const loadFromCloud = useCallback(async (silent = false) => {
    if (authLoading) return;
    if (!userId) { setLoading(false); return; }
    try {
      const { data, error } = await supabase.from("weight_logs").select("*").eq("user_id", userId)
        .order("logged_date", { ascending: true }).order("created_at", { ascending: true });
      if (error) { console.error("Weight load error:", error); setLoading(false); return; }
      const raw = data || [];
      const norm = normalizeWeights(raw);
      rawRef.current = norm;
      setWeightLogState(toView(norm));
      // Sửa ngầm dữ liệu cũ bị lệch tuần/delta
      const fix = weightRowsToFix(raw, norm);
      if (fix.length > 0) {
        await Promise.all(fix.map(r => supabase.from("weight_logs").update({ week: r.week, delta: r.delta }).eq("id", r.id)));
      }
      if (!silent) console.log(`✅ Loaded ${norm.length} weight entries from cloud`);
    } catch (e) { console.error("Weight load error:", e); }
    setLoading(false);
    lastFetchRef.current = Date.now();
  }, [userId, authLoading]);

  useEffect(() => { loadFromCloud(false); }, [loadFromCloud]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && userId) {
        if (Date.now() - lastFetchRef.current > 30000) loadFromCloud(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [loadFromCloud, userId]);

  // Giữ cho tương thích — chỉ đổi state tạm, không ghi DB
  const setWeightLog = (logs) => { setWeightLogState(logs); };

  // Thêm cân nặng cho ngày `date` (mặc định hôm nay). Đã có số ngày đó → cập nhật.
  const addWeight = useCallback(async (kg, date = null) => {
    if (!userId) return null;
    const d = date || todayVN();
    try {
      const existing = rawRef.current.find(r => r.logged_date === d);
      if (existing) {
        const { error } = await supabase.from("weight_logs").update({ kg }).eq("id", existing.id);
        if (error) { console.error("Weight update error:", error); return null; }
      } else {
        const { error } = await supabase.from("weight_logs").insert({
          user_id: userId, week: rawRef.current.length + 1, kg, delta: null, logged_date: d,
        });
        if (error) { console.error("Weight insert error:", error); return null; }
      }
      await loadFromCloud(true);
      return { kg, logged_date: d };
    } catch (e) { console.error("Weight save error:", e); return null; }
  }, [userId, loadFromCloud]);

  const updateWeight = useCallback(async (id, kg) => {
    if (!userId || !id) return false;
    const { error } = await supabase.from("weight_logs").update({ kg }).eq("id", id);
    if (error) { console.error("Weight update error:", error); return false; }
    await loadFromCloud(true);
    return true;
  }, [userId, loadFromCloud]);

  const deleteWeight = useCallback(async (id) => {
    if (!userId || !id) return;
    try {
      const { error } = await supabase.from("weight_logs").delete().eq("id", id);
      if (error) { console.error("Weight delete error:", error); return; }
      await loadFromCloud(true);
    } catch (e) { console.error("Weight delete error:", e); }
  }, [userId, loadFromCloud]);

  const resetWeights = useCallback(async () => {
    if (!userId) return;
    try {
      const { error } = await supabase.from("weight_logs").delete().eq("user_id", userId);
      if (error) { console.error("Weight reset error:", error); return; }
      rawRef.current = [];
      setWeightLogState([]);
      lastFetchRef.current = Date.now();
    } catch (e) { console.error("Weight reset error:", e); }
  }, [userId]);

  return { weightLog, addWeight, updateWeight, deleteWeight, resetWeights, setWeightLog, loading };
}
