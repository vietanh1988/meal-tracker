// Số đo cơ thể (17/10): bảng body_measurements, 1 dòng / user / ngày VN. Lưu = upsert cả dòng của ngày đó
// (ô để trống → null, tức là đo lại cùng ngày sẽ thay số của ngày đó). Xoá = xoá dòng của ngày.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { ALL_KEYS, sortRows } from "../lib/bodyMeasure";

export function useBodyMeasure(uid) {
  const [rows, setRows] = useState(null); // null = đang tải
  const load = useCallback(async () => {
    if (!uid) { setRows([]); return; }
    const { data, error } = await supabase.from("body_measurements").select("*").eq("user_id", uid).order("log_date", { ascending: true });
    if (error) { console.warn("[body_measurements]", error.message); setRows((r) => r || []); return; }
    setRows(sortRows((data || []).map((r) => { const o = { log_date: r.log_date }; ALL_KEYS.forEach((k) => { o[k] = r[k] == null ? null : Number(r[k]); }); return o; })));
  }, [uid]);
  useEffect(() => { load(); }, [load]);

  const saveMeasure = useCallback(async (date, vals) => {
    if (!uid || !date) return false;
    const row = { user_id: uid, log_date: date, updated_at: new Date().toISOString() };
    ALL_KEYS.forEach((k) => { row[k] = vals?.[k] ?? null; });
    const { error } = await supabase.from("body_measurements").upsert(row, { onConflict: "user_id,log_date" });
    if (error) { console.warn("[body_measurements] lưu lỗi:", error.message); return false; }
    setRows((prev) => sortRows([...(prev || []).filter((r) => r.log_date !== date), { log_date: date, ...Object.fromEntries(ALL_KEYS.map((k) => [k, row[k]])) }]));
    return true;
  }, [uid]);

  const deleteMeasure = useCallback(async (date) => {
    if (!uid || !date) return false;
    const { error } = await supabase.from("body_measurements").delete().eq("user_id", uid).eq("log_date", date);
    if (error) return false;
    setRows((prev) => (prev || []).filter((r) => r.log_date !== date));
    return true;
  }, [uid]);

  return { measures: rows, saveMeasure, deleteMeasure, reloadMeasures: load };
}
