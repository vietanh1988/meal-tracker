// 01/11: dữ liệu Tập luyện của khách — giáo án (workout_plans), buổi tập (workout_sessions, 120 ngày gần nhất), bài tự thêm (user_exercises).
// Ghi thẳng bảng (RLS: chỉ dòng của mình). Bảng chưa có trên máy chủ (chưa chạy SQL) → giữ trên máy (localStorage) để app vẫn dùng được.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { addDays, todayVN } from "../lib/dateVN";

const LS = (uid) => `fp_workout_${uid}`;
const readLS = (uid) => { try { return JSON.parse(localStorage.getItem(LS(uid)) || "null") || { plans: [], sessions: [], custom: [] }; } catch (e) { return { plans: [], sessions: [], custom: [] }; } };
const writeLS = (uid, v) => { try { localStorage.setItem(LS(uid), JSON.stringify(v)); } catch (e) { /* */ } };
const missing = (e) => e && (e.code === "42P01" || e.code === "PGRST205" || /does not exist|schema cache/i.test(e.message || ""));
const uuid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `l-${Date.now()}-${Math.random().toString(36).slice(2)}`);

export function useWorkout(userId, enabled = true) {
  const [plans, setPlans] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [custom, setCustom] = useState([]);
  const [ready, setReady] = useState(false);
  const local = useRef(false);
  const snap = useRef({ plans: [], sessions: [], custom: [] });
  useEffect(() => { snap.current = { plans, sessions, custom }; }, [plans, sessions, custom]);
  const persistLocal = (next) => { if (local.current) writeLS(userId, { ...snap.current, ...next }); };

  const load = useCallback(async () => {
    if (!userId || !enabled) return;
    const since = addDays(todayVN(), -120);
    const [p, s, c] = await Promise.all([
      supabase.from("workout_plans").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("workout_sessions").select("*").eq("user_id", userId).gte("day", since).order("day", { ascending: false }).limit(300),
      supabase.from("user_exercises").select("*").eq("user_id", userId).order("created_at"),
    ]);
    if (missing(p.error) || missing(s.error)) {
      local.current = true;
      const v = readLS(userId);
      setPlans(v.plans || []); setSessions(v.sessions || []); setCustom(v.custom || []);
    } else {
      local.current = false;
      setPlans(p.data || []); setSessions(s.data || []); setCustom(c.error ? [] : c.data || []);
    }
    setReady(true);
  }, [userId, enabled]);
  useEffect(() => { load(); }, [load]);

  const active = plans.find((x) => x.active) || null;

  /** lưu giáo án (mới hoặc sửa); active=true → bỏ đang dùng ở cái khác */
  const savePlan = useCallback(async (plan) => {
    const row = { name: String(plan.name || "Giáo án").slice(0, 40), tpl: plan.tpl || null, days: plan.days || {}, active: !!plan.active, updated_at: new Date().toISOString() };
    if (local.current) {
      const id = plan.id || uuid();
      const next = snap.current.plans.map((x) => (row.active && x.id !== id ? { ...x, active: false } : x)).filter((x) => x.id !== id).concat([{ ...row, id, user_id: userId, created_at: plan.created_at || new Date().toISOString() }]);
      setPlans(next); persistLocal({ plans: next }); return { ok: true, id };
    }
    if (row.active) await supabase.from("workout_plans").update({ active: false }).eq("user_id", userId).eq("active", true).neq("id", plan.id || "00000000-0000-0000-0000-000000000000");
    const q = plan.id ? supabase.from("workout_plans").update(row).eq("id", plan.id).select().single() : supabase.from("workout_plans").insert({ ...row, user_id: userId }).select().single();
    const { data, error } = await q;
    if (error) return { ok: false, error: error.message };
    setPlans((ps) => ps.map((x) => (row.active && x.id !== data.id ? { ...x, active: false } : x)).filter((x) => x.id !== data.id).concat([data]));
    return { ok: true, id: data.id };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setActivePlan = useCallback(async (id) => {
    const p = snap.current.plans.find((x) => x.id === id);
    return p ? savePlan({ ...p, active: true }) : { ok: false };
  }, [savePlan]);

  const deletePlan = useCallback(async (id) => {
    if (!local.current) { const { error } = await supabase.from("workout_plans").delete().eq("id", id); if (error) return { ok: false, error: error.message }; }
    const next = snap.current.plans.filter((x) => x.id !== id);
    setPlans(next); persistLocal({ plans: next }); return { ok: true };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** lưu buổi tập (tạo mới lần đầu, sau đó cập nhật theo id) */
  const saveSession = useCallback(async (s) => {
    const row = { day: s.day, plan_id: s.plan_id || null, title: String(s.title || "Buổi tập").slice(0, 60), items: s.items || [], started_at: s.started_at || new Date().toISOString(),
      ended_at: s.ended_at || null, minutes: s.minutes ?? null, sets_done: s.sets_done ?? null, volume: s.volume ?? null, updated_at: new Date().toISOString() };
    if (local.current) {
      const id = s.id || uuid();
      const next = [{ ...row, id, user_id: userId }, ...snap.current.sessions.filter((x) => x.id !== id)];
      setSessions(next); persistLocal({ sessions: next }); return { ok: true, id, local: true };
    }
    const q = s.id ? supabase.from("workout_sessions").update(row).eq("id", s.id).select().single() : supabase.from("workout_sessions").insert({ ...row, user_id: userId }).select().single();
    const { data, error } = await q;
    if (error) return { ok: false, error: error.message };
    setSessions((ss) => [data, ...ss.filter((x) => x.id !== data.id)]);
    return { ok: true, id: data.id };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteSession = useCallback(async (id) => {
    if (!local.current) { const { error } = await supabase.from("workout_sessions").delete().eq("id", id); if (error) return { ok: false }; }
    const next = snap.current.sessions.filter((x) => x.id !== id);
    setSessions(next); persistLocal({ sessions: next }); return { ok: true };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addCustom = useCallback(async (ex) => {
    const row = { id: ex.id, vi: ex.vi, en: ex.en || null, muscle: ex.muscle, equip: ex.equip || null };
    if (!local.current) { const { error } = await supabase.from("user_exercises").insert({ ...row, user_id: userId }); if (error) return { ok: false, error: error.message }; }
    const next = [...snap.current.custom.filter((x) => x.id !== row.id), row];
    setCustom(next); persistLocal({ custom: next }); return { ok: true };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ready, plans, active, sessions, custom, savePlan, setActivePlan, deletePlan, saveSession, deleteSession, addCustom, reload: load, isLocal: () => local.current };
}
