// Vận động thêm trong ngày (bảng activity_logs, 17/10). Tải 14 ngày gần nhất; lưu = upsert cả danh sách của ngày,
// danh sách rỗng = xoá dòng. Bảng chưa có trên máy chủ (prod chưa chạy SQL) → giữ trên máy (fp_activity).
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { readUser, writeUser } from "../lib/userStore";
import { addDays, todayVN } from "../lib/dateVN";

const KEY = "fp_activity";

export function useActivityLog(uid) {
  const [byDate, setByDate] = useState({});
  useEffect(() => {
    let dead = false;
    const local = readUser(KEY, uid, {}) || {};
    setByDate(local);
    if (!uid) return undefined;
    (async () => {
      const { data, error } = await supabase.from("activity_logs").select("log_date,items").eq("user_id", uid).gte("log_date", addDays(todayVN(), -13));
      if (dead || error) { if (error) console.warn("[activity_logs]", error.message); return; }
      const m = { ...local };
      (data || []).forEach((r) => { m[String(r.log_date).slice(0, 10)] = Array.isArray(r.items) ? r.items : []; });
      setByDate(m);
    })();
    return () => { dead = true; };
  }, [uid]);

  const saveActivity = useCallback(async (date, items) => {
    if (!date) return false;
    const list = Array.isArray(items) ? items : [];
    setByDate((prev) => {
      const next = { ...prev, [date]: list };
      if (!list.length) delete next[date];
      // chỉ giữ 14 ngày trên máy
      const keep = addDays(todayVN(), -13);
      Object.keys(next).forEach((d) => { if (d < keep) delete next[d]; });
      writeUser(KEY, uid, next);
      return next;
    });
    if (!uid) return true;
    const q = list.length
      ? supabase.from("activity_logs").upsert({ user_id: uid, log_date: date, items: list, updated_at: new Date().toISOString() }, { onConflict: "user_id,log_date" })
      : supabase.from("activity_logs").delete().eq("user_id", uid).eq("log_date", date);
    const { error } = await q;
    if (error) console.warn("[activity_logs] lưu lỗi (giữ trên máy):", error.message);
    return true;
  }, [uid]);

  return { activityByDate: byDate, saveActivity };
}
