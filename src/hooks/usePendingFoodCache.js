import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

// Quản lý "hàng chờ duyệt" cho món ăn lạ do AI/USDA tự tính (chưa có trong
// localFoodDB.js hay food_cache dùng chung). Khi user nhập món lạ và lưu bữa
// ăn, kết quả AI tính được lưu vào bảng food_cache_pending — CHỈ chính user
// đó dùng lại được ngay (đỡ tốn thêm lượt AI khi ăn lại món cũ), CHƯA chia sẻ
// cho user khác cho tới khi admin vào duyệt (tránh AI tính sai lan ra cả kho
// chung). Admin duyệt → copy sang food_cache thật (dùng chung toàn app).
export function usePendingFoodCache(userId, isAdmin) {
  const [myPending, setMyPending] = useState({});
  const [allPending, setAllPending] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);

  const refreshMyPending = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase.from("food_cache_pending").select("*").eq("created_by", userId);
    if (error) { console.error("Load my pending food error:", error); return; }
    const map = {};
    (data || []).forEach(d => {
      const k = (d.food_name || "").toLowerCase().trim();
      if (k) map[k] = { p: Number(d.protein), c: Number(d.carb), f: Number(d.fat), fiber: Number(d.fiber), cal: Number(d.cal), gram: d.gram };
    });
    setMyPending(map);
  }, [userId]);

  const refreshAllPending = useCallback(async () => {
    if (!isAdmin) return;
    const { data, error } = await supabase.from("food_cache_pending").select("*").order("created_at", { ascending: false });
    if (error) { console.error("Load all pending food error:", error); return; }
    setAllPending(data || []);
    setPendingCount((data || []).length);
  }, [isAdmin]);

  const refreshApprovedCount = useCallback(async () => {
    if (!isAdmin) return;
    const { count, error } = await supabase.from("food_cache").select("*", { count: "exact", head: true });
    if (error) { console.error("Count food_cache error:", error); return; }
    setApprovedCount(count || 0);
  }, [isAdmin]);

  useEffect(() => { refreshMyPending(); }, [refreshMyPending]);
  useEffect(() => { refreshAllPending(); refreshApprovedCount(); }, [refreshAllPending, refreshApprovedCount]);

  // Lưu món lạ AI/USDA vừa tính vào hàng chờ duyệt
  const savePendingFoodCache = useCallback(async (normalizedEntries, provider) => {
    if (!userId || !normalizedEntries) return;
    setMyPending(prev => {
      const next = { ...prev };
      Object.entries(normalizedEntries).forEach(([k, v]) => { if (k) next[k] = v; });
      return next;
    });
    for (const [name, v] of Object.entries(normalizedEntries)) {
      try {
        if (!name) continue;
        // Tránh dồn trùng: xoá bản chờ duyệt cũ của chính user này cho món này trước khi thêm bản mới
        await supabase.from("food_cache_pending").delete().eq("food_name", name).eq("created_by", userId);
        const { error } = await supabase.from("food_cache_pending").insert({
          food_name: name, gram: v.gram || 100,
          protein: v.p || 0, carb: v.c || 0, fat: v.f || 0, fiber: v.fiber || 0, cal: v.cal || 0,
          ai_provider: provider || "unknown", created_by: userId,
        });
        if (error) console.error("Pending food insert error:", name, error);
      } catch (e) { console.error("Pending food error:", e); }
    }
    if (isAdmin) refreshAllPending();
  }, [userId, isAdmin, refreshAllPending]);

  // Admin duyệt: copy sang food_cache thật (dùng chung), xoá khỏi hàng chờ
  const approvePendingFood = useCallback(async (row) => {
    try {
      const { error: upErr } = await supabase.from("food_cache").upsert({
        food_name: row.food_name, gram: row.gram || 100,
        protein: row.protein || 0, carb: row.carb || 0, fat: row.fat || 0,
        fiber: row.fiber || 0, cal: row.cal || 0, ai_provider: row.ai_provider || "unknown",
      }, { onConflict: "food_name,gram" });
      if (upErr) { console.error("Approve → food_cache error:", upErr); return; }
      const { error: delErr } = await supabase.from("food_cache_pending").delete().eq("id", row.id);
      if (delErr) console.error("Approve delete pending error:", delErr);
      setAllPending(prev => prev.filter(p => p.id !== row.id));
      setPendingCount(prev => Math.max(0, prev - 1));
      setApprovedCount(prev => prev + 1);
    } catch (e) { console.error("Approve pending food error:", e); }
  }, []);

  // Admin từ chối: xoá khỏi hàng chờ, không đưa vào kho chung
  const rejectPendingFood = useCallback(async (id) => {
    try {
      const { error } = await supabase.from("food_cache_pending").delete().eq("id", id);
      if (error) { console.error("Reject pending food error:", error); return; }
      setAllPending(prev => prev.filter(p => p.id !== id));
      setPendingCount(prev => Math.max(0, prev - 1));
    } catch (e) { console.error("Reject pending food error:", e); }
  }, []);

  return { myPending, allPending, pendingCount, approvedCount, savePendingFoodCache, approvePendingFood, rejectPendingFood };
}
